import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createClientSchema, updateClientSchema } from '../schemas/index.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const clients = await db.many('SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ clients });
});

router.post('/', validate(createClientSchema), async (req, res) => {
  const { name, email, company, notes } = req.validated;
  const client = await db.one(
    'INSERT INTO clients (user_id, name, email, company, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user.id, name, email || null, company || null, notes || null]
  );
  res.status(201).json({ client });
});

router.patch('/:id', validate(updateClientSchema), async (req, res) => {
  const fields = Object.entries(req.validated).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const sets = fields.map(([k], i) => `${k} = $${i + 3}`).join(', ');
  const values = fields.map(([, v]) => v);

  const client = await db.one(
    `UPDATE clients SET ${sets} WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.id, ...values]
  );
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ client });
});

router.delete('/:id', async (req, res) => {
  const result = await db.query('DELETE FROM clients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
  res.json({ deleted: true });
});

export default router;
