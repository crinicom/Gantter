// Aplicación determinística de propuestas de Maie (§9/§12). Puro y sin contexto:
// `apply(project, proposal)` devuelve el proyecto nuevo con la tarea tocada, el
// comentario de Maie con la evidencia y la entrada de actionLog (fuente
// auto|confirm). `canApply` valida que la condición que originó la propuesta
// siga presente (nunca aplicar propuestas vencidas).

import { v4 as uuidv4 } from 'uuid';
import { TASK_STATUS } from '../constants/project';
import { MAIE_DEFAULTS } from '../constants/maie';

function staleDaysOf(project) {
  return project?.settings?.staleDays ?? MAIE_DEFAULTS.staleDays;
}

function workingSinceDays(task, now) {
  const ts = Date.parse(task?.lastActivityAt || task?.updatedAt || task?.createdAt);
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.round((now.getTime() - ts) / 86400000));
}

export function canApply(project, proposal, { now = new Date() } = {}) {
  if (!proposal || proposal.needsInput || proposal.status !== 'pending') return false;
  const task = (project?.tasks || []).find((t) => t.id === proposal.payload?.taskId);
  if (!task || task.status === TASK_STATUS.COMPLETED) return false;

  switch (proposal.action) {
    case 'assign': {
      const memberId = proposal.payload?.memberId;
      const exists = (project?.members || []).some((m) => m.id === memberId);
      const already = (task.assignedUsers || []).some((u) => (u && u.id) === memberId);
      return exists && !already;
    }
    case 'move': {
      const bucketId = proposal.payload?.bucketId;
      const exists = (project?.buckets || []).some((b) => b.id === bucketId);
      if (!exists || task.bucketId === bucketId) return false;
      return workingSinceDays(task, now) > staleDaysOf(project);
    }
    case 'set-dates': {
      const { startDate, endDate } = proposal.payload || {};
      const valid = startDate && endDate && String(startDate) <= String(endDate);
      const hasBoth = Boolean(task.startDate && task.endDate);
      return valid && !hasBoth;
    }
    case 'set-blocked':
      return Boolean(task) && !task.blocked && workingSinceDays(task, now) > staleDaysOf(project);
    case 'set-description':
      return Boolean(proposal.payload?.text?.trim());
    case 'add-comment':
      return true;
    default:
      return false;
  }
}

function patchTask(project, proposal, { now, source }) {
  const tasks = (project?.tasks || []).map((t) => {
    if (t.id !== proposal.payload?.taskId) return t;
    let next = t;
    const at = now.toISOString();
    switch (proposal.action) {
      case 'assign': {
        const member = (project?.members || []).find((m) => m.id === proposal.payload?.memberId);
        if (!member) return t;
        const list = [...(t.assignedUsers || [])];
        if (list.some((u) => (u && u.id) === member.id)) return t;
        list.push(member);
        next = { ...t, assignedUsers: list };
        break;
      }
      case 'move':
        next = { ...t, bucketId: proposal.payload?.bucketId };
        break;
      case 'set-dates':
        next = {
          ...t,
          startDate: proposal.payload?.startDate ?? t.startDate,
          endDate: proposal.payload?.endDate ?? t.endDate,
        };
        break;
      case 'set-blocked':
        next = {
          ...t,
          blocked: true,
          blockedReason:
            proposal.payload?.blockedReason || 'Marcada al aplicar la propuesta de Maie.',
        };
        break;
      case 'set-description':
        next = { ...t, description: proposal.payload?.text ?? t.description };
        break;
      case 'add-comment':
        next = t;
        break;
      default:
        return t;
    }
    const comment = { id: uuidv4(), author: 'Maie', text: '', createdAt: at };
    if (proposal.action === 'add-comment') {
      comment.text = proposal.payload?.text || proposal.comment || '';
    } else {
      comment.text = proposal.comment || proposal.label;
    }
    return {
      ...next,
      updatedAt: at,
      lastActivityAt: at,
      comments: comment.text ? [...(t.comments || []), comment] : t.comments || [],
    };
  });
  return { ...project, tasks };
}

// Devuelve el proyecto nuevo + la entrada de actionLog de la aplicación.
// `source` es 'auto' (modo auto) o 'confirm' (Sí en confirmar).
export function apply(project, proposal, { source = 'confirm', now = new Date() } = {}) {
  const nextProject = patchTask(project, proposal, { now, source });
  const at = now.toISOString();
  const task = (nextProject?.tasks || []).find((t) => t.id === proposal.payload?.taskId);
  const summary = proposal.comment || proposal.label;
  const logEntry = {
    id: uuidv4(),
    at,
    source,
    summary,
    cardId: proposal.payload?.taskId || null,
  };
  return {
    project: { ...nextProject, actionLog: [...(nextProject.actionLog || []), logEntry] },
    logEntry,
    task,
  };
}

// Ordena qué propuestas puede aplicar el modo auto sobre el set de inquiries.
export function selectAutoActions(project, inquiries, { canAutoApply } = {}) {
  return (inquiries || [])
    .filter((inq) => inq.status === 'open' || inq.status === 'chatting')
    .flatMap((inq) =>
      (inq.proposals || [])
        .filter((p) => p.status === 'pending' && !p.needsInput)
        .filter((p) => (canAutoApply ? canAutoApply(p, inq.kind) : true))
        .filter((p) => canApply(project, p))
        .map((p) => ({ inquiry: inq, proposal: p })),
    );
}

export const applyEngine = { canApply, apply, selectAutoActions };