import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(requireAuth);

const CATEGORIES = ['payment_pref', 'comm_tone', 'red_flag', 'pricing_history', 'other'];

// =====================================================================
// Validation
// =====================================================================
const createMemorySchema = z.object({
  scope: z.enum(['client', 'workspace']),
  client_id: z.string().uuid().optional(),
  category: z.enum(CATEGORIES),
  key: z.string().min(1).max(120),
  value: z.string().min(1).max(120),
  confidence: z.number().min(0).max(1).optional()
}).refine(
  (d) => d.scope === 'workspace' || (d.scope === 'client' && d.client_id),
  { message: 'client_id required when scope=client' }
);

const patchMemorySchema = z.object({
  scope: z.enum(['client', 'workspace']),
  status: z.enum(['pending', 'confirmed']).optional(),
  value: z.string().min(1).max(120).optional()
});

// =====================================================================
// GET /api/memory/clients/:client_id — all memory rows for a client
// (both pending and confirmed; ordered newest-first; capped at 50)
// =====================================================================
router.get('/clients/:client_id', async (req, res) => {
  const rows = await db.many(
    `SELECT id, category, key, value, confidence, source, status, created_at, updated_at
       FROM client_memory
      WHERE user_id = $1 AND client_id = $2
      ORDER BY status ASC, updated_at DESC
      LIMIT 50`,
    [req.user.id, req.params.client_id]
  );
  res.json({ memory: rows, count: rows.length });
});

// =====================================================================
// GET /api/memory/workspace — workspace-wide memory rows
// =====================================================================
router.get('/workspace', async (req, res) => {
  const rows = await db.many(
    `SELECT id, category, key, value, confidence, source, status, created_at, updated_at
       FROM workspace_memory
      WHERE user_id = $1
      ORDER BY status ASC, updated_at DESC
      LIMIT 50`,
    [req.user.id]
  );
  res.json({ memory: rows, count: rows.length });
});

// =====================================================================
// GET /api/memory/pending — cross-scope queue of pending owner reviews
// (drives the Memory Drawer count badge in the UI)
// =====================================================================
router.get('/pending', async (req, res) => {
  const rows = await db.many(
    `SELECT 'client' AS scope, cm.id, cm.client_id, c.name AS client_name,
            cm.category, cm.key, cm.value, cm.confidence, cm.source, cm.created_at
       FROM client_memory cm
       LEFT JOIN clients c ON cm.client_id = c.id
      WHERE cm.user_id = $1 AND cm.status = 'pending'
     UNION ALL
     SELECT 'workspace' AS scope, wm.id, NULL::uuid AS client_id, NULL AS client_name,
            wm.category, wm.key, wm.value, wm.confidence, wm.source, wm.created_at
       FROM workspace_memory wm
      WHERE wm.user_id = $1 AND wm.status = 'pending'
      ORDER BY created_at DESC
      LIMIT 100`,
    [req.user.id]
  );
  res.json({ pending: rows, count: rows.length });
});

// =====================================================================
// PATCH /api/memory/:id — promote pending→confirmed, edit value, or both.
// scope must be in body so we know which table to hit (no enumeration).
// =====================================================================
router.patch('/:id', validate(patchMemorySchema), async (req, res) => {
  const { scope, status, value } = req.validated;
  const table = scope === 'client' ? 'client_memory' : 'workspace_memory';

  const sets = [];
  const params = [req.params.id, req.user.id];
  if (status) { params.push(status); sets.push(`status = $${params.length}`); }
  if (value !== undefined) { params.push(value); sets.push(`value = $${params.length}`); }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  sets.push('updated_at = now()');

  const row = await db.one(
    `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2
     RETURNING id, category, key, value, status, source, confidence, updated_at`,
    params
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ memory: row });
});

// =====================================================================
// DELETE /api/memory/:id?scope=client|workspace — drop a fact entirely.
// =====================================================================
router.delete('/:id', async (req, res) => {
  const scope = req.query.scope === 'workspace' ? 'workspace_memory' : 'client_memory';
  const result = await db.query(
    `DELETE FROM ${scope} WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

// =====================================================================
// POST /api/memory — owner-authored fact. status defaults to 'confirmed'
// since the owner is authoritative; source='owner'.
// =====================================================================
router.post('/', validate(createMemorySchema), async (req, res) => {
  const { scope, client_id, category, key, value, confidence } = req.validated;
  if (scope === 'client') {
    const row = await db.one(
      `INSERT INTO client_memory (user_id, client_id, category, key, value, confidence, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'owner', 'confirmed')
       ON CONFLICT (user_id, client_id, category, key)
       DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = 'owner', status = 'confirmed', updated_at = now()
       RETURNING id, category, key, value, status, source`,
      [req.user.id, client_id, category, key, value, confidence ?? null]
    );
    return res.status(201).json({ memory: row });
  }
  const row = await db.one(
    `INSERT INTO workspace_memory (user_id, category, key, value, confidence, source, status)
     VALUES ($1, $2, $3, $4, $5, 'owner', 'confirmed')
     ON CONFLICT (user_id, category, key)
     DO UPDATE SET value = EXCLUDED.value, confidence = EXCLUDED.confidence, source = 'owner', status = 'confirmed', updated_at = now()
     RETURNING id, category, key, value, status, source`,
    [req.user.id, category, key, value, confidence ?? null]
  );
  res.status(201).json({ memory: row });
});

export default router;
