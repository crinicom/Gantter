import { hasGoogleCredentials } from '../config/appConfig';

const MOCK_USER = {
  id: 'u_demo',
  name: 'Usuario demo',
  email: 'demo@local',
  picture: null,
};

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
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  async login() {
    if (hasGoogleCredentials()) {
      const driveAuth = await import('./authServiceDrive');
      return driveAuth.login();
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(MOCK_USER));
    return MOCK_USER;
  },

  async logout() {
    if (hasGoogleCredentials()) {
      const driveAuth = await import('./authServiceDrive');
      await driveAuth.logout();
      return;
    }
    localStorage.removeItem(AUTH_KEY);
  },
};