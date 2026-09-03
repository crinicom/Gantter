import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';

export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta JWT_SECRET en el entorno');
  return new TextEncoder().encode(secret);
}

export function signSession(user) {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtSecret());
}

export async function verifySession(token) {
  const { payload } = await jwtVerify(token, jwtSecret());
  return payload;
}

export function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

export const SESSION_COOKIE = 'gantter_session';
export const getCookieName = () => SESSION_COOKIE;
