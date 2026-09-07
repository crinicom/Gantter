// Anclaje de fechas del seed demo al día actual.
//
// El template `DB/sample_data.json` es estático (fechas absolutas) para que el
// diff quede limpio. Al sembrar (primer run o reset demo) se desplaza TODO el
// calendario del proyecto para que el hito ancla caiga `daysAhead` días desde
// hoy. Así las condiciones del demo (stale ~18 días, hito a ~7 días, overlap,
// missing-date) siguen vivas sin importar cuándo se restablece la demo.
//
// Solo mueve fechas: los gaps relativos se preservan exactos.

import { parseISO, addDays, differenceInCalendarDays, isValid, format } from 'date-fns';

function shiftDayDate(value, delta) {
  if (typeof value !== 'string' || !value.trim()) return value;
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return format(addDays(d, delta), 'yyyy-MM-dd');
}

function shiftTimestamp(value, delta) {
  if (typeof value !== 'string' || !value.trim()) return value;
  const d = parseISO(value);
  if (!isValid(d)) return value;
  return addDays(d, delta).toISOString();
}

// Devuelve una copia de `project` (canónico §12) con todas sus fechas corridas
// en `delta` días. No muta el original. Si falta el ancla, devuelve el mismo.
export function reanchorSeedDates(project, { anchorCardId, daysAhead = 7 } = {}) {
  const cards = Array.isArray(project?.cards) ? project.cards : [];
  if (cards.length === 0) return project;

  const anchor = anchorCardId
    ? cards.find((c) => c.milestone && c.id === anchorCardId)
    : null;
  const anchorDate = anchor?.endDate ? parseISO(anchor.endDate) : null;
  if (!anchorDate || !isValid(anchorDate)) return project;

  const delta = differenceInCalendarDays(addDays(new Date(), daysAhead), anchorDate);
  if (delta === 0) return project;

  const sDate = (v) => shiftDayDate(v, delta);
  const sTs = (v) => shiftTimestamp(v, delta);

  return {
    ...project,
    createdAt: sTs(project.createdAt),
    updatedAt: sTs(project.updatedAt),
    members: (project.members || []).map((m) => ({
      ...m,
      invitedAt: sTs(m.invitedAt),
      updatedAt: sTs(m.updatedAt),
    })),
    cards: cards.map((c) => ({
      ...c,
      startDate: sDate(c.startDate),
      endDate: sDate(c.endDate),
      createdAt: sTs(c.createdAt),
      updatedAt: sTs(c.updatedAt),
      lastActivityAt: sTs(c.lastActivityAt),
      comments: (c.comments || []).map((cm) => ({ ...cm, createdAt: sTs(cm.createdAt) })),
    })),
  };
}