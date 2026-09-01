export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
};

export const STATUS_LABELS = {
  [TASK_STATUS.TODO]: 'En trabajo',
  [TASK_STATUS.IN_PROGRESS]: 'En trabajo',
  [TASK_STATUS.COMPLETED]: 'Finalizada',
};

export const PROJECT_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
};

export const DEFAULT_PROJECT_NAME = 'Proyecto sin título';