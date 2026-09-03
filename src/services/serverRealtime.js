import { apiBase } from '../config/appConfig';

const URL = (p) => `${apiBase()}/api${p}`;

// Implementación de la capa de colaboración sobre SSE del backend real.
// Mantiene el mismo contrato de RealtimeService (subscribe/broadcast) con
// payload { type, projectId, project }. El broadcast es local "no-op": es el
// servidor quien reenvía los cambios a los suscriptores del canal.

const activeConnections = new Map(); // projectId -> EventSource
const listeners = new Map(); // projectId -> Set<handler>

function urlFor(projectId) {
  const base = URL('/realtime');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}projectId=${encodeURIComponent(projectId)}`;
}

function connect(projectId) {
  const es = new EventSource(urlFor(projectId), { withCredentials: true });
  activeConnections.set(projectId, es);
  es.onmessage = (event) => {
    if (!event.data || event.data === 'ping') return;
    try {
      const payload = JSON.parse(event.data);
      const handlers = listeners.get(projectId);
      if (!handlers) return;
      for (const handler of handlers) handler(payload);
    } catch {
      /* payload inválido: ignorar */
    }
  };
  es.onerror = () => {
    // EventSource se reconecta automáticamente; cerramos limpiamente si el
    // server dejó de responder.
  };
}

function close(projectId) {
  const es = activeConnections.get(projectId);
  if (es) {
    es.close();
    activeConnections.delete(projectId);
  }
}

export const ServerRealtime = {
  subscribe(projectId, handler) {
    if (!listeners.has(projectId)) {
      listeners.set(projectId, new Set());
      connect(projectId);
    }
    listeners.get(projectId).add(handler);
    return () => {
      const set = listeners.get(projectId);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        close(projectId);
        listeners.delete(projectId);
      }
    };
  },
};

export default ServerRealtime;
