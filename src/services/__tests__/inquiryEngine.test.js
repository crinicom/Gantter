import { describe, it, expect } from 'vitest';
import { scanInquiries } from '../inquiryEngine';
import { INQUIRY_STATUS } from '../../constants/maia';
import { TASK_STATUS } from '../../constants/project';

const DAY = 86400000;
const day = (offset) => new Date(Date.now() + offset * DAY).toISOString();
const date = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

const martin = { id: 'u_martin', name: 'Martín Vega' };
const lucia = { id: 'u_lucia', name: 'Lucía Ríos' };
const diego = { id: 'u_diego', name: 'Diego Luna' };

const buckets = [
  { id: 'b_backlog', name: 'Backlog' },
  { id: 'b_listo', name: 'Listo' },
  { id: 'b_curso', name: 'En curso' },
  { id: 'b_hecho', name: 'Hecho' },
];

function task(overrides) {
  return {
    id: 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: 'Tarea',
    description: '',
    assignedUsers: [lucia],
    status: TASK_STATUS.TODO,
    startDate: date(-2),
    endDate: date(2),
    milestone: false,
    comments: [],
    createdAt: day(-30),
    updatedAt: day(-30),
    lastActivityAt: day(-30),
    ...overrides,
  };
}

function portalProject(overrides = {}) {
  return {
    id: 'p_portal',
    name: 'Portal de clientes',
    version: 1,
    members: [martin, lucia, diego],
    buckets,
    tasks: [
      task({
        id: 't_stale',
        name: 'Rediseñar onboarding',
        bucketId: 'b_curso',
        description: 'Nuevo primer logueo con estados y vacío amable.',
        startDate: null,
        endDate: null,
        lastActivityAt: day(-18),
      }),
      task({
        id: 't_auth',
        name: 'Auth magic link',
        bucketId: 'b_listo',
        description: '',
        assignedUsers: [],
        startDate: null,
        endDate: null,
        lastActivityAt: day(-3),
      }),
      task({
        id: 't_doc',
        name: 'Documentar API pública',
        bucketId: 'b_listo',
        description: '',
        assignedUsers: [lucia],
        startDate: null,
        endDate: null,
        lastActivityAt: day(-3),
      }),
      task({
        id: 't_qa',
        name: 'QA staging release',
        bucketId: 'b_listo',
        description: 'Prueba de integración completa en staging antes del corte.',
        assignedUsers: [diego],
        startDate: null,
        endDate: null,
        lastActivityAt: day(-1),
      }),
      task({
        id: 't_checkout',
        name: 'Migrar checkout a v3',
        bucketId: 'b_curso',
        description: 'Checkout web bajo el nuevo motor de pagos.',
        startDate: date(-2),
        endDate: date(2),
        assignedUsers: [martin],
        lastActivityAt: day(-2),
      }),
      task({
        id: 't_analytics',
        name: 'Analytics de conversión',
        bucketId: 'b_listo',
        description: 'Embudo de conversión del checkout y tablón de resultados.',
        startDate: date(0),
        endDate: date(4),
        assignedUsers: [martin],
        lastActivityAt: day(-1),
      }),
      task({
        id: 't_go_live',
        name: 'Go-live portal',
        bucketId: 'b_curso',
        milestone: true,
        startDate: date(7),
        endDate: date(7),
      }),
      task({
        id: 't_done',
        name: 'Fix timeout 3DS',
        bucketId: 'b_hecho',
        status: TASK_STATUS.COMPLETED,
      }),
      task({
        id: 't_backlog',
        name: 'Copy legal de reembolsos',
        bucketId: 'b_backlog',
        description: '',
        assignedUsers: [],
      }),
    ],
    settings: { staleDays: 15 },
    ...overrides,
  };
}

const byKind = (list, kind) =>
  list.filter((i) => i.kind === kind).map((i) => `${i.kind}:${i.cardId}`);

describe('scanInquiries', () => {
  it('detecta los 5 kinds sobre el proyecto demo (una por condición destacada)', () => {
    const { inquiries } = scanInquiries(portalProject());

    // thin: auth y doc (ambas sin descripción); auth además unassigned.
    expect(byKind(inquiries, 'thin')).toContain('thin:t_auth');
    expect(byKind(inquiries, 'thin')).toContain('thin:t_doc');
    expect(byKind(inquiries, 'unassigned')).toEqual(['unassigned:t_auth']);

    // stale: la carta sin actividad desde hace 18 días (default 15).
    expect(byKind(inquiries, 'stale')).toContain('stale:t_stale');

    // missing-date: QA en la columna previa al hito (Listo → En curso), sin
    // duplicarse sobre cartas que ya avisan thin/unassigned.
    expect(byKind(inquiries, 'missing-date')).toEqual(['missing-date:t_qa']);

    // overlap: solo Martín tiene barras que se pisan.
    expect(byKind(inquiries, 'overlap')).toEqual(['overlap:t_analytics']);

    const overlap = inquiries.find((i) => i.kind === 'overlap');
    expect(overlap.question).toContain('Martín');
  });

  it('ignora Backlog, Hecho y cartas finalizadas; no pregunta dos veces una carta flaca', () => {
    const { inquiries } = scanInquiries(portalProject());
    const cardIds = new Set(inquiries.map((i) => i.cardId));
    expect(cardIds.has('t_backlog')).toBe(false);
    expect(cardIds.has('t_done')).toBe(false);
    expect(byKind(inquiries, 'missing-date')).not.toContain('missing-date:t_auth');
    expect(byKind(inquiries, 'missing-date')).not.toContain('missing-date:t_doc');
  });

  it('proyecto saludable (App móvil) no genera preguntas', () => {
    const { inquiries } = scanInquiries({
      ...portalProject({
        id: 'p_movil',
        tasks: [
          task({ id: 'm1', name: 'Push de notificaciones', bucketId: 'b_hecho', status: TASK_STATUS.COMPLETED }),
          task({ id: 'm2', name: 'Ajuste de fuentes', bucketId: 'b_backlog', description: '', assignedUsers: [] }),
        ],
      }),
    });
    expect(inquiries).toHaveLength(0);
  });

  it('es estable: rescannear con el mismo set no duplica ni genera log', () => {
    const first = scanInquiries(portalProject());
    const again = scanInquiries(portalProject(), { existingInquiries: first.inquiries });
    expect(again.inquiries.map((i) => i.id).sort()).toEqual(
      first.inquiries.map((i) => i.id).sort(),
    );
    expect(again.logEntries).toHaveLength(0);
  });

  it('auto-resuelve cuando la condición desaparece y deja registro con motivo', () => {
    const first = scanInquiries(portalProject());
    // La carta estancada vuelve a moverse hace 1 día.
    const project = portalProject();
    project.tasks.find((t) => t.id === 't_stale').lastActivityAt = day(-1);

    const { inquiries, logEntries } = scanInquiries(project, {
      existingInquiries: first.inquiries,
    });

    const stale = inquiries.find((i) => i.cardId === 't_stale' && i.kind === 'stale');
    expect(stale.status).toBe(INQUIRY_STATUS.RESOLVED);
    expect(stale.resolvedNote).toContain('volvió a moverse');
    expect(logEntries.some((e) => e.summary.includes('volvió a moverse'))).toBe(true);
    // Al volver a moverse sin fechas y en la columna del hito, la misma carta se
    // reflota ahora como missing-date (cambio de lente, no duplicación).
    expect(inquiries.some((i) => i.kind === 'missing-date' && i.cardId === 't_stale')).toBe(true);
    expect(inquiries.filter((i) => i.status === INQUIRY_STATUS.OPEN).length).toBe(first.inquiries.filter((i) => i.status === INQUIRY_STATUS.OPEN).length);
  });

  it('respeta Snoozed: la condición sigue → no se reabre y no genera log', () => {
    const first = scanInquiries(portalProject());
    const parked = first.inquiries.map((i) =>
      i.cardId === 't_stale' ? { ...i, status: INQUIRY_STATUS.SNOOZED } : i,
    );
    const { inquiries, logEntries } = scanInquiries(portalProject(), {
      existingInquiries: parked,
    });
    const stale = inquiries.find((i) => i.cardId === 't_stale');
    expect(stale.status).toBe(INQUIRY_STATUS.SNOOZED);
    expect(logEntries).toHaveLength(0);
  });

  it('P2: un inquiry persistente refresca evidencia y pregunta sin perder hilo ni propuestas', () => {
    const first = scanInquiries(portalProject());
    const staleFirst = first.inquiries.find((i) => i.kind === 'stale');
    const later = new Date(Date.now() + 3 * DAY);

    const { inquiries } = scanInquiries(portalProject(), {
      existingInquiries: first.inquiries,
      now: later,
    });
    const stale = inquiries.find((i) => i.kind === 'stale');

    expect(stale.id).toBe(staleFirst.id);
    expect(stale.evidence).toBe('Última actividad hace 21 días.');
    expect(stale.question).toContain('Lleva 21 días');
    expect(stale.proposals.map((p) => p.id)).toEqual(staleFirst.proposals.map((p) => p.id));
    expect(stale.thread).toEqual(staleFirst.thread);
    expect(stale.updatedAt).not.toBe(staleFirst.updatedAt);
  });

  it('P2: rescannear con el mismo estado no toca updatedAt (sin churn)', () => {
    const first = scanInquiries(portalProject());
    const again = scanInquiries(portalProject(), { existingInquiries: first.inquiries });
    expect(again.logEntries).toHaveLength(0);
    const firstById = new Map(first.inquiries.map((i) => [i.id, i]));
    for (const inq of again.inquiries) {
      expect(inq.updatedAt).toBe(firstById.get(inq.id).updatedAt);
    }
  });

  it('P2: la pregunta unassigned refleja la columna actual al moverse la carta', () => {
    const first = scanInquiries(portalProject());
    const unFirst = first.inquiries.find((i) => i.kind === 'unassigned');
    const moved = portalProject();
    moved.tasks.find((t) => t.id === 't_auth').bucketId = 'b_curso';

    const { inquiries } = scanInquiries(moved, { existingInquiries: first.inquiries });
    const un = inquiries.find((i) => i.kind === 'unassigned');

    expect(un.id).toBe(unFirst.id);
    expect(unFirst.question).toContain('«Listo»');
    expect(un.question).toContain('«En curso»');
    expect(un.evidence).toBe('Sin responsable en una columna de trabajo.');
  });
});