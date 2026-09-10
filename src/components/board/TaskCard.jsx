import React from 'react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, CalendarDays } from 'lucide-react';
import Checkbox from '../common/Checkbox';
import { TASK_STATUS, STATUS_LABELS } from '../../constants/project';
import { formatISODate } from '../../utils/dateUtils';
import { initialsOf } from '../../models/member';
import { clampProgress } from '../../utils/progress';
import { useProject } from '../../hooks/useProject';
import { useHuddleHighlights } from '../../context/MaiaContext';

const statusBadgeClasses = {
  [TASK_STATUS.TODO]: 'bg-gray-100 text-gray-600',
  [TASK_STATUS.IN_PROGRESS]: 'bg-forest-100 text-forest-700',
  [TASK_STATUS.COMPLETED]: 'bg-green-100 text-green-700',
};

export default function TaskCard({ task, onToggle, onOpen, showCompletedTasks }) {
  const { setTaskProgress } = useProject();
  const highlightedTaskIds = useHuddleHighlights();
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const progress = clampProgress(task.progress);
  const style = {};
  if (isCompleted && !showCompletedTasks) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  style.transform = CSS.Transform.toString(transform);
  style.transition = transition;

  const statusLabel = STATUS_LABELS[task.status] || task.status;
  const hasDependentStatus = task.status === TASK_STATUS.IN_PROGRESS;
  const highlighted = highlightedTaskIds.has(task.id);

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
        task.blocked && 'border-l-4 border-l-red-500',
        highlighted && 'ring-2 ring-forest-500',
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
          <span className="rounded-full bg-rust/15 px-2 py-0.5 text-[10px] font-medium text-rust">
            tiene antecedentes
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          disabled={isCompleted}
          onChange={(e) => setTaskProgress(task.id, Number(e.target.value))}
          aria-label={`Avance de ${task.name || 'la tarea'}`}
          className="h-1 w-full cursor-pointer accent-forest-600 disabled:opacity-50"
        />
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-gray-500">
          {progress}%
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        {(task.startDate || task.endDate) && (
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {formatISODate(task.startDate)} → {formatISODate(task.endDate)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          {(task.assignedUsers || []).slice(0, 3).map((user) => (
            <span
              key={user.id}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600"
              title={user.name}
            >
              {initialsOf(user.name)}
            </span>
          ))}
          {(task.assignedUsers || []).length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{(task.assignedUsers || []).length - 3}
            </span>
          )}
        </span>
        {task.blocked && (
          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
            bloqueada
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