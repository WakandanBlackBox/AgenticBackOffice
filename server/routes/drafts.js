import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/drafts — cross-resource pending_approval queue (proposals + invoices + contracts)
// Returns rows sorted newest-first with confidence + project + client for the inbox UI.
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT 'proposal' AS resource_type, pr.id, pr.project_id, pr.status, pr.confidence,
           pr.requires_approval, pr.created_at,
           pr.content->>'title' AS title,
           (pr.content->>'pricing_total_cents')::BIGINT AS amount_cents,
           p.name AS project_name, c.name AS client_name
      FROM proposals pr
      JOIN projects p ON pr.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
     WHERE pr.user_id = $1 AND pr.status = 'pending_approval'
    UNION ALL
    SELECT 'invoice' AS resource_type, i.id, i.project_id, i.status, i.confidence,
           i.requires_approval, i.created_at,
           ('Invoice $' || to_char(i.total_cents / 100.0, 'FM999G999G990D00')) AS title,
           i.total_cents AS amount_cents,
           p.name AS project_name, c.name AS client_name
      FROM invoices i
      JOIN projects p ON i.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
     WHERE i.user_id = $1 AND i.status = 'pending_approval'
    UNION ALL
    SELECT 'contract' AS resource_type, ct.id, ct.project_id, ct.status, ct.confidence,
           ct.requires_approval, ct.created_at,
           COALESCE(ct.content->>'title', 'Contract') AS title,
           NULL::BIGINT AS amount_cents,
           p.name AS project_name, c.name AS client_name
      FROM contracts ct
      JOIN projects p ON ct.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
     WHERE ct.user_id = $1 AND ct.status = 'pending_approval'
    ORDER BY created_at DESC
    LIMIT 100`;
  const rows = await db.many(sql, [userId]);
  res.json({ drafts: rows, count: rows.length });
});

// Shared approval-and-send handler. Atomic: a single conditional UPDATE that
// also serves as the concurrency guard, plus a transactional audit_log write.
// If two requests race, only one UPDATE returns a row; the loser gets 409.
const TABLE_FOR = { proposal: 'proposals', invoice: 'invoices', contract: 'contracts' };

async function approveAndSend(req, res, resourceType) {
  const table = TABLE_FOR[resourceType];
  const id = req.params.id;
  const userId = req.user.id;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Conditional UPDATE: only succeeds if the row is still pending_approval.
    // No SELECT-then-UPDATE; no TOCTOU.
    const result = await client.query(
      `UPDATE ${table}
          SET status = 'sent',
              approved_by = $1,
              approved_at = now(),
              sent_at = now()
        WHERE id = $2 AND user_id = $1 AND status = 'pending_approval'
        RETURNING id, status, confidence, approved_by, approved_at, sent_at`,
      [userId, id]
    );

    if (result.rowCount === 0) {
      // Either not owned by this user, doesn't exist, or already past pending_approval.
      // Disambiguate so the client gets a useful error.
      await client.query('ROLLBACK');
      const probe = await db.one(
        `SELECT status FROM ${table} WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (!probe) return res.status(404).json({ error: 'Not found' });
      return res.status(409).json({ error: `Cannot send: status is "${probe.status}", not "pending_approval"` });
    }

    const after = result.rows[0];

    await client.query(
      `INSERT INTO audit_log (user_id, actor_type, actor_id, action, resource_type, resource_id, before_state, after_state)
       VALUES ($1, 'owner', $2, 'approve_and_send', $3, $4, $5, $6)`,
      [
        userId,
        userId,
        resourceType,
        id,
        JSON.stringify({ status: 'pending_approval', confidence: after.confidence }),
        JSON.stringify({ status: after.status, approved_at: after.approved_at, sent_at: after.sent_at })
      ]
    );

    await client.query('COMMIT');
    res.json({ [resourceType]: after, sent: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

router.post('/proposals/:id/send', (req, res) => approveAndSend(req, res, 'proposal'));
router.post('/invoices/:id/send', (req, res) => approveAndSend(req, res, 'invoice'));
router.post('/contracts/:id/send', (req, res) => approveAndSend(req, res, 'contract'));

// GET /api/drafts/audit-log — recent audit entries for the user (capped, newest-first).
// Useful for the demo "trust" panel and for verification scripts.
router.get('/audit-log', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const rows = await db.many(
    `SELECT id, actor_type, actor_id, action, resource_type, resource_id, created_at
       FROM audit_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [req.user.id, limit]
  );
  res.json({ entries: rows, count: rows.length });
});

export default router;
