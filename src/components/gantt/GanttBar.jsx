import React from 'react';
import clsx from 'clsx';
import { dateRangePx, GANTT } from './ganttLayout';
import { TASK_STATUS } from '../../constants/project';
import { clampProgress } from '../../utils/progress';

export default function GanttBar({ task, startDate, isCritical, overlapped = false }) {
  // Las cartas sin rango completo viven en el canal "Sin fechas"; no se dibuja una barra.
  if (!task.startDate || !task.endDate) return null;

  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const progress = clampProgress(task.progress);
  const { left, width } = dateRangePx(startDate, task);

  return (
    <div
      className={clsx(
        'absolute overflow-hidden rounded-md border px-1.5 text-center text-[11px] font-medium leading-6 text-white shadow-sm',
        isCritical
          ? 'border-red-700 bg-red-600'
          : isCompleted
            ? 'border-green-700 bg-green-600'
            : task.status === TASK_STATUS.IN_PROGRESS
              ? 'border-forest-800 bg-forest-600'
              : 'border-gray-400 bg-gray-500',
        isCompleted && 'opacity-60',
        overlapped && 'ring-2 ring-red-400',
      )}
      style={{ left, width, height: GANTT.BAR_HEIGHT, top: 0 }}
      title={`${task.name}${isCritical ? ' [crítica]' : ''} — ${progress}%`}
    >
      <span className="truncate">{task.name}</span>
      {progress > 0 && progress < 100 && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/40">
          <span className="absolute inset-y-0 left-0 bg-white/70" style={{ width: `${progress}%` }} />
        </span>
      )}
    </div>
  );
}