import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateProposalSchema, generateInvoiceSchema, generateContractSchema, analyzeScopeSchema, generateInsightSchema, chatSchema } from '../schemas/index.js';
import { runAgent, runWorkflow, routeToAgent, onboardingWorkflow, scopeCheckWorkflow } from '../agents/dispatcher.js';
import { checkBudget, getDailyUsage } from '../agents/token-budget.js';

const classifier = new Anthropic();

// Scope creep keywords -- skip classifier if none match (saves an API call)
const SCOPE_KEYWORDS = ['also', 'add', 'extra', 'another', 'more', 'change', 'tweak', 'adjust', 'include', 'want', 'need', 'can you', 'could you', 'new feature', 'quick', 'small', 'one more'];

function looksLikeScopeCreep(message) {
  const lower = message.toLowerCase();
  return SCOPE_KEYWORDS.some((kw) => lower.includes(kw));
}

// Cached system prompt for classifier -- reuse across calls within cache TTL
const CLASSIFIER_SYSTEM = [
  { type: 'text', text: 'Detect scope creep. Respond ONLY with raw JSON: {"is_scope_creep":true/false,"reason":"brief"}. Scope creep = CLIENT requesting work beyond original agreement.', cache_control: { type: 'ephemeral' } }
];

async function detectScopeCreep(message) {
  // Skip classifier for short messages or those without scope-creep signals
  if (message.length < 20 || !looksLikeScopeCreep(message)) {
    return { isScopeCreep: false, reason: '' };
  }

  const res = await classifier.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    system: CLASSIFIER_SYSTEM,
    messages: [{ role: 'user', content: message }]
  });
  const raw = (res.content[0]?.text || '{}').replace(/```json\s*|```\s*/g, '').trim();
  const parsed = JSON.parse(raw);
  return { isScopeCreep: !!parsed.is_scope_creep, reason: parsed.reason || '' };
}

const router = Router();

router.use(requireAuth);

// SSE helper
function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Stream a single agent run over SSE (with budget gate)
async function streamAgent(res, agentId, userId, message, projectId) {
  setupSSE(res);

  // Check daily token budget before running
  const budget = await checkBudget(userId, agentId);
  if (!budget.allowed) {
    sendEvent(res, { type: 'budget_exceeded', usage: budget.usage, reason: budget.reason });
    sendEvent(res, { type: 'done' });
    res.end();
    return;
  }

  try {
    for await (const chunk of runAgent(agentId, userId, message, projectId)) {
      sendEvent(res, chunk);
    }
  } catch (err) {
    sendEvent(res, { type: 'error', error: err.message });
  }
  sendEvent(res, { type: 'done' });
  res.end();
}

// Generate proposal
router.post('/proposal/generate', validate(generateProposalSchema), async (req, res) => {
  const { project_id, instructions, tone } = req.validated;
  const message = `Generate a ${tone} proposal for project ${project_id}. Instructions: ${instructions}`;
  await streamAgent(res, 'proposal', req.user.id, message, project_id);
});

// Generate invoice
router.post('/invoice/generate', validate(generateInvoiceSchema), async (req, res) => {
  const { project_id, instructions, due_days } = req.validated;
  const message = `Create an invoice for project ${project_id}. Due in ${due_days} days.${instructions ? ` Instructions: ${instructions}` : ''}`;
  await streamAgent(res, 'invoice', req.user.id, message, project_id);
});

// Generate contract
router.post('/contract/generate', validate(generateContractSchema), async (req, res) => {
  const { project_id, instructions } = req.validated;
  const message = `Generate a contract for project ${project_id}.${instructions ? ` Instructions: ${instructions}` : ''}`;
  await streamAgent(res, 'contract', req.user.id, message, project_id);
});

// Scope analysis
router.post('/scope/analyze', validate(analyzeScopeSchema), async (req, res) => {
  const { project_id, request_description } = req.validated;
  const message = `A client has requested: "${request_description}". Analyze whether this is within scope for project ${project_id}. If out of scope, calculate the change order.`;
  await streamAgent(res, 'scope_guardian', req.user.id, message, project_id);
});

// Business insights
router.post('/insight/generate', validate(generateInsightSchema), async (req, res) => {
  const { period } = req.validated;
  const message = `Generate a business insights report for the past ${period}. Include revenue, outstanding invoices, pipeline value, and actionable recommendations.`;
  await streamAgent(res, 'insight', req.user.id, message, null);
});

// Token usage endpoint -- lets frontend show budget status
router.get('/usage', async (req, res) => {
  const usage = await getDailyUsage(req.user.id);
  res.json(usage);
});

// Smart chat - auto-route to best agent (with proactive scope detection)
// Agents that REQUIRE a project_id (their tools fail without it). Insight is
// the only project-agnostic specialist; chief delegates so it inherits the
// requirement of whatever it routes to. Guarding here prevents silent agent
// failures from a null project_id and saves the round-trip + tokens.
const PROJECT_SCOPED_AGENTS = new Set(['proposal', 'invoice', 'contract', 'scope_guardian']);

router.post('/chat', validate(chatSchema), async (req, res) => {
  const { message, project_id } = req.validated;

  setupSSE(res);

  // Check daily token budget
  const agent = routeToAgent(message);

  // Guard: if the routed agent needs a project and none is selected, return a
  // friendly SSE message instead of running the agent against a null context.
  // (Chief is excluded — it can sometimes answer without a project, and over-
  // gating it would block legitimate cross-project orchestration prompts.)
  if (!project_id && PROJECT_SCOPED_AGENTS.has(agent.id)) {
    sendEvent(res, {
      type: 'text',
      text: `To run the ${agent.name}, pick a project from the dropdown above first — this action needs a specific project's context.`
    });
    sendEvent(res, { type: 'done' });
    res.end();
    return;
  }

  const budget = await checkBudget(req.user.id, agent.id);
  if (!budget.allowed) {
    sendEvent(res, { type: 'budget_exceeded', usage: budget.usage, reason: budget.reason });
    sendEvent(res, { type: 'done' });
    res.end();
    return;
  }

  // Proactive scope creep detection when a project is selected
  if (project_id) {
    try {
      const { isScopeCreep, reason } = await detectScopeCreep(message);
      if (isScopeCreep) {
        sendEvent(res, { type: 'scope_alert_start', reason });
        const scopeMsg = `A client has requested: "${message}". Analyze whether this is within scope for project ${project_id}. If out of scope, calculate the change order.`;
        for await (const chunk of runAgent('scope_guardian', req.user.id, scopeMsg, project_id)) {
          sendEvent(res, { ...chunk, scope_alert: true });
        }
        sendEvent(res, { type: 'scope_alert_end' });
      }
    } catch { /* classifier failed, continue normally */ }
  }

  // Normal agent routing (agent already resolved above for budget check)
  const enrichedMessage = project_id
    ? `[Context: The user has selected project_id="${project_id}". Use this project_id when delegating to agents.]\n\n${message}`
    : message;

  try {
    for await (const chunk of runAgent(agent.id, req.user.id, enrichedMessage, project_id || null)) {
      sendEvent(res, chunk);
    }
  } catch (err) {
    sendEvent(res, { type: 'error', error: err.message });
  }
  sendEvent(res, { type: 'done' });
  res.end();
});

// Onboarding workflow - proposal + contract + invoice
router.post('/workflow/onboard', validate(generateProposalSchema), async (req, res) => {
  const { project_id, instructions } = req.validated;
  setupSSE(res);

  // Workflows are expensive (3 agents) -- budget check with chief multiplier
  const budget = await checkBudget(req.user.id, 'chief');
  if (!budget.allowed) {
    sendEvent(res, { type: 'budget_exceeded', usage: budget.usage, reason: budget.reason });
    sendEvent(res, { type: 'done' });
    res.end();
    return;
  }

  try {
    const steps = onboardingWorkflow(project_id, instructions);
    for await (const chunk of runWorkflow(steps, req.user.id)) {
      sendEvent(res, chunk);
    }
  } catch (err) {
    sendEvent(res, { type: 'error', error: err.message });
  }
  sendEvent(res, { type: 'done' });
  res.end();
});

// Scope check workflow
router.post('/workflow/scope-check', validate(analyzeScopeSchema), async (req, res) => {
  const { project_id, request_description } = req.validated;
  setupSSE(res);

  const budget = await checkBudget(req.user.id, 'scope_guardian');
  if (!budget.allowed) {
    sendEvent(res, { type: 'budget_exceeded', usage: budget.usage, reason: budget.reason });
    sendEvent(res, { type: 'done' });
    res.end();
    return;
  }

  try {
    const steps = scopeCheckWorkflow(project_id, request_description);
    for await (const chunk of runWorkflow(steps, req.user.id)) {
      sendEvent(res, chunk);
    }
  } catch (err) {
    sendEvent(res, { type: 'error', error: err.message });
  }
  sendEvent(res, { type: 'done' });
  res.end();
});

export default router;
