import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import agentRoutes from './routes/agents.js';
import documentRoutes from './routes/documents.js';
import dashboardRoutes from './routes/dashboard.js';
import milestoneRoutes from './routes/milestones.js';
import clientPortalRoutes from './routes/client-portal.js';
import draftsRoutes from './routes/drafts.js';
import memoryRoutes from './routes/memory.js';
import { csrfProtection } from './middleware/csrf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  // 'unsafe-inline' for styles is required because the SPA uses inline
  // style={...} heavily; remove once styling moves to CSS classes.
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://api.anthropic.com'],
      'frame-ancestors': ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(csrfProtection);

// Rate limiters. Tests share one process so a 5/min ceiling makes the suite
// flaky; under NODE_ENV=test the limiter becomes a no-op pass-through.
const skipLimits = process.env.NODE_ENV === 'test';
const passthrough = (_req, _res, next) => next();
const authLimiter = skipLimits ? passthrough : rateLimit({ windowMs: 60_000, max: 5, message: { error: 'Too many attempts' } });
const agentLimiter = skipLimits ? passthrough : rateLimit({ windowMs: 60_000, max: process.env.NODE_ENV === 'production' ? 10 : 50, message: { error: 'Agent rate limit reached' } });
const generalLimiter = skipLimits ? passthrough : rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Rate limit reached' } });

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/agents', agentLimiter, agentRoutes);
app.use('/api/clients', generalLimiter, clientRoutes);
app.use('/api/projects', generalLimiter, projectRoutes);
app.use('/api/documents', generalLimiter, documentRoutes);
app.use('/api/dashboard', generalLimiter, dashboardRoutes);
app.use('/api/milestones', generalLimiter, milestoneRoutes);
app.use('/api/portal', generalLimiter, clientPortalRoutes);
app.use('/api/drafts', generalLimiter, draftsRoutes);
app.use('/api/memory', generalLimiter, memoryRoutes);

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

// Only listen when invoked directly (not when imported by tests).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
