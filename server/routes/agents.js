import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateProposalSchema, generateInvoiceSchema, generateContractSchema, analyzeScopeSchema, generateInsightSchema, chatSchema } from '../schemas/index.js';
import { runAgent, runWorkflow, routeToAgent, onboardingWorkflow, scopeCheckWorkflow } from '../agents/dispatcher.js';

const classifier = new Anthropic();

async function detectScopeCreep(message) {
  const res = await classifier.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    system: 'You detect scope creep in freelancer messages. Respond ONLY with raw JSON, no markdown fences: {"is_scope_creep":true/false,"reason":"brief reason"}. Scope creep = a CLIENT requesting work, features, or changes beyond what was originally agreed.',
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

// Stream a single agent run over SSE
async function streamAgent(res, agentId, userId, message, projectId) {
  setupSSE(res);
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

// Smart chat - auto-route to best agent (with proactive scope detection)
router.post('/chat', validate(chatSchema), async (req, res) => {
  const { message, project_id } = req.validated;

  setupSSE(res);

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

  // Normal agent routing
  const agent = routeToAgent(message);
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
