import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import clsx from 'clsx';
import TaskCard from './TaskCard';
import AddTaskForm from './AddTaskForm';
import { bucketProgress } from '../../utils/progress';

export default function BucketColumn({ bucket, tasks, showCompletedTasks, onOpenTask, onToggleTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.id });
  const progress = bucketProgress(tasks, bucket.id);

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex w-72 flex-col rounded-lg border border-gray-200 bg-gray-100/60 p-2',
        isOver && 'border-forest-400 bg-forest-50',
      )}
    >
      <div className="mb-1.5 px-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700" style={{ borderLeft: `3px solid ${bucket.color || '#2B4D42'}`, paddingLeft: 6 }}>
            {bucket.name}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            {tasks.length}
            {bucket.wipLimit != null && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  tasks.length > bucket.wipLimit
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-200 text-gray-500',
                )}
                title="Límite de trabajo en curso (informativo, no bloquea)"
              >
                {tasks.length}/{bucket.wipLimit}
              </span>
            )}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-gray-200">
            <div
              className="h-full rounded bg-forest-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-gray-500">{progress}%</span>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              showCompletedTasks={showCompletedTasks}
              onToggle={onToggleTask}
              onOpen={onOpenTask}
            />
          ))}
        </SortableContext>
      </div>

      <div className="mt-2">
        <AddTaskForm bucketId={bucket.id} />
      </div>
    </div>
  );
}