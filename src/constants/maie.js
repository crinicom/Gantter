// Catálogo de interpelaciones de Maie (§8) y defaults del panel (§7). Los IDs
// son internos en inglés; el copy de producto va en español (tono socrático).

export const INQUIRY_KINDS = {
  THIN: 'thin',
  UNASSIGNED: 'unassigned',
  STALE: 'stale',
  MISSING_DATE: 'missing-date',
  OVERLAP: 'overlap',
};

export const INQUIRY_STATUS = {
  OPEN: 'open',
  CHATTING: 'chatting',
  RESOLVED: 'resolved',
  SNOOZED: 'snoozed',
};

export const MAIE_ROLE = 'Facilitadora';

// Etiquetas cortas para los badges de kind (§14: rust para stale/overlap, bosque para ok).
export const INQUIRY_KIND_META = {
  [INQUIRY_KINDS.THIN]: { label: 'Flaca', tone: 'muted' },
  [INQUIRY_KINDS.UNASSIGNED]: { label: 'Sin dueño', tone: 'forest' },
  [INQUIRY_KINDS.STALE]: { label: 'Estancada', tone: 'rust' },
  [INQUIRY_KINDS.MISSING_DATE]: { label: 'Sin fechas', tone: 'muted' },
  [INQUIRY_KINDS.OVERLAP]: { label: 'Solapada', tone: 'rust' },
};

export const INQUIRY_STATUS_LABELS = {
  [INQUIRY_STATUS.OPEN]: 'Abierta',
  [INQUIRY_STATUS.CHATTING]: 'En diálogo',
  [INQUIRY_STATUS.SNOOZED]: 'Aparcada',
  [INQUIRY_STATUS.RESOLVED]: 'Resuelta',
};

export const MAIE_DEFAULTS = {
  staleDays: 15,
  minDescriptionChars: 20,
  milestoneWindowDays: 10,
};

// Columnas donde Maie "pregunta de trabajo": Listo / En curso (u equivalentes).
// Backlog, Hecho y revisión quedan fuera: no insistir en lo que aún no se tomaría.
export const WORKING_COLUMNS = new Set([
  'listo',
  'ready',
  'en curso',
  'en progreso',
  'in progress',
  'in-progress',
  'doing',
]);