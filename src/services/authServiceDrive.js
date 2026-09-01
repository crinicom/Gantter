// Implementación real de autenticación con Google Identity Services (GIS).
// Este módulo es el "punto de inserción" para el modo Drive.
// Sin credenciales configuradas (VITE_GOOGLE_CLIENT_ID / APP_ID), la app
// opera en modo offline con el mock de `authService.js`.

let currentTokenClient = null;

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve(window.google);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function getTokenClient() {
  if (currentTokenClient) return currentTokenClient;
  const { APP_CONFIG } = await import('../config/appConfig');
  const gsi = await loadGsiScript();
  currentTokenClient = gsi.accounts.oauth2.initTokenClient({
    client_id: APP_CONFIG.google.clientId,
    scope: 'https://www.googleapis.com/auth/drive.file openid email profile',
    callback: () => {},
  });
  return currentTokenClient;
}

export async function login() {
  const client = await getTokenClient();
  const token = await new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error) reject(new Error(resp.error_description || 'Error de autenticación'));
      else resolve(resp.access_token);
    };
    client.requestAccessToken();
  });
  return getUserFromToken(token);
}

async function getUserFromToken(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await res.json();
  return {
    id: profile.sub,
    name: profile.name,
    email: profile.email,
    picture: profile.picture,
    accessToken,
  };
}

export async function getCurrentUser() {
  const { APP_CONFIG } = await import('../config/appConfig');
  const gsi = await loadGsiScript();
  return new Promise((resolve) => {
    gsi.accounts.id.initialize({
      client_id: APP_CONFIG.google.clientId,
      callback: () => {},
    });
    gsi.accounts.id.prompt(
      (notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          resolve(null);
        }
      },
    );
  });
}

export async function logout() {
  const { APP_CONFIG } = await import('../config/appConfig');
  const client = await getTokenClient();
  try {
    const token = client.access_token;
    if (token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`);
    }
  } catch {
    /* ignorar errores de revocación */
  }
  void APP_CONFIG;
}