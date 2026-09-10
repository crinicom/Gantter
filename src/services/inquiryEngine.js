// Motor de interpelaciones de Maia (§8). Determinístico: sin LLM. Dado el
// proyecto (runtime §12) y el set de inquiries vigentes, produce el set nuevo
// de inquiries + entradas de log. Escribe solo cuando algo cambió (anti-loop):
// el rescan con las mismas entradas devuelve lo mismo.
//
// Reglas:
//  - thin / unassigned / stale aplican a cartas activas en columnas de trabajo
//    (Listo / En curso), nunca en Backlog ni Hecho.
//  - missing-date aplica a cartas "sanas" sin rango completo que estén en la
//    columna de un hito próximo (≤ milestoneWindowDays) o en la columna de
//    trabajo previa; no se duplica sobre cartas que ya avisan thin/unassigned.
//  - overlap: un inquiry por responsable con barras que se pisan (findOverlaps).
//  - La identidad del hilo es `kind:cardId`; Snoozed se respeta; cuando la
//    condición desaparece se auto-resuelve con motivo + entrada en el log.

import { v4 as uuidv4 } from 'uuid';
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import { TASK_STATUS } from '../constants/project';
import { findOverlaps } from '../utils/ganttSchedule';
import {
  INQUIRY_KINDS,
  INQUIRY_STATUS,
  MAIA_DEFAULTS,
  WORKING_COLUMNS,
} from '../constants/maia';
import { defaultProposalsFor } from './proposalEngine';

function normColumnTitle(title) {
  return String(title || '')
    .trim()
    .toLowerCase();
}

function isWorkingColumn(title) {
  return WORKING_COLUMNS.has(normColumnTitle(title));
}

function columnTitleOf(task, buckets) {
  const bucket = (buckets || []).find((b) => b.id === task.bucketId);
  return bucket?.name || '';
}

// Columna de trabajo inmediatamente anterior a otra en el orden del tablero.
function previousColumnOf(bucketId, buckets) {
  const idx = buckets.findIndex((b) => b.id === bucketId);
  for (let i = idx - 1; i >= 0; i--) {
    if (isWorkingColumn(buckets[i].name)) return buckets[i].id;
  }
  return null;
}

function daysBetween(now, value) {
  const d = parseISO(value);
  if (!isValid(d)) return null;
  return differenceInCalendarDays(now, d);
}

// Días que faltan desde hoy hasta `value` (positivo si es futuro).
function daysUntil(now, value) {
  const d = parseISO(value);
  if (!isValid(d)) return null;
  return differenceInCalendarDays(d, now);
}

function titleOf(task) {
  return task?.name || task?.title || 'Carta sin título';
}

function isCompleted(task) {
  return Boolean(task) && task.status === TASK_STATUS.COMPLETED;
}

const KIND_RESOLVE_TEXTS = {
  [INQUIRY_KINDS.THIN]: (t, ctx) =>
    ctx.hasFullDates && ctx.descLen(t) >= ctx.minDescriptionChars
      ? `«${titleOf(t)}» ganó descripción`
      : `«${titleOf(t)}» salió del trabajo activo`,
  [INQUIRY_KINDS.UNASSIGNED]: (t, ctx) =>
    ctx.hasAssignees(t) ? `«${titleOf(t)}» tomó responsable` : `«${titleOf(t)}» salió del trabajo activo`,
  [INQUIRY_KINDS.STALE]: (t, ctx) =>
    ctx.staleDaysNow(t) <= ctx.staleDays ? `«${titleOf(t)}» volvió a moverse` : `«${titleOf(t)}» salió del trabajo activo`,
  [INQUIRY_KINDS.MISSING_DATE]: (t, ctx) => {
    if (ctx.hasFullDates(t)) return `«${titleOf(t)}» cargó sus fechas`;
    if (!ctx.hasNearMilestone) return `«${titleOf(t)}» ya no pisa un hito próximo`;
    return `«${titleOf(t)}» salió del trabajo activo`;
  },
  [INQUIRY_KINDS.OVERLAP]: () => 'Se despejó el solapamiento de barras',
};

function resolveReasonFor(inq, tasks, ctx) {
  const task = inq.cardId ? (tasks || []).find((t) => t.id === inq.cardId) : null;
  if (task && isCompleted(task)) return `«${titleOf(task)}» se finalizó`;
  const text = KIND_RESOLVE_TEXTS[inq.kind];
  return text ? text(task, ctx) : 'La condición que la originó ya no está';
}

export function scanInquiries(project, { existingInquiries = [], now = new Date() } = {}) {
  const buckets = Array.isArray(project?.buckets) ? project.buckets : [];
  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
  const settings = project?.settings || {};
  const staleDays = settings.staleDays ?? MAIA_DEFAULTS.staleDays;
  const minDescriptionChars =
    settings.minDescriptionChars ?? MAIA_DEFAULTS.minDescriptionChars;
  const milestoneWindowDays =
    settings.milestoneWindowDays ?? MAIA_DEFAULTS.milestoneWindowDays;

  // Hitos próximos (no finalizados): marcan la ventana de missing-date.
  const milestoneCandidates = tasks
    .filter((t) => t.milestone && !isCompleted(t) && t.endDate)
    .map((t) => ({ task: t, days: daysUntil(now, t.endDate) }));
  const nearMilestones = milestoneCandidates
    .filter((m) => m.days !== null && m.days >= 0 && m.days <= milestoneWindowDays);

  const ctx = {
    hasFullDates: (t) => Boolean(t && t.startDate && t.endDate),
    descLen: (t) => ((t && t.description) || '').trim().length,
    hasAssignees: (t) => Array.isArray(t?.assignedUsers) && t.assignedUsers.length > 0,
    staleDaysNow: (t) => {
      const d = daysBetween(now, t && (t.lastActivityAt || t.updatedAt || t.createdAt));
      return d === null ? 0 : d;
    },
    staleDays,
    minDescriptionChars,
    hasNearMilestone: nearMilestones.length > 0,
  };

  const workingTask = (t) =>
    !isCompleted(t) && !t.milestone && isWorkingColumn(columnTitleOf(t, buckets));

  // --- Genera candidatos por kind -------------------------------------------
  const candidates = [];

  tasks.forEach((t) => {
    if (!workingTask(t)) return;
    const descLen = ctx.descLen(t);

    if (descLen < minDescriptionChars) {
      candidates.push({
        kind: INQUIRY_KINDS.THIN,
        cardId: t.id,
        evidence: `Descripción corta (${descLen} car.).`,
        question:
          'Recién abierta, esta carta no cuenta qué conlleva. Si alguien la toma mañana, ¿qué no sabría todavía?',
      });
    }

    if (!ctx.hasAssignees(t)) {
      candidates.push({
        kind: INQUIRY_KINDS.UNASSIGNED,
        cardId: t.id,
        evidence: 'Sin responsable en una columna de trabajo.',
        question: `Esta carta está en «${columnTitleOf(t, buckets)}» sin dueño. ¿De quién sería el siguiente movimiento?`,
      });
    }

    const since = daysBetween(now, t.lastActivityAt || t.updatedAt || t.createdAt);
    if (since !== null && since > staleDays) {
      candidates.push({
        kind: INQUIRY_KINDS.STALE,
        cardId: t.id,
        evidence: `Última actividad hace ${since} días.`,
        question: `Lleva ${since} días sin movimiento. ¿Sigue siendo trabajo activo o es un recuerdo del plan?`,
      });
    }
  });

  // missing-date: cartas sin fechas en la ruta de un hito próximo, sin duplicar
  // avisos de thin/unassigned sobre la misma carta.
  if (nearMilestones.length > 0) {
    const relevantColumns = new Set();
    nearMilestones.forEach(({ task: m }) => {
      relevantColumns.add(m.bucketId);
      const prev = previousColumnOf(m.bucketId, buckets);
      if (prev) relevantColumns.add(prev);
    });

    const alreadyFlagged = new Set(
      candidates.filter((c) => c.kind !== INQUIRY_KINDS.MISSING_DATE).map((c) => c.cardId),
    );
    const milestone = nearMilestones[0];
    tasks.forEach((t) => {
      if (!workingTask(t)) return;
      if (alreadyFlagged.has(t.id)) return;
      if (ctx.hasFullDates(t)) return;
      if (!relevantColumns.has(t.bucketId)) return;
      candidates.push({
        kind: INQUIRY_KINDS.MISSING_DATE,
        cardId: t.id,
        evidence: `Sin rango de fechas, hito «${titleOf(milestone.task)}» a ${milestone.days} días.`,
        question: `El hito «${titleOf(milestone.task)}» está a ${milestone.days} días y esta carta no tiene fechas. ¿Qué habría que comprometer esta semana?`,
      });
    });
  }

  // overlap: una pregunta por responsable con barras que se pisan.
  const overlayTasks = tasks.filter((t) => !isCompleted(t) && ctx.hasFullDates(t));
  const { byAssignee } = findOverlaps(overlayTasks);
  const nameToTasks = new Map();
  Object.entries(byAssignee).forEach(([taskId, names]) => {
    names.forEach((name) => {
      if (!name) return;
      if (!nameToTasks.has(name)) nameToTasks.set(name, new Set());
      nameToTasks.get(name).add(taskId);
    });
  });
  nameToTasks.forEach((taskIds, name) => {
    const count = taskIds.size;
    const anchorId = Array.from(taskIds).sort()[0];
    candidates.push({
      kind: INQUIRY_KINDS.OVERLAP,
      cardId: anchorId,
      evidence: `${count} barras de ${name} que se pisan.`,
      question: `${name} tiene ${count} barras que se pisan. ¿Cuál es la prioridad real de esta semana?`,
    });
  });

  // --- Fusiona con los inquiries vigentes (conserva hilo, respeta snooze) ---
  const key = (c) => `${c.kind}:${c.cardId || ''}`;
  const wanted = new Map(candidates.map((c) => [key(c), c]));
  const inquiries = [];
  const logEntries = [];
  const tick = now.toISOString();

  existingInquiries.forEach((inq) => {
    const k = key(inq);
    if (!wanted.has(k)) {
      if (inq.status === INQUIRY_STATUS.RESOLVED) {
        inquiries.push(inq);
        return;
      }
      const reason = resolveReasonFor(inq, tasks, ctx);
      inquiries.push({
        ...inq,
        status: INQUIRY_STATUS.RESOLVED,
        updatedAt: tick,
        resolvedAt: tick,
        resolvedNote: reason,
      });
      logEntries.push({
        id: uuidv4(),
        at: tick,
        source: 'auto',
        summary: reason,
        cardId: inq.cardId || null,
      });
      return;
    }
    const fresh = wanted.get(k);
    wanted.delete(k);
    // Evidencia viva (P2 de la review del slice 4/5): una pregunta persistente
    // conserva id, hilo, propuestas, status y snooze, pero la pregunta y la
    // evidencia se refrescan del candidato fresco (días de stale, columna,
    // hito próximo, conteo de solapadas). Si nada cambió, se reutiliza el
    // objeto (anti-loop de `sameSet` intacto).
    if (inq.question === fresh.question && inq.evidence === fresh.evidence) {
      inquiries.push(inq);
      return;
    }
    inquiries.push({ ...inq, question: fresh.question, evidence: fresh.evidence, updatedAt: tick });
  });

  wanted.forEach((c) => {
    const id = uuidv4();
    const base = {
      id,
      projectId: project?.id || null,
      cardId: c.cardId,
      kind: c.kind,
      question: c.question,
      evidence: c.evidence,
      status: INQUIRY_STATUS.OPEN,
      thread: [],
      createdAt: tick,
      updatedAt: tick,
    };
    inquiries.push({
      ...base,
      proposals: defaultProposalsFor(project, base, { now }),
    });
  });

  const rank = (s) =>
    s === INQUIRY_STATUS.OPEN ? 0 : s === INQUIRY_STATUS.CHATTING ? 1 : s === INQUIRY_STATUS.SNOOZED ? 2 : 3;
  inquiries.sort(
    (a, b) => rank(a.status) - rank(b.status) || a.createdAt.localeCompare(b.createdAt),
  );

  return { inquiries, logEntries };
}

// Helper exportado para tests del sinónimo de columnas.
export { isWorkingColumn };