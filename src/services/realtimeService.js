// Propagación en tiempo real entre pestañas (modo offline).
//
// Usa BroadcastChannel; si no está disponible, cae al evento `storage`, que
// también atraviesa pestañas cuando otra escribe en localStorage. Este
// servicio implementa el CONTRATO local de la capa de colaboración: el backend
// real (WebSocket/SSE) debe exponer las mismas funciones `broadcast`/`subscribe`
// (ver docs/backend-plan.md).

const CHANNEL_NAME = 'gantter.sync.v1';
const STORAGE_KEY_PREFIX = 'gantter.project';

const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

export const RealtimeService = {
  canUseBC: channel !== null,

  broadcast(payload) {
    if (channel) {
      channel.postMessage(payload);
      return true;
    }
    return false;
  },

  subscribe(handler) {
    if (channel) {
      const listener = (event) => handler(event.data);
      channel.addEventListener('message', listener);
      return () => channel.removeEventListener('message', listener);
    }
    const storageListener = (event) => {
      if (!event.key || !event.key.startsWith(STORAGE_KEY_PREFIX) || !event.newValue) return;
      try {
        handler({ source: 'storage', project: JSON.parse(event.newValue) });
      } catch {
        /* doc parcialmente escrito: ignorar */
      }
    };
    window.addEventListener('storage', storageListener);
    return () => window.removeEventListener('storage', storageListener);
  },
};

export default RealtimeService;