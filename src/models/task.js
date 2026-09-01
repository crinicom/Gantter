import { v4 as uuidv4 } from 'uuid';
import { TASK_STATUS } from '../constants/project';

export function createEmptyTask(bucketId) {
  return {
    id: uuidv4(),
    name: '',
    description: '',
    assignedUser: null,
    startDate: null,
    endDate: null,
    status: TASK_STATUS.TODO,
    progress: 0,
    comments: [],
    precedents: [],
    dependents: [],
    bucketId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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