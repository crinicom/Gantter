import { describe, it, expect } from 'vitest';
import { canApply, apply, applyBatch, selectAutoActions, applyEngine } from '../applyEngine';

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
    actionLog: [],
    settings: { staleDays: 15 },
    ...overrides,
  };
}

const pendingProposal = (overrides = {}) => ({
  id: 'p1',
  action: 'assign',
  label: 'Asignar la carta',
  payload: { taskId: 't1', memberId: 'm_lucia' },
  needsInput: false,
  status: 'pending',
  comment: 'Sin dueño, quedó asignada a Lucía.',
  ...overrides,
});

describe('canApply', () => {
  it('permite asignar cuando el miembro existe y todavía no está en la carta', () => {
    const p = project({ tasks: [task({ id: 't1' })] });
    expect(canApply(p, pendingProposal())).toBe(true);
  });

  it('rechaza asignar si ya está asignado o el miembro no existe', () => {
    const p = project({ tasks: [task({ id: 't1', assignedUsers: [members[0]] })] });
    expect(canApply(p, pendingProposal())).toBe(false);
    expect(
      canApply(p, pendingProposal({ payload: { taskId: 't1', memberId: 'm_ausente' } })),
    ).toBe(false);
  });

  it('rechaza propuestas vencidas o needsInput', () => {
    const p = project({
      tasks: [task({ id: 't1', status: 'completed' })],
    });
    expect(canApply(p, pendingProposal())).toBe(false);
    expect(canApply(p, pendingProposal({ needsInput: true }))).toBe(false);
  });

  it('move solo aplica a cartas realmente estancadas', () => {
    const stale = task({ id: 't1', lastActivityAt: day(-20) });
    const fresh = task({ id: 't2', lastActivityAt: day(-1) });
    const p = project({ tasks: [stale, fresh] });
    const move = (taskId) =>
      pendingProposal({ action: 'move', payload: { taskId, bucketId: 'b_backlog' } });
    expect(canApply(p, move('t1'))).toBe(true);
    expect(canApply(p, move('t2'))).toBe(false);
  });

  it('set-dates valida el rango y que no haya fechas', () => {
    const p = project({ tasks: [task({ id: 't1' })] });
    expect(
      canApply(
        p,
        pendingProposal({ action: 'set-dates', payload: { taskId: 't1', startDate: date(0), endDate: date(5) } }),
      ),
    ).toBe(true);
    const withDates = project({ tasks: [task({ id: 't1', startDate: date(0), endDate: date(5) })] });
    expect(
      canApply(
        withDates,
        pendingProposal({ action: 'set-dates', payload: { taskId: 't1', startDate: date(0), endDate: date(5) } }),
      ),
    ).toBe(false);
  });

  it('create-card exige bucket existente y título no vacío', () => {
    const p = project();
    const ok = pendingProposal({
      action: 'create-card',
      payload: { bucketId: 'b_backlog', title: 'Setup CI' },
    });
    const sinBucket = pendingProposal({
      action: 'create-card',
      payload: { bucketId: 'b_ausente', title: 'Setup CI' },
    });
    const sinTitulo = pendingProposal({
      action: 'create-card',
      payload: { bucketId: 'b_backlog', title: '   ' },
    });
    expect(canApply(p, ok)).toBe(true);
    expect(canApply(p, sinBucket)).toBe(false);
    expect(canApply(p, sinTitulo)).toBe(false);
  });

  it('create-card numera la carta nueva con max+1 por proyecto', () => {
    const p = project({ tasks: [task({ id: 't1', number: 3 })] });
    const out = apply(
      p,
      pendingProposal({
        action: 'create-card',
        payload: { title: 'CI', bucketId: 'b_backlog' },
      }),
      { source: 'confirm' },
    );
    const created = out.project.tasks.find((t) => t.id !== 't1');
    expect(created.number).toBe(4);
  });
});

describe('apply', () => {
  it('asigna el miembro, comenta la carta en voz de Maia y registra el log', () => {
    const p = project({ tasks: [task({ id: 't1' })] });
    const proposal = pendingProposal();
    const out = apply(p, proposal, { source: 'confirm', now: new Date('2026-09-08T10:00:00Z') });
    const appliedTask = out.project.tasks.find((t) => t.id === 't1');
    expect(appliedTask.assignedUsers.map((u) => u.id)).toEqual(['m_lucia']);
    expect(appliedTask.comments).toHaveLength(1);
    expect(appliedTask.comments[0]).toMatchObject({ author: 'Maia', text: proposal.comment });
    expect(out.project.actionLog).toHaveLength(1);
    expect(out.project.actionLog[0]).toMatchObject({
      source: 'confirm',
      cardId: 't1',
      summary: proposal.comment,
    });
  });

  it('set-dates y set-blocked mutan la carta y dejan log source auto', () => {
    const p = project({ tasks: [task({ id: 't1' })] });
    const prop = pendingProposal({
      action: 'set-dates',
      payload: { taskId: 't1', startDate: date(0), endDate: date(5) },
    });
    const out = apply(p, prop, { source: 'auto', now: new Date('2026-09-08T10:00:00Z') });
    const t = out.project.tasks[0];
    expect(t.startDate).toBe(date(0));
    expect(t.endDate).toBe(date(5));
    expect(out.project.actionLog[0].source).toBe('auto');

    const blocked = apply(out.project, pendingProposal({
      action: 'set-blocked',
      payload: { taskId: 't1', blocked: true },
    }), { source: 'auto' });
    expect(blocked.project.tasks[0].blocked).toBe(true);
  });

  it('create-card crea la tarea nueva en la columna, con comentario de Maia y log apuntando a la carta creada', () => {
    const p = project();
    const now = new Date('2026-09-08T10:00:00Z');
    const proposal = pendingProposal({
      id: 'p_new',
      action: 'create-card',
      label: 'Crear «Setup CI» en «Backlog»',
      payload: { title: 'Setup CI', bucketId: 'b_backlog' },
    });
    const out = apply(p, proposal, { source: 'confirm', now });
    expect(out.project.tasks).toHaveLength(1);
    const created = out.project.tasks[0];
    expect(created.name).toBe('Setup CI');
    expect(created.number).toBe(1);
    expect(created.bucketId).toBe('b_backlog');
    expect(created.status).toBe('todo');
    expect(created.progress).toBe(0);
    expect(created.assignedUsers).toEqual([]);
    expect(created.createdAt).toBe(now.toISOString());
    expect(out.task?.id).toBe(created.id);
    expect(created.comments[0]).toMatchObject({ author: 'Maia', text: proposal.comment });
    expect(out.project.actionLog[0]).toMatchObject({ cardId: created.id });
  });
});

describe('selectAutoActions', () => {
  it('selecciona solo propuestas pendientes aplicables y según autoEligible', () => {
    const t = task({ id: 't1', lastActivityAt: day(-20) });
    const p = project({ tasks: [t] });
    const proposals = [
      pendingProposal({ id: 'c1' }),
      pendingProposal({ id: 'c2', action: 'move', payload: { taskId: 't1', bucketId: 'b_backlog' } }),
      pendingProposal({ id: 'c3', action: 'set-blocked', payload: { taskId: 't1' } }),
      pendingProposal({ id: 'c4', needsInput: true }),
    ];
    const inqs = [
      { id: 'q1', kind: 'unassigned', status: 'open', proposals },
    ];
    const autoEligible = (proposal) => proposal.action !== 'move';

    const selected = selectAutoActions(p, inqs, { canAutoApply: autoEligible });
    // move c2 y needsInput c4 quedan fuera
    expect(selected.map((s) => s.proposal.id).sort()).toEqual(['c1', 'c3']);
  });

  it('exporta applyEngine con la API pública', () => {
    expect(applyEngine.canApply).toBe(canApply);
    expect(applyEngine.apply).toBe(apply);
    expect(applyEngine.applyBatch).toBe(applyBatch);
    expect(applyEngine.selectAutoActions).toBe(selectAutoActions);
  });
});

describe('applyBatch', () => {
  it('aplica un lote de create-card con numeración correlativa #1..#N y un comentario por carta', () => {
    const now = new Date('2026-09-08T10:00:00Z');
    const proposals = ['Setup CI', 'Elegir stack', 'Caso de uso feliz'].map((title, i) =>
      pendingProposal({
        id: `bd${i}`,
        action: 'create-card',
        payload: { bucketId: 'b_backlog', title, description: 'Criterio de hecho listo.' },
      }),
    );
    const out = applyBatch(project(), proposals, { source: 'confirm', now });
    expect(out.project.tasks).toHaveLength(3);
    expect(out.project.tasks.map((t) => `${t.number}:${t.name}`)).toEqual([
      '1:Setup CI',
      '2:Elegir stack',
      '3:Caso de uso feliz',
    ]);
    out.project.tasks.forEach((t) => {
      expect(t.comments).toHaveLength(1);
      expect(t.comments[0]).toMatchObject({ author: 'Maia' });
    });
    expect(out.project.actionLog).toHaveLength(3);
    expect(out.appliedProposalIds).toEqual(['bd0', 'bd1', 'bd2']);
  });

  it('saltea propuestas que ya no aplican sin abortar el resto del lote', () => {
    const now = new Date('2026-09-08T10:00:00Z');
    const proposals = [
      pendingProposal({ id: 'ok1', action: 'create-card', payload: { bucketId: 'b_backlog', title: 'Ok' } }),
      pendingProposal({ id: 'bad', action: 'create-card', payload: { bucketId: 'b_ausente', title: 'Sin columna' } }),
      pendingProposal({ id: 'ok2', action: 'create-card', payload: { bucketId: 'b_backlog', title: 'Ok dos' } }),
    ];
    const out = applyBatch(project(), proposals, { source: 'confirm', now });
    expect(out.appliedProposalIds).toEqual(['ok1', 'ok2']);
    expect(out.project.tasks).toHaveLength(2);
    expect(out.project.tasks.map((t) => t.number)).toEqual([1, 2]);
  });

  it('numeración sigue la carta más alta del proyecto previo (#4..#6 tras una #3)', () => {
    const now = new Date('2026-09-08T10:00:00Z');
    const p = project({ tasks: [task({ id: 't1', number: 3 })] });
    const proposals = ['A', 'B', 'C'].map((title, i) =>
      pendingProposal({ id: `bd${i}`, action: 'create-card', payload: { bucketId: 'b_backlog', title } }),
    );
    const out = applyBatch(p, proposals, { source: 'confirm', now });
    expect(out.project.tasks.filter((t) => t.id !== 't1').map((t) => t.number)).toEqual([4, 5, 6]);
  });
});