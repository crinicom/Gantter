import React, { useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import Checkbox from '../common/Checkbox';
import BucketColumn from './BucketColumn';
import AddBucketForm from './AddBucketForm';
import TaskModal from '../task/TaskModal';
import { useProject } from '../../hooks/useProject';

export default function BoardView() {
  const { project, moveTaskToBucket, toggleTaskCompleted } = useProject();
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const tasks = project?.tasks || [];
  const buckets = project?.buckets || [];

  const tasksByBucket = useMemo(() => {
    const map = {};
    buckets.forEach((b) => {
      map[b.id] = [];
    });
    tasks.forEach((t) => {
      const bucketId = t.bucketId;
      if (map[bucketId]) map[bucketId].push(t);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    });
    return map;
  }, [buckets, tasks]);

  const handleDragEnd = ({ active, over }) => {
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Dropped inside a bucket column.
    if (over.id !== activeTask.bucketId && buckets.some((b) => b.id === over.id)) {
      moveTaskToBucket(activeTask.id, over.id);
      return;
    }

    // Reordering within same bucket: not persisted (only visual) — keep simple,
    // reordering is meaningful in Gantt; here we only move across buckets.
  };

  const getSelectedTask = () => tasks.find((t) => t.id === selectedTaskId) || null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Tablero</h1>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <Checkbox checked={showCompletedTasks} onChange={() => setShowCompletedTasks((v) => !v)} />
          Mostrar tareas finalizadas
        </label>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {buckets.map((bucket) => (
            <BucketColumn
              key={bucket.id}
              bucket={bucket}
              tasks={tasksByBucket[bucket.id] || []}
              showCompletedTasks={showCompletedTasks}
              onOpenTask={(task) => setSelectedTaskId(task.id)}
              onToggleTask={(task) => toggleTaskCompleted(task.id)}
            />
          ))}
          <div className="shrink-0">
            <AddBucketForm />
          </div>
        </div>
      </DndContext>

      {selectedTaskId && <TaskModal task={getSelectedTask()} onClose={() => setSelectedTaskId(null)} open={Boolean(selectedTaskId)} />}
    </div>
  );
}