import { deserializeProject, serializeProject, createDefaultProject } from './projectStorage';

const STORAGE_KEY = 'gantter.project.v2';
const LEGACY_STORAGE_KEY = 'gantter.project.v1';

export const LocalBackend = {
  name: 'local',

  async loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return deserializeProject(raw);

      // Migración desde el esquema v1 (ya normalizado al cargar; el primer
      // guardado escribirá en la clave v2 y eliminará la antigua).
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) return deserializeProject(legacy);

      return createDefaultProject();
    } catch {
      return createDefaultProject();
    }
  },

  async saveProject(project) {
    try {
      localStorage.setItem(STORAGE_KEY, serializeProject(project));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
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