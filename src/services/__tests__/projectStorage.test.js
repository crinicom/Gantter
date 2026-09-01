import { describe, it, expect } from 'vitest';
import {
  createDefaultProject,
  serializeProject,
  deserializeProject,
  normalizeProject,
} from '../projectStorage';

describe('projectStorage', () => {
  it('createDefaultProject inicializa con arrays vacíos', () => {
    const p = createDefaultProject();
    expect(p.buckets).toEqual([]);
    expect(p.tasks).toEqual([]);
    expect(p.name).toBeTruthy();
  });

  it('serialize/deserialize mantiene la estructura y normaliza', () => {
    const project = {
      ...createDefaultProject(),
      name: 'Mi proyecto',
      buckets: [{ id: 'b1', name: 'Backlog', color: '#123' }],
      tasks: [
        {
          id: 't1',
          name: 'Tarea',
          precedents: ['b1'], // no es id de tarea pero se conserva
          dependents: [],
          comments: [],
        },
      ],
    };
    const json = serializeProject(project);
    const restored = deserializeProject(json);
    expect(restored.name).toBe('Mi proyecto');
    expect(restored.buckets[0].name).toBe('Backlog');
    expect(restored.buckets[0].color).toBe('#123');
    expect(restored.tasks[0].precedents).toEqual(['b1']);
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
    expect(p.createdAt).toBeTruthy();
  });
});