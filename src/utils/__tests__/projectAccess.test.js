import { describe, it, expect } from 'vitest';
import { isProjectVisible, visibleProjects } from '../projectAccess';

const project = (overrides = {}) => ({
  id: 'p1',
  ownerId: 'u_demo',
  members: [{ id: 'u_demo', status: 'active' }],
  ...overrides,
});

const user = (id) => ({ id, name: id });

describe('isProjectVisible', () => {
  it('propietario siempre ve su proyecto', () => {
    expect(isProjectVisible(project(), user('u_demo'))).toBe(true);
  });

  it('miembro activo ve el proyecto', () => {
    const p = project({ ownerId: 'u_ana', members: [{ id: 'u_carlos', status: 'active' }] });
    expect(isProjectVisible(p, user('u_carlos'))).toBe(true);
  });

  it('invitado pendiente no ve el proyecto', () => {
    const p = project({ ownerId: 'u_ana', members: [{ id: 'u_carlos', status: 'invited' }] });
    expect(isProjectVisible(p, user('u_carlos'))).toBe(false);
  });

  it('ajeno no ve el proyecto', () => {
    expect(isProjectVisible(project(), user('u_lucia'))).toBe(false);
  });

  it('anónimo no ve nada', () => {
    expect(isProjectVisible(project(), null)).toBe(false);
  });
});

describe('visibleProjects', () => {
  it('filtra y mantiene el orden de entrada', () => {
    const list = [
      project(),
      project({ id: 'p2', ownerId: 'u_ana', members: [{ id: 'u_carlos', status: 'invited' }] }),
      project({ id: 'p3', ownerId: 'u_carlos', members: [] }),
    ];
    const visible = visibleProjects(list, user('u_carlos'));
    expect(visible.map((p) => p.id)).toEqual(['p3']);
  });
});