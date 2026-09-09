// Barra de sesión del huddle en el chrome (§10): sin sesión, botón para abrir
// el ritual; con sesión, ritual, timer en vivo, play/pausa del demo (standup) y
// cerrar. Persistente entre vistas (Kanban/Gantt).

import React, { useEffect, useState } from 'react';
import { Radio, Pause, Play, X, MessagesSquare } from 'lucide-react';
import { useMaie } from '../../context/MaieContext';
import { HUDDLE_RITUALS, MAIE_ROLE } from '../../constants/maie';
import RitualPicker from './RitualPicker';

function ritualLabel(id) {
  return HUDDLE_RITUALS.find((r) => r.id === id)?.label || id || 'Huddle';
}

function elapsed(startedAt, now) {
  const ms = Math.max(0, now - Date.parse(startedAt || now));
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function HuddleSessionBar() {
  const { huddle, demoStatus, startHuddle, stopHuddle, toggleDemo } = useMaie();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!huddle || huddle.endedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [huddle?.id, huddle?.endedAt]);

  if (!huddle) {
    return (
      <div className="flex items-center gap-2 border-b border-gray-200 bg-paper px-4 py-1.5">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-forest-300 bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700 hover:bg-forest-100"
        >
          <MessagesSquare size={14} /> Abrir huddle
        </button>
        <RitualPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </div>
    );
  }

  const closed = Boolean(huddle.endedAt);
  const isDemo = Boolean(huddle.demo);
  const playing = demoStatus === 'playing';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 bg-paper px-4 py-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
        <span className={`flex h-2 w-2 rounded-full ${closed ? 'bg-gray-300' : playing ? 'animate-pulse bg-forest-500' : 'bg-rust'}`} />
        {ritualLabel(huddle.ritual)}
      </span>
      {!closed && (
        <>
          <span className="text-xs tabular-nums text-muted">{elapsed(huddle.startedAt, now)}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Radio size={12} /> {MAIE_ROLE} en línea
          </span>
          {isDemo && !closed && huddle.demo.status !== 'done' && (
            <button
              type="button"
              onClick={toggleDemo}
              title={playing ? 'Pausar el demo' : 'Reanudar el demo'}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-forest-700 hover:bg-forest-50"
            >
              {playing ? <Pause size={12} /> : <Play size={12} />}
              {playing ? 'Pausar' : 'Reanudar'}
            </button>
          )}
          <button
            type="button"
            onClick={stopHuddle}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted hover:bg-gray-100 hover:text-ink"
          >
            <X size={12} /> Cerrar sesión
          </button>
        </>
      )}
      {closed && (
        <span className="ml-auto text-xs text-muted">Sesión cerrada — transcript en el panel de Maie</span>
      )}
    </div>
  );
}