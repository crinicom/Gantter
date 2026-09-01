import { createEmptyTask } from '../models/task';
import { TASK_STATUS } from '../constants/project';

export { createEmptyTask };

export function getTaskStatus(task) {
  return task.status || TASK_STATUS.TODO;
}

export function linkTasks(tasks, precedentId, dependentId) {
  if (precedentId === dependentId) return tasks;

  const hasPrecedent = tasks.some(
    (t) => t.id === dependentId && (t.precedents || []).includes(precedentId),
  );
  if (hasPrecedent) return tasks;

  return tasks.map((task) => {
    if (task.id === dependentId) {
      return { ...task, precedents: [...(task.precedents || []), precedentId] };
    }
    if (task.id === precedentId) {
      return { ...task, dependents: [...(task.dependents || []), dependentId] };
    }
    return task;
  });
}

export function unlinkTasks(tasks, precedentId, dependentId) {
  return tasks.map((task) => {
    if (task.id === dependentId) {
      return {
        ...task,
        precedents: (task.precedents || []).filter((id) => id !== precedentId),
      };
    }
    if (task.id === precedentId) {
      return {
        ...task,
        dependents: (task.dependents || []).filter((id) => id !== dependentId),
      };
    }
    return task;
  });
}

export function getPrecedentTasks(tasks, taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return [];
  return (task.precedents || [])
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean);
}

export function getDependentTasks(tasks, taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return [];
  return (task.dependents || [])
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean);
}