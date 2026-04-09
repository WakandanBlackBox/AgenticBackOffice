import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateProposalSchema, generateInvoiceSchema, generateContractSchema, analyzeScopeSchema, generateInsightSchema } from '../schemas/index.js';
import { runAgent, runWorkflow, routeToAgent, onboardingWorkflow, scopeCheckWorkflow } from '../agents/dispatcher.js';

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

// Smart chat - auto-route to best agent
router.post('/chat', async (req, res) => {
  const { message, project_id } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const agent = routeToAgent(message);
  await streamAgent(res, agent.id, req.user.id, message, project_id || null);
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
