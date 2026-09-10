import { describe, it, expect } from 'vitest';
import { renderMarkdownPreview } from '../markdownPreview';

describe('renderMarkdownPreview', () => {
  it('convierte encabezados, listas y negritas básicas', () => {
    const html = renderMarkdownPreview('# Ficha\n\n## Objetivo\n\n- a\n- b\n\n**clave**');
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<li');
    expect(html).toContain('<strong>clave</strong>');
  });

  it('rompe líneas sueltas (breaks) para que los párrafos queden legibles', () => {
    const html = renderMarkdownPreview('Hola\nMundo');
    expect(html).toContain('<br');
  });

  it('quita script/iframe, handlers on* e hrefs javascript:', () => {
    const html = renderMarkdownPreview(
      '<script>alert(1)</script><iframe src="x"></iframe><a href="javascript:alert(1)">x</a><img src="a" onerror="alert(1)"><b onclick="x()">negrita</b>',
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('iframe');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('href="javascript:');
  });

  it('soporta input que no es string (undefined/null)', () => {
    expect(renderMarkdownPreview()).not.toContain('NaN');
    expect(renderMarkdownPreview(null)).not.toContain('null');
  });
});