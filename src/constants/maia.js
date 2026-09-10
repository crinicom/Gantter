// Catálogo de interpelaciones de Maia (§8) y defaults del panel (§7). Los IDs
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

// Estados de una propuesta de acción (§12 ProposedAction).
export const PROPOSAL_STATUS = {
  PENDING: 'pending',
  APPLIED: 'applied',
  DISMISSED: 'dismissed',
};

export const MAIA_ROLE = 'Facilitadora';

// Rituales de huddle (§10). Los IDs son internos en inglés; solo standup lleva
// el guion demo que muta el tablero (§17.5).
export const HUDDLE_RITUALS = [
  {
    id: 'standup',
    label: 'Standup de los miércoles',
    description: 'Ronda del equipo seed: replay del standup que mueve cartas reales.',
    demo: true,
  },
  {
    id: 'refinement',
    label: 'Refinamiento',
    description: 'Pulir cartas flacas o sin dueño antes de la iteración.',
    demo: false,
  },
  {
    id: 'planning',
    label: 'Planning',
    description: 'Definir qué entra esta iteración y con qué fechas.',
    demo: false,
  },
  {
    id: 'blockers',
    label: 'Despeje de bloqueos',
    description: 'Sacar del medio las cartas trabadas del camino.',
    demo: false,
  },
];

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

export const MAIA_DEFAULTS = {
  staleDays: 15,
  minDescriptionChars: 20,
  milestoneWindowDays: 10,
};

// Columnas donde Maia "pregunta de trabajo": Listo / En curso (u equivalentes).
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