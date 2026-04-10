import { Router } from 'express';
import db from '../db.js';
import { validate } from '../middleware/validate.js';
import { rejectMilestoneSchema } from '../schemas/index.js';

const router = Router();

// Resolve and validate a portal share token
const resolveToken = async (token) => {
  const row = await db.one(
    `SELECT st.project_id, st.user_id, st.client_name, st.expires_at,
            p.name AS project_name, p.status AS project_status,
            u.name AS freelancer_name, u.business_name
     FROM share_tokens st
     JOIN projects p ON st.project_id = p.id
     JOIN users u ON st.user_id = u.id
     WHERE st.token = $1`,
    [token]
  );
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  return row;
};

// Get portal data (public, no auth)
router.get('/:token', async (req, res) => {
  const portal = await resolveToken(req.params.token);
  if (!portal) return res.status(404).json({ error: 'Invalid or expired link' });

  const milestones = await db.many(
    `SELECT id, title, description, amount_cents, position, approval_type, status, completed_at, approved_at, rejection_reason, created_at
     FROM milestones WHERE project_id = $1 ORDER BY position ASC`,
    [portal.project_id]
  );

  const approved = milestones.filter((m) => m.status === 'approved').length;

  res.json({
    project_name: portal.project_name,
    freelancer_name: portal.freelancer_name,
    business_name: portal.business_name,
    client_name: portal.client_name,
    milestones,
    progress: { total: milestones.length, approved }
  });
});

// Client approves a milestone
router.post('/:token/milestones/:id/approve', async (req, res) => {
  const portal = await resolveToken(req.params.token);
  if (!portal) return res.status(404).json({ error: 'Invalid or expired link' });

  const milestone = await db.one(
    'SELECT * FROM milestones WHERE id = $1 AND project_id = $2',
    [req.params.id, portal.project_id]
  );
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
  if (milestone.status !== 'completed') {
    return res.status(400).json({ error: 'Only completed milestones can be approved' });
  }

  const updated = await db.one(
    `UPDATE milestones SET status = 'approved', approved_at = now() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );

  // Auto-activate next pending milestone
  await db.query(
    `UPDATE milestones SET status = 'active'
     WHERE project_id = $1 AND status = 'pending'
     AND position = (SELECT MIN(position) FROM milestones WHERE project_id = $1 AND status = 'pending')`,
    [portal.project_id]
  );

  res.json({ milestone: updated });
});

// Client rejects a milestone
router.post('/:token/milestones/:id/reject', validate(rejectMilestoneSchema), async (req, res) => {
  const portal = await resolveToken(req.params.token);
  if (!portal) return res.status(404).json({ error: 'Invalid or expired link' });

  const milestone = await db.one(
    'SELECT * FROM milestones WHERE id = $1 AND project_id = $2',
    [req.params.id, portal.project_id]
  );
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
  if (milestone.status !== 'completed') {
    return res.status(400).json({ error: 'Only completed milestones can be rejected' });
  }

  const updated = await db.one(
    `UPDATE milestones SET status = 'active', rejection_reason = $2, completed_at = NULL WHERE id = $1 RETURNING *`,
    [req.params.id, req.validated.reason]
  );
  res.json({ milestone: updated });
});

export default router;
