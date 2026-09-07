import { describe, it, expect } from 'vitest';
import { findOverlaps, tasksWithoutDates, milestones, NO_DATES_GROUP_ID } from '../ganttSchedule';

const martin = { id: 'u_martin', name: 'Martín Vega', email: 'martin@rio.local' };
const lucia = { id: 'u_lucia', name: 'Lucía Ríos', email: 'lucia@rio.local' };

const tasks = [
  { id: 't1', name: 'Checkout', assignedUsers: [martin], startDate: '2026-09-08', endDate: '2026-09-11' },
  { id: 't2', name: 'Analytics', assignedUsers: [martin], startDate: '2026-09-10', endDate: '2026-09-12' },
  { id: 't3', name: 'Hito', assignedUsers: [lucia], startDate: '2026-09-12', endDate: '2026-09-12', milestone: true },
  { id: 't4', name: 'Sin fecha', assignedUsers: [lucia], startDate: null, endDate: null },
  { id: 't5', name: 'Otra sin fecha', assignedUsers: [], startDate: null, endDate: null },
];

describe('ganttSchedule', () => {
  it('findOverlaps detecta las barras que se pisan por responsable', () => {
    const { byTask, byAssignee } = findOverlaps(tasks);
    expect(byTask).toEqual({ t1: true, t2: true });
    expect(Array.from(byAssignee.t1)).toEqual(['Martín Vega']);
    expect(Array.from(byAssignee.t2)).toEqual(['Martín Vega']);
  });

  it('findOverlaps ignora cartas sin fechas y sin responsables', () => {
    expect(findOverlaps(tasks).byTask.t4).toBeUndefined();
    expect(findOverlaps(tasks).byTask.t5).toBeUndefined();
  });

  it('tasksWithoutDates separa las cartas sin rango', () => {
    const list = tasksWithoutDates(tasks);
    expect(list.map((t) => t.id)).toEqual(['t4', 't5']);
  });

  it('milestones expone solo los hitos con fecha', () => {
    expect(milestones(tasks).map((t) => t.id)).toEqual(['t3']);
  });

  it('el id del canal sin fechas es estable', () => {
    expect(NO_DATES_GROUP_ID).toBe('__sin-fechas__');
  });
});