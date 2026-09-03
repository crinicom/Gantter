import { apiBase } from '../config/appConfig';

const URL = (p) => `${apiBase()}/api${p}`;

async function getCurrentUser() {
  const res = await fetch(URL('/auth/me'), { credentials: 'include' });
  if (res.status === 401) return null;
  const data = await res.json().catch(() => null);
  return data;
}

// Inicia el flujo OAuth de Google server-side; al volver, el SPA recarga.
async function login() {
  window.location.href = URL('/auth/google/start');
  return null;
}

async function logout() {
  await fetch(URL('/auth/logout'), { method: 'POST', credentials: 'include' });
}

export const ServerAuth = { getCurrentUser, login, logout };
export default ServerAuth;
