import { describe, it, expect } from 'vitest';
import { taskWeight, clampProgress, projectProgress, bucketProgress } from '../progress';

const task = (overrides = {}) => ({
  id: 't1',
  name: 'Tarea',
  progress: 0,
  startDate: null,
  endDate: null,
  bucketId: 'b1',
  ...overrides,
});

describe('clampProgress', () => {
  it('normaliza a entero 0-100', () => {
    expect(clampProgress(35.6)).toBe(36);
    expect(clampProgress(-5)).toBe(0);
    expect(clampProgress(150)).toBe(100);
    expect(clampProgress('85')).toBe(85);
  });

  it('tolera valores inválidos', () => {
    expect(clampProgress(undefined)).toBe(0);
    expect(clampProgress(null)).toBe(0);
    expect(clampProgress(NaN)).toBe(0);
    expect(clampProgress('abc')).toBe(0);
  });
});

describe('taskWeight', () => {
  it('pesa 1 si no hay fechas o la duración es 0', () => {
    expect(taskWeight(task())).toBe(1);
    expect(taskWeight(task({ startDate: '2026-09-01', endDate: '2026-09-01' }))).toBe(1);
  });

  it('usa la duración en días como peso', () => {
    expect(taskWeight(task({ startDate: '2026-09-01', endDate: '2026-09-07' }))).toBe(6);
  });
});

describe('projectProgress', () => {
  it('es 0 sin tareas', () => {
    expect(projectProgress([])).toBe(0);
    expect(projectProgress(undefined)).toBe(0);
  });

  it('pondera por duración', () => {
    const tareas = [
      task({ progress: 100, startDate: '2026-09-01', endDate: '2026-09-07' }), // peso 6
      task({ id: 't2', progress: 0 }), // peso 1
    ];
    expect(projectProgress(tareas)).toBe(86); // (100*6 + 0*1)/7 ≈ 85.7 → 86
  });

  it('todas completas → 100', () => {
    const tareas = [
      task({ progress: 100, startDate: '2026-09-01', endDate: '2026-09-04' }),
      task({ id: 't2', progress: 100 }),
    ];
    expect(projectProgress(tareas)).toBe(100);
  });

  it('clampa progresos fuera de rango', () => {
    const tareas = [task({ progress: 120 }), task({ id: 't2', progress: -3 })];
    expect(projectProgress(tareas)).toBe(50); // (100 + 0)/2
  });
});

describe('bucketProgress', () => {
  it('solo considera las tareas del bucket', () => {
    const tareas = [
      task({ id: 't1', progress: 100 }),
      task({ id: 't2', progress: 0, bucketId: 'b2' }),
    ];
    expect(bucketProgress(tareas, 'b1')).toBe(100);
    expect(bucketProgress(tareas, 'b2')).toBe(0);
    expect(bucketProgress(tareas, 'b3')).toBe(0);
  });
});