import { v4 as uuidv4 } from 'uuid';
import { TASK_STATUS } from '../constants/project';

export function createEmptyTask(bucketId) {
  return {
    id: uuidv4(),
    number: 0,
    name: '',
    description: '',
    assignedUsers: [],
    startDate: null,
    endDate: null,
    status: TASK_STATUS.TODO,
    progress: 0,
    blocked: false,
    blockedReason: '',
    milestone: false,
    comments: [],
    precedents: [],
    dependents: [],
    bucketId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// El número de carta (##N) es por proyecto, inmutable y se asigna en el orden
// de creación. Es la referencia humana ("me quedo con la 12") y el ancla
// robusta del reconocimiento de voz del huddle.
export function assignTaskNumbers(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  let seq = 1;
  return list.map((t) => {
    if (Number.isInteger(t?.number) && t.number > 0) {
      seq = Math.max(seq, t.number + 1);
      return t;
    }
    return { ...t, number: seq++ };
  });
}

export function nextTaskNumber(tasks) {
  let max = 0;
  (Array.isArray(tasks) ? tasks : []).forEach((t) => {
    if (Number.isInteger(t?.number) && t.number > max) max = t.number;
  });
  return max + 1;
}

export function isTaskCompleted(task) {
  return task.status === TASK_STATUS.COMPLETED;
}

export function hasPendingPrecedents(task, tasksById) {
  return (task.precedents || []).some((id) => {
    const precedent = tasksById[id];
    return precedent && !isTaskCompleted(precedent);
  });
}

export function canCompleteTask(task, tasksById) {
  return !hasPendingPrecedents(task, tasksById);
}

export function taskDurationInDays(task) {
  if (!task.startDate || !task.endDate) return 0;
  const start = new Date(task.startDate);
  const end = new Date(task.endDate);
  return Math.max(0, Math.round((end - start) / 86400000));
}