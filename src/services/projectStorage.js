import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_PROJECT_NAME } from '../constants/project';
import { normalizeBucket } from '../models/bucket';
import { normalizeMember, MEMBER_ROLES, MEMBER_STATUS } from '../models/member';
import { clampProgress } from '../utils/progress';

export function createDefaultProject() {
  return {
    id: null,
    name: DEFAULT_PROJECT_NAME,
    description: '',
    version: 0,
    ownerId: null,
    members: [],
    image: null,
    coverSeed: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    buckets: [],
    tasks: [],
  };
}

// Crea un proyecto nuevo con id, propietario (owner activo), portada aleatoria
// única (coverSeed) y fechas. La portada se asigna una sola vez al crear y no
// cambia salvo que el propietario suba una imagen propia.
export function createProject({ name, description = '', owner }) {
  const now = new Date().toISOString();
  const ownerId = owner?.id || null;
  return {
    ...createDefaultProject(),
    id: uuidv4(),
    name: name || DEFAULT_PROJECT_NAME,
    description: description || '',
    ownerId,
    coverSeed: uuidv4(),
    members: owner
      ? [
          {
            id: ownerId,
            name: owner.name || '',
            email: owner.email || '',
            role: MEMBER_ROLES.OWNER,
            status: MEMBER_STATUS.ACTIVE,
            invitedBy: null,
            invitedAt: now,
            updatedAt: now,
          },
        ]
      : [],
    createdAt: now,
    updatedAt: now,
  };
}

// Deduce el owner de un documento legado (miembro con rol owner o el campo ownerId).
export function inferOwnerId(project) {
  if (project?.ownerId) return project.ownerId;
  const owner = (project?.members || []).find((m) => m.role === MEMBER_ROLES.OWNER);
  return owner?.id || null;
}

export function normalizeProject(raw) {
  const defaults = createDefaultProject();
  const project = raw && typeof raw === 'object' ? raw : {};
  const buckets = Array.isArray(project.buckets) ? project.buckets : [];
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const id = project.id || null;

  return {
    ...defaults,
    ...project,
    id,
    createdAt: project.createdAt || defaults.createdAt,
    updatedAt: project.updatedAt || defaults.updatedAt,
    version:
      typeof project.version === 'number' && project.version >= 0 ? Math.floor(project.version) : 0,
    ownerId: project.ownerId || null,
    image: typeof project.image === 'string' && project.image ? project.image : null,
    coverSeed:
      typeof project.coverSeed === 'string' && project.coverSeed ? project.coverSeed : id,
    members: Array.isArray(project.members) ? project.members.map(normalizeMember) : [],
    buckets: buckets.map(normalizeBucket),
    tasks: tasks.map((task) => ({
      ...task,
      progress: clampProgress(task.progress),
      precedents: Array.isArray(task.precedents) ? task.precedents : [],
      dependents: Array.isArray(task.dependents) ? task.dependents : [],
      comments: Array.isArray(task.comments) ? task.comments : [],
    })),
  };
}

export function serializeProject(project) {
  return JSON.stringify(normalizeProject(project), null, 2);
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
  return 3;
}