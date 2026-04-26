import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AGENT_BASELINE_MINUTES } from '../agents/roi-baselines.js';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard/roi — derived ROI metrics. Computed entirely from
// existing data; ?days defaults to 30. Returns nulls (not zeros) when a
// metric has insufficient samples so the UI can say "needs more data"
// instead of fabricating "$0" figures.
router.get('/roi', async (req, res) => {
  const uid = req.user.id;
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const interval = `${days} days`;
  const MIN_SAMPLES = 5;

  const [scopeAgg, collectionAgg, proposalAgg, agentRuns] = await Promise.all([
    // Scope creep blocked = sum of estimated_cost_cents on change_order events
    db.one(
      `SELECT COALESCE(SUM(estimated_cost_cents), 0) AS cents,
              COUNT(*) AS events
         FROM scope_events
        WHERE user_id = $1 AND event_type = 'change_order'
          AND created_at > now() - $2::interval`,
      [uid, interval]
    ),
    // Avg collection time = AVG(paid_at - sent_at) on invoices with both set
    db.one(
      `SELECT EXTRACT(EPOCH FROM AVG(paid_at - sent_at)) / 86400.0 AS days_avg,
              COUNT(*) AS samples
         FROM invoices
        WHERE user_id = $1 AND paid_at IS NOT NULL AND sent_at IS NOT NULL
          AND paid_at > now() - $2::interval`,
      [uid, interval]
    ),
    // Proposal close rate over a 90-day window (longer because sales cycle)
    db.one(
      `SELECT COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
              COUNT(*) FILTER (WHERE status IN ('sent','accepted','rejected')) AS sent_total
         FROM proposals
        WHERE user_id = $1 AND created_at > now() - interval '90 days'`,
      [uid]
    ),
    // Agent runs grouped by agent in window — drives hours saved
    db.many(
      `SELECT agent, COUNT(*)::int AS calls
         FROM agent_logs
        WHERE user_id = $1 AND created_at > now() - $2::interval
        GROUP BY agent`,
      [uid, interval]
    )
  ]);

  // Hours saved = sum of (calls per agent × baseline minutes / 60)
  const minutesSaved = agentRuns.reduce((acc, r) => {
    const baseline = AGENT_BASELINE_MINUTES[r.agent] || 0;
    return acc + r.calls * baseline;
  }, 0);
  const hoursSaved = parseFloat((minutesSaved / 60).toFixed(1));

  const collectionSamples = parseInt(collectionAgg.samples, 10);
  const sentTotal = parseInt(proposalAgg.sent_total, 10);

  res.json({
    window_days: days,
    scope_creep_blocked: {
      cents: parseInt(scopeAgg.cents, 10),
      events: parseInt(scopeAgg.events, 10)
    },
    avg_collection_days: collectionSamples >= MIN_SAMPLES
      ? parseFloat(Number(collectionAgg.days_avg).toFixed(1))
      : null,
    collection_samples: collectionSamples,
    proposal_close_rate: sentTotal >= MIN_SAMPLES
      ? parseFloat((parseInt(proposalAgg.accepted, 10) / sentTotal).toFixed(3))
      : null,
    proposal_samples: sentTotal,
    hours_saved: hoursSaved,
    agent_run_count: agentRuns.reduce((s, r) => s + r.calls, 0)
  });
});

// Single endpoint -- everything the dashboard needs in one call
router.get('/', async (req, res) => {
  const uid = req.user.id;

  const [projects, invoiceStats, recentActivity, scopeEvents, agentStats, clientCount, upcomingMilestones] = await Promise.all([
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
    ),
    // Total clients
    db.one(`SELECT COUNT(*) AS total FROM clients WHERE user_id = $1`, [uid]),
    // Upcoming milestones across active projects
    db.many(
      `SELECT m.id, m.title, m.status, m.amount_cents, p.name AS project_name, p.id AS project_id
       FROM milestones m
       JOIN projects p ON m.project_id = p.id
       WHERE m.user_id = $1 AND p.status = 'active' AND m.status IN ('pending', 'active', 'completed')
       ORDER BY
         CASE m.status WHEN 'active' THEN 1 WHEN 'completed' THEN 2 WHEN 'pending' THEN 3 END,
         m.created_at ASC
       LIMIT 8`, [uid]
    )
  ]);

  const pipelineValue = projects.reduce((sum, p) => sum + parseInt(p.budget_cents || 0), 0);

  res.json({
    kpis: {
      active_projects: projects.length,
      pipeline_cents: pipelineValue,
      total_clients: parseInt(clientCount.total),
      paid_cents: parseInt(invoiceStats.paid_cents),
      outstanding_cents: parseInt(invoiceStats.outstanding_cents),
      overdue_cents: parseInt(invoiceStats.overdue_cents),
      overdue_count: parseInt(invoiceStats.overdue_count)
    },
    projects,
    upcoming_milestones: upcomingMilestones,
    recent_activity: recentActivity,
    scope_events: scopeEvents,
    agent_stats: agentStats
  });
});

export default router;
