import { describe, it, expect } from 'vitest';
import { defaultProposalsFor, autoEligible } from '../proposalEngine';

const DAY = 86400000;
const day = (offset) => new Date(Date.now() + offset * DAY).toISOString();
const date = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

const members = [
  { id: 'm_lucia', name: 'Lucía Ríos' },
  { id: 'm_martin', name: 'Martín Vega' },
];

const buckets = [
  { id: 'b_backlog', name: 'Backlog' },
  { id: 'b_listo', name: 'Listo' },
  { id: 'b_curso', name: 'En curso' },
];

function task(overrides = {}) {
  return {
    id: 't_' + Math.random().toString(36).slice(2, 8),
    title: 'Carta',
    name: 'Carta',
    description: '',
    assignedUsers: [],
    startDate: null,
    endDate: null,
    status: 'todo',
    blocked: false,
    milestone: false,
    comments: [],
    bucketId: 'b_listo',
    createdAt: day(-30),
    updatedAt: day(-30),
    lastActivityAt: day(-30),
    ...overrides,
  };
}

function project(overrides = {}) {
  return {
    id: 'proj_1',
    members,
    buckets,
    tasks: [],
    settings: {},
    ...overrides,
  };
}

describe('defaultProposalsFor', () => {
  it('thin pide dictar la descripción (needsInput)', () => {
    const t = task();
    const p = project({ tasks: [t] });
    const inq = { id: 'q1', kind: 'thin', cardId: t.id };
    const ps = defaultProposalsFor(p, inq, { now: new Date() });
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ action: 'set-description', needsInput: true, status: 'pending' });
    expect(ps[0].payload.taskId).toBe(t.id);
  });

  it('unassigned asigna al miembro con menos carga (empate por nombre)', () => {
    const t = task();
    const p = project({ tasks: [t] });
    const inq = { id: 'q2', kind: 'unassigned', cardId: t.id };
    const ps = defaultProposalsFor(p, inq, { now: new Date() });
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ action: 'assign', needsInput: false });
    expect(ps[0].payload.memberId).toBe('m_lucia');
    expect(ps[0].label).toContain('Lucía Ríos');
  });

  it('unassigned sin miembros queda needsInput', () => {
    const t = task();
    const p = project({ members: [], tasks: [t] });
    const inq = { id: 'q3', kind: 'unassigned', cardId: t.id };
    const ps = defaultProposalsFor(p, inq, { now: new Date() });
    expect(ps[0]).toMatchObject({ action: 'assign', needsInput: true });
  });

  it('stale propone mover a Backlog y marcar bloqueada', () => {
    const t = task({ lastActivityAt: day(-20), blocked: false });
    const p = project({ tasks: [t] });
    const inq = { id: 'q4', kind: 'stale', cardId: t.id };
    const ps = defaultProposalsFor(p, inq, { now: new Date() });
    const actions = ps.map((x) => x.action);
    expect(actions).toContain('move');
    expect(actions).toContain('set-blocked');
    const move = ps.find((x) => x.action === 'move');
    expect(move.payload.bucketId).toBe('b_backlog');
    expect(move.needsInput).toBe(false);
  });

  it('missing-date fechas desde hoy hasta el hito próximo', () => {
    const now = new Date();
    const milestone = task({
      id: 'ms1',
      title: 'Go-live',
      name: 'Go-live',
      milestone: true,
      endDate: date(7),
    });
    const t = task({ id: 't_pend', lastActivityAt: day(-1) });
    const p = project({ tasks: [milestone, t] });
    const inq = { id: 'q5', kind: 'missing-date', cardId: t.id };
    const ps = defaultProposalsFor(p, inq, { now });
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({
      action: 'set-dates',
      needsInput: false,
      payload: { startDate: now.toISOString().slice(0, 10), endDate: date(7) },
    });
  });

  it('overlap reasigna la barra que menos termina a la persona con menos carga', () => {
    const a = task({ id: 't_a', title: 'Analytics', name: 'Analytics', assignedUsers: [members[1]], startDate: date(-1), endDate: date(5) });
    const b = task({ id: 't_b', title: 'Checkout', name: 'Checkout', assignedUsers: [members[1]], startDate: date(1), endDate: date(8) });
    const p = project({ tasks: [a, b] });
    // anchor = id menor
    const anchor = a.id < b.id ? a : b;
    const inq = { id: 'q6', kind: 'overlap', cardId: anchor.id };
    const ps = defaultProposalsFor(p, inq, { now: new Date() });
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ action: 'assign', needsInput: false });
    expect(ps[0].payload.memberId).toBe('m_lucia');
    expect(ps[0].payload.taskId).toBe(anchor.id === a.id ? b.id : a.id);
  });

  it('determinístico: mismo tablero produce el mismo set de acciones y labels', () => {
    const now = new Date();
    const t1 = task({ id: 't_d1' });
    const t2 = task({ id: 't_d2', title: 'Carta sola', name: 'Carta sola', lastActivityAt: day(-20) });
    const t3 = task({ id: 't_d3', title: 'Sin dueño', name: 'Sin dueño' });
    const p = project({ tasks: [t1, t2, t3] });
    const shape = (ps) => ps.map((x) => `${x.action}|${Number(x.needsInput)}|${x.label}`);
    const cases = [
      { kind: 'thin', cardId: t1.id },
      { kind: 'stale', cardId: t2.id },
      { kind: 'unassigned', cardId: t3.id },
    ];
    for (const c of cases) {
      const a = defaultProposalsFor(p, { id: 'q', ...c }, { now });
      const b = defaultProposalsFor(p, { id: 'q', ...c }, { now });
      expect(shape(a)).toEqual(shape(b));
      if (a.length > 0) expect(a[0].id).not.toBe(b[0].id);
    }
  });
});

describe('autoEligible', () => {
  it('solo admite lo "obvio": asignar, fechar y bloquear', () => {
    const mk = (action, needsInput = false) => ({ action, needsInput, status: 'pending' });
    expect(autoEligible(mk('assign'), 'unassigned')).toBe(true);
    expect(autoEligible(mk('set-dates'), 'missing-date')).toBe(true);
    expect(autoEligible(mk('set-blocked'), 'stale')).toBe(true);
    expect(autoEligible(mk('move'), 'stale')).toBe(false);
    expect(autoEligible(mk('assign', true), 'unassigned')).toBe(false);
    expect(autoEligible(mk('assign'), 'overlap')).toBe(false);
    expect(autoEligible(mk('set-description'), 'thin')).toBe(false);
  });
});