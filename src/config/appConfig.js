export const APP_CONFIG = {
  mode: import.meta.env.VITE_APP_MODE || 'offline',
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
    appId: import.meta.env.VITE_GOOGLE_APP_ID || '',
  },
  apiBase: import.meta.env.VITE_API_BASE || '',
  storageKey: 'gantter.project.v2',
  syncDebounceMs: Number(import.meta.env.VITE_SYNC_DEBOUNCE_MS) || 2000,
};

export const APP_MODE = {
  OFFLINE: 'offline',
  DRIVE: 'drive',
  SERVER: 'server',
};

export const isDriveMode = () => APP_CONFIG.mode === APP_MODE.DRIVE;
export const isServerMode = () => APP_CONFIG.mode === APP_MODE.SERVER;
export const isOfflineMode = () => APP_CONFIG.mode === APP_MODE.OFFLINE;
export const apiBase = () => APP_CONFIG.apiBase || '';
export const hasGoogleCredentials = () =>
  Boolean(APP_CONFIG.google.clientId && APP_CONFIG.google.appId);