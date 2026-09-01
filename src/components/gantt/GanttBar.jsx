import React from 'react';
import clsx from 'clsx';
import { dateRangePx, GANTT } from './ganttLayout';
import { TASK_STATUS } from '../../constants/project';

export default function GanttBar({ task, startDate, isCritical }) {
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const { left, width } = dateRangePx(startDate, task);

  return (
    <div
      className={clsx(
        'absolute rounded-md border px-1.5 text-center text-[11px] font-medium leading-6 text-white shadow-sm',
        isCritical
          ? 'border-red-700 bg-red-600'
          : isCompleted
            ? 'border-green-700 bg-green-600'
            : task.status === TASK_STATUS.IN_PROGRESS
              ? 'border-violet-800 bg-violet-600'
              : 'border-gray-400 bg-gray-500',
        isCompleted && 'opacity-60',
      )}
      style={{ left, width, height: GANTT.BAR_HEIGHT, top: 0 }}
      title={`${task.name}${isCritical ? ' [crítica]' : ''}`}
    >
      <span className="truncate">{task.name}</span>
    </div>
  );
}