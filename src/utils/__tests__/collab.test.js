import { describe, it, expect } from 'vitest';
import { nextVersion, sameProjectAs, mergeProjects } from '../collab';

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
});