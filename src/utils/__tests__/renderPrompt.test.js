import { describe, it, expect } from 'vitest';
import { collectTokens, renderPrompt, sectionText, stripComments } from '../renderPrompt';

describe('renderPrompt', () => {
  it('rellena los placeholders y no deja comentarios ni sobrante', () => {
    const tpl = '# comentario que no debe pasar\n«{title}» llevá {since} sin moverse. ¿Sigue?\n';
    expect(stripComments(tpl)).not.toContain('comentario');
    expect(renderPrompt(tpl, { title: 'QA staging release', since: '5 días' })).toBe(
      '«QA staging release» llevá 5 días sin moverse. ¿Sigue?',
    );
  });

  it('deja un token sin resolver intacto (bug visible)', () => {
    expect(renderPrompt('«{title}» y {missing}.', { title: 'A' })).toBe('«A» y {missing}.');
  });

  it('collectTokens lista los tokens de un template', () => {
    expect([...collectTokens('«{card}» a {gaps}.')].sort()).toEqual(['card', 'gaps']);
  });

  it('sectionText devuelve el cuerpo de la sección pedida y nada más', () => {
    const md = '## standup\nHola uno.\n\n## refinement\nHola dos.';
    expect(sectionText(md, 'standup')).toBe('Hola uno.');
    expect(sectionText(md, 'refinement')).toBe('Hola dos.');
    expect(sectionText(md, 'ghost')).toBe('');
  });
});