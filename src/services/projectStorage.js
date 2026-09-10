import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_PROJECT_NAME,
  PROJECT_SETTINGS_DEFAULTS,
  DEFAULT_PROJECT_COLUMNS,
  ACTIVE_USER,
} from '../constants/project';
import { normalizeBucket } from '../models/bucket';
import { normalizeMember, MEMBER_ROLES, MEMBER_STATUS } from '../models/member';
import { normalizeColumn } from '../models/column';
import { normalizeCard } from '../models/card';
import { assignTaskNumbers } from '../models/task';
import { clampProgress } from '../utils/progress';

const NOW = () => new Date().toISOString();
const VALID_STATUS = new Set(['todo', 'in-progress', 'completed']);

// Nombre de la columna en el estado v1 (la columna ES el estado). Solo hay
// tres estados en el modelo de tareas legacy; el resto de columnas cae en todo.
function statusForColumn(title) {
  const t = (title || '').trim().toLowerCase();
  if (t === 'hecho' || t === 'finished' || t === 'done') return 'completed';
  if (t === 'en curso' || t === 'in progress' || t === 'in-progress') return 'in-progress';
  return 'todo';
}

// Convierte una lista de turnos legacy (bucketId/task) a columnas/cartas v1.
function toColumns(buckets) {
  return (buckets || []).map((b) => ({
    id: b.id ?? uuidv4(),
    title: b.name || '',
    wipLimit: b.wipLimit ?? null,
  }));
}

function toCards(tasks) {
  return (tasks || []).map((t) => ({
    id: t.id ?? uuidv4(),
    title: t.name || '',
    description: t.description || '',
    columnId: t.bucketId ?? null,
    assigneeIds: Array.isArray(t.assignedUsers)
      ? t.assignedUsers.map((u) => u?.id).filter(Boolean)
      : [],
    startDate: t.startDate ?? null,
    endDate: t.endDate ?? null,
    blocked: Boolean(t.blocked),
    blockedReason: t.blockedReason || '',
    milestone: Boolean(t.milestone),
    number: Number.isInteger(t.number) && t.number > 0 ? t.number : null,
    comments: Array.isArray(t.comments) ? t.comments : [],
    createdAt: t.createdAt || NOW(),
    updatedAt: t.updatedAt || NOW(),
    lastActivityAt: t.lastActivityAt || t.updatedAt || NOW(),
  }));
}

export function createDefaultProject() {
  const now = NOW();
  return {
    id: null,
    name: DEFAULT_PROJECT_NAME,
    description: '',
    teamName: '',
    summary: '',
    version: 4,
    ownerId: null,
    members: [],
    image: null,
    coverSeed: null,
    createdAt: now,
    updatedAt: now,
    // Runtime legacy (lo que siguen consumiendo Board/Gantt/context).
    buckets: DEFAULT_PROJECT_COLUMNS.map((title) => ({
      id: uuidv4(),
      name: title,
      color: '#2b4d42',
      collapsed: false,
      createdAt: now,
      updatedAt: now,
    })),
    tasks: [],
    // Canónico v1 (§12).
    columns: [],
    cards: [],
    inquiries: [],
    actionLog: [],
    huddle: null,
    settings: { ...PROJECT_SETTINGS_DEFAULTS },
  };
}

// Crea un proyecto nuevo con id, propietario (owner activo), portada aleatoria
// única (coverSeed) y fechas. La portada se asigna una sola vez al crear y no
// cambia salvo que el propietario suba una imagen propia. Los proyectos nuevos
// parten de dos columnas por defecto: "Por hacer" y "En curso".
export function createProject({ name, description = '', owner }) {
  const now = NOW();
  const ownerId = owner?.id || null;
  const doc = createDefaultProject();
  return {
    ...doc,
    id: uuidv4(),
    name: name || DEFAULT_PROJECT_NAME,
    description: description || '',
    ownerId,
    coverSeed: uuidv4(),
    members: owner && ownerId
      ? [
          {
            id: ownerId,
            name: owner.name || '',
            email: owner.email || '',
            role: MEMBER_ROLES.OWNER,
            status: MEMBER_STATUS.ACTIVE,
            initials: '',
            invitedBy: null,
            invitedAt: now,
            updatedAt: now,
          },
        ]
      : [],
    // Sincroniza el shape canónico con los buckets por defecto (mismos ids).
    columns: doc.buckets.map((b) => ({ id: b.id, title: b.name, wipLimit: null })),
    cards: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Deduce el owner de un documento legado (miembro con rol owner o el campo ownerId).
// Si no hay rastro de owner, la identidad v1 (Lucía) es el default para que el
// proyecto siga siendo visible al entrar.
export function inferOwnerId(project) {
  if (project?.ownerId) return project.ownerId;
  const owner = (project?.members || []).find((m) => m.role === MEMBER_ROLES.OWNER);
  return owner?.id || null;
}

// Identidades demo de versiones anteriores: v1 tiene una sola identidad activa
// (Lucía), así que un owner viejo/de autenticación antigua queda bajo ella.
const LEGACY_OWNER_ALIASES = { u_demo: ACTIVE_USER.id };

function resolveOwnerId(project) {
  const explicit = project?.ownerId || inferOwnerId(project);
  return LEGACY_OWNER_ALIASES[explicit] || explicit || ACTIVE_USER.id;
}

// Convierte ids de responsables (canónico) a la lista de runtime {id,name,email}.
function toAssigneeList(ids, members) {
  return (ids || [])
    .map((id) => {
      const m = (members || []).find((x) => x.id === id);
      return m ? { id: m.id, name: m.name, email: m.email || '' } : null;
    })
    .filter(Boolean);
}

function fromAssigneeList(task) {
  if (Array.isArray(task?.assignedUsers)) return task.assignedUsers;
  if (task?.assignedUser) return [{ ...task.assignedUser }];
  return [];
}

// --- Adaptadores canónico <-> runtime ---

function hasCanonicalShape(project) {
  return (
    project &&
    (Array.isArray(project.columns) || Array.isArray(project.cards)) &&
    !Array.isArray(project.buckets) &&
    !Array.isArray(project.tasks)
  );
}

// Convierte un documento canónico v1 (§12) a runtime legacy (buckets/tasks).
function fromDocumentCanonical(project) {
  const columns = (project.columns || []).map(normalizeColumn);
  const cards = (project.cards || []).map(normalizeCard);
  const buckets = columns.map((c, i) => ({
    id: c.id,
    name: c.title,
    color: '#2b4d42',
    collapsed: false,
    createdAt: NOW(),
    updatedAt: NOW(),
    wipLimit: c.wipLimit ?? null,
    order: i,
  }));
  const tasks = cards.map((card) => {
    const col = columns.find((c) => c.id === card.columnId);
    return {
      id: card.id,
      name: card.title,
      description: card.description,
      assignedUsers: toAssigneeList(card.assigneeIds, project.members),
      startDate: card.startDate ?? null,
      endDate: card.endDate ?? null,
      status: statusForColumn(col?.title),
      progress: card.blocked
        ? clampProgress(100)
        : statusForColumn(col?.title) === 'completed'
          ? 100
          : clampProgress(card.progress ?? 0),
      blocked: card.blocked,
      blockedReason: card.blockedReason || '',
      milestone: Boolean(card.milestone),
      number: Number.isInteger(card.number) && card.number > 0 ? card.number : 0,
      comments: Array.isArray(card.comments) ? card.comments : [],
      precedents: [],
      dependents: [],
      bucketId: card.columnId ?? null,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      lastActivityAt: card.lastActivityAt || card.updatedAt,
    };
  });
  // Backfill: números por proyecto, inmutable, en orden de creación (§10:
  // referencia humana "la 12" y ancla del ASR del huddle).
  const tasksWithNumbers = assignTaskNumbers(tasks);

  return {
    id: project.id ?? null,
    name: project.name || DEFAULT_PROJECT_NAME,
    description: project.summary || project.description || '',
    teamName: project.teamName || '',
    summary: project.summary || project.description || '',
    version:
      typeof project.version === 'number' && project.version >= 0
        ? Math.floor(project.version)
        : 0,
    ownerId: resolveOwnerId(project),
    members: Array.isArray(project.members)
      ? project.members.map(normalizeMember)
      : [],
    image: project.image ?? null,
    coverSeed: project.coverSeed || project.id || null,
    createdAt: project.createdAt || NOW(),
    updatedAt: project.updatedAt || NOW(),
    buckets,
    tasks: tasksWithNumbers,
    columns,
    cards,
    inquiries: Array.isArray(project.inquiries) ? project.inquiries : [],
    actionLog: Array.isArray(project.actionLog) ? project.actionLog : [],
    huddle: project.huddle ?? null,
    settings: {
      ...PROJECT_SETTINGS_DEFAULTS,
      ...(project.settings || {}),
    },
  };
}

// Convierte un proyecto runtime legacy a documento canónico v1 (§12).
// El runtime (buckets/tasks) es siempre la fuente de verdad; las columnas y
// cartas se derivan para obtener el documento persistido.
export function toDocument(runtime) {
  const p = runtime && typeof runtime === 'object' ? runtime : {};
  const buckets = Array.isArray(p.buckets) ? p.buckets : [];
  const tasks = Array.isArray(p.tasks) ? p.tasks : [];
  const columns = toColumns(buckets);
  const cards = toCards(tasks);

  const now = NOW();
  return {
    id: p.id ?? null,
    name: p.name || DEFAULT_PROJECT_NAME,
    teamName: p.teamName || '',
    summary: p.summary || p.description || '',
    version:
      typeof p.version === 'number' && p.version >= 0 ? Math.floor(p.version) : 0,
    ownerId: resolveOwnerId(p),
    members: Array.isArray(p.members) ? p.members.map(normalizeMember) : [],
    image: p.image ?? null,
    coverSeed: p.coverSeed || p.id || null,
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
    columns,
    cards,
    inquiries: Array.isArray(p.inquiries) ? p.inquiries : [],
    actionLog: Array.isArray(p.actionLog) ? p.actionLog : [],
    huddle: p.huddle ?? null,
    settings: { ...PROJECT_SETTINGS_DEFAULTS, ...(p.settings || {}) },
  };
}

export function normalizeProject(raw) {
  const project = raw && typeof raw === 'object' ? raw : {};
  if (hasCanonicalShape(project)) {
    return fromDocumentCanonical(project);
  }
  // Legacy v2/v3 o runtime: normalizar y re-generar el shape canónico.
  const explicitBuckets = Array.isArray(project.buckets) ? project.buckets : [];
  const explicitCols = Array.isArray(project.columns) ? project.columns : [];
  const hasKanban =
    explicitBuckets.length > 0 || explicitCols.length > 0;
  const buckets = hasKanban ? explicitBuckets : createDefaultProject().buckets;
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const id = project.id || null;

  const cols = explicitCols.length > 0
    ? explicitCols.map(normalizeColumn)
    : toColumns(buckets);
  const cardList = Array.isArray(project.cards) && project.cards.length > 0
    ? project.cards.map(normalizeCard)
    : toCards(tasks);

  const notes = Array.isArray(tasks)
    ? tasks.map((task) => ({
        ...task,
        progress: clampProgress(task.progress),
        precedents: Array.isArray(task.precedents) ? task.precedents : [],
        dependents: Array.isArray(task.dependents) ? task.dependents : [],
        comments: Array.isArray(task.comments) ? task.comments : [],
        assignedUsers: fromAssigneeList(task),
        blocked: Boolean(task.blocked),
        blockedReason: task.blockedReason || '',
        milestone: Boolean(task.milestone),
        status: VALID_STATUS.has(task.status) ? task.status : statusForColumn('todo'),
      }))
    : [];

  const now = NOW();
  return {
    ...createDefaultProject(),
    id,
    name: project.name || DEFAULT_PROJECT_NAME,
    description: project.summary || project.description || '',
    teamName: project.teamName || '',
    summary: project.summary || project.description || '',
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now,
    version:
      typeof project.version === 'number' && project.version >= 0
        ? Math.floor(project.version)
        : 0,
    ownerId: resolveOwnerId(project),
    image: typeof project.image === 'string' && project.image ? project.image : null,
    coverSeed:
      typeof project.coverSeed === 'string' && project.coverSeed
        ? project.coverSeed
        : id,
    members: Array.isArray(project.members) ? project.members.map(normalizeMember) : [],
    buckets: buckets.map(normalizeBucket),
    tasks: assignTaskNumbers(notes),
    columns: cols,
    cards: cardList,
    inquiries: Array.isArray(project.inquiries) ? project.inquiries : [],
    actionLog: Array.isArray(project.actionLog) ? project.actionLog : [],
    huddle: project.huddle ?? null,
    settings: { ...PROJECT_SETTINGS_DEFAULTS, ...(project.settings || {}) },
  };
}

// El documento persistido es SIEMPRE canónico v1.
export function serializeProject(project) {
  return JSON.stringify(toDocument(normalizeProject(project)), null, 2);
}

export function deserializeProject(rawJson) {
  try {
    const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    return normalizeProject(parsed);
  } catch {
    return createDefaultProject();
  }
}

export function projectStoredVersion() {
  return 4;
}
