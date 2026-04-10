import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createProjectSchema, updateProjectSchema } from '../schemas/index.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { client_id, status } = req.query;
  let sql = 'SELECT p.*, c.name AS client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.user_id = $1';
  const params = [req.user.id];

  if (client_id) { sql += ` AND p.client_id = $${params.length + 1}`; params.push(client_id); }
  if (status) { sql += ` AND p.status = $${params.length + 1}`; params.push(status); }
  sql += ' ORDER BY p.created_at DESC';

  const projects = await db.many(sql, params);
  res.json({ projects });
});

router.get('/:id', async (req, res) => {
  const project = await db.one(
    `SELECT p.*, c.name AS client_name, c.email AS client_email
     FROM projects p LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.id = $1 AND p.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const [proposals, invoices, contracts, scopeEvents] = await Promise.all([
    db.many('SELECT id, content, status, created_at FROM proposals WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC', [req.params.id, req.user.id]),
    db.many('SELECT id, line_items, total_cents, status, due_date, created_at FROM invoices WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC', [req.params.id, req.user.id]),
    db.many('SELECT id, content, flags, status, created_at FROM contracts WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC', [req.params.id, req.user.id]),
    db.many('SELECT id, event_type, description, estimated_cost_cents, created_at FROM scope_events WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 20', [req.params.id, req.user.id])
  ]);

  res.json({ project, proposals, invoices, contracts, scope_events: scopeEvents });
});

router.post('/', validate(createProjectSchema), async (req, res) => {
  const { client_id, name, description, budget_cents, scope_summary, start_date, end_date } = req.validated;
  const project = await db.one(
    `INSERT INTO projects (user_id, client_id, name, description, budget_cents, scope_summary, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.user.id, client_id || null, name, description || null, budget_cents || null, scope_summary || null, start_date || null, end_date || null]
  );
  res.status(201).json({ project });
});

router.patch('/:id', validate(updateProjectSchema), async (req, res) => {
  const fields = Object.entries(req.validated).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const sets = fields.map(([k], i) => `${k} = $${i + 3}`).join(', ');
  const values = fields.map(([, v]) => v);

  const project = await db.one(
    `UPDATE projects SET ${sets} WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.id, ...values]
  );
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
});

export default router;
