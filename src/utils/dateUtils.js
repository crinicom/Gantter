import { format, parseISO, startOfWeek, addDays, differenceInCalendarDays, isValid } from 'date-fns';

export function formatISODate(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'yyyy-MM-dd') : null;
}

export function parseISODate(isoString) {
  if (!isoString) return null;
  const d = parseISO(isoString);
  return isValid(d) ? d : null;
}

export function startOfWeekDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function addDaysTo(date, days) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addDays(d, days);
}

export function diffInDays(dateA, dateB) {
  const a = typeof dateA === 'string' ? parseISO(dateA) : dateA;
  const b = typeof dateB === 'string' ? parseISO(dateB) : dateB;
  return differenceInCalendarDays(a, b);
}

export function getWeekRange(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const start = startOfWeek(d, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  return { start, end };
}

export function getProjectDateRange(tasks) {
  if (!tasks || tasks.length === 0) return null;
  const starts = tasks.map((t) => parseISODate(t.startDate)).filter(Boolean);
  const ends = tasks.map((t) => parseISODate(t.endDate)).filter(Boolean);
  const all = [...starts, ...ends];
  if (all.length === 0) return null;
  const min = new Date(Math.min(...all.map((d) => d.getTime())));
  const max = new Date(Math.max(...all.map((d) => d.getTime())));
  return { start: min, end: max };
}

export function getOffset(startDate, date) {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return diffInDays(d, start);
}

export function getWeekDates(startDate, endDate) {
  const weeks = [];
  let cursor = startOfWeekDate(startDate);
  const last = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  while (cursor <= last) {
    weeks.push({
      start: cursor,
      end: addDays(cursor, 6),
      label: format(cursor, 'dd/MM'),
    });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function todayISO() {
  return formatISODate(new Date());
}