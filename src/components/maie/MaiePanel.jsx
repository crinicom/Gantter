// Panel de Maie (§7–8): dock derecho fijo en desktop (mobile = slice 8).
// Pestañas: Preguntas (open/chatting/snoozed), Huddle (slice 7) y Registro
// (actionLog read-only). El hilo de cada pregunta (click → chat, propuestas)
// llega en el slice 5.

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import MaieMark from './MaieMark';
import ApplyModeToggle from './ApplyModeToggle';
import { useMaie } from '../../context/MaieContext';
import {
  INQUIRY_KIND_META,
  INQUIRY_STATUS,
  INQUIRY_STATUS_LABELS,
  MAIE_ROLE,
} from '../../constants/maie';

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

function QuestionsTab() {
  const { inquiries } = useMaie();
  const open = inquiries.filter(
    (i) => i.status === INQUIRY_STATUS.OPEN || i.status === INQUIRY_STATUS.CHATTING,
  );
  const parked = inquiries.filter((i) => i.status === INQUIRY_STATUS.SNOOZED);

  if (open.length === 0 && parked.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted">
        No hay preguntas abiertas. Maie pregunta cuando algo se queda flaco, sin dueño o estancado.
      </p>
    );
  }

  const rows = (items) =>
    items.map((inq) => (
      <article key={inq.id} className="border-b border-gray-100 px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <KindBadge kind={inq.kind} />
          {inq.status === INQUIRY_STATUS.CHATTING && (
            <span className="text-[11px] text-forest-600">En diálogo</span>
          )}
        </div>
        <p className="text-sm text-ink">{inq.question}</p>
        <p className="mt-1 text-xs text-muted">{inq.evidence}</p>
      </article>
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

function HuddleTab() {
  return (
    <div className="px-4 py-6">
      <p className="text-sm text-ink">
        El primer huddle se arma acá, con las preguntas abiertas de la semana.
      </p>
      <p className="mt-1 text-xs text-muted">
        El huddle de los miércoles llega en una próxima entrega.
      </p>
    </div>
  );
}

function LogTab() {
  const { actionLog } = useMaie();
  if (actionLog.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted">Todavía no hay entradas en el registro.</p>;
  }
  return (
    <div className="px-4 py-3">
      <ul className="space-y-3">
        {actionLog.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2.5 text-sm">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest-600" aria-hidden="true" />
            <div>
              <p className="text-ink">{entry.summary}</p>
              <p className="text-xs text-muted">{timeAgo(entry.at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MaiePanel() {
  const { openCount, applyMode, setApplyMode } = useMaie();
  const [tab, setTab] = useState(TABS[0].id);

  return (
    <aside
      className="hidden w-[360px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-surface lg:flex"
      aria-label="Panel de Maie"
    >
      <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <MaieMark />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-tight text-ink">Maie</h2>
          <p className="text-xs text-muted">{MAIE_ROLE}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-forest-600 px-2.5 py-0.5 text-xs font-medium text-paper">
          {openCount} {openCount === 1 ? 'abierta' : 'abiertas'}
        </span>
      </header>

      <div className="border-b border-gray-200 px-4 py-3">
        <ApplyModeToggle value={applyMode} onChange={setApplyMode} />
      </div>

      <nav
        aria-label="Secciones de Maie"
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
        {tab === 'questions' && <QuestionsTab />}
        {tab === 'huddle' && <HuddleTab />}
        {tab === 'log' && <LogTab />}
      </div>
    </aside>
  );
}