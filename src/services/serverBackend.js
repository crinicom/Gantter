import { apiBase } from '../config/appConfig';
import { mergeProjects } from '../utils/collab';

const URL = (p) => `${apiBase()}/api${p}`;

async function request(path, { method = 'GET', body, headers, signal } = {}) {
  const res = await fetch(URL(path), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (res.status === 401) {
    throw new Error('No autenticado');
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// Guarda con CAS: reintenta una vez tras el merge del cliente si hay 409.
async function saveProject(project, { expectedVersion } = {}) {
  let attempt = 0;
  let current = project;
  let base = expectedVersion ?? (project.version || 0);
  while (attempt < 2) {
    const { status, data } = await request(`/projects/${current.id}`, {
      method: 'PUT',
      body: current,
      headers: { 'If-Match': String(base) },
    });
    if (status === 409 && data.remote) {
      // Merge entidad por entidad. Si el remoto no aporta nada nuevo (el server
      // quedó detrás del store optimista), igual se reintenta sobre su version
      // como base: el cliente es más nuevo y gana (LWW), sanando el desync.
      const { project: merged } = mergeProjects(current, data.remote);
      current = merged;
      base = data.remote.version;
      attempt += 1;
      continue;
    }
    if (![200, 201].includes(status)) return false;
    return true;
  }
  return false;
}

export const ServerBackend = {
  name: 'server',

  async loadProjects() {
    try {
      const { ok, data } = await request('/projects');
      return ok && Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async loadProject(projectId) {
    try {
      const { ok, data } = await request(`/projects/${projectId}`);
      return ok ? data : null;
    } catch {
      return null;
    }
  },

  saveProject,

  async deleteProject(projectId) {
    const { ok } = await request(`/projects/${projectId}`, { method: 'DELETE' });
    return ok;
  },

  async createProject({ name, description }) {
    const { ok, data } = await request('/projects', { method: 'POST', body: { name, description } });
    return ok ? data : null;
  },

  async setProjectImage(projectId, image) {
    const form = new FormData();
    const blob = await (await fetch(image)).blob();
    form.append('image', blob, 'cover.jpg');
    const res = await fetch(URL(`/projects/${projectId}/image`), {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : null;
  },

  async sendInvite(projectId, { name, email }) {
    const { ok, data } = await request(`/projects/${projectId}/invites`, {
      method: 'POST',
      body: { name, email },
    });
    return ok ? data : null;
  },

  async acceptInvite(token) {
    const { ok, data } = await request(`/invites/${token}/accept`, { method: 'POST' });
    return ok ? data : null;
  },

  async revokeMember(projectId, memberId) {
    const { ok, data } = await request(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
    return ok ? data : null;
  },
};

export default ServerBackend;
