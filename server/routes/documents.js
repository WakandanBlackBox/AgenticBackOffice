import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// === PROPOSALS ===
router.get('/proposals', async (req, res) => {
  const { project_id, status } = req.query;
  let sql = `SELECT pr.*, p.name AS project_name, c.name AS client_name
    FROM proposals pr JOIN projects p ON pr.project_id = p.id LEFT JOIN clients c ON p.client_id = c.id
    WHERE pr.user_id = $1`;
  const params = [req.user.id];
  if (project_id) { sql += ` AND pr.project_id = $${params.length + 1}`; params.push(project_id); }
  if (status) { sql += ` AND pr.status = $${params.length + 1}`; params.push(status); }
  sql += ' ORDER BY pr.created_at DESC';
  res.json({ proposals: await db.many(sql, params) });
});

router.get('/proposals/:id', async (req, res) => {
  const row = await db.one('SELECT * FROM proposals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ proposal: row });
});

router.patch('/proposals/:id', async (req, res) => {
  const { status, content } = req.body;
  const sets = []; const vals = [req.params.id, req.user.id];
  if (status) { sets.push(`status = $${vals.length + 1}`); vals.push(status); }
  if (content) { sets.push(`content = $${vals.length + 1}`); vals.push(JSON.stringify(content)); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  const row = await db.one(`UPDATE proposals SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`, vals);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ proposal: row });
});

router.delete('/proposals/:id', async (req, res) => {
  const result = await db.query('DELETE FROM proposals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

// === INVOICES ===
router.get('/invoices', async (req, res) => {
  const { project_id, status } = req.query;
  let sql = `SELECT i.*, p.name AS project_name, c.name AS client_name, c.email AS client_email
    FROM invoices i JOIN projects p ON i.project_id = p.id LEFT JOIN clients c ON p.client_id = c.id
    WHERE i.user_id = $1`;
  const params = [req.user.id];
  if (project_id) { sql += ` AND i.project_id = $${params.length + 1}`; params.push(project_id); }
  if (status) { sql += ` AND i.status = $${params.length + 1}`; params.push(status); }
  sql += ' ORDER BY i.created_at DESC';
  res.json({ invoices: await db.many(sql, params) });
});

router.get('/invoices/:id', async (req, res) => {
  const row = await db.one(
    `SELECT i.*, p.name AS project_name, c.name AS client_name, c.email AS client_email
     FROM invoices i JOIN projects p ON i.project_id = p.id LEFT JOIN clients c ON p.client_id = c.id
     WHERE i.id = $1 AND i.user_id = $2`, [req.params.id, req.user.id]
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ invoice: row });
});

router.patch('/invoices/:id', async (req, res) => {
  const { status, line_items, total_cents, due_date } = req.body;
  const sets = []; const vals = [req.params.id, req.user.id];
  if (status) { sets.push(`status = $${vals.length + 1}`); vals.push(status); }
  if (line_items) { sets.push(`line_items = $${vals.length + 1}`); vals.push(JSON.stringify(line_items)); }
  if (total_cents !== undefined) { sets.push(`total_cents = $${vals.length + 1}`); vals.push(total_cents); }
  if (due_date) { sets.push(`due_date = $${vals.length + 1}`); vals.push(due_date); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  const row = await db.one(`UPDATE invoices SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`, vals);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ invoice: row });
});

router.delete('/invoices/:id', async (req, res) => {
  const result = await db.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

// === CONTRACTS ===
router.get('/contracts', async (req, res) => {
  const { project_id } = req.query;
  let sql = `SELECT ct.*, p.name AS project_name, c.name AS client_name
    FROM contracts ct JOIN projects p ON ct.project_id = p.id LEFT JOIN clients c ON p.client_id = c.id
    WHERE ct.user_id = $1`;
  const params = [req.user.id];
  if (project_id) { sql += ` AND ct.project_id = $${params.length + 1}`; params.push(project_id); }
  sql += ' ORDER BY ct.created_at DESC';
  res.json({ contracts: await db.many(sql, params) });
});

router.get('/contracts/:id', async (req, res) => {
  const row = await db.one('SELECT * FROM contracts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ contract: row });
});

router.patch('/contracts/:id', async (req, res) => {
  const { status, content } = req.body;
  const sets = []; const vals = [req.params.id, req.user.id];
  if (status) { sets.push(`status = $${vals.length + 1}`); vals.push(status); }
  if (content) { sets.push(`content = $${vals.length + 1}`); vals.push(JSON.stringify(content)); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  const row = await db.one(`UPDATE contracts SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`, vals);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ contract: row });
});

router.delete('/contracts/:id', async (req, res) => {
  const result = await db.query('DELETE FROM contracts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

// === SCOPE EVENTS ===
router.get('/scope-events', async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });
  const events = await db.many(
    `SELECT se.*, p.name AS project_name FROM scope_events se JOIN projects p ON se.project_id = p.id
     WHERE se.user_id = $1 AND se.project_id = $2 ORDER BY se.created_at DESC`,
    [req.user.id, project_id]
  );
  res.json({ scope_events: events });
});

router.delete('/scope-events/:id', async (req, res) => {
  const result = await db.query('DELETE FROM scope_events WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

// === AGENT LOGS ===
router.get('/agent-logs', async (req, res) => {
  const { agent, project_id, limit } = req.query;
  let sql = `SELECT al.id, al.agent, al.project_id, p.name AS project_name, al.model, al.input_tokens, al.output_tokens, al.duration_ms, al.created_at
    FROM agent_logs al LEFT JOIN projects p ON al.project_id = p.id
    WHERE al.user_id = $1`;
  const params = [req.user.id];
  if (agent) { sql += ` AND al.agent = $${params.length + 1}`; params.push(agent); }
  if (project_id) { sql += ` AND al.project_id = $${params.length + 1}`; params.push(project_id); }
  sql += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
  params.push(Math.min(parseInt(limit) || 50, 100));
  const logs = await db.many(sql, params);

  // Compute summary stats
  const totalTokens = logs.reduce((s, l) => s + (l.input_tokens || 0) + (l.output_tokens || 0), 0);
  const totalDuration = logs.reduce((s, l) => s + (l.duration_ms || 0), 0);
  const agentCounts = {};
  for (const l of logs) { agentCounts[l.agent] = (agentCounts[l.agent] || 0) + 1; }

  res.json({ logs, summary: { total_logs: logs.length, total_tokens: totalTokens, total_duration_ms: totalDuration, agent_counts: agentCounts } });
});

export default router;
