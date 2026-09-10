// Preview de markdown para la pestaña "Información del proyecto" (§12). El
// contenido vive en el proyecto (documentos del usuario), no se renderiza HTML
// arbitrario: se analiza con `marked` y se quitan script/iframe, handlers de
// eventos e hrefs javascript: antes de inyectarlo en el DOM.

import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

function stripDangerous(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*["']\s*javascript:/gi, '$1="#"');
}

export function renderMarkdownPreview(text) {
  const source = typeof text === 'string' ? text : '';
  const html = marked.parse(source);
  return stripDangerous(typeof html === 'string' ? html : String(html));
}