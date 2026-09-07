import React, { useMemo } from 'react';
import { GANTT, dateOffsetPx } from './ganttLayout';
import { addDays, format } from 'date-fns';

// Encabezado del timeline. Los hitos (§6) se marcan con una línea vertical y
// etiqueta en la posición de su fecha, alineada con las barras del cuerpo.
export default function GanttHeader({ startDate, endDate, milestones = [] }) {
  const weeks = useMemo(() => {
    const weeks = [];
    const cursor = new Date(startDate);
    // alinear al inicio de semana (lunes)
    const day = cursor.getDay();
    const diff = (day + 6) % 7;
    cursor.setDate(cursor.getDate() - diff);

    while (cursor <= endDate) {
      weeks.push({
        start: new Date(cursor),
        end: addDays(cursor, 6),
        label: format(cursor, 'dd/MM'),
        year: format(cursor, 'yyyy'),
      });
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, [startDate, endDate]);

  const width = weeks.length * GANTT.WEEK_WIDTH;

  return (
    <div className="relative" style={{ minWidth: width }}>
      <div className="flex">
        {weeks.map((week) => (
          <div
            key={week.start.toISOString()}
            className="flex-shrink-0 border-b border-r border-gray-200 px-2 py-1 text-xs text-gray-500"
            style={{ width: GANTT.WEEK_WIDTH }}
          >
            <div className="font-medium">{week.label}</div>
            <div className="text-[10px] text-gray-400">{week.year}</div>
          </div>
        ))}
      </div>
      {milestones.map((m) => {
        const left = dateOffsetPx(startDate, m.endDate);
        return (
          <div key={m.id || `${m.name}-${m.endDate}`} className="pointer-events-none absolute inset-y-0" style={{ left }}>
            <div className="absolute inset-y-0 w-px bg-red-400/60" />
            <div
              data-testid={m.id ? `milestone-${m.id}` : 'milestone'}
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
            >
              {m.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}