import { v4 as uuidv4 } from 'uuid';
import { deserializeProject, toDocument } from './projectStorage';
import { reanchorSeedDates } from '../utils/seedAnchoring';

// El template del seed es estático; al sembrar se ancla el hito go-live a ~7
// días de hoy para que stale/overlap/missing-date del demo sigan vivos.
const SEED_ANCHOR = { anchorCardId: 'card_go_live', daysAhead: 7 };

// Almacén v4: mapa de proyectos `{ [projectId]: DocumentoCanónico }` en una
// sola clave. El documento persistido es canónico v1 (§12); al cargar se
// normaliza a runtime (buckets/tasks).
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
  const migrated = {
    ...project,
    id,
    // el owner ya quedó resuelto por deserializeProject (identidad v1: Lucía).
    coverSeed: project.coverSeed || id,
  };
  writeStore({ [id]: toDocument(migrated) });
  localStorage.removeItem(LEGACY_V2_KEY);
  localStorage.removeItem(LEGACY_V1_KEY);
  return migrated;
}

// Retorna los proyectos del seed (canónico §13) normalizados a runtime.
export async function loadSeedProjects() {
  const { default: raw } = await import('../../DB/sample_data.json');
  const list = Array.isArray(raw?.projects) ? raw.projects : (raw ? [raw] : []);
  return list.map((p) => deserializeProject(JSON.stringify(reanchorSeedDates(p, SEED_ANCHOR))));
}

export const LocalBackend = {
  name: 'local',

  async loadProjects() {
    const store = readRawStore();
    if (store) {
      return Object.values(store)
        .filter((p) => p && p.id)
        .map((p) => deserializeProject(p));
    }
    const migrated = migrateLegacy();
    if (migrated) return [migrated];
    // First run: sembrar 2 proyectos demo y persistirlos para que Home y la
    // persistencia arranquen con contenido (Board y Gantt no quedan en blanco).
    const seeds = await loadSeedProjects();
    writeStore(Object.fromEntries(seeds.map((s) => [s.id, toDocument(s)])));
    return seeds;
  },

  async saveProject(project) {
    try {
      const store = readRawStore() || {};
      if (project?.id) store[project.id] = toDocument(project);
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
    return loadSeedProjects();
  },
};

export { STORAGE_KEY };
