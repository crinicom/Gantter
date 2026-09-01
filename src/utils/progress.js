import { taskDurationInDays } from '../models/task';

// Peso de una tarea para ponderar el avance por duración.
// Las tareas sin fechas pesan 1 para no distorsionar el promedio.
export function taskWeight(task) {
  return Math.max(1, taskDurationInDays(task));
}

// Normaliza un valor de progreso a un entero entre 0 y 100.
export function clampProgress(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

// % de avance de un conjunto de tareas, ponderado por duración.
export function projectProgress(tasks) {
  const list = tasks || [];
  if (list.length === 0) return 0;
  const totalWeight = list.reduce((acc, t) => acc + taskWeight(t), 0);
  if (totalWeight === 0) return 0;
  const weightedProgress = list.reduce(
    (acc, t) => acc + clampProgress(t.progress) * taskWeight(t),
    0,
  );
  return Math.round(weightedProgress / totalWeight);
}

// % de avance de las tareas de un bucket concreto.
export function bucketProgress(tasks, bucketId) {
  return projectProgress((tasks || []).filter((t) => t.bucketId === bucketId));
}