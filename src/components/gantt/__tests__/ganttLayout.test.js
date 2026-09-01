import { describe, it, expect } from 'vitest';
import { dateRangePx, dateOffsetPx, GANTT } from '../ganttLayout';

const START = new Date(2026, 7, 25); // 25 ago 2026

describe('ganttLayout', () => {
  it('dateOffsetPx convierte días a píxeles correctamente', () => {
    const date = new Date(2026, 7, 30); // 5 días después
    expect(dateOffsetPx(START, date)).toBe(5 * GANTT.DAY_WIDTH);
  });

  it('dateRangePx produce un ancho razonable en píxeles (no ms)', () => {
    const task = { startDate: '2026-09-01', endDate: '2026-09-07' }; // 6 días
    const { left, width } = dateRangePx(START, task);
    expect(left).toBe(7 * GANTT.DAY_WIDTH);
    expect(width).toBe(7 * GANTT.DAY_WIDTH); // 6 días + 1
    expect(width).toBeLessThan(1000);
  });

  it('dateRangePx respeta el ancho mínimo para tareas de un día', () => {
    const { width } = dateRangePx(START, { startDate: '2026-09-01', endDate: '2026-09-01' });
    expect(width).toBe(GANTT.DAY_WIDTH);
  });

  it('dateRangePx tolera tareas sin fechas', () => {
    const { left, width } = dateRangePx(START, {});
    expect(width).toBe(GANTT.DAY_WIDTH);
    expect(left).toBe(0);
  });
});