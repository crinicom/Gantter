// Panel de Maia (§7–8): dock derecho fijo en desktop (mobile = slice 8).
// Pestañas: Preguntas (open/chatting/snoozed), Huddle (slice 7) y Registro
// (actionLog read-only). El hilo de cada pregunta (click → chat, propuestas)
// llega en el slice 5.

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import MaiaMark from './MaiaMark';
import ApplyModeToggle from './ApplyModeToggle';
import InquiryThread from './InquiryThread';
import HuddleTab from '../huddle/HuddleTab';
import { useMaia } from '../../context/MaiaContext';
import {
  INQUIRY_KIND_META,
  INQUIRY_STATUS,
  INQUIRY_STATUS_LABELS,
  MAIA_ROLE,
} from '../../constants/maia';

const TABS = [
  { id: 'questions', label: 'Preguntas' },
  { id: 'huddle', label: 'Huddle' },
  { id: 'log', label: 'Registro' },
];

function timeAgo(value) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: es });
}

function KindBadge({ kind }) {
  const meta = INQUIRY_KIND_META[kind] || { label: kind, tone: 'muted' };
  const tones = {
    forest: 'bg-forest-100 text-forest-700',
    rust: 'bg-rust/15 text-rust',
    muted: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tones[meta.tone]}`}>
      {meta.label}
    </span>
  );
}

function QuestionsTab({ onOpen }) {
  const { inquiries } = useMaia();
  const open = inquiries.filter(
    (i) => i.status === INQUIRY_STATUS.OPEN || i.status === INQUIRY_STATUS.CHATTING,
  );
  const parked = inquiries.filter((i) => i.status === INQUIRY_STATUS.SNOOZED);

  if (open.length === 0 && parked.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted">
        No hay preguntas abiertas. Maia pregunta cuando algo se queda flaco, sin dueño o estancado.
      </p>
    );
  }

  const rows = (items) =>
    items.map((inq) => (
      <button
        key={inq.id}
        type="button"
        onClick={() => onOpen(inq.id)}
        className="block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-surface"
      >
        <span className="mb-1 flex items-center gap-2">
          <KindBadge kind={inq.kind} />
          {inq.status === INQUIRY_STATUS.CHATTING && (
            <span className="text-[11px] text-forest-600">En diálogo</span>
          )}
        </span>
        <span className="block text-sm text-ink">{inq.question}</span>
        <span className="mt-1 block text-xs text-muted">{inq.evidence}</span>
      </button>
    ));

  return (
    <div>
      {open.length > 0 && <div>{rows(open)}</div>}
      {parked.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted">Aparcadas</p>
          {rows(parked)}
        </div>
      )}
    </div>
  );
}

const SOURCE_BADGES = {
  auto: { label: 'Auto', tone: 'bg-forest-100 text-forest-700' },
  confirm: { label: 'Confirmada', tone: 'bg-rust/15 text-rust' },
  manual: { label: 'Manual', tone: 'bg-gray-100 text-gray-600' },
};

function LogTab() {
  const { actionLog } = useMaia();
  if (actionLog.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted">Todavía no hay entradas en el registro.</p>;
  }
  return (
    <div className="px-4 py-3">
      <ul className="space-y-3">
        {actionLog.map((entry) => {
          const badge = SOURCE_BADGES[entry.source] || SOURCE_BADGES.manual;
          return (
            <li key={entry.id} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest-600" aria-hidden="true" />
              <div>
                <p className="text-ink">{entry.summary}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${badge.tone}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-muted">{timeAgo(entry.at)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MaiaPanel() {
  const { openCount, applyMode, setApplyMode } = useMaia();
  const [tab, setTab] = useState(TABS[0].id);
  const [chatInquiryId, setChatInquiryId] = useState(null);

  return (
    <aside
      className="relative hidden w-[360px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-surface lg:flex"
      aria-label="Panel de Maia"
    >
      <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <MaiaMark />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-tight text-ink">Maia</h2>
          <p className="text-xs text-muted">{MAIA_ROLE}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-forest-600 px-2.5 py-0.5 text-xs font-medium text-paper">
          {openCount} {openCount === 1 ? 'abierta' : 'abiertas'}
        </span>
      </header>

      <div className="border-b border-gray-200 px-4 py-3">
        <ApplyModeToggle value={applyMode} onChange={setApplyMode} />
      </div>

      <nav
        aria-label="Secciones de Maia"
        className="flex gap-1 border-b border-gray-200 px-3 pt-2"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`rounded-t-lg px-3 py-1.5 text-sm font-medium ${
              tab === id ? 'bg-paper text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto bg-paper/40">
        {tab === 'questions' && <QuestionsTab onOpen={setChatInquiryId} />}
        {tab === 'huddle' && <HuddleTab />}
        {tab === 'log' && <LogTab />}
      </div>

      {chatInquiryId && (
        <InquiryThread inquiryId={chatInquiryId} onClose={() => setChatInquiryId(null)} />
      )}
    </aside>
  );
}