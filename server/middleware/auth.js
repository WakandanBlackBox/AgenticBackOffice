import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET environment variable is required');

export const TOKEN_COOKIE_NAME = 'token';

export function requireAuth(req, res, next) {
  // Cookie is the canonical source. Bearer header kept as a fallback so
  // server-to-server calls (and tests) still work; not exposed to the SPA.
  const cookieToken = req.cookies?.[TOKEN_COOKIE_NAME];
  const header = req.headers.authorization;
  const token = cookieToken || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, { path: '/' });
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    SECRET,
    { expiresIn: '7d' }
  );
}
