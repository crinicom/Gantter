import React from 'react';
import { dateOffsetPx } from './ganttLayout';

/**
 * Línea vertical que marca el día HOY en el eje temporal del Gantt.
 * Se posiciona en el offset en píxeles desde el inicio del proyecto.
 */
export default function TodayLine({ startDate, totalWidth, height, visible }) {
  if (!visible) return null;

  const today = new Date();
  const left = dateOffsetPx(startDate, today);

  if (left < 0 || left > totalWidth) return null;

  return (
    <div
      className="pointer-events-none absolute top-0 z-20"
      style={{ left, height }}
    >
      <div className="h-1.5 w-px bg-red-500" />
      <div className="-mt-px w-px bg-red-500" style={{ height: height - 6 }} />
      <span className="absolute -top-1 left-1 rounded bg-red-500 px-1 text-[10px] font-semibold text-white">
        HOY
      </span>
    </div>
  );
}