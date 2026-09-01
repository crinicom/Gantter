import { describe, it, expect } from 'vitest';
import {
  formatISODate,
  parseISODate,
  getWeekRange,
  getOffset,
  getWeekDates,
  diffInDays,
} from '../dateUtils';

describe('dateUtils', () => {
  it('formatea ISO', () => {
    expect(formatISODate(new Date(2026, 8, 1))).toBe('2026-09-01');
    expect(formatISODate(null)).toBeNull();
  });

  it('parsea ISO y devuelve Date válido', () => {
    const d = parseISODate('2026-09-01');
    expect(d.getFullYear()).toBe(2026);
    expect(parseISODate(null)).toBeNull();
  });

  it('calcula el rango de una semana comenzando lunes', () => {
    const { start, end } = getWeekRange(new Date(2026, 8, 3)); // jueves
    expect(start.getDay()).toBe(1); // lunes
    expect(diffInDays(end, start)).toBe(6);
  });

  it('calcula offset en días desde una fecha base', () => {
    expect(getOffset('2026-09-01', '2026-09-10')).toBe(9);
  });

  it('genera semanas entre dos fechas', () => {
    const weeks = getWeekDates('2026-09-01', '2026-09-30');
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks[0].label).toBeTruthy();
  });
});