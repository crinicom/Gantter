import { DEFAULT_PROJECT_NAME } from '../constants/project';
import { normalizeBucket } from '../models/bucket';
import { normalizeMember } from '../models/member';
import { clampProgress } from '../utils/progress';

export function createDefaultProject() {
  return {
    id: null,
    name: DEFAULT_PROJECT_NAME,
    description: '',
    version: 0,
    members: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    buckets: [],
    tasks: [],
  };
}

export function normalizeProject(raw) {
  const defaults = createDefaultProject();
  const project = raw && typeof raw === 'object' ? raw : {};
  const buckets = Array.isArray(project.buckets) ? project.buckets : [];
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];

  return {
    ...defaults,
    ...project,
    createdAt: project.createdAt || defaults.createdAt,
    updatedAt: project.updatedAt || defaults.updatedAt,
    version:
      typeof project.version === 'number' && project.version >= 0 ? Math.floor(project.version) : 0,
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
  return 2;
}