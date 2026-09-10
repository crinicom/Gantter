import { describe, it, expect } from 'vitest';
import { parseOnboardingQuestions, answeredCount, slugId } from '../parseOnboarding';

const MD = `# Comentario (no se muestra)
Texto introductorio que sí se muestra.

## Objetivo
¿Cuál es el objetivo principal?

## Stakeholders
¿Quién aprueba los cambios?
línea extra de la misma pregunta.`;

describe('parseOnboardingQuestions', () => {
  it('ignora los comentarios con una sola # y conserva la intro', () => {
    const parsed = parseOnboardingQuestions(MD);
    expect(parsed.intro).toContain('Texto introductorio');
    expect(parsed.intro).not.toContain('Comentario');
  });

  it('arma las preguntas con id derivado, título y texto unido', () => {
    const { questions } = parseOnboardingQuestions(MD);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toEqual({
      id: 'objetivo',
      heading: 'Objetivo',
      text: '¿Cuál es el objetivo principal?',
    });
    expect(questions[1].text).toBe('¿Quién aprueba los cambios? línea extra de la misma pregunta.');
  });

  it('tolera input inválido', () => {
    expect(parseOnboardingQuestions(null).questions).toEqual([]);
    expect(parseOnboardingQuestions('').questions).toEqual([]);
  });

  it('markdown vacío produce intro vacía y 0 preguntas', () => {
    const { intro, questions } = parseOnboardingQuestions('   \n  \n  ');
    expect(intro).toBe('');
    expect(questions).toHaveLength(0);
  });

  it('solo comentarios produce 0 preguntas', () => {
    const { intro, questions } = parseOnboardingQuestions('# Primera línea\n# Segunda línea');
    expect(intro).toBe('');
    expect(questions).toHaveLength(0);
  });

  it('un solo heading produce 1 pregunta', () => {
    const { questions } = parseOnboardingQuestions('## Resumen\n\nBreve resumen del proyecto.');
    expect(questions).toHaveLength(1);
    expect(questions[0].heading).toBe('Resumen');
    expect(questions[0].text).toBe('Breve resumen del proyecto.');
  });

  it('heading sin body produce texto vacío', () => {
    const { questions } = parseOnboardingQuestions('## Vacía\n\n## Llena\nCon contenido');
    expect(questions).toHaveLength(2);
    expect(questions[0].text).toBe('');
    expect(questions[1].text).toBe('Con contenido');
  });
});

describe('answeredCount', () => {
  it('cuenta solo respuestas con texto', () => {
    expect(answeredCount({ a: 'sí', b: '   ', c: '' })).toBe(1);
    expect(answeredCount()).toBe(0);
  });
});

describe('slugId', () => {
  it('normaliza títulos a ids en kebab sin acentos', () => {
    expect(slugId('Fechas Clave')).toBe('fechas-clave');
    expect(slugId('Qué hacemos')).toBe('que-hacemos');
  });
});