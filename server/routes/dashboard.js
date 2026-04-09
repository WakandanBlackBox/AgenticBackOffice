import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Single endpoint -- everything the dashboard needs in one call
router.get('/', async (req, res) => {
  const uid = req.user.id;

  const [projects, invoiceStats, recentActivity, scopeEvents, agentStats] = await Promise.all([
    // Active projects with client info
    db.many(
      `SELECT p.id, p.name, p.status, p.budget_cents, p.end_date, c.name AS client_name
       FROM projects p LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.user_id = $1 AND p.status = 'active' ORDER BY p.created_at DESC`, [uid]
    ),
    // Invoice KPIs
    db.one(
      `SELECT
         COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid'), 0) AS paid_cents,
         COALESCE(SUM(total_cents) FILTER (WHERE status IN ('sent','overdue')), 0) AS outstanding_cents,
         COALESCE(SUM(total_cents) FILTER (WHERE status = 'overdue' OR (status = 'sent' AND due_date < CURRENT_DATE)), 0) AS overdue_cents,
         COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'sent' AND due_date < CURRENT_DATE)) AS overdue_count,
         COUNT(*) AS total_invoices
       FROM invoices WHERE user_id = $1 AND created_at > now() - interval '30 days'`, [uid]
    ),
    // Recent activity (last 20 agent runs)
    db.many(
      `SELECT al.agent, al.project_id, al.duration_ms, al.created_at, p.name AS project_name
       FROM agent_logs al LEFT JOIN projects p ON al.project_id = p.id
       WHERE al.user_id = $1 ORDER BY al.created_at DESC LIMIT 20`, [uid]
    ),
    // Recent scope events
    db.many(
      `SELECT se.event_type, se.description, se.estimated_cost_cents, se.created_at, p.name AS project_name
       FROM scope_events se JOIN projects p ON se.project_id = p.id
       WHERE se.user_id = $1 ORDER BY se.created_at DESC LIMIT 10`, [uid]
    ),
    // Agent usage stats (30 days)
    db.many(
      `SELECT agent, COUNT(*) AS calls, AVG(duration_ms)::int AS avg_duration_ms,
         SUM(input_tokens) AS total_input_tokens, SUM(output_tokens) AS total_output_tokens
       FROM agent_logs WHERE user_id = $1 AND created_at > now() - interval '30 days'
       GROUP BY agent`, [uid]
    )
  ]);

  const pipelineValue = projects.reduce((sum, p) => sum + (p.budget_cents || 0), 0);

  res.json({
    kpis: {
      active_projects: projects.length,
      pipeline_cents: pipelineValue,
      paid_cents: parseInt(invoiceStats.paid_cents),
      outstanding_cents: parseInt(invoiceStats.outstanding_cents),
      overdue_cents: parseInt(invoiceStats.overdue_cents),
      overdue_count: parseInt(invoiceStats.overdue_count)
    },
    projects,
    recent_activity: recentActivity,
    scope_events: scopeEvents,
    agent_stats: agentStats
  });
});

export default router;
