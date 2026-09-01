import { describe, it, expect } from 'vitest';
import { calculateCpmMap, isCriticalTask } from '../cpm';
import { TASK_STATUS } from '../../constants/project';

const tasks = [
  { id: 'a', name: 'A', precedents: [], dependents: ['b'], startDate: '2026-09-01', endDate: '2026-09-03', status: TASK_STATUS.TODO },
  { id: 'b', name: 'B', precedents: ['a'], dependents: [], startDate: '2026-09-04', endDate: '2026-09-06', status: TASK_STATUS.TODO },
];

describe('calculateCpmMap', () => {
  it('calcula early/late y el camino crítico para tareas en cadena', () => {
    const map = calculateCpmMap(tasks);
    expect(map.a).toBeDefined();
    expect(map.b).toBeDefined();
    expect(map.a.earlyStart).toBe(0);
    expect(map.a.earlyFinish).toBe(2);
    expect(map.b.earlyStart).toBe(2);
    expect(map.b.earlyFinish).toBe(4);
    // En cadena simple sin holgura, ambas son críticas.
    expect(map.a.isCritical).toBe(true);
    expect(map.b.isCritical).toBe(true);
    expect(map.a.slack).toBe(0);
  });

  it('ignora tareas sin fechas', () => {
    const withNoDates = [...tasks, { id: 'c', name: 'C', precedents: [], dependents: [], startDate: null, endDate: null }];
    const map = calculateCpmMap(withNoDates);
    expect(map.c).toBeUndefined();
  });

  it('calcula holgura cuando existe margen', () => {
    const map = calculateCpmMap(tasks);
    // Si añadimos una tarea paralela más corta, tiene holgura.
    const parallel = [
      ...tasks,
      { id: 'c', name: 'C', precedents: [], dependents: [], startDate: '2026-09-01', endDate: '2026-09-04', status: TASK_STATUS.TODO },
    ];
    const m = calculateCpmMap(parallel);
    expect(m.c.slack).toBeGreaterThan(0);
    expect(m.c.isCritical).toBe(false);
  });
});

describe('isCriticalTask', () => {
  it('nunca marca como crítica una tarea finalizada', () => {
    const completed = { ...tasks[0], status: TASK_STATUS.COMPLETED };
    const map = calculateCpmMap([completed, tasks[1]]);
    expect(isCriticalTask(map, completed)).toBe(false);
  });
});

describe('calculateCpmMap con dependencias circulares', () => {
  it('no se desborda con un ciclo de 2 tareas', () => {
    const cyclic = [
      {
        id: 'a', name: 'A', precedents: ['b'], dependents: ['b'],
        startDate: '2026-09-01', endDate: '2026-09-03', status: TASK_STATUS.TODO,
      },
      {
        id: 'b', name: 'B', precedents: ['a'], dependents: ['a'],
        startDate: '2026-09-04', endDate: '2026-09-06', status: TASK_STATUS.TODO,
      },
    ];
    const map = calculateCpmMap(cyclic);
    expect(map.a).toBeDefined();
    expect(map.b).toBeDefined();
    expect(typeof map.a.earlyFinish).toBe('number');
    expect(typeof map.b.lateStart).toBe('number');
  });

  it('no se desborda con un ciclo de 3 tareas ni en el backward pass', () => {
    const cyclic = [
      { id: 'a', precedents: ['c'], dependents: ['b'], startDate: '2026-09-01', endDate: '2026-09-03', status: TASK_STATUS.TODO },
      { id: 'b', precedents: ['a'], dependents: ['c'], startDate: '2026-09-04', endDate: '2026-09-06', status: TASK_STATUS.TODO },
      { id: 'c', precedents: ['b'], dependents: ['a'], startDate: '2026-09-07', endDate: '2026-09-09', status: TASK_STATUS.TODO },
    ];
    const map = calculateCpmMap(cyclic);
    expect(map.a).toBeDefined();
    expect(map.b).toBeDefined();
    expect(map.c).toBeDefined();
  });
});