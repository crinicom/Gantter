import { describe, it, expect } from 'vitest';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { loadSeedProjects } from '../localStorageBackend';
import seedRaw from '../../../DB/sample_data.json';

const MIRROR = [
  { title: 'Rediseñar onboarding', assignee: 'u_sofia', column: 'En curso', stale: true },
  { title: 'Auth magic link', assignee: null, column: 'Listo', thin: true, noDates: true },
  { title: 'Webhook de pagos', assignee: 'u_ana', column: 'En curso', blocked: false },
  { title: 'QA staging release', assignee: 'u_diego', column: 'Listo', noDates: true },
  { title: 'Migrar checkout a v3', assignee: 'u_martin', column: 'En curso' },
  { title: 'Analytics de conversión', assignee: 'u_martin', column: 'Listo' },
  { title: 'Copy legal de reembolsos', assignee: null, column: 'Backlog', thin: true, noDates: true },
  { title: 'Fix timeout 3DS', assignee: 'u_ana', column: 'Hecho' },
  { title: 'Documentar API pública', assignee: 'u_lucia', column: 'Listo', thin: true, noDates: true },
  { title: 'Go-live portal', assignee: ['u_lucia', 'u_sofia'], column: 'En curso', hito: true },
];

function cardByTitle(project, title) {
  return project.cards.find((c) => c.title === title);
}

describe('seed demo (DB/sample_data.json)', () => {
  it('hay exactamente 2 proyectos con ids determinísticos', () => {
    expect(seedRaw.projects).toHaveLength(2);
    expect(seedRaw.projects.map((p) => p.id)).toEqual(['seed_portal', 'seed_app_movil']);
  });

  it('Portal de clientes es el proyecto principal del equipo Río con Lucía como owner', () => {
    const portal = seedRaw.projects.find((p) => p.id === 'seed_portal');
    expect(portal.name).toBe('Portal de clientes');
    expect(portal.teamName).toBe('Equipo Río');
    expect(portal.ownerId).toBe('u_lucia');
    expect(portal.members.map((m) => m.id)).toEqual(['u_lucia', 'u_martin', 'u_ana', 'u_sofia', 'u_diego']);
    // Iniciales derivables.
    for (const m of portal.members) {
      expect(m.initials).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('Portal tiene 4 columnas y En curso con wipLimit informativo', () => {
    const portal = seedRaw.projects.find((p) => p.id === 'seed_portal');
    expect(portal.columns.map((c) => c.title)).toEqual(['Backlog', 'Listo', 'En curso', 'Hecho']);
    expect(portal.columns.find((c) => c.title === 'En curso').wipLimit).toBe(3);
  });

  it('Portal contiene las 9 cartas de §13 + el hito go-live', () => {
    const portal = seedRaw.projects.find((p) => p.id === 'seed_portal');
    const titles = portal.cards.map((c) => c.title);
    for (const m of MIRROR.slice(0, 9)) {
      expect(titles).toContain(m.title);
    }
    expect(titles).toContain('Go-live portal');
  });

  it('las cartas preservan dueño, columna y huecos de la tabla', () => {
    const portal = seedRaw.projects.find((p) => p.id === 'seed_portal');
    for (const m of MIRROR) {
      const card = cardByTitle(portal, m.title);
      expect(card, `carta ${m.title}`).toBeTruthy();
      if (m.assignee) {
        const expected = Array.isArray(m.assignee) ? m.assignee : [m.assignee];
        expect(card.assigneeIds).toEqual(expected);
      } else expect(card.assigneeIds).toEqual([]);
      expect(portal.columns.find((c) => c.id === card.columnId).title).toBe(m.column);
      if (m.thin) expect(card.description).toBe('');
      if (m.noDates) {
        expect(card.startDate).toBeNull();
        expect(card.endDate).toBeNull();
      }
    }
  });

  it('los assigneeIds referencian miembros reales del proyecto', () => {
    const portal = seedRaw.projects.find((p) => p.id === 'seed_portal');
    const memberIds = portal.members.map((m) => m.id);
    for (const card of portal.cards) {
      for (const id of card.assigneeIds) expect(memberIds).toContain(id);
    }
  });

  it('hay stale (~18 días sin actividad), unassigned+thin, overlap de Martín y missing-date pegado al hito', () => {
    const portal = seedRaw.projects.find((p) => p.id === 'seed_portal');

    const stale = cardByTitle(portal, 'Rediseñar onboarding');
    // Hito a ~7 días, stale ~18 días: sin actividad desde mediados de agosto.
    expect(stale.lastActivityAt).toBe('2026-08-18T09:00:00.000Z');

    const hito = cardByTitle(portal, 'Go-live portal');
    expect(hito.endDate).toBe('2026-09-12');
    expect(hito.startDate).toBe(hito.endDate);
    expect(hito.milestone).toBe(true);
    expect(hito.assigneeIds).toEqual(['u_lucia', 'u_sofia']);

    // Overlap de Martín: checkout (8-11 sep) se pisa con analytics (10-12 sep).
    const checkout = cardByTitle(portal, 'Migrar checkout a v3');
    const analytics = cardByTitle(portal, 'Analytics de conversión');
    expect(checkout.endDate >= analytics.startDate).toBe(true);
    expect(analytics.startDate < checkout.endDate).toBe(true);
  });

  it('webhook de pagos está en curso sin blocker marcado (el demo lo destapa)', () => {
    const portal = seedRaw.projects.find((p) => p.id === 'seed_portal');
    const webhook = cardByTitle(portal, 'Webhook de pagos');
    expect(webhook.blocked).toBe(false);
    expect(webhook.blockedReason).toBe('');
  });

  it('App móvil v2 tiene pocas cartas y casi todas sanas', () => {
    const movil = seedRaw.projects.find((p) => p.id === 'seed_app_movil');
    expect(movil.teamName).toBe('Equipo Costa');
    expect(movil.cards.length).toBeLessThanOrEqual(4);
    expect(movil.cards.length).toBeGreaterThan(0);
    const unhealthy = movil.cards.filter((c) => c.assigneeIds.length === 0 || !c.description);
    expect(unhealthy.length).toBeLessThanOrEqual(1);
  });

  it('reset es determinista: dos cargas producen el mismo estado de tablero', async () => {
    const a = await loadSeedProjects();
    const b = await loadSeedProjects();
    // Compara el contenido estable del tablero (columnas/cartas/miembros); los
    // timestamps de buckets son housekeeping del runtime y no afectan el estado.
    const stable = (p) =>
      p.map((x) => ({
        id: x.id,
        columns: x.columns,
        cards: x.cards,
        members: x.members,
        settings: x.settings,
      }));
    expect(JSON.stringify(stable(a))).toBe(JSON.stringify(stable(b)));
  });

  it('al sembrar, el hito go-live queda anclado a hoy + 7 días (seed relativo)', async () => {
    const [portal] = await loadSeedProjects();
    const rawPortal = seedRaw.projects.find((p) => p.id === 'seed_portal');
    const goLive = portal.cards.find((c) => c.title === 'Go-live portal');

    // Máximo ±1 día de diferencia por el guard de la medianoche del test.
    const distance = Math.abs(
      differenceInCalendarDays(parseISO(goLive.endDate), addDays(new Date(), 7)),
    );
    expect(distance).toBeLessThanOrEqual(1);

    // El modelo no se re-ancla en cada load: solo la primera vez contra el template.
    const stale = portal.cards.find((c) => c.title === 'Rediseñar onboarding');
    const rawStale = rawPortal.cards.find((c) => c.title === 'Rediseñar onboarding');
    const rawGoLive = rawPortal.cards.find((c) => c.title === 'Go-live portal');
    const rawGap = differenceInCalendarDays(parseISO(rawGoLive.endDate), parseISO(rawStale.lastActivityAt));
    const newGap = differenceInCalendarDays(parseISO(goLive.endDate), parseISO(stale.lastActivityAt));
    expect(newGap).toBe(rawGap);
  });
});