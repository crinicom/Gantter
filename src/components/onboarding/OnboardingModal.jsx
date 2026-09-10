// Modal de onboarding del proyecto (slice 13): las preguntas de
// `maia/onboarding/questions.md` se responden una por una en primer plano, con
// autosave (sin botón de guardar) y dictado opcional. Cada respuesta se
// regenera en la "Ficha del proyecto" hasta que el onboarding se marca done.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import Modal from '../common/Modal';
import { useProject } from '../../hooks/useProject';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { getOnboardingQuestions } from '../../services/onboardingService';
import { answeredCount } from '../../utils/parseOnboarding';

export default function OnboardingModal({ open, onClose }) {
  const { project, saveOnboardingAnswer, completeOnboarding } = useProject();
  const { questions } = useMemo(() => getOnboardingQuestions(), []);
  const answers = project?.onboarding?.answers || {};
  const total = questions.length;

  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');

  const firstUnanswered = questions.findIndex((q) => !String(answers[q.id] || '').trim());
  const firstUnansweredRef = useRef(firstUnanswered);
  firstUnansweredRef.current = firstUnanswered;

  useEffect(() => {
    if (!open) return;
    const target = firstUnansweredRef.current === -1 ? 0 : firstUnansweredRef.current;
    setIndex(target);
  }, [open]);

  const question = questions[index] || null;
  useEffect(() => {
    if (question) setDraft(String(answers[question.id] || ''));
  }, [question, answers]);

  const save = () => {
    if (question) saveOnboardingAnswer(question.id, draft.trim());
  };

  const speech = useSpeechToText({
    autoRestart: false,
    continuous: false,
    onFinal: (text) => {
      setDraft((prev) => `${prev} ${text}`.trim());
    },
  });

  const go = (direction) => {
    save();
    speech.stop();
    const next = Math.min(Math.max(index + direction, 0), total - 1);
    if (next === index) return false;
    setIndex(next);
    return true;
  };

  const onDone = () => {
    save();
    speech.stop();
    completeOnboarding();
    onClose();
  };

  const onCloseSaving = () => {
    save();
    speech.stop();
    onClose();
  };

  if (total === 0) return null;

  const answered = answeredCount(answers);

  return (
    <Modal
      open={open}
      onClose={onCloseSaving}
      title="Ficha del proyecto"
      width="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-ink hover:bg-gray-50 disabled:opacity-40"
          >
            Anterior
          </button>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              className="rounded-md bg-forest-600 px-3 py-2 text-sm font-medium text-paper hover:bg-forest-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={onDone}
              className="rounded-md bg-forest-600 px-3 py-2 text-sm font-medium text-paper hover:bg-forest-700"
            >
              Listo
            </button>
          )}
        </>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium text-muted">Pregunta {index + 1} de {total}</p>
        <button
          type="button"
          onClick={() => index > 0 && setIndex(0)}
          className="text-xs text-forest-700 underline"
          aria-label="Empezar de nuevo las preguntas"
        >
          {answered} {answered === 1 ? 'respondida' : 'respondidas'}
        </button>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-forest-600 transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      {question && (
        <div>
          <label htmlFor="onboarding-answer" className="font-display text-base font-semibold text-ink">
            {question.text}
          </label>
          <textarea
            id="onboarding-answer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            placeholder="Escribí acá o usá Dictar…"
            rows={5}
            className="mt-3 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-ink focus:border-forest-500 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (speech.listening) speech.stop();
                else speech.start();
              }}
              disabled={!speech.supported}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-ink hover:bg-gray-50 disabled:opacity-40"
            >
              {speech.listening ? <Square size={14} /> : <Mic size={14} />}
              {speech.listening ? 'Detener' : 'Dictar'}
            </button>
            {speech.listening && speech.interim && (
              <span className="text-xs italic text-muted">…{speech.interim}</span>
            )}
            {speech.supported === false && (
              <span className="text-xs text-muted">Dictado no disponible en este navegador.</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}