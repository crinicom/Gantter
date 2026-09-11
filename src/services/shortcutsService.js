// Accesos directos (§12 Shortcut): enlaces externos por proyecto (Figma, Jira,
// etc.) que la pestaña "Accesos directos" muestra como grid de iconos.

export const SHORTCUTS_MAX = 30;

// Nombre visible derivado de la URL: hostname limpio (sin www).
export function labelForUrl(rawUrl) {
  try {
    const host = new URL(String(rawUrl || '').trim()).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Normaliza lo que pega el usuario: recorta, auto-prepende https:// si no trae
// scheme y valida que sea http/https (bloquea javascript:, data:, etc.).
// Devuelve null si no queda una URL http(s) válida.
export function normalizeUrl(raw) {
  const input = String(raw || '').trim();
  if (!input) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname) return null;
  return parsed.href;
}

export function defaultShortcuts() {
  return [];
}

export function normalizeShortcut(shortcut) {
  const url = typeof shortcut?.url === 'string' ? shortcut.url : '';
  const derived = labelForUrl(url);
  return {
    id: shortcut?.id ?? null,
    url,
    label:
      typeof shortcut?.label === 'string' && shortcut.label.trim()
        ? shortcut.label.trim()
        : derived || 'Enlace',
    createdAt: shortcut?.createdAt ?? null,
  };
}