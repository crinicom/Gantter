import { hasGoogleCredentials, isServerMode } from '../config/appConfig';
import { ACTIVE_USER } from '../constants/project';

const MOCK_USER = ACTIVE_USER;

// Catálogo de identidades disponibles para simular el uso simultáneo:
// cada pestaña puede "entrar como" un usuario distinto. Alineado con el seed.
export const DEFAULT_COLLAB_USERS = [
  ACTIVE_USER,
  { id: 'u_martin', name: 'Martín Vega', email: 'martin@rio.local', picture: null },
  { id: 'u_ana', name: 'Ana Soler', email: 'ana@rio.local', picture: null },
  { id: 'u_sofia', name: 'Sofía Chen', email: 'sofia@rio.local', picture: null },
  { id: 'u_diego', name: 'Diego Palacios', email: 'diego@rio.local', picture: null },
];

// sessionStorage: cada pestaña mantiene su propia identidad (una pestaña = un
// usuario). Con un backend real esto se sustituye por la sesión OAuth/JWT.
const AUTH_KEY = 'gantter.auth.mock.v1';

export const AuthService = {
  async getCurrentUser() {
    if (isServerMode()) {
      const { default: serverAuth } = await import('./serverAuth');
      return serverAuth.getCurrentUser();
    }
    if (hasGoogleCredentials()) {
      // Modo Drive: delegar en la implementación GIS (authServiceDrive).
      // Por ahora devuelve null para forzar el login en el modo real.
      try {
        const driveAuth = await import('./authServiceDrive');
        return driveAuth.getCurrentUser();
      } catch {
        return null;
      }
    }
    const stored = sessionStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  async login() {
    if (isServerMode()) {
      const { default: serverAuth } = await import('./serverAuth');
      return serverAuth.login();
    }
    if (hasGoogleCredentials()) {
      const driveAuth = await import('./authServiceDrive');
      return driveAuth.login();
    }
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(MOCK_USER));
    return MOCK_USER;
  },

  async logout() {
    if (isServerMode()) {
      const { default: serverAuth } = await import('./serverAuth');
      return serverAuth.logout();
    }
    if (hasGoogleCredentials()) {
      const driveAuth = await import('./authServiceDrive');
      await driveAuth.logout();
      return;
    }
    sessionStorage.removeItem(AUTH_KEY);
  },

  // Cambia la identidad de la pestaña actual (simulación multiusuario).
  // Si el miembro estaba invitado, pasa a activo al entrar como él.
  switchTo(user) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  },
};