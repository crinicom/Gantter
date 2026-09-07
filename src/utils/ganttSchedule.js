// Utilidades de programación para el Gantt (§6): solapamientos de responsables,
// cartas sin fechas e hitos.

// Detecta solapamiento de fechas entre cartas del mismo responsable. Devuelve
// `byTask` (ids de cartas con alguna barra que se pisa) y `byAssignee`
// (id de carta → nombres de responsables cuyas barras se pisan ahí).
export function findOverlaps(tasks) {
  const list = (tasks || []).filter((t) => t.startDate && t.endDate);
  const rangesByAssignee = new Map();
  list.forEach((t) => {
    (t.assignedUsers || []).forEach((u) => {
      if (!u?.id) return;
      if (!rangesByAssignee.has(u.id)) rangesByAssignee.set(u.id, []);
      rangesByAssignee.get(u.id).push({
        id: t.id,
        assignee: u,
        start: Date.parse(t.startDate),
        end: Date.parse(t.endDate),
      });
    });
  });

  const byAssignee = {};
  rangesByAssignee.forEach((ranges) => {
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const a = ranges[i];
        const b = ranges[j];
        if (a.start <= b.end && b.start <= a.end) {
          const namesA = byAssignee[a.id] || (byAssignee[a.id] = new Set());
          const namesB = byAssignee[b.id] || (byAssignee[b.id] = new Set());
          namesA.add(a.assignee.name || '');
          namesB.add(b.assignee.name || '');
        }
      }
    }
  });

  const byTask = {};
  Object.keys(byAssignee).forEach((id) => {
    byTask[id] = true;
  });
  return { byTask, byAssignee };
}

export const NO_DATES_GROUP_ID = '__sin-fechas__';

// Cartas sin rango completo (les falta inicio o fin): viven en el canal "Sin
// fechas", no se inventa una barra (§6).
export function tasksWithoutDates(tasks) {
  return (tasks || []).filter((t) => !(t.startDate && t.endDate));
}

// Hitos marcados (§6: se ven en el header del timeline).
export function milestones(tasks) {
  return (tasks || []).filter((t) => t.milestone && t.endDate);
}