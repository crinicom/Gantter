import { describe, it, expect } from 'vitest';
import { collectSystemState, describeScreen } from '../systemState';

describe('collectSystemState', () => {
  const base = {
    user: { id: 'u1', name: 'Lucía', email: 'l@test' },
    project: { id: 'p1', name: 'App', version: 3, buckets: [1, 2], tasks: [1], members: [1], actionLog: [1] },
    syncStatus: 'synced',
    lastSyncAt: '2026-09-08T12:00:00Z',
    applyMode: 'auto',
    staleDays: 10,
    openInquiries: 2,
    backendName: 'local',
  };

  it('incluye todos los campos esperados', () => {
    const state = collectSystemState(base);
    expect(state).toHaveProperty('appMode');
    expect(state).toHaveProperty('backend', 'local');
    expect(state.user).toEqual({ id: 'u1', name: 'Lucía', email: 'l@test' });
    expect(state.project).toEqual({ id: 'p1', name: 'App', version: 3 });
    expect(state.counts).toEqual({ buckets: 2, tasks: 1, members: 1, openInquiries: 2, actionLog: 1 });
    expect(state.sync).toEqual({ status: 'synced', lastSyncAt: '2026-09-08T12:00:00Z' });
    expect(state.applyMode).toBe('auto');
    expect(state.staleDays).toBe(10);
    expect(state.viewport).toHaveProperty('w');
    expect(state).toHaveProperty('hash');
  });

  it('maneja user/project null', () => {
    const state = collectSystemState({ ...base, user: null, project: null, openInquiries: undefined });
    expect(state.user).toBeNull();
    expect(state.project).toBeNull();
    expect(state.counts).toEqual({ buckets: 0, tasks: 0, members: 0, openInquiries: 0, actionLog: 0 });
  });
});

describe('describeScreen', () => {
  it('Login cuando isLogin es true', () => {
    expect(describeScreen({ isLogin: true })).toBe('Login');
  });

  it('Proyectos cuando no hay proyecto', () => {
    expect(describeScreen({ project: null, isLogin: false })).toBe('Proyectos');
  });

  it('combina vista y nombre del proyecto', () => {
    expect(
      describeScreen({ project: { name: 'App móvil' }, view: 'board', isLogin: false }),
    ).toBe('board · App móvil');
  });
});
