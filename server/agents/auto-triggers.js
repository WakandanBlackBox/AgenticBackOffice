// Phase 1D — internal auto-triggers. Fired from existing route handlers
// (milestones, documents) when user actions create the right conditions
// for an agent to draft something automatically. Drafts always land as
// pending_approval — auto-triggers never auto-send.
//
// Design choices:
//  - Fire-and-forget from route handlers (no await on the route's response
//    path) so user-facing requests return immediately.
//  - Token budget gate: if the user is over their daily limit we record a
//    'budget_blocked' run instead of attempting the agent call.
//  - All exceptions caught and logged to automation_runs with status='failed'
//    so a misbehaving auto-trigger never crashes the server.
//  - audit_log gets a parallel entry with actor_type='agent' so the trust
//    panel surface differentiates user actions from system actions.
//  - Idempotency is enforced by the underlying SAVE tools' UNIQUE constraints
//    where applicable; here we additionally short-circuit if the same trigger
//    fires twice for the same source resource within 60s (e.g. double-click
//    on the approve button by a client).
//  - KNOWN RACE: dedup is SELECT-then-INSERT (not atomic). Two concurrent
//    triggers within the agent's 10-30s run window can both pass the SELECT
//    and produce duplicate drafts. UI usually disables the trigger button on
//    click, so this only surfaces under deliberate spam. Hardening would
//    require a UNIQUE partial index or pg_advisory_lock around the run.

import db from '../db.js';
import { runAgent } from './dispatcher.js';
import { checkBudget } from './token-budget.js';

const RECENT_DEDUP_WINDOW_SECONDS = 60;

async function recordRun(userId, fields) {
  await db.query(
    `INSERT INTO automation_runs
       (user_id, trigger_type, trigger_resource_type, trigger_resource_id,
        action_agent, draft_id, draft_resource_type, status, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      userId,
      fields.trigger_type,
      fields.trigger_resource_type,
      fields.trigger_resource_id || null,
      fields.action_agent,
      fields.draft_id || null,
      fields.draft_resource_type || null,
      fields.status,
      fields.error || null
    ]
  );
}

async function recordAuditEntry(userId, action, resource_type, resource_id, before, after) {
  await db.query(
    `INSERT INTO audit_log (user_id, actor_type, actor_id, action, resource_type, resource_id, before_state, after_state)
     VALUES ($1, 'agent', $2, $3, $4, $5, $6, $7)`,
    [userId, 'auto-trigger', action, resource_type, resource_id, JSON.stringify(before || {}), JSON.stringify(after || {})]
  );
}

async function recentlyTriggered(userId, trigger_type, trigger_resource_id) {
  if (!trigger_resource_id) return false;
  const row = await db.one(
    `SELECT id FROM automation_runs
      WHERE user_id = $1 AND trigger_type = $2 AND trigger_resource_id = $3
        AND created_at > now() - ($4 || ' seconds')::interval
      ORDER BY created_at DESC LIMIT 1`,
    [userId, trigger_type, trigger_resource_id, RECENT_DEDUP_WINDOW_SECONDS]
  );
  return !!row;
}

// Drain the runAgent generator and return the last save tool result so we
// can capture the draft id for automation_runs/audit_log records.
async function drainAgent(agentId, userId, message, projectId) {
  let lastSavedId = null;
  let lastSavedResourceType = null;
  for await (const chunk of runAgent(agentId, userId, message, projectId)) {
    if (chunk.type === 'tool_result' && chunk.result?.success) {
      const tool = chunk.tool;
      if (tool === 'save_proposal') { lastSavedId = chunk.result.data?.id; lastSavedResourceType = 'proposal'; }
      else if (tool === 'create_invoice') { lastSavedId = chunk.result.data?.id; lastSavedResourceType = 'invoice'; }
      else if (tool === 'save_contract') { lastSavedId = chunk.result.data?.id; lastSavedResourceType = 'contract'; }
    }
  }
  return { draft_id: lastSavedId, draft_resource_type: lastSavedResourceType };
}

// =====================================================================
// Trigger 1: milestone approved → invoice drafted for that milestone.
// =====================================================================
export async function triggerInvoiceFromMilestone(userId, milestone) {
  const trigger = {
    trigger_type: 'milestone_approved',
    trigger_resource_type: 'milestone',
    trigger_resource_id: milestone?.id,
    action_agent: 'invoice'
  };
  try {
    if (!milestone?.id || !milestone?.project_id) {
      return recordRun(userId, { ...trigger, status: 'skipped', error: 'missing milestone id/project_id' });
    }
    if (await recentlyTriggered(userId, trigger.trigger_type, milestone.id)) {
      return recordRun(userId, { ...trigger, status: 'skipped', error: 'duplicate within dedup window' });
    }

    const budget = await checkBudget(userId, 'invoice');
    if (!budget.allowed) {
      return recordRun(userId, { ...trigger, status: 'budget_blocked', error: budget.reason });
    }

    const amountDollars = milestone.amount_cents != null
      ? `$${(Number(milestone.amount_cents) / 100).toFixed(2)}`
      : 'the milestone amount';
    const message = `Auto-trigger from milestone approval. Create an invoice for the milestone "${milestone.title}" (${amountDollars}). Use project_id="${milestone.project_id}". The line item should reference the milestone title and amount; due in 30 days.`;

    const { draft_id, draft_resource_type } = await drainAgent('invoice', userId, message, milestone.project_id);
    await recordRun(userId, { ...trigger, draft_id, draft_resource_type, status: draft_id ? 'success' : 'failed', error: draft_id ? null : 'agent ran but no invoice saved' });
    if (draft_id) {
      await recordAuditEntry(userId, 'auto_create_draft', draft_resource_type, draft_id,
        { source: 'milestone', milestone_id: milestone.id, milestone_title: milestone.title },
        { status: 'pending_approval', amount_cents: milestone.amount_cents });
    }
  } catch (err) {
    await recordRun(userId, { ...trigger, status: 'failed', error: String(err?.message || err).slice(0, 500) });
  }
}

// =====================================================================
// Trigger 2: proposal accepted → contract + 50% deposit invoice drafted.
// We run them sequentially because contract often references invoice terms
// and we want both visible in the Drafts inbox after one user click.
// =====================================================================
export async function triggerOnboardFromAcceptedProposal(userId, proposal) {
  const triggerBase = {
    trigger_type: 'proposal_accepted',
    trigger_resource_type: 'proposal',
    trigger_resource_id: proposal?.id
  };
  try {
    if (!proposal?.id || !proposal?.project_id) {
      return recordRun(userId, { ...triggerBase, action_agent: 'contract', status: 'skipped', error: 'missing proposal id/project_id' });
    }
    if (await recentlyTriggered(userId, triggerBase.trigger_type, proposal.id)) {
      return recordRun(userId, { ...triggerBase, action_agent: 'contract', status: 'skipped', error: 'duplicate within dedup window' });
    }

    // Contract first (uses proposal terms for alignment)
    const contractBudget = await checkBudget(userId, 'contract');
    if (contractBudget.allowed) {
      try {
        const contractMsg = `Auto-trigger from proposal acceptance. Draft a contract aligned to the accepted proposal for project_id="${proposal.project_id}". Pull the proposal scope/timeline/pricing; include standard freelancer protections.`;
        const r = await drainAgent('contract', userId, contractMsg, proposal.project_id);
        await recordRun(userId, { ...triggerBase, action_agent: 'contract', draft_id: r.draft_id, draft_resource_type: r.draft_resource_type, status: r.draft_id ? 'success' : 'failed', error: r.draft_id ? null : 'agent ran but no contract saved' });
        if (r.draft_id) await recordAuditEntry(userId, 'auto_create_draft', r.draft_resource_type, r.draft_id, { source: 'proposal', proposal_id: proposal.id }, { status: 'pending_approval' });
      } catch (e) {
        await recordRun(userId, { ...triggerBase, action_agent: 'contract', status: 'failed', error: String(e?.message || e).slice(0, 500) });
      }
    } else {
      await recordRun(userId, { ...triggerBase, action_agent: 'contract', status: 'budget_blocked', error: contractBudget.reason });
    }

    // Deposit invoice next (50% of proposal pricing if available)
    const invoiceBudget = await checkBudget(userId, 'invoice');
    if (invoiceBudget.allowed) {
      try {
        const totalCents = Number(proposal.content?.pricing_total_cents) || null;
        const depositLine = totalCents ? `50% deposit ($${(totalCents / 200).toFixed(2)})` : '50% deposit of the accepted proposal total';
        const invoiceMsg = `Auto-trigger from proposal acceptance. Create a ${depositLine} invoice for project_id="${proposal.project_id}", due in 14 days. One line item: "Project deposit — ${proposal.content?.title || 'engagement'}".`;
        const r = await drainAgent('invoice', userId, invoiceMsg, proposal.project_id);
        await recordRun(userId, { ...triggerBase, action_agent: 'invoice', draft_id: r.draft_id, draft_resource_type: r.draft_resource_type, status: r.draft_id ? 'success' : 'failed', error: r.draft_id ? null : 'agent ran but no invoice saved' });
        if (r.draft_id) await recordAuditEntry(userId, 'auto_create_draft', r.draft_resource_type, r.draft_id, { source: 'proposal', proposal_id: proposal.id }, { status: 'pending_approval' });
      } catch (e) {
        await recordRun(userId, { ...triggerBase, action_agent: 'invoice', status: 'failed', error: String(e?.message || e).slice(0, 500) });
      }
    } else {
      await recordRun(userId, { ...triggerBase, action_agent: 'invoice', status: 'budget_blocked', error: invoiceBudget.reason });
    }
  } catch (err) {
    await recordRun(userId, { ...triggerBase, action_agent: 'orchestration', status: 'failed', error: String(err?.message || err).slice(0, 500) });
  }
}
