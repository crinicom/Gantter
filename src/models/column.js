import { v4 as uuidv4 } from 'uuid';

// Columna canónica v1 (§12). Es el estado de cada carta.
export function createColumn(title, { wipLimit } = {}) {
  return {
    id: uuidv4(),
    title: title || '',
    wipLimit: wipLimit ?? null,
  };
}

export function normalizeColumn(column) {
  return {
    id: column?.id ?? null,
    title: column?.title || column?.name || '',
    wipLimit: column?.wipLimit ?? null,
  };
}
