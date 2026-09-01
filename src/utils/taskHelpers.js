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

  // Rechazar el vínculo si el antecedente ya depende (directa o
  // transitivamente) de la tarea: crearía un ciclo A→B y B→A.
  if (helper_wouldCreateCycle(tasks, precedentId, dependentId)) return tasks;

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

// ¿El antecedente tiene a la tarea entre sus antecedentes transitivos?
function helper_wouldCreateCycle(tasks, newPrecedentId, dependentId) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const stack = [newPrecedentId];
  const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (id === dependentId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const task = byId.get(id);
    (task?.precedents || []).forEach((p) => {
      if (!seen.has(p)) stack.push(p);
    });
  }
  return false;
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