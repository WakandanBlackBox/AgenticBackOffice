import Anthropic from '@anthropic-ai/sdk';
import { AGENTS, AGENT_LIST } from './agent-config.js';
import { getToolDefs, executeTool, capResultSize } from './tools.js';
import { setRunAgent, DELEGATE_TOOL_DEF, executeDelegation } from './delegate.js';
import db from '../db.js';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY environment variable is required');
const client = new Anthropic();

// Per-million-token pricing (USD) -- update when models change
const MODEL_PRICING = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00, cache_write: 1.00, cache_read: 0.08 },
  'claude-sonnet-4-5-20241022': { input: 3.00, output: 15.00, cache_write: 3.75, cache_read: 0.30 }
};

function estimateCost(model, inputTokens, outputTokens, cacheCreation = 0, cacheRead = 0) {
  const p = MODEL_PRICING[model] || MODEL_PRICING['claude-haiku-4-5-20251001'];
  const uncachedInput = Math.max(0, inputTokens - cacheRead);
  return parseFloat((
    (uncachedInput / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output +
    (cacheCreation / 1_000_000) * p.cache_write +
    (cacheRead / 1_000_000) * p.cache_read
  ).toFixed(6));
}

// Route a natural language query to the best agent by intent score
export function routeToAgent(query) {
  const q = query.toLowerCase();
  let best = { agent: null, score: 0 };

  // Score each specialist agent by keyword match
  const scored = AGENT_LIST.map((agent) => {
    const score = agent.intentPatterns.reduce((acc, p) => acc + (q.includes(p) ? 1 : 0), 0);
    if (score > best.score) best = { agent, score };
    return { agent, score };
  });

  // Multi-domain detection: 2+ agents match -> Chief orchestrates
  const matchedAgents = scored.filter((s) => s.score > 0);
  if (matchedAgents.length >= 2) return AGENTS.chief;

  // Clear single-agent match -> direct routing (fast path)
  if (best.agent && best.score > 0) return best.agent;

  // Ambiguous -> Chief decides
  return AGENTS.chief;
}

const MAX_DELEGATION_DEPTH = 2;

// Run a single agent with streaming — yields SSE chunks
export async function* runAgent(agentId, userId, userMessage, projectId, { depth = 0 } = {}) {
  if (depth >= MAX_DELEGATION_DEPTH) {
    throw new Error(`Max delegation depth (${MAX_DELEGATION_DEPTH}) exceeded.`);
  }

  const agent = AGENTS[agentId];
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);

  // Build tools array — inject delegate_to_agent def if agent uses it
  const regularTools = agent.tools.filter((t) => t !== 'delegate_to_agent');
  const tools = getToolDefs(regularTools);
  if (agent.tools.includes('delegate_to_agent')) {
    tools.push({ name: DELEGATE_TOOL_DEF.name, description: DELEGATE_TOOL_DEF.description, input_schema: DELEGATE_TOOL_DEF.input_schema });
  }

  const messages = [{ role: 'user', content: userMessage }];
  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;

  yield { type: 'agent_start', agent: agent.id, name: agent.name };

  // Track whether we've emitted any user-visible text. If the model exits
  // without emitting a final answer (rare but happens — model treats the
  // last tool call as the end), we emit a deterministic fallback so the user
  // is never left staring at an empty bubble.
  let emittedText = false;
  let lastSaveResult = null;

  // System prompt with cache_control -- cached after first call, saving ~90% on re-reads
  const systemWithCache = [
    { type: 'text', text: agent.system, cache_control: { type: 'ephemeral' } }
  ];

  // Mark last tool def for caching -- tools are static per agent
  const cachedTools = tools.map((t, i) =>
    i === tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t
  );

  const maxIterations = agentId === 'chief' ? 12 : 5;
  const maxTotalTokens = agentId === 'chief' ? 30000 : 15000;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Bail if we've used too many tokens (prevents runaway loops)
    if (totalInputTokens + totalOutputTokens > maxTotalTokens) break;

    const response = await client.messages.create({
      model: agent.model,
      max_tokens: agent.maxTokens,
      system: systemWithCache,
      messages,
      tools: cachedTools
    });

    totalInputTokens += response.usage?.input_tokens || 0;
    totalOutputTokens += response.usage?.output_tokens || 0;
    cacheCreationTokens += response.usage?.cache_creation_input_tokens || 0;
    cacheReadTokens += response.usage?.cache_read_input_tokens || 0;

    // Process content blocks
    const textBlocks = [];
    const toolUseBlocks = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text);
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // Emit text only on the FINAL iteration (no tool calls = the model's final
    // answer). Intermediate text is "Now I'll X..."-style narration that the
    // model produces between tool calls — it's noise, never the actual summary.
    // The model's final answer always comes in a turn with no tool_use blocks.
    if (toolUseBlocks.length === 0) {
      for (const txt of textBlocks) {
        yield { type: 'text', content: txt };
        if (txt && txt.trim()) emittedText = true;
      }
      break;
    }

    // Execute tools and feed results back
    messages.push({ role: 'assistant', content: response.content });
    const toolResults = [];

    for (const toolUse of toolUseBlocks) {
      yield { type: 'tool_call', tool: toolUse.name, input: toolUse.input };

      let result;
      if (toolUse.name === 'delegate_to_agent') {
        // Collect yielded events from sub-agent via a buffer, then yield them
        const events = [];
        const collectEvent = (evt) => events.push(evt);
        result = await executeDelegation(toolUse.input, userId, agentId, collectEvent, depth, projectId);
        for (const evt of events) yield evt;
      } else {
        result = await executeTool(toolUse.name, toolUse.input, userId);
      }

      yield { type: 'tool_result', tool: toolUse.name, result };
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: capResultSize(JSON.stringify(result)) });

      // Track the most recent save + the confidence the agent assigned to it.
      // Used after the loop to emit a draft_saved card event the chat UI
      // renders as a clickable confirmation, plus a fallback if the model
      // exits silently.
      if (result?.success && /^(save_proposal|create_invoice|save_contract|draft_email)$/.test(toolUse.name)) {
        lastSaveResult = { tool: toolUse.name, data: result.data, input: toolUse.input };
      }
      if (result?.success && toolUse.name === 'set_confidence' && lastSaveResult) {
        // Match by resource id when possible
        if (toolUse.input?.resource_id === lastSaveResult.data?.id) {
          lastSaveResult.confidence = toolUse.input?.score;
        }
      }
    }

    messages.push({ role: 'user', content: toolResults });

    // If stop_reason is end_turn, break
    if (response.stop_reason === 'end_turn') break;
  }

  // Whenever a save tool ran successfully, emit a structured draft_saved
  // event so the chat UI can render a clickable confirmation card with a
  // jump-to-Drafts button — much better UX than a wall of text.
  if (lastSaveResult) {
    const t = lastSaveResult.tool;
    const resource_type = t === 'save_proposal' ? 'proposal'
      : t === 'create_invoice' ? 'invoice'
      : t === 'save_contract' ? 'contract'
      : t === 'draft_email' ? 'email_draft'
      : 'document';
    const input = lastSaveResult.input || {};
    const title = input.title
      || (resource_type === 'invoice' ? 'New invoice' : null)
      || (input.content && typeof input.content === 'object' ? input.content.title : null)
      || 'Saved draft';
    const amount_cents = input.pricing_total_cents ?? input.total_cents ?? null;
    yield {
      type: 'draft_saved',
      resource_type,
      resource_id: lastSaveResult.data?.id,
      title,
      amount_cents,
      confidence: lastSaveResult.confidence ?? null
    };
    emittedText = true; // card serves as the user-visible confirmation
  } else if (!emittedText) {
    yield { type: 'text', content: '_(No response from agent — try rephrasing.)_' };
  }

  const durationMs = Date.now() - startTime;

  // Log agent execution -- store only input message and final text, not full conversation history
  const finalText = messages
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => (Array.isArray(m.content) ? m.content : [m.content]))
    .filter((b) => typeof b === 'string' || b?.type === 'text')
    .map((b) => (typeof b === 'string' ? b : b.text))
    .join('');
  const outputLog = { summary: finalText.slice(0, 500), iterations: messages.filter((m) => m.role === 'assistant').length };

  await db.query(
    `INSERT INTO agent_logs (user_id, agent, project_id, input, output, model, input_tokens, output_tokens, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, agent.id, projectId || null, JSON.stringify({ message: userMessage.slice(0, 500) }), JSON.stringify(outputLog), agent.model, totalInputTokens, totalOutputTokens, durationMs]
  );

  yield {
    type: 'agent_complete',
    agent: agent.id,
    duration_ms: durationMs,
    tokens: { input: totalInputTokens, output: totalOutputTokens, cache_creation: cacheCreationTokens, cache_read: cacheReadTokens },
    cost_estimate_usd: estimateCost(agent.model, totalInputTokens, totalOutputTokens, cacheCreationTokens, cacheReadTokens)
  };
}

// Wire up late binding for delegation
setRunAgent(runAgent);

// Workflow: run multiple agents with dependencies
export async function* runWorkflow(steps, userId) {
  const completed = new Map(); // stepId -> result

  yield { type: 'workflow_start', steps: steps.map((s) => ({ id: s.id, agent: s.agent, status: 'pending' })) };

  while (completed.size < steps.length) {
    // Find steps whose dependencies are met
    const ready = steps.filter((s) =>
      !completed.has(s.id) &&
      (!s.dependsOn || s.dependsOn.every((dep) => completed.has(dep)))
    );

    if (ready.length === 0) {
      yield { type: 'workflow_error', error: 'Circular dependency or unresolvable steps' };
      break;
    }

    // Execute ready steps in parallel
    const results = await Promise.all(
      ready.map(async (step) => {
        const chunks = [];
        const gen = runAgent(step.agent, userId, step.message, step.projectId);
        for await (const chunk of gen) chunks.push(chunk);
        return { stepId: step.id, chunks };
      })
    );

    for (const { stepId, chunks } of results) {
      completed.set(stepId, chunks);
      yield { type: 'step_complete', stepId, chunks };
    }
  }

  yield { type: 'workflow_complete', stepsCompleted: completed.size };
}

// Pre-built workflow: New client onboarding
export function onboardingWorkflow(projectId, instructions) {
  return [
    { id: 'proposal', agent: 'proposal', message: instructions, projectId },
    { id: 'contract', agent: 'contract', message: `Generate a contract based on the proposal for project ${projectId}. Align scope and pricing with the proposal.`, projectId, dependsOn: ['proposal'] },
    { id: 'invoice', agent: 'invoice', message: `Create a 50% deposit invoice for project ${projectId} based on the proposal pricing.`, projectId, dependsOn: ['proposal'] }
  ];
}

// Pre-built workflow: Scope check
export function scopeCheckWorkflow(projectId, requestDescription) {
  return [
    { id: 'scope', agent: 'scope_guardian', message: `A client has made this request: "${requestDescription}". Check if this is within the contracted scope for project ${projectId}. If out of scope, calculate the change order cost.`, projectId }
  ];
}
