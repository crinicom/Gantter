import { describe, it, expect } from 'vitest';
import { addDays, differenceInCalendarDays, parseISO, format } from 'date-fns';
import { reanchorSeedDates } from '../seedAnchoring';

const DAY = 86400000;
const dateOnly = (d) => format(d, 'yyyy-MM-dd');

function fullProject(overrides = {}) {
  return {
    id: 'seed_portal',
    name: 'Portal de clientes',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    members: [
      {
        id: 'u_lucia',
        name: 'Lucía Ríos',
        initials: 'LR',
        invitedAt: '2026-08-01T09:00:00.000Z',
        updatedAt: '2026-08-01T09:00:00.000Z',
      },
    ],
    cards: [
      {
        id: 'card_go_live',
        title: 'Go-live portal',
        milestone: true,
        startDate: '2026-09-12',
        endDate: '2026-09-12',
        createdAt: '2026-09-01T09:00:00.000Z',
        updatedAt: '2026-09-01T09:00:00.000Z',
        lastActivityAt: '2026-09-01T09:00:00.000Z',
        comments: [{ id: 'c1', createdAt: '2026-09-01T10:00:00.000Z' }],
      },
      {
        id: 'card_stale',
        title: 'Rediseñar onboarding',
        milestone: false,
        startDate: null,
        endDate: null,
        createdAt: '2026-08-18T09:00:00.000Z',
        updatedAt: '2026-08-18T09:00:00.000Z',
        lastActivityAt: '2026-08-18T09:00:00.000Z',
        comments: [],
      },
    ],
    ...overrides,
  };
}

describe('reanchorSeedDates', () => {
  it('ancla el hito a hoy + daysAhead y preserva los gaps del calendar', () => {
    const out = reanchorSeedDates(fullProject(), { anchorCardId: 'card_go_live', daysAhead: 7 });

    const hito = out.cards.find((c) => c.id === 'card_go_live');
    expect(hito.endDate).toBe(dateOnly(addDays(new Date(), 7)));
    expect(hito.startDate).toBe(hito.endDate);

    // Los 25 días entre stale y hito sobreviven al re-anclaje.
    const rawGap = new Date('2026-09-12T00:00:00.000Z') - new Date('2026-08-18T00:00:00.000Z');
    const stale = out.cards.find((c) => c.id === 'card_stale');
    const newGap = new Date(`${hito.endDate}T00:00:00.000Z`) - new Date(stale.lastActivityAt);
    expect(Math.round(newGap / DAY)).toBe(Math.round(rawGap / DAY));
  });

  it('desplaza timestamps de actividad y comentarios', () => {
    const out = reanchorSeedDates(fullProject(), { anchorCardId: 'card_go_live', daysAhead: 7 });
    const hito = out.cards.find((c) => c.id === 'card_go_live');
    // El delta aplicado al timestamp es el mismo delta calendario del hito. Se
    // compara contra el mismo addDays (días de calendario en hora local) para no
    // asumir días de exactamente 24 h cuando el TZ cruza un cambio de horario.
    const delta = differenceInCalendarDays(parseISO(hito.endDate), parseISO('2026-09-12'));
    expect(hito.lastActivityAt).toBe(addDays(parseISO('2026-09-01T09:00:00.000Z'), delta).toISOString());
    expect(hito.comments[0].createdAt).toMatch(/T\d{2}:/);
  });

  it('devuelve el proyecto como está si no encuentra el ancla', () => {
    const project = fullProject();
    const out = reanchorSeedDates(project, { anchorCardId: 'card_que_no_existe', daysAhead: 7 });
    expect(out).toBe(project);
  });

  it('no toca las fechas nulas ni las cadenas vacías', () => {
    const out = reanchorSeedDates(fullProject(), { anchorCardId: 'card_go_live', daysAhead: 7 });
    const stale = out.cards.find((c) => c.id === 'card_stale');
    expect(stale.startDate).toBeNull();
    expect(stale.endDate).toBeNull();
  });

  it('es idempotente: re-anclar dos veces no cambia nada', () => {
    const once = reanchorSeedDates(fullProject(), { anchorCardId: 'card_go_live', daysAhead: 7 });
    const twice = reanchorSeedDates(once, { anchorCardId: 'card_go_live', daysAhead: 7 });
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});