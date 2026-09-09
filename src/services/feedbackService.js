import { isServerMode, apiBase } from '../config/appConfig';

const PENDING_KEY = 'gantter.feedback.pending.v1';
const LOCAL_KEY = 'gantter.feedback.v1';

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeJSON(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// Refleja la entrada en `feedback/inbox.jsonl` via el middleware del dev server
// (`POST /dev/feedback`), la fuente que el agente lee en cada planning. Se envía
// en cualquier modo: en dev (server u offline) el middleware responde; si no hay
// dev server o da 404 (prod/build), falla a silencio.
async function pushToDevInbox(entry) {
  try {
    const res = await fetch('/dev/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const feedbackService = {
  async submitFeedback({ type, message, screen, systemState, user }) {
    const entry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type,
      message,
      screen,
      systemState,
      author: user ? { id: user.id, name: user.name, email: user.email } : null,
    };

    // El dev server (`.env` con VITE_APP_MODE) corre en modo server; sea cual sea
    // el modo, el comentario tambien va al inbox del agente (fire-and-forget).
    void pushToDevInbox(entry);

    if (!isServerMode()) {
      const list = readJSON(LOCAL_KEY);
      list.unshift(entry);
      writeJSON(LOCAL_KEY, list);
      return { ok: true, local: true };
    }

    try {
      const res = await fetch(`${apiBase()}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, message, screen, systemState }),
      });
      if (!res.ok) {
        const pending = readJSON(PENDING_KEY);
        pending.unshift(entry);
        writeJSON(PENDING_KEY, pending);
        return { ok: false, queued: true };
      }
      return { ok: true };
    } catch {
      const pending = readJSON(PENDING_KEY);
      pending.unshift(entry);
      writeJSON(PENDING_KEY, pending);
      return { ok: false, queued: true };
    }
  },

  async listFeedback() {
    if (!isServerMode()) {
      return readJSON(LOCAL_KEY);
    }
    try {
      const res = await fetch(`${apiBase()}/api/feedback`, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async flushPending() {
    if (!isServerMode()) return;
    const pending = readJSON(PENDING_KEY);
    if (pending.length === 0) return;
    const remaining = [];
    for (const entry of pending) {
      try {
        const res = await fetch(`${apiBase()}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: entry.type,
            message: entry.message,
            screen: entry.screen,
            systemState: entry.systemState,
          }),
        });
        if (!res.ok) remaining.push(entry);
      } catch {
        remaining.push(entry);
      }
    }
    writeJSON(PENDING_KEY, remaining);
  },
};
