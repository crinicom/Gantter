// Pestaña Huddle del panel de Maia (§10): transcript de la sesión con speaker y
// hora, cartas mencionadas, propuestas sí/no del demo (modo confirmar) y la
// línea de texto del usuario interpretada por Maia (mismo path LLM del chat).

import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mic, Pause, Play, Square, X } from 'lucide-react';
import { useMaia } from '../../context/MaiaContext';
import { useAuth } from '../../hooks/useAuth';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { ACTIVE_USER } from '../../constants/project';
import { HUDDLE_RITUALS, PROPOSAL_STATUS } from '../../constants/maia';

function ritualLabel(id) {
  return HUDDLE_RITUALS.find((r) => r.id === id)?.label || id || 'Huddle';
}

function time(at) {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'HH:mm', { locale: es });
}

function StatusPill({ session, demoStatus }) {
  if (session.endedAt) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-muted">Cerrada</span>;
  }
  if (demoStatus === 'playing') {
    return <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-medium text-forest-700">Reproduciendo</span>;
  }
  if (demoStatus === 'paused') {
    return <span className="rounded-full bg-rust/15 px-2 py-0.5 text-[11px] font-medium text-rust">En pausa</span>;
  }
  return <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-medium text-forest-700">En curso</span>;
}

function ProposalRow({ proposal, onResolve }) {
  if (proposal.status === PROPOSAL_STATUS.APPLIED) {
    return (
      <div className="rounded-md border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
        Aplicada: {proposal.label}
      </div>
    );
  }
  if (proposal.status === PROPOSAL_STATUS.DISMISSED) {
    return (
      <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-muted line-through">
        Descartada: {proposal.label}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-rust/25 bg-rust/5 px-3 py-2">
      <p className="min-w-0 flex-1 text-sm text-ink">{proposal.label}</p>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onResolve(proposal.id, true)}
          className="rounded-md bg-forest-600 px-2.5 py-1 text-xs font-medium text-paper hover:bg-forest-700"
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onResolve(proposal.id, false)}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-ink hover:bg-gray-100"
        >
          No
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  const { startHuddle } = useMaia();
  return (
    <div className="px-4 py-6">
      <p className="text-sm text-ink">
        El huddle de los miércoles se arma acá y deja rastro en el tablero.
      </p>
      <p className="mt-1 text-xs text-muted">Elegí el ritual para empezar una sesión.</p>
      <div className="mt-4 space-y-2">
        {HUDDLE_RITUALS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => startHuddle({ ritual: r.id })}
            className="block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-forest-400 hover:bg-forest-50"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{r.label}</span>
              {r.demo && (
                <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-medium text-forest-700">
                  Demo que mueve cartas
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-xs text-muted">{r.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HuddleTab() {
  const { huddle, demoStatus, sendHuddleLine, submitHuddleMicLine, resolveHuddleProposal, stopHuddle, toggleDemo, maiaReplying } = useMaia();
  const { user } = useAuth();
  const activeUser = user || ACTIVE_USER;
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  const mic = useSpeechToText({ onFinal: (text) => submitHuddleMicLine(text) });

  const session = huddle;

  useEffect(() => {
    if (session?.endedAt && mic.listening) {
      mic.stop();
    }
  }, [session?.endedAt, mic.listening, mic]);

  useEffect(() => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'end' });
    }
  }, [session?.transcript?.length, session?.pending?.length]);

  if (!session) return <EmptyState />;

  const closed = Boolean(session.endedAt);
  const isDemo = Boolean(session.demo);
  const canPlayPause = isDemo && !closed && session.demo.status !== 'done' && session.demo.status !== undefined;

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendHuddleLine(draft);
    setDraft('');
  };

  return (
    <div>
      <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{ritualLabel(session.ritual)}</span>
        <StatusPill session={session} demoStatus={demoStatus} />
      </header>

      <div className="max-h-[50vh] space-y-3 overflow-y-auto px-4 py-3">
        {(session.transcript || []).map((line) => {
          if (line.role === 'user') {
            return (
              <div key={line.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-forest-600 px-3 py-2 text-sm text-paper">
                  <p className="whitespace-pre-wrap">{line.text}</p>
                  <p className="mt-0.5 text-right text-[11px] text-paper/80">
                    {line.speaker || activeUser.name} · {time(line.at)}
                  </p>
                </div>
              </div>
            );
          }
          const member = line.role === 'member';
          return (
            <div key={line.id} className="flex justify-start">
              <div
                className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                  member ? 'border-gray-200 bg-forest-50/60 text-ink' : 'border-gray-200 bg-surface text-ink'
                }`}
              >
                <p className="whitespace-pre-wrap">{line.text}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {line.role === 'maia' ? 'Maia' : line.speaker || 'Equipo'} · {time(line.at)}
                </p>
              </div>
            </div>
          );
        })}
        {maiaReplying && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm text-muted">
              Maia está pensando…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(session.pending || []).length > 0 && (
        <div className="space-y-2 border-t border-gray-100 px-4 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Propuestas del huddle</p>
          {(session.pending || []).map((p) => (
            <ProposalRow key={p.id} proposal={p} onResolve={resolveHuddleProposal} />
          ))}
        </div>
      )}

      {!closed && (
        <div className="border-t border-gray-100 px-4 py-2">
          {mic.supported && mic.listening && (
            <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rust" aria-hidden="true" />
              Escuchando… {mic.interim || 'hablá, te anoto'}
            </p>
          )}
          <form onSubmit={send} className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder={`Escribir o hablar como ${activeUser?.name || ACTIVE_USER.name}…`}
              className="min-w-0 flex-1 resize-none rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-forest-500 focus:outline-none"
            />
            {mic.supported && (
              <button
                type="button"
                aria-label={mic.listening ? 'Dejar de escuchar' : 'Escuchar reunión'}
                title={mic.listening ? 'Dejar de escuchar' : 'Escuchar la reunión con el micrófono'}
                onClick={mic.toggle}
                className={`flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium ${
                  mic.listening
                    ? 'bg-rust text-paper hover:bg-rust/90'
                    : 'border border-gray-300 bg-surface text-ink hover:bg-gray-100'
                }`}
              >
                {mic.listening ? <Square size={14} /> : <Mic size={14} />}
              </button>
            )}
            <button
              type="submit"
              disabled={!draft.trim()}
              className="shrink-0 rounded-md bg-forest-600 px-3 py-2 text-sm font-medium text-paper hover:bg-forest-700 disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {canPlayPause && (
              <button
                type="button"
                onClick={toggleDemo}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-ink hover:bg-gray-100"
              >
                {demoStatus === 'playing' ? <Pause size={12} /> : <Play size={12} />}
                {demoStatus === 'playing' ? 'Pausar demo' : 'Reanudar demo'}
              </button>
            )}
            <button
              type="button"
              onClick={stopHuddle}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-ink hover:bg-gray-100"
            >
              <X size={12} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
      {closed && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-muted">Sesión cerrada. Podés releer el transcript o abrir una nueva.</p>
        </div>
      )}
    </div>
  );
}