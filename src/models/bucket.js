import { v4 as uuidv4 } from 'uuid';

export function createEmptyBucket() {
  return {
    id: uuidv4(),
    name: '',
    color: '#2b4d42',
    collapsed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeBucket(bucket) {
  const defaults = {
    id: null,
    name: '',
    color: '#2b4d42',
    collapsed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...defaults, ...(bucket || {}) };
}