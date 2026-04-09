import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/index.js';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password, name, business_name, hourly_rate_cents } = req.validated;

  const existing = await db.one('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const user = await db.one(
    'INSERT INTO users (email, password_hash, name, business_name, hourly_rate_cents) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name',
    [email, hash, name, business_name || null, hourly_rate_cents || null]
  );

  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated;

  const user = await db.one('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { password_hash, ...safe } = user;
  res.json({ token: signToken(safe), user: safe });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.one(
    'SELECT id, email, name, business_name, hourly_rate_cents, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

export default router;
