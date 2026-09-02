import { describe, it, expect } from 'vitest';
import {
  createDefaultProject,
  createProject,
  serializeProject,
  deserializeProject,
  normalizeProject,
  projectStoredVersion,
} from '../projectStorage';
import { MEMBER_ROLES, MEMBER_STATUS } from '../../models/member';

describe('projectStorage', () => {
  it('createDefaultProject inicializa con arrays vacíos', () => {
    const p = createDefaultProject();
    expect(p.buckets).toEqual([]);
    expect(p.tasks).toEqual([]);
    expect(p.members).toEqual([]);
    expect(p.ownerId).toBeNull();
    expect(p.image).toBeNull();
    expect(p.coverSeed).toBeNull();
    expect(p.name).toBeTruthy();
  });

  it('createProject crea un proyecto con owner activo', () => {
    const p = createProject({
      name: 'Nuevo',
      description: 'Desc',
      owner: { id: 'u_demo', name: 'Demo', email: 'demo@local' },
    });
    expect(p.id).toBeTruthy();
    expect(p.name).toBe('Nuevo');
    expect(p.description).toBe('Desc');
    expect(p.ownerId).toBe('u_demo');
    expect(p.image).toBeNull();
    expect(p.coverSeed).toBeTruthy();
    expect(p.members).toHaveLength(1);
    expect(p.members[0]).toMatchObject({
      id: 'u_demo',
      role: MEMBER_ROLES.OWNER,
      status: MEMBER_STATUS.ACTIVE,
    });
  });

  it('serialize/deserialize mantiene la estructura y normaliza', () => {
    const project = {
      ...createDefaultProject(),
      id: 'p1',
      name: 'Mi proyecto',
      image: 'data:image/jpeg;base64,AAA=',
      buckets: [{ id: 'b1', name: 'Backlog', color: '#123' }],
      tasks: [
        {
          id: 't1',
          name: 'Tarea',
          precedents: ['b1'],
          dependents: [],
          comments: [],
        },
      ],
    };
    const json = serializeProject(project);
    const restored = deserializeProject(json);
    expect(restored.id).toBe('p1');
    expect(restored.name).toBe('Mi proyecto');
    expect(restored.image).toBe('data:image/jpeg;base64,AAA=');
    expect(restored.buckets[0].name).toBe('Backlog');
    expect(restored.tasks[0].precedents).toEqual(['b1']);
  });

  it('createProject asigna un coverSeed único por proyecto', () => {
    const a = createProject({ name: 'A', owner: { id: 'u1' } });
    const b = createProject({ name: 'B', owner: { id: 'u1' } });
    expect(a.coverSeed).toBeTruthy();
    expect(a.coverSeed).not.toBe(b.coverSeed);
  });

  it('normalizeProject conserva coverSeed si existe y lo backfillea desde el id si falta', () => {
    const withSeed = normalizeProject({ name: 'X', id: 'p1', coverSeed: 's-42' });
    expect(withSeed.coverSeed).toBe('s-42');
    const withoutSeed = normalizeProject({ name: 'Y', id: 'p2' });
    expect(withoutSeed.coverSeed).toBe('p2');
    const noId = normalizeProject({ name: 'Z', coverSeed: 's-43' });
    expect(noId.coverSeed).toBe('s-43');
  });

  it('deserializeProject tolera JSON inválido y devuelve default', () => {
    const p = deserializeProject('{esto no es json');
    expect(p.buckets).toEqual([]);
    expect(p.tasks).toEqual([]);
  });

  it('normalizeProject aplica defaults cuando faltan campos', () => {
    const p = normalizeProject({ name: 'X' });
    expect(p.buckets).toEqual([]);
    expect(p.tasks).toEqual([]);
    expect(p.ownerId).toBeNull();
    expect(p.image).toBeNull();
    expect(p.createdAt).toBeTruthy();
  });

  it('projectStoredVersion es 3', () => {
    expect(projectStoredVersion()).toBe(3);
  });
});