import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import agentRoutes from './routes/agents.js';
import documentRoutes from './routes/documents.js';
import dashboardRoutes from './routes/dashboard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 60_000, max: 5, message: { error: 'Too many attempts' } });
const agentLimiter = rateLimit({ windowMs: 60_000, max: process.env.NODE_ENV === 'production' ? 10 : 50, message: { error: 'Agent rate limit reached' } });
const generalLimiter = rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Rate limit reached' } });

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/agents', agentLimiter, agentRoutes);
app.use('/api/clients', generalLimiter, clientRoutes);
app.use('/api/projects', generalLimiter, projectRoutes);
app.use('/api/documents', generalLimiter, documentRoutes);
app.use('/api/dashboard', generalLimiter, dashboardRoutes);

// Serve React in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
