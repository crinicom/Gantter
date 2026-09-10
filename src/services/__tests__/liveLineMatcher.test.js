import { describe, it, expect } from 'vitest';
import { matchLiveLine } from '../liveLineMatcher';

const TASKS = [
  { id: 't1', number: 12, name: 'Webhook de pagos' },
  { id: 't2', number: 3, name: 'Auth magic link' },
  { id: 't3', number: 7, name: 'Rediseñar onboarding' },
];

const MEMBERS = [
  { id: 'u_lucia', name: 'Lucía Ríos' },
  { id: 'u_martin', name: 'Martín Vega' },
  { id: 'u_sofia', name: 'Sofía Chen' },
  { id: 'u_ana', name: 'Ana Soler' },
  { id: 'u_diego', name: 'Diego Palacios' },
];

const SELF = { id: 'u_lucia', name: 'Lucía Ríos' };

const NOW = new Date('2026-09-09T12:00:00Z');

describe('liveLineMatcher', () => {
  it('acepta primera persona: me quedo con la carta por #N y asigna a quien habla', () => {
    const out = matchLiveLine('me quedo con la 12', { tasks: TASKS, members: MEMBERS, self: SELF, now: NOW });
    expect(out.confidence).toBe('high');
    expect(out.cardIds).toEqual(['t1']);
    expect(out.actions).toEqual([
      { type: 'assign', payload: { taskId: 't1', memberId: 'u_lucia' } },
    ]);
  });

  it('ancla por #N con numeral y asigna al miembro nombrado', () => {
    const out = matchLiveLine('que la tome Sofía, la #3', { tasks: TASKS, members: MEMBERS, self: SELF, now: NOW });
    expect(out.confidence).toBe('high');
    expect(out.actions).toEqual([
      { type: 'assign', payload: { taskId: 't2', memberId: 'u_sofia' } },
    ]);
  });

  it('ancla por título exacto único cuando no hay número', () => {
    const out = matchLiveLine('dejamos el Rediseñar onboarding en manos de Ana', {
      tasks: TASKS,
      members: MEMBERS,
      self: SELF,
      now: NOW,
    });
    expect(out.confidence).toBe('high');
    expect(out.actions).toEqual([
      { type: 'assign', payload: { taskId: 't3', memberId: 'u_ana' } },
    ]);
  });

  it('bloquea la carta mencionada con la línea como evidencia', () => {
    const out = matchLiveLine('se bloqueó la 7 porque el proveedor no responde', {
      tasks: TASKS,
      members: MEMBERS,
      self: SELF,
      now: NOW,
    });
    expect(out.confidence).toBe('high');
    expect(out.actions).toEqual([
      {
        type: 'set-blocked',
        payload: {
          taskId: 't3',
          blocked: true,
          blockedReason: 'se bloqueó la 7 porque el proveedor no responde',
        },
      },
    ]);
  });

  it('fecha la carta de hoy a hoy (no inventa fechas)', () => {
    const out = matchLiveLine('fechamos la 12 para hoy', { tasks: TASKS, members: MEMBERS, self: SELF, now: NOW });
    expect(out.confidence).toBe('high');
    expect(out.actions).toEqual([
      {
        type: 'set-dates',
        payload: { taskId: 't1', startDate: '2026-09-09', endDate: '2026-09-09' },
      },
    ]);
  });

  it('crear una carta nunca sale del mic (low, sin acciones)', () => {
    const out = matchLiveLine('creemos una carta para el nuevo onboarding', {
      tasks: TASKS,
      members: MEMBERS,
      self: SELF,
      now: NOW,
    });
    expect(out.confidence).toBe('low');
    expect(out.actions).toEqual([]);
  });

  it('sin ancla → low y sin acciones (Maia pregunta templated)', () => {
    const out = matchLiveLine('buenos días a todos', { tasks: TASKS, members: MEMBERS, self: SELF, now: NOW });
    expect(out.confidence).toBe('low');
    expect(out.actions).toEqual([]);
    expect(out.cardIds).toEqual([]);
  });

  it('varias cartas que encajan por título → low, pide #N', () => {
    const dup = [
      { id: 'a', number: 1, name: 'QA staging' },
      { id: 'b', number: 2, name: 'QA staging release' },
    ];
    const out = matchLiveLine('hablemos de QA staging release', { tasks: dup, members: MEMBERS, self: SELF, now: NOW });
    expect(out.confidence).toBe('low');
    expect(out.actions).toEqual([]);
    expect(out.note).toContain('#N');
  });

  it('carta resuelta pero sin verbo claro → low', () => {
    const out = matchLiveLine('la 12 está complicada', { tasks: TASKS, members: MEMBERS, self: SELF, now: NOW });
    expect(out.confidence).toBe('low');
    expect(out.cardIds).toEqual(['t1']);
    expect(out.actions).toEqual([]);
  });
});