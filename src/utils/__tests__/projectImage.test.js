import { describe, it, expect } from 'vitest';
import { seedFromString, localFallback, coverImageUrl } from '../projectImage';

describe('seedFromString', () => {
  it('es determinista', () => {
    expect(seedFromString('abc')).toBe(seedFromString('abc'));
  });

  it('produce valores distintos para cadenas distintas', () => {
    expect(seedFromString('abc')).not.toBe(seedFromString('abd'));
  });
});

describe('localFallback', () => {
  it('es determinista para el mismo proyecto', () => {
    expect(localFallback('proj-1')).toBe(localFallback('proj-1'));
  });

  it('genera al menos 2 portadas distintas entre varios proyectos', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `proj-${i}`);
    const covers = new Set(ids.map((id) => localFallback(id)));
    expect(covers.size).toBeGreaterThanOrEqual(2);
  });

  it('devuelve un data URI de SVG', () => {
    expect(localFallback('x')).toMatch(/^data:image\/svg\+xml,/);
  });
});

describe('coverImageUrl', () => {
  it('usa la imagen subida si existe', () => {
    expect(coverImageUrl({ id: 'p1', image: 'data:image/jpeg;base64,AAA=' })).toBe(
      'data:image/jpeg;base64,AAA=',
    );
  });

  it('usa picsum con el coverSeed si no hay imagen', () => {
    expect(coverImageUrl({ id: 'p1', coverSeed: 's-42' })).toBe('https://picsum.photos/seed/s-42/640/360');
  });

  it('usa picsum con seed del id si no hay coverSeed (legacy)', () => {
    expect(coverImageUrl({ id: 'p1' })).toBe('https://picsum.photos/seed/p1/640/360');
  });

  it('devuelve el mismo URL para el mismo proyecto (estable)', () => {
    const p = { id: 'p1', coverSeed: 's-42' };
    expect(coverImageUrl(p)).toBe(coverImageUrl(p));
  });
});