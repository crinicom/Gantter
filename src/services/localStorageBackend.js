import { deserializeProject, serializeProject, createDefaultProject } from './projectStorage';

const STORAGE_KEY = 'gantter.project.v1';

export const LocalBackend = {
  name: 'local',

  async loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultProject();
      return deserializeProject(raw);
    } catch {
      return createDefaultProject();
    }
  },

  async saveProject(project) {
    try {
      localStorage.setItem(STORAGE_KEY, serializeProject(project));
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