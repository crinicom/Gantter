import { describe, it, expect } from 'vitest';
import { nextVersion, sameProjectAs, sameProjectIgnoringTimestamps, mergeProjects } from '../collab';

const entity = (id, name, updatedAt) => ({ id, name, updatedAt });

const baseProject = {
  id: 'p1',
  name: 'Proyecto',
  description: '',
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  version: 0,
  buckets: [],
  tasks: [],
  members: [],
};

describe('nextVersion', () => {
  it('incrementa la versión', () => {
    expect(nextVersion({ version: 4 })).toBe(5);
    expect(nextVersion({})).toBe(1);
  });
});

describe('sameProjectAs', () => {
  it('ignora el orden de claves', () => {
    const a = { name: 'X', tasks: [] };
    const b = { tasks: [], name: 'X' };
    expect(sameProjectAs(a, b)).toBe(true);
  });

  it('detecta diferencias de contenido', () => {
    expect(sameProjectAs({ name: 'X' }, { name: 'Y' })).toBe(false);
  });
});

describe('mergeProjects', () => {
  it('fusiona entidades no tocadas sin conflictos', () => {
    const local = {
      ...baseProject,
      tasks: [entity('tA', 'Local', '2026-09-01T10:00:00.000Z')],
      buckets: [entity('bA', 'Bucket A', '2026-09-01T10:00:00.000Z')],
    };
    const remote = {
      ...baseProject,
      tasks: [entity('tB', 'Remota', '2026-09-02T10:00:00.000Z')],
      buckets: [entity('bB', 'Bucket B', '2026-09-02T10:00:00.000Z')],
    };
    const { project, conflicts } = mergeProjects(local, remote);
    expect(conflicts).toEqual([]);
    expect(project.tasks.map((t) => t.id).sort()).toEqual(['tA', 'tB']);
    expect(project.buckets.map((t) => t.id).sort()).toEqual(['bA', 'bB']);
    expect(project.version).toBe(0);
  });

  it('gana LWW cuando la misma entidad se editó en ambas partes', () => {
    const local = {
      ...baseProject,
      tasks: [entity('tA', 'Versión local', '2026-09-01T10:00:00.000Z')],
    };
    const remote = {
      ...baseProject,
      tasks: [entity('tA', 'Versión remota', '2026-09-02T10:00:00.000Z')],
    };
    const { project, conflicts } = mergeProjects(local, remote);
    expect(project.tasks[0].name).toBe('Versión remota');
    expect(conflicts).toEqual([{ kind: 'task', id: 'tA', name: 'Versión remota' }]);
  });

  it('conserva la entidad local si es más reciente', () => {
    const local = {
      ...baseProject,
      tasks: [entity('tA', 'Local', '2026-09-03T10:00:00.000Z')],
    };
    const remote = {
      ...baseProject,
      tasks: [entity('tA', 'Remota', '2026-09-02T10:00:00.000Z')],
    };
    const { project, conflicts } = mergeProjects(local, remote);
    expect(project.tasks[0].name).toBe('Local');
    expect(conflicts).toHaveLength(1);
  });

  it('toma el máximo de version', () => {
    const { project } = mergeProjects({ ...baseProject, version: 3 }, { ...baseProject, version: 5 });
    expect(project.version).toBe(5);
  });

  it('es idempotente aplicándolo dos veces', () => {
    const local = { ...baseProject, tasks: [entity('tA', 'Local', '2026-09-01T10:00:00.000Z')] };
    const remote = { ...baseProject, tasks: [entity('tB', 'Remota', '2026-09-02T10:00:00.000Z')] };
    const first = mergeProjects(local, remote).project;
    const { project } = mergeProjects(first, remote);
    expect(sameProjectAs(project, first)).toBe(true);
  });

  it('conserva el estado de Maie del documento más reciente (inquiries/actionLog/settings)', () => {
    const local = {
      ...baseProject,
      updatedAt: '2026-09-01T12:00:00.000Z',
      inquiries: [{ id: 'q1' }],
      actionLog: [{ id: 'L1' }],
      settings: { applyMode: 'confirm', staleDays: 15 },
    };
    const remote = {
      ...baseProject,
      updatedAt: '2026-09-02T12:00:00.000Z',
      inquiries: [{ id: 'q2' }],
      actionLog: [{ id: 'L2' }],
      settings: { applyMode: 'auto', staleDays: 7 },
      huddle: { recordedAt: '2026-09-02T12:00:00.000Z' },
    };
    const { project } = mergeProjects(local, remote);
    expect(project.inquiries).toEqual([{ id: 'q2' }]);
    expect(project.actionLog).toEqual([{ id: 'L2' }]);
    expect(project.settings.applyMode).toBe('auto');
    expect(project.huddle.recordedAt).toBe('2026-09-02T12:00:00.000Z');
  });

  it('conserva metadatos (teamName/summary/image/coverSeed/ownerId) sin perderlos', () => {
    const local = { ...baseProject, ownerId: 'u_lucia', teamName: 'Equipo Río' };
    const remote = { ...baseProject, ownerId: 'u_lucia', teamName: 'Equipo Río', summary: 'Demo' };
    const { project } = mergeProjects(local, remote);
    expect(project.ownerId).toBe('u_lucia');
    expect(project.teamName).toBe('Equipo Río');
    expect(project.summary).toBe('Demo');
  });
});

describe('sameProjectIgnoringTimestamps', () => {
  it('detecta ecos del propio guardado (misma versión/contenido, otro updatedAt)', () => {
    const project = {
      ...baseProject,
      version: 9,
      columns: [{ id: 'c1' }],
      cards: [{ id: 'k1' }],
    };
    const echo = { ...project, updatedAt: '2026-09-02T18:00:00.000Z' };
    expect(sameProjectAs(echo, project)).toBe(false);
    expect(sameProjectIgnoringTimestamps(echo, project)).toBe(true);
  });

  it('es false cuando el contenido difiere aunque updatedAt sea igual', () => {
    const a = { ...baseProject, name: 'A', updatedAt: '2026-09-02T18:00:00.000Z' };
    const b = { ...baseProject, name: 'B', updatedAt: '2026-09-02T18:00:00.000Z' };
    expect(sameProjectIgnoringTimestamps(a, b)).toBe(false);
  });
});

describe('merge (loop save-echo server mode)', () => {
  it('conserva columns/cards (y demás campos canónicos) del ganador en el merge', () => {
    const remoteWithExtra = {
      ...baseProject,
      version: 3,
      updatedAt: '2026-09-02T18:00:00.000Z',
      columns: [{ id: 'c1', name: 'Listo' }],
      cards: [{ id: 'k1', title: 'Carta' }],
      settings: { applyMode: 'confirm' },
    };
    const local = { ...baseProject, version: 3, updatedAt: '2026-09-02T17:00:00.000Z' };
    const { project } = mergeProjects(local, remoteWithExtra);
    expect(project.columns).toEqual([{ id: 'c1', name: 'Listo' }]);
    expect(project.cards).toEqual([{ id: 'k1', title: 'Carta' }]);
  });

  it('el merge de un eco queda idéntico al remoto (no dispara persistRemote)', () => {
    const echo = {
      ...baseProject,
      version: 3,
      updatedAt: '2026-09-02T18:00:00.000Z',
      columns: [{ id: 'c1' }],
      cards: [{ id: 'k1' }],
    };
    const local = { ...baseProject, version: 3, updatedAt: '2026-09-02T17:00:00.000Z' };
    const { project } = mergeProjects(local, echo);
    expect(sameProjectAs(project, echo)).toBe(true);
  });
});