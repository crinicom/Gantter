import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProject';
import { useMaie } from '../../context/MaieContext';
import { collectSystemState, describeScreen } from '../../utils/systemState';
import { feedbackService } from '../../services/feedbackService';

const TYPES = ['error', 'sugerencia', 'comentario'];
const TYPE_LABELS = { error: 'Error', sugerencia: 'Sugerencia', comentario: 'Comentario' };

export default function FeedbackButton() {
  const { user, isAuthenticated } = useAuth();
  const { project, syncStatus, lastSyncAt } = useProject();
  const { applyMode, staleDays, openCount } = useMaie();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState('comentario');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'done'
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const screen = describeScreen({
    project,
    view: document.documentElement.dataset.activeView || 'board',
    isLogin: !isAuthenticated,
  });

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    const systemState = collectSystemState({
      user,
      project,
      syncStatus,
      lastSyncAt,
      applyMode,
      staleDays,
      openInquiries: openCount,
      backendName: 'server',
    });
    const result = await feedbackService.submitFeedback({
      type,
      message: message.trim(),
      screen,
      systemState,
      user,
    });
    setStatus(result.ok ? 'done' : 'error');
    setTimeout(() => {
      setOpen(false);
      setMessage('');
      setType('comentario');
      setStatus(null);
    }, 1500);
  }, [message, type, status, user, project, syncStatus, lastSyncAt, applyMode, staleDays, openCount, screen]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-forest-600 text-white shadow-lg transition-colors hover:bg-forest-700"
        aria-label="Reportar error o sugerencia"
        title="Reportar error o sugerencia"
      >
        <MessageSquarePlus size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-start bg-black/30 p-4 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Enviar feedback</h3>
            <div className="mb-2 flex gap-1">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    type === t
                      ? 'bg-forest-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mb-2 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-forest-500 focus:ring-1 focus:ring-forest-500"
              placeholder="Describe el problema o sugerencia..."
              aria-label="Mensaje de feedback"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400" title={screen}>
                {screen}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === 'sending'}
                  className="rounded bg-forest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-700 disabled:opacity-50"
                >
                  {status === 'sending' ? 'Enviando…' : status === 'done' ? 'Enviado' : 'Enviar'}
                </button>
              </div>
            </div>
            {status === 'done' && (
              <p className="mt-2 text-xs text-forest-600">Feedback registrado. Gracias.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
