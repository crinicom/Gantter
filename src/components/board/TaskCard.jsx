import React from 'react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, CalendarDays, User } from 'lucide-react';
import Checkbox from '../common/Checkbox';
import { TASK_STATUS, STATUS_LABELS } from '../../constants/project';
import { formatISODate } from '../../utils/dateUtils';

const statusBadgeClasses = {
  [TASK_STATUS.TODO]: 'bg-gray-100 text-gray-600',
  [TASK_STATUS.IN_PROGRESS]: 'bg-violet-100 text-violet-700',
  [TASK_STATUS.COMPLETED]: 'bg-green-100 text-green-700',
};

export default function TaskCard({ task, onToggle, onOpen, showCompletedTasks }) {
  const isCompleted = task.status === TASK_STATUS.COMPLETED;

  if (isCompleted && !showCompletedTasks) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusLabel = STATUS_LABELS[task.status] || task.status;
  const hasDependentStatus = task.status === TASK_STATUS.IN_PROGRESS;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'group mb-2 cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50',
        isCompleted && 'bg-gray-50 opacity-70',
      )}
      onClick={() => onOpen(task)}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className={clsx('text-sm font-medium', isCompleted ? 'text-gray-400 line-through' : 'text-gray-800')}>
          {task.name || 'Sin título'}
        </span>
        <Checkbox checked={isCompleted} onChange={() => onToggle(task)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            statusBadgeClasses[task.status],
          )}
        >
          {statusLabel}
        </span>
        {hasDependentStatus && task.precedents?.length > 0 && (
          <span className="text-amber-600">⚠ tiene antecedentes</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        {(task.startDate || task.endDate) && (
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {formatISODate(task.startDate)} → {formatISODate(task.endDate)}
          </span>
        )}
        {task.assignedUser && (
          <span className="flex items-center gap-1">
            <User size={12} />
            {task.assignedUser.name}
          </span>
        )}
        {task.comments?.length > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare size={12} />
            {task.comments.length}
          </span>
        )}
      </div>
    </div>
  );
}