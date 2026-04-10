import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createMilestoneSchema, updateMilestoneSchema, createShareTokenSchema } from '../schemas/index.js';

const router = Router();

router.use(requireAuth);

// List milestones for a project
router.get('/', async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  const project = await db.one('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [project_id, req.user.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const milestones = await db.many(
    'SELECT id, title, description, amount_cents, position, approval_type, status, completed_at, approved_at, rejection_reason, created_at FROM milestones WHERE project_id = $1 AND user_id = $2 ORDER BY position ASC',
    [project_id, req.user.id]
  );
  res.json({ milestones });
});

// Create milestone
router.post('/', validate(createMilestoneSchema), async (req, res) => {
  const { project_id, title, description, amount_cents, approval_type, position } = req.validated;

  const project = await db.one('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [project_id, req.user.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const milestone = await db.one(
    `INSERT INTO milestones (project_id, user_id, title, description, amount_cents, approval_type, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [project_id, req.user.id, title, description || null, amount_cents || 0, approval_type, position]
  );
  res.status(201).json({ milestone });
});

// Update milestone
router.patch('/:id', validate(updateMilestoneSchema), async (req, res) => {
  const fields = Object.entries(req.validated).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const sets = fields.map(([k], i) => `${k} = $${i + 3}`).join(', ');
  const values = fields.map(([, v]) => v);

  const milestone = await db.one(
    `UPDATE milestones SET ${sets} WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.id, ...values]
  );
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
  res.json({ milestone });
});

// Delete milestone (only if pending)
router.delete('/:id', async (req, res) => {
  const milestone = await db.one(
    'DELETE FROM milestones WHERE id = $1 AND user_id = $2 AND status = $3 RETURNING id',
    [req.params.id, req.user.id, 'pending']
  );
  if (!milestone) return res.status(404).json({ error: 'Milestone not found or not deletable' });
  res.json({ deleted: true });
});

// Freelancer marks milestone complete
router.post('/:id/complete', async (req, res) => {
  const milestone = await db.one(
    'SELECT * FROM milestones WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

  if (milestone.status !== 'active' && milestone.status !== 'pending') {
    return res.status(400).json({ error: 'Milestone must be active or pending to complete' });
  }

  // Check sequential ordering: all prior milestones must be approved
  const prior = await db.one(
    `SELECT COUNT(*) AS count FROM milestones
     WHERE project_id = $1 AND user_id = $2 AND position < $3 AND status != 'approved'`,
    [milestone.project_id, req.user.id, milestone.position]
  );
  if (parseInt(prior.count) > 0) {
    return res.status(400).json({ error: 'Prior milestones must be approved first' });
  }

  // Auto-approve if approval_type is 'auto', otherwise mark as completed (awaiting client)
  if (milestone.approval_type === 'auto') {
    const updated = await db.one(
      `UPDATE milestones SET status = 'approved', completed_at = now(), approved_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    // Auto-activate next pending milestone
    await db.query(
      `UPDATE milestones SET status = 'active'
       WHERE project_id = $1 AND status = 'pending'
       AND position = (SELECT MIN(position) FROM milestones WHERE project_id = $1 AND status = 'pending')`,
      [milestone.project_id]
    );
    return res.json({ milestone: updated, auto_approved: true });
  }

  const updated = await db.one(
    `UPDATE milestones SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json({ milestone: updated });
});

// Activate a milestone (set to active from pending)
router.post('/:id/activate', async (req, res) => {
  const milestone = await db.one(
    'SELECT * FROM milestones WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
  if (milestone.status !== 'pending') return res.status(400).json({ error: 'Only pending milestones can be activated' });

  const updated = await db.one(
    `UPDATE milestones SET status = 'active' WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json({ milestone: updated });
});

// Create share token for a project
router.post('/share', validate(createShareTokenSchema), async (req, res) => {
  const { project_id, client_name, expires_days } = req.validated;

  const project = await db.one('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [project_id, req.user.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000);

  const shareToken = await db.one(
    `INSERT INTO share_tokens (project_id, user_id, token, client_name, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [project_id, req.user.id, token, client_name || null, expiresAt]
  );
  res.status(201).json({ share_token: shareToken, url: `/portal/${token}` });
});

// List share tokens for a project
router.get('/share', async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  const tokens = await db.many(
    'SELECT id, token, client_name, expires_at, created_at FROM share_tokens WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC',
    [project_id, req.user.id]
  );
  res.json({ share_tokens: tokens });
});

export default router;
