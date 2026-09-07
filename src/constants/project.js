export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
};

export const STATUS_LABELS = {
  [TASK_STATUS.TODO]: 'En trabajo',
  [TASK_STATUS.IN_PROGRESS]: 'En progreso',
  [TASK_STATUS.COMPLETED]: 'Finalizada',
};

export const PROJECT_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
};

export const DEFAULT_PROJECT_NAME = 'Proyecto sin título';

// Identidad v1: única persona activa. Los proyectos seed la usan como owner
// para que sean visibles al entrar.
export const ACTIVE_USER = {
  id: 'u_lucia',
  name: 'Lucía Ríos',
  email: 'lucia.rios@rio.local',
  picture: null,
};

export const PROJECT_SETTINGS_DEFAULTS = {
  applyMode: 'confirm',
  staleDays: 15,
};

// Columnas por defecto de un proyecto nuevo (shape v1: la columna es el estado).
export const DEFAULT_PROJECT_COLUMNS = ['Por hacer', 'En curso'];