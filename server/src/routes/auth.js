import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db.js';
import { signSession, getCookieName } from '../services/tokens.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI');
  }
  return { clientId, clientSecret, redirectUri };
}

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

// GET /api/auth/google/start -> inicia el flujo con PKCE y redirige a Google.
router.get('/auth/google/start', (req, res) => {
  const { clientId, redirectUri } = googleConfig();
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  res.cookie('pkce_verifier', verifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
  });
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
  });
  res.redirect(`${AUTH_ENDPOINT}?${params.toString()}`);
});

// GET /api/auth/google/callback -> intercambia el code y emite JWT.
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const expectedState = req.cookies?.oauth_state;
    const verifier = req.cookies?.pkce_verifier;
    res.clearCookie('oauth_state');
    res.clearCookie('pkce_verifier');

    if (error) throw new Error(`Google error: ${error}`);
    if (!state || state !== expectedState) throw new Error('state no coincide');
    if (!code || !verifier) throw new Error('Falta code o verifier');

    const { clientId, clientSecret, redirectUri } = googleConfig();

    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) {
      throw new Error(token.error_description || 'No se pudo intercambiar el code');
    }

    const infoRes = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await infoRes.json();
    if (!profile.sub) throw new Error('No se pudo obtener el perfil');

    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, email, name, picture, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET name = excluded.name, picture = excluded.picture`,
    ).run(profile.sub, profile.email, profile.name || '', profile.picture || null, now);

    const sessionToken = await signSession({
      id: profile.sub,
      email: profile.email,
      name: profile.name || '',
    });
    res.cookie(getCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.APP_BASE_URL || '/');
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error en la autenticación' });
  }
});

// GET /api/auth/me -> devuelve el usuario actual.
router.get('/auth/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie(getCookieName());
  res.json({ ok: true });
});

export default router;
