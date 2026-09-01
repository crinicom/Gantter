import React, { useMemo } from 'react';
import { GANTT } from './ganttLayout';
import { addDays, format } from 'date-fns';

export default function GanttHeader({ startDate, endDate }) {
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

  return (
    <div className="flex" style={{ minWidth: weeks.length * GANTT.WEEK_WIDTH }}>
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
  );
}