// Parsing de `maia/onboarding/questions.md` (slice 13). Convenio de los
// templates de Maia: las líneas con una sola `#` son comentarios editables
// (nunca se muestran); cada `## Título` abre una pregunta (id derivado en
// inglés/kebab y título para la Ficha); el cuerpo es el texto de la pregunta.

export function slugId(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseOnboardingQuestions(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const intro = [];
  const questions = [];
  let current = null;

  for (const line of lines) {
    if (/^\s*#(?!\s*#)/.test(line)) continue;
    const header = line.match(/^\s*##\s+(.+)$/);
    if (header) {
      const heading = header[1].trim();
      current = { heading, body: [] };
      questions.push(current);
      continue;
    }
    if (current) current.body.push(line);
    else intro.push(line);
  }

  return {
    intro: intro.map((l) => l.trim()).filter(Boolean).join('\n'),
    questions: questions.map((q) => ({
      id: slugId(q.heading),
      heading: q.heading,
      text: q.body.map((l) => l.trim()).filter(Boolean).join(' '),
    })),
  };
}

export function answeredCount(answers = {}) {
  return Object.values(answers).filter((value) => String(value || '').trim()).length;
}