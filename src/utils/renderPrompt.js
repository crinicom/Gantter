// Render de templates markdown de Maia (`maia/`). Las líneas que arrancan con
// `#` son comentarios editables (nunca llegan al prompt); los `{vars}` se
// rellenan con datos del tablero. `sectionText` extrae una sección `## clave`.

const TOKEN_RE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

export function stripComments(template) {
  return String(template ?? '')
    .split(/\r?\n/)
    .filter((line) => !/^\s*#(?!\s*#)/.test(line))
    .join('\n');
}

export function collectTokens(template) {
  const tokens = new Set();
  for (const match of stripComments(template).matchAll(TOKEN_RE)) {
    tokens.add(match[1]);
  }
  return tokens;
}

export function renderPrompt(template, vars = {}) {
  return stripComments(template)
    .replace(TOKEN_RE, (raw, key) => {
      const value = vars[key];
      return value === undefined || value === null ? raw : String(value);
    })
    .trim();
}

export function sectionText(template, heading) {
  const lines = stripComments(template).split(/\r?\n/);
  let inSection = false;
  const body = [];
  for (const line of lines) {
    const header = line.match(/^##\s+(.+)$/);
    if (header) {
      inSection = header[1].trim() === heading;
      continue;
    }
    if (inSection) body.push(line.trim());
  }
  return body.filter(Boolean).join(' ');
}