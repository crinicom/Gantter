// Constantes y utilidades de layout para la vista Gantt (compartidas entre
// GanttHeader, GanttBar, GanttDependencyArrows y TodayLine).

export const GANTT = {
  BAR_HEIGHT: 24,
  ROW_HEIGHT: 40,
  WEEK_WIDTH: 84,
  DAY_WIDTH: 12,
  GROUP_HEADER_HEIGHT: 32,
};

export const MS_PER_DAY = 86400000;

export function daysToPx(days) {
  return days * GANTT.DAY_WIDTH;
}

export function toDayNumber(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor(d.getTime() / MS_PER_DAY);
}

export function dateOffsetPx(startDate, date) {
  const startNum = toDayNumber(startDate);
  const dateNum = toDayNumber(date);
  return daysToPx(dateNum - startNum);
}

export function dateRangePx(startDate, task) {
  const from = task.startDate ? new Date(task.startDate) : new Date(startDate);
  const to = task.endDate ? new Date(task.endDate) : from;
  const left = dateOffsetPx(startDate, from);
  const width = Math.max(GANTT.DAY_WIDTH, daysToPx((to - from) / MS_PER_DAY + 1));
  return { left, width };
}

export function projectStartDate(project) {
  const tasks = project?.tasks || [];
  const dates = tasks
    .filter((t) => t.startDate)
    .map((t) => new Date(t.startDate).getTime());
  const min = Math.min(...(dates.length ? dates : [Date.now()]));
  const d = new Date(min);
  // §6: el eje arranca ~10 días antes de hoy para dar aire y contexto a la izquierda.
  d.setDate(d.getDate() - 10);
  return d;
}

export function projectEndDate(project, startDate) {
  const tasks = project?.tasks || [];
  const dates = tasks
    .filter((t) => t.endDate)
    .map((t) => new Date(t.endDate).getTime());
  const max = Math.max(...(dates.length ? dates : [Date.now()]));
  const d = new Date(max);
  // §6: margen hacia adelante ~3 semanas para ver hitos próximos.
  d.setDate(d.getDate() + 21);
  return d;
}