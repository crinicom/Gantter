// Generación determinística de propuestas por inquiry (§8 "acciones típicas").
// Sin LLM y sin efectos: cada propuesta es una ProposedAction con target/payload
// resuelto cuando se puede resolver (miembro con menos carga, hito próximo,
// bucket Backlog). Las que requieren dictado del usuario se marcan `needsInput`
// y se completan en el chat (slice 6). `autoEligible` decide qué propuestas
// admite el modo auto de §9 (asignación 1:1, fechar, bloquear).

import { v4 as uuidv4 } from 'uuid';
import { findOverlaps } from '../utils/ganttSchedule';
import { INQUIRY_KINDS, WORKING_COLUMNS, MAIA_DEFAULTS, PROPOSAL_STATUS } from '../constants/maia';
import { TASK_STATUS } from '../constants/project';

function normColumnTitle(title) {
  return String(title || '')
    .trim()
    .toLowerCase();
}

function isWorkingColumn(title) {
  return WORKING_COLUMNS.has(normColumnTitle(title));
}

function isCompleted(task) {
  return Boolean(task) && task.status === TASK_STATUS.COMPLETED;
}

function hasFullDates(task) {
  return Boolean(task && task.startDate && task.endDate);
}

function hasAssignees(task) {
  return Array.isArray(task?.assignedUsers) && task.assignedUsers.length > 0;
}

function titleOf(task) {
  return task?.title || task?.name || 'Carta sin título';
}

function bucketOf(task, buckets) {
  return (buckets || []).find((b) => b.id === task?.bucketId);
}

function daysUntil(now, value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((new Date(d).setUTCHours(0, 0, 0, 0) - new Date(now).setUTCHours(0, 0, 0, 0)) / 86400000);
}

function iso(now) {
  return new Date(now).toISOString().slice(0, 10);
}

function memberById(members, id) {
  return (members || []).find((m) => m.id === id) || null;
}

// Carga relativa: cuántos trabajos activos tiene asignados un miembro.
function activeTasks(project) {
  const buckets = project?.buckets || [];
  return (project?.tasks || []).filter(
    (t) => !isCompleted(t) && isWorkingColumn(bucketOf(t, buckets)?.name),
  );
}

function loadOf(memberId, project) {
  return activeTasks(project).filter((t) =>
    (t.assignedUsers || []).some((u) => (u && u.id) === memberId),
  ).length;
}

// Miembro con menos carga activa; desempata por nombre para ser determinístico.
function leastLoadedMember(project, { excludeIds = [] } = {}) {
  const excluded = new Set(excludeIds);
  const candidates = (project?.members || []).filter((m) => !excluded.has(m.id));
  if (candidates.length === 0) return null;
  return candidates
    .map((m) => ({ member: m, load: loadOf(m.id, project) }))
    .sort((a, b) => a.load - b.load || a.member.name.localeCompare(b.member.name))[0].member;
}

function nearMilestone(project, now, windowDays) {
  const tasks = project?.tasks || [];
  const candidates = tasks
    .filter((t) => t.milestone && !isCompleted(t) && t.endDate)
    .map((t) => ({ task: t, days: daysUntil(now, t.endDate) }))
    .filter((m) => m.days !== null && m.days >= 0 && m.days <= windowDays)
    .sort((a, b) => a.days - b.days);
  return candidates[0] || null;
}

function staleDaysOf(project) {
  return project?.settings?.staleDays ?? MAIA_DEFAULTS.staleDays;
}

function workingDueTime(task, project, now) {
  const ts = Date.parse(task?.lastActivityAt || task?.updatedAt || task?.createdAt);
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.round((now.getTime() - ts) / 86400000));
}

// Armador de propuesta estándar.
function proposal(inquiry, action, label, payload = {}, extra = {}) {
  const needsInput = Boolean(extra.needsInput);
  return {
    id: uuidv4(),
    inquiryId: inquiry.id,
    action,
    label,
    payload: { taskId: inquiry.cardId || null, ...payload, ...(extra.payload || {}) },
    needsInput,
    status: PROPOSAL_STATUS.PENDING,
    comment: extra.comment || null,
  };
}

export function defaultProposalsFor(project, inquiry, { now = new Date() } = {}) {
  const kind = inquiry?.kind;
  const task = inquiry?.cardId
    ? (project?.tasks || []).find((t) => t.id === inquiry.cardId) || null
    : null;
  const buckets = project?.buckets || [];
  const proposals = [];

  if (!task) return proposals;

  switch (kind) {
    case INQUIRY_KINDS.THIN: {
      proposals.push(
        proposal(inquiry, 'set-description', 'Dictar qué implica esta carta', {}, { needsInput: true }),
      );
      break;
    }
    case INQUIRY_KINDS.UNASSIGNED: {
      const exclude = (task.assignedUsers || []).map((u) => (u && u.id) || u);
      const member = leastLoadedMember(project, { excludeIds: exclude });
      if (member) {
        proposals.push(
          proposal(
            inquiry,
            'assign',
            `Asignar «${titleOf(task)}» a ${member.name}`,
            { memberId: member.id },
            { comment: `Esta carta estaba en «${bucketOf(task, buckets)?.name || ''}» sin dueño. Quedó asignada a ${member.name}, que es quien hoy tiene menos carga.` },
          ),
        );
      } else {
        proposals.push(
          proposal(inquiry, 'assign', 'Elegir responsable', {}, { needsInput: true }),
        );
      }
      break;
    }
    case INQUIRY_KINDS.STALE: {
      const backlog = buckets.find((b) => normColumnTitle(b.name) === 'backlog') || null;
      if (backlog) {
        proposals.push(
          proposal(
            inquiry,
            'move',
            `Mover a «${backlog.name}»`,
            { bucketId: backlog.id },
            { comment: `Hace ${workingDueTime(task, project, now)} días que esta carta no se mueve. Quedó archivada en «${backlog.name}» como recuerdo del plan.` },
          ),
        );
      }
      if (!task.blocked) {
        proposals.push(
          proposal(
            inquiry,
            'set-blocked',
            'Marcar como bloqueada',
            { blocked: true },
            { comment: `Lleva ${workingDueTime(task, project, now)} días sin movimiento. Quedó marcada como bloqueada para que se note.` },
          ),
        );
      }
      break;
    }
    case INQUIRY_KINDS.MISSING_DATE: {
      const windowDays = project?.settings?.milestoneWindowDays ?? MAIA_DEFAULTS.milestoneWindowDays;
      const milestone = nearMilestone(project, now, windowDays);
      if (milestone && !task.startDate) {
        proposals.push(
          proposal(
            inquiry,
            'set-dates',
            `Fechar desde hoy hasta «${titleOf(milestone.task)}»`,
            { startDate: iso(now), endDate: milestone.task.endDate },
            { comment: `La carta no tenía fechas y el hito «${titleOf(milestone.task)}» está a ${milestone.days} días. Quedó fechada de hoy a ${milestone.task.endDate}.` },
            { needsInput: false },
          ),
        );
      } else {
        proposals.push(
          proposal(inquiry, 'set-dates', 'Definir fechas', {}, { needsInput: true }),
        );
      }
      break;
    }
    case INQUIRY_KINDS.OVERLAP: {
      const overlayTasks = (project?.tasks || []).filter((t) => !isCompleted(t) && hasFullDates(t));
      const { byAssignee } = findOverlaps(overlayTasks);
      const group = Object.entries(byAssignee).find(
        ([taskId]) => taskId === inquiry.cardId,
      );
      if (group) {
        const names = Array.from(group[1] || []).filter(Boolean);
        if (names.length > 0) {
          const tasksOf = overlayTasks.filter((t) =>
            names.every((name) => (t.assignedUsers || []).some((u) => (u && u.name) === name)),
          );
          const target =
            tasksOf
              .filter((t) => t.id !== inquiry.cardId)
              .sort((a, b) => a.endDate.localeCompare(b.endDate))[0] || task;
          const exclude = (target.assignedUsers || []).map((u) => (u && u.id) || u);
          const member = leastLoadedMember(project, { excludeIds: exclude });
          if (member) {
            proposals.push(
              proposal(
                inquiry,
                'assign',
                `Reasignar «${titleOf(target)}» a ${member.name}`,
                { taskId: target.id, memberId: member.id },
                { comment: `Las barras de ${names.join(' y ')} se pisaban. «${titleOf(target)}» quedó con ${member.name} para despejarlas.` },
                { payload: { taskId: target.id, memberId: member.id } },
              ),
            );
          } else {
            proposals.push(
              proposal(inquiry, 'assign', 'Definir dueño de la barra', {}, { needsInput: true }),
            );
          }
          break;
        }
      }
      proposals.push(
        proposal(inquiry, 'assign', 'Definir dueño de la barra', {}, { needsInput: true }),
      );
      break;
    }
    default:
      break;
  }

  return proposals;
}

// Propuestas que el modo auto puede aplicar sin diálogo (§9 "obvios"):
// asignar al descartarla de un match 1:1, fechar y bloquear. Los movimientos de
// archivo y las reasignaciones de overlap piden criterio humano (o chat).
export function autoEligible(proposal, kind) {
  if (!proposal || proposal.needsInput) return false;
  if (kind === INQUIRY_KINDS.UNASSIGNED && proposal.action === 'assign') return true;
  if (kind === INQUIRY_KINDS.MISSING_DATE && proposal.action === 'set-dates') return true;
  if (kind === INQUIRY_KINDS.STALE && proposal.action === 'set-blocked') return true;
  return false;
}