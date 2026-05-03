import crypto from 'crypto';

// Double-submit cookie CSRF protection. Login emits two cookies:
//   - token       (HttpOnly, Secure)             - the JWT
//   - csrf_token  (readable, Secure, SameSite)   - random value
// Mutating requests must echo csrf_token via X-CSRF-Token header. An
// attacker on another origin cannot read the cookie (SameSite=Strict +
// cross-origin script cannot access it), so cannot forge the matching header.
const CSRF_COOKIE_NAME = 'csrf_token';

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res, value) {
  res.cookie(CSRF_COOKIE_NAME, value, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/register']);

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.has(req.path)) return next();
  if (req.path.startsWith('/api/portal/')) return next();

  const headerToken = req.get('x-csrf-token');
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieToken || headerToken.length !== cookieToken.length) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

export const CSRF_COOKIE = CSRF_COOKIE_NAME;
