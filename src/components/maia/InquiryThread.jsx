// Hilo de una pregunta de Maia (§7 Click → chat, §8 catálogo, §9 propuestas
// por modo, §11 LLM + fallback templated). Enviar mensaje persiste en el hilo,
// deja la pregunta en "chatting" y pide la respuesta a Maia; mientras espera la
// llamada se muestra "Maia está pensando…". Las propuestas (catálogo o del LLM)
// se aplican en modo confirmar (Sí/No) o auto (aplicar + registro).

import React, { useEffect, useRef, useState } from 'react';
import { useMaia } from '../../context/MaiaContext';
import { useAuth } from '../../hooks/useAuth';
import { ACTIVE_USER } from '../../constants/project';
import { INQUIRY_KIND_META, INQUIRY_STATUS, PROPOSAL_STATUS } from '../../constants/maia';
import MaiaMark from './MaiaMark';

// P1 de la review del slice 5/6: rechazar una propuesta no corta la charla.
// Maia sigue la pregunta ("la pregunta sigue", §17.4) para entender qué hacer.
const DECLINE_FOLLOW_UP = 'No por ahora. ¿Qué habría que hacer entonces?';

function kindTone(kind) {
  return INQUIRY_KIND_META[kind]?.tone || 'muted';
}

function ProposalRow({ inquiry, proposal, applyMode }) {
  const { applyProposal, dismissProposal, sendThreadMessage } = useMaia();
  const st = proposal.status;

  if (st === PROPOSAL_STATUS.APPLIED) {
    return (
      <div className="rounded-md border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
        Aplicada: {proposal.label}
      </div>
    );
  }

  if (st === PROPOSAL_STATUS.DISMISSED) {
    return (
      <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-muted line-through">
        Descartada: {proposal.label}
      </div>
    );
  }

  if (proposal.needsInput) {
    return (
      <div className="rounded-md border border-gray-200 bg-surface px-3 py-2 text-sm text-muted">
        {proposal.label} — se completa conversando con Maia.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-rust/25 bg-rust/5 px-3 py-2">
      <p className="min-w-0 flex-1 text-sm text-ink">{proposal.label}</p>
      {applyMode === 'auto' ? (
        <button
          type="button"
          onClick={() => applyProposal(inquiry.id, proposal.id, 'auto')}
          className="shrink-0 rounded-md bg-forest-600 px-2.5 py-1 text-xs font-medium text-paper hover:bg-forest-700"
        >
          Aplicar
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyProposal(inquiry.id, proposal.id, 'confirm')}
            className="rounded-md bg-forest-600 px-2.5 py-1 text-xs font-medium text-paper hover:bg-forest-700"
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => {
              dismissProposal(inquiry.id, proposal.id);
              sendThreadMessage(inquiry.id, DECLINE_FOLLOW_UP);
            }}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-ink hover:bg-gray-100"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}

function bubbleTone(role) {
  return role === 'maia'
    ? 'border border-gray-200 bg-surface text-ink'
    : 'bg-forest-600 text-paper';
}

export default function InquiryThread({ inquiryId, onClose }) {
  const { inquiries, applyMode, sendThreadMessage, snoozeInquiry, maiaReplying } = useMaia();
  const { user } = useAuth();
  const activeUser = user || ACTIVE_USER;
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  const inquiry = inquiries.find((i) => i.id === inquiryId);

  useEffect(() => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'end' });
    }
  }, [inquiryId, inquiry?.thread?.length]);

  if (!inquiry) return null;

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendThreadMessage(inquiryId, draft);
    setDraft('');
  };

  const proposals = inquiry.proposals || [];
  const pendingCount = proposals.filter((p) => p.status === PROPOSAL_STATUS.PENDING).length;
  const resolvedCondition = inquiry.status === INQUIRY_STATUS.RESOLVED;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-paper" aria-label="Hilo de la pregunta">
      <header className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted hover:bg-gray-100 hover:text-ink"
          aria-label="Volver a las preguntas"
        >
          ←
        </button>
        <MaiaMark />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-ink">Pregunta de Maia</h3>
          <p className="text-xs text-muted">
            {INQUIRY_KIND_META[inquiry.kind]?.label || inquiry.kind}
            {inquiry.status === INQUIRY_STATUS.CHATTING ? ' · En diálogo' : ''}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <article className={`rounded-md border-l-4 bg-surface px-3 py-2 ${kindTone(inquiry.kind) === 'rust' ? 'border-rust/40' : 'border-forest/40'}`}>
          <p className="text-sm font-medium text-ink">{inquiry.question}</p>
          <p className="mt-1 text-xs text-muted">{inquiry.evidence}</p>
        </article>

        {(inquiry.thread || []).map((m) => (
          <div key={m.id} className={m.role === 'maia' ? 'flex justify-start' : 'flex justify-end'}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${bubbleTone(m.role)}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className={`mt-0.5 text-[11px] ${m.role === 'maia' ? 'text-muted' : 'text-paper/80'}`}>
                {(m.role === 'maia' ? 'Maia' : m.author || activeUser.name) || ''}
              </p>
            </div>
          </div>
        ))}
        {maiaReplying && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm text-muted">
              Maia está pensando…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(proposals.length > 0 || resolvedCondition) && (
        <div className="space-y-2 border-t border-gray-200 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Propuestas</p>
          {proposals.map((p) => (
            <ProposalRow key={p.id} inquiry={inquiry} proposal={p} applyMode={applyMode} />
          ))}
          {pendingCount === 0 && resolvedCondition && (
            <p className="text-sm text-forest-700">Esta pregunta ya se resolvió sola.</p>
          )}
        </div>
      )}

      {inquiry.status !== INQUIRY_STATUS.RESOLVED && (
        <>
          <div className="border-t border-gray-200 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                snoozeInquiry(inquiryId);
                onClose();
              }}
              className="text-xs font-medium text-muted hover:text-ink"
            >
              Recordármelo en el próximo standup
            </button>
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t border-gray-200 px-4 py-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder={`Responder como ${activeUser?.name || ACTIVE_USER.name}…`}
              className="min-w-0 flex-1 resize-none rounded-md border border-gray-300 bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-forest-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="shrink-0 rounded-md bg-forest-600 px-3 py-2 text-sm font-medium text-paper hover:bg-forest-700 disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </>
      )}
    </div>
  );
}