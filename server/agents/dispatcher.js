import Anthropic from '@anthropic-ai/sdk';
import { AGENTS, AGENT_LIST } from './agent-config.js';
import { getToolDefs, executeTool } from './tools.js';
import { setRunAgent, DELEGATE_TOOL_DEF, executeDelegation } from './delegate.js';
import db from '../db.js';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY environment variable is required');
const client = new Anthropic();

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

  yield { type: 'agent_start', agent: agent.id, name: agent.name };

  const maxIterations = agentId === 'chief' ? 12 : 5;
  const maxTotalTokens = agentId === 'chief' ? 30000 : 15000;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Bail if we've used too many tokens (prevents runaway loops)
    if (totalInputTokens + totalOutputTokens > maxTotalTokens) break;

    const response = await client.messages.create({
      model: agent.model,
      max_tokens: agent.maxTokens,
      system: agent.system,
      messages,
      tools
    });

    totalInputTokens += response.usage?.input_tokens || 0;
    totalOutputTokens += response.usage?.output_tokens || 0;

    // Process content blocks
    const textBlocks = [];
    const toolUseBlocks = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text);
        yield { type: 'text', content: block.text };
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0) break;

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
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
    }

    messages.push({ role: 'user', content: toolResults });

    // If stop_reason is end_turn, break
    if (response.stop_reason === 'end_turn') break;
  }

  const durationMs = Date.now() - startTime;

  // Log agent execution
  await db.query(
    `INSERT INTO agent_logs (user_id, agent, project_id, input, output, model, input_tokens, output_tokens, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, agent.id, projectId || null, JSON.stringify({ message: userMessage }), JSON.stringify({ messages }), agent.model, totalInputTokens, totalOutputTokens, durationMs]
  );

  yield { type: 'agent_complete', agent: agent.id, duration_ms: durationMs, tokens: { input: totalInputTokens, output: totalOutputTokens } };
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
