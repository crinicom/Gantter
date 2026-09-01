import { parseISODate } from './dateUtils';
import { TASK_STATUS } from '../constants/project';

function durationDays(task) {
  if (!task.startDate || !task.endDate) return 0;
  const start = parseISODate(task.startDate);
  const end = parseISODate(task.endDate);
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
}

/**
 * Calcula el mapa de camino crítico (CPM) a partir del grafo de dependencias.
 * Devuelve un objeto { taskId: { earlyStart, earlyFinish, lateStart, lateFinish, slack, isCritical } }.
 * Las tareas sin fechas se ignoran.
 */
export function calculateCpmMap(tasks) {
  const datedTasks = (tasks || []).filter((t) => t.startDate && t.endDate);
  const taskMap = {};
  const byId = {};
  datedTasks.forEach((t) => {
    byId[t.id] = t;
  });

  const early = {};
  const computeEarly = (taskId, path, memo) => {
    const task = byId[taskId];
    if (!task) return 0;
    if (memo[taskId] !== undefined) return memo[taskId];

    const dur = durationDays(task);
    const precedents = (task.precedents || []).filter((id) => byId[id]);
    const maxPrecedentFinish = precedents.length
      ? Math.max(...precedents.map((id) => computeEarly(id, path, memo)))
      : 0;

    const earlyStart = maxPrecedentFinish;
    const earlyFinish = earlyStart + dur;
    memo[taskId] = earlyFinish;
    early[taskId] = { earlyStart, earlyFinish };
    return earlyFinish;
  };

  datedTasks.forEach((t) => computeEarly(t.id, [], {}));

  const projectEnd = datedTasks.length
    ? Math.max(...datedTasks.map((t) => early[t.id]?.earlyFinish ?? 0))
    : 0;

  const late = {};
  const computeLate = (taskId, memo) => {
    const task = byId[taskId];
    if (!task) return projectEnd;
    if (memo[taskId] !== undefined) return memo[taskId];

    const dur = durationDays(task);
    const dependents = (task.dependents || []).filter((id) => byId[id]);

    // El fin tardío de una tarea es el menor de los inicios tardíos de sus
    // dependientes; si no tiene dependientes, es el fin del proyecto.
    const lateFinish = dependents.length
      ? Math.min(...dependents.map((id) => computeLate(id, memo) - durationDays(byId[id])))
      : projectEnd;

    const lateStart = lateFinish - dur;
    memo[taskId] = lateFinish;
    late[taskId] = { lateStart, lateFinish };
    return lateFinish;
  };

  datedTasks.forEach((t) => computeLate(t.id, {}));

  datedTasks.forEach((task) => {
    const e = early[task.id] || { earlyStart: 0, earlyFinish: 0 };
    const l = late[task.id] || { lateStart: 0, lateFinish: 0 };
    const slack = l.lateFinish - e.earlyFinish;
    const isCritical = slack <= 0;
    taskMap[task.id] = {
      earlyStart: e.earlyStart,
      earlyFinish: e.earlyFinish,
      lateStart: l.lateStart,
      lateFinish: l.lateFinish,
      slack,
      isCritical,
      status: task.status,
    };
  });

  return taskMap;
}

export function isCriticalTask(cpmMap, task) {
  if (task.status === TASK_STATUS.COMPLETED) return false;
  const entry = cpmMap[task.id];
  return Boolean(entry && entry.isCritical);
}