import { v4 as uuidv4 } from 'uuid';
import { TASK_STATUS } from '../constants/project';

// Carta canónica v1 (§12): fuente única para Kanban y Gantt.
export function createCard({ columnId, title, ...rest } = {}) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title: title || '',
    description: '',
    columnId: columnId ?? null,
    assigneeIds: [],
    startDate: null,
    endDate: null,
    blocked: false,
    blockedReason: '',
    milestone: false,
    comments: [],
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    ...rest,
  };
}

export function normalizeCard(card) {
  const now = new Date().toISOString();
  const c = card && typeof card === 'object' ? card : {};
  const createdAt = c.createdAt || now;
  return {
    id: c.id ?? null,
    title: c.title || '',
    description: c.description || '',
    columnId: c.columnId ?? null,
    assigneeIds: Array.isArray(c.assigneeIds) ? c.assigneeIds : [],
    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,
    blocked: Boolean(c.blocked),
    blockedReason: c.blockedReason || '',
    milestone: Boolean(c.milestone),
    comments: Array.isArray(c.comments) ? c.comments : [],
    createdAt,
    updatedAt: c.updatedAt || createdAt,
    lastActivityAt: c.lastActivityAt || c.updatedAt || createdAt,
  };
}
