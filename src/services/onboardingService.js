// Onboarding del proyecto (slice 13): preguntas configurables en
// `maia/onboarding/questions.md` (config a nivel app, como los templates) y la
// Ficha del proyecto que se regenera desde las respuestas mientras el
// onboarding no esté `done`. La Ficha ES un Document del proyecto (§12), no una
// "nota desconectada".

import { v4 as uuidv4 } from 'uuid';
import questionsMd from '@maia/onboarding/questions.md?raw';
import { parseOnboardingQuestions } from '../utils/parseOnboarding';

let parsed = null;

export function getOnboardingQuestions() {
  if (!parsed) parsed = parseOnboardingQuestions(questionsMd);
  return parsed;
}

export function defaultOnboarding() {
  const first = getOnboardingQuestions().questions[0];
  return {
    answers: {},
    currentQuestionId: first ? first.id : null,
    done: false,
  };
}

export function normalizeOnboarding(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    answers: value.answers && typeof value.answers === 'object' ? { ...value.answers } : {},
    currentQuestionId: typeof value.currentQuestionId === 'string' ? value.currentQuestionId : null,
    done: Boolean(value.done),
  };
}

// Markdown de la Ficha desde las respuestas, en el orden de las preguntas y
// solo con las que tienen texto. Vacío si no hay ninguna respuesta.
export function buildFichaContent(answers = {}, { questions } = {}) {
  const all = questions || getOnboardingQuestions().questions;
  const answered = all.filter((q) => String(answers[q.id] || '').trim() !== '');
  if (answered.length === 0) return '';
  const lines = ['# Ficha del proyecto', ''];
  for (const q of answered) {
    lines.push(`## ${q.heading}`, '', String(answers[q.id] || '').trim(), '');
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

// Sincroniza la Ficha dentro de `documents`: crea el Document si no existe o
// actualiza el que lleva ese título. Mientras `done` sea false la Ficha se
// regenera desde `answers`; con `done` queda congelada (libre para edición
// manual).
export function syncFichaDocument(documents, answers, { done = false } = {}) {
  if (done) return Array.isArray(documents) ? documents : [];
  const list = Array.isArray(documents) ? documents : [];
  const content = buildFichaContent(answers);
  const now = new Date().toISOString();
  const existing = list.find((d) => d.title === 'Ficha del proyecto');
  if (existing) {
    return list.map((d) => (d.id === existing.id ? { ...d, content, updatedAt: now } : d));
  }
  return [
    ...list,
    { id: uuidv4(), title: 'Ficha del proyecto', content, createdAt: now, updatedAt: now },
  ];
}