import { hasGoogleCredentials } from '../config/appConfig';

const MOCK_USER = {
  id: 'u_demo',
  name: 'Usuario demo',
  email: 'demo@local',
  picture: null,
};

// Catálogo de identidades disponibles para simular el uso simultáneo:
// cada pestaña puede "entrar como" un usuario distinto.
export const DEFAULT_COLLAB_USERS = [
  MOCK_USER,
  { id: 'u_ana', name: 'Ana García', email: 'ana@local', picture: null },
  { id: 'u_carlos', name: 'Carlos Pérez', email: 'carlos@local', picture: null },
  { id: 'u_lucia', name: 'Lucía Fernández', email: 'lucia@local', picture: null },
];

// sessionStorage: cada pestaña mantiene su propia identidad (una pestaña = un
// usuario). Con un backend real esto se sustituye por la sesión OAuth/JWT.
const AUTH_KEY = 'gantter.auth.mock.v1';

export const AuthService = {
  async getCurrentUser() {
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
    if (hasGoogleCredentials()) {
      const driveAuth = await import('./authServiceDrive');
      return driveAuth.login();
    }
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(MOCK_USER));
    return MOCK_USER;
  },

  async logout() {
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