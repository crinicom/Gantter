import { verifySession, getCookieName } from '../services/tokens.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[getCookieName()] || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const payload = await verifySession(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    req.authToken = token;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}
