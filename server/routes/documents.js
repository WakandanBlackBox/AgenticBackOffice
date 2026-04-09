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

// === AGENT LOGS ===
router.get('/agent-logs', async (req, res) => {
  const { agent, project_id, limit } = req.query;
  let sql = 'SELECT id, agent, project_id, model, input_tokens, output_tokens, duration_ms, created_at FROM agent_logs WHERE user_id = $1';
  const params = [req.user.id];
  if (agent) { sql += ` AND agent = $${params.length + 1}`; params.push(agent); }
  if (project_id) { sql += ` AND project_id = $${params.length + 1}`; params.push(project_id); }
  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(parseInt(limit) || 50);
  res.json({ logs: await db.many(sql, params) });
});

export default router;
