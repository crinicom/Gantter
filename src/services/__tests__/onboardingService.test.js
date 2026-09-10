import { describe, it, expect } from 'vitest';
import {
  defaultOnboarding,
  normalizeOnboarding,
  buildFichaContent,
  syncFichaDocument,
  getOnboardingQuestions,
} from '../onboardingService';

describe('onboardingService', () => {
  it('getOnboardingQuestions lee las preguntas configurables de maia/onboarding', () => {
    const { questions } = getOnboardingQuestions();
    expect(questions).toHaveLength(3);
    expect(questions.map((q) => q.id)).toEqual(['objetivo', 'entregable', 'equipo']);
    expect(questions[0]).toMatchObject({ id: 'objetivo', heading: 'Objetivo' });
    expect(questions[0].text.length).toBeGreaterThan(10);
  });

  it('defaultOnboarding arranca en la primera pregunta sin respuestas', () => {
    const o = defaultOnboarding();
    expect(o).toMatchObject({ answers: {}, done: false, currentQuestionId: 'objetivo' });
  });

  it('normalizeOnboarding deja null lo que no es onboarding object (seeds/legacy)', () => {
    expect(normalizeOnboarding(undefined)).toBeNull();
    expect(normalizeOnboarding(null)).toBeNull();
    expect(normalizeOnboarding('x')).toBeNull();
  });

  it('normalizeOnboarding completa defaults de un object parcial', () => {
    expect(normalizeOnboarding({})).toEqual({ answers: {}, currentQuestionId: null, done: false });
    expect(normalizeOnboarding({ done: true, answers: { a: 'z' } })).toMatchObject({
      done: true,
      answers: { a: 'z' },
    });
  });

  it('buildFichaContent escribe solo respuestas con texto, en el orden de las preguntas', () => {
    const ficha = buildFichaContent({ objetivo: 'Entregar el portal', equipo: 'Lucía' });
    expect(ficha).toContain('# Ficha del proyecto');
    expect(ficha.indexOf('## Objetivo')).toBeGreaterThan(0);
    expect(ficha.indexOf('## Equipo')).toBeGreaterThan(ficha.indexOf('## Objetivo'));
    expect(ficha).toContain('Entregar el portal');
    expect(ficha).not.toContain('## Fechas');
  });

  it('buildFichaContent devuelve vacío sin respuestas', () => {
    expect(buildFichaContent({})).toBe('');
  });

  it('syncFichaDocument crea la Ficha si no existe y la mantiene mientras el onboarding no done', () => {
    const docs = syncFichaDocument([], { objetivo: 'x' }, {});
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('Ficha del proyecto');
    expect(docs[0].content).toContain('## Objetivo');

    const updated = syncFichaDocument(docs, { objetivo: 'x', equipo: 'y' }, {});
    expect(updated).toHaveLength(1);
    expect(updated[0].content).toContain('## Equipo');
  });

  it('syncFichaDocument respeta un documento que no sea la Ficha', () => {
    const existing = [{ id: 'doc_otro', title: 'Notas', content: '# Notas', createdAt: 'x', updatedAt: 'x' }];
    const docs = syncFichaDocument(existing, { objetivo: 'x' }, {});
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.title)).toEqual(['Notas', 'Ficha del proyecto']);
  });

  it('syncFichaDocument no toca nada cuando el onboarding quedó done', () => {
    const docs = [{ id: 'd1', title: 'Ficha del proyecto', content: '# viejo', createdAt: 'x', updatedAt: 'x' }];
    expect(syncFichaDocument(docs, { objetivo: 'nueva' }, { done: true })).toEqual(docs);
  });

  it('buildFichaContent con todas las preguntas produce todas las secciones', () => {
    const allAnswers = { objetivo: 'A', entregable: 'B', equipo: 'C' };
    const ficha = buildFichaContent(allAnswers);
    expect(ficha).toContain('## Objetivo');
    expect(ficha).toContain('## Entregable');
    expect(ficha).toContain('## Equipo');
    expect(ficha).not.toContain('## Fechas');
    expect(ficha).not.toContain('## Riesgos');
  });

  it('syncFichaDocument actualiza la Ficha existente con nuevas respuestas', () => {
    const docs = [{ id: 'f1', title: 'Ficha del proyecto', content: '# viejo', createdAt: 'x', updatedAt: 'x' }];
    const updated = syncFichaDocument(docs, { objetivo: 'nuevo' }, {});
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe('f1');
    expect(updated[0].content).toContain('## Objetivo');
  });

  it('normalizeOnboarding descarta campos extra sin romper', () => {
    const result = normalizeOnboarding({ done: true, extra: 'field', answers: { a: 'b' } });
    expect(result).toEqual({ answers: { a: 'b' }, currentQuestionId: null, done: true });
  });
});