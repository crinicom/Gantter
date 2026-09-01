import { v4 as uuidv4 } from 'uuid';
import { deserializeProject, inferOwnerId } from './projectStorage';

// Almacén v3: mapa de proyectos `{ [projectId]: Project }` en una sola clave.
const STORAGE_KEY = 'gantter.projects.v3';
const LEGACY_V2_KEY = 'gantter.project.v2';
const LEGACY_V1_KEY = 'gantter.project.v1';

function readRawStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Migra el documento único v1/v2 al almacén multi-proyecto (idempotente).
function migrateLegacy() {
  const legacy = localStorage.getItem(LEGACY_V2_KEY) || localStorage.getItem(LEGACY_V1_KEY);
  if (!legacy) return null;

  const project = deserializeProject(legacy);
  const id = project.id || uuidv4();
  const migrated = { ...project, id, ownerId: inferOwnerId(project) || 'u_demo' };
  writeStore({ [id]: migrated });
  localStorage.removeItem(LEGACY_V2_KEY);
  localStorage.removeItem(LEGACY_V1_KEY);
  return migrated;
}

export const LocalBackend = {
  name: 'local',

  async loadProjects() {
    const store = readRawStore();
    if (store) {
      return Object.values(store).map((p) => deserializeProject(p));
    }
    const migrated = migrateLegacy();
    if (migrated) return [migrated];
    return [];
  },

  async saveProject(project) {
    try {
      const store = readRawStore() || {};
      store[project.id] = project;
      writeStore(store);
      return true;
    } catch {
      return false;
    }
  },

  async deleteProject(projectId) {
    try {
      const store = readRawStore();
      if (!store) return true;
      delete store[projectId];
      writeStore(store);
      return true;
    } catch {
      return false;
    }
  },

  async loadSampleData() {
    const raw = await import('../../DB/sample_data.json');
    return deserializeProject(JSON.stringify(raw.default));
  },
};

export { STORAGE_KEY };