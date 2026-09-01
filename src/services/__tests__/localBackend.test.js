import { describe, it, expect, beforeEach } from 'vitest';
import { LocalBackend } from '../localStorageBackend';
import { createDefaultProject } from '../projectStorage';

describe('LocalBackend', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('devuelve proyecto por defecto si no hay nada guardado', async () => {
    const p = await LocalBackend.loadProject();
    expect(p.buckets).toEqual([]);
    expect(p.tasks).toEqual([]);
  });

  it('guarda y recupera un proyecto', async () => {
    const project = {
      ...createDefaultProject(),
      name: 'Mi proyecto',
      tasks: [{ id: 't1', name: 'T', precedents: [], dependents: [], comments: [], bucketId: 'b' }],
    };
    await LocalBackend.saveProject(project);
    const loaded = await LocalBackend.loadProject();
    expect(loaded.name).toBe('Mi proyecto');
    expect(loaded.tasks[0].id).toBe('t1');
  });
});