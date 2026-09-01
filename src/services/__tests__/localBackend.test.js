import { describe, it, expect, beforeEach } from 'vitest';
import { LocalBackend, STORAGE_KEY } from '../localStorageBackend';
import { createProject } from '../projectStorage';

describe('LocalBackend', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('devuelve [] si no hay proyectos guardados', async () => {
    expect(await LocalBackend.loadProjects()).toEqual([]);
  });

  it('guarda y recupera un proyecto en el almacén v3', async () => {
    const project = createProject({ name: 'Mi proyecto', owner: { id: 'u_demo' } });
    await LocalBackend.saveProject(project);
    const list = await LocalBackend.loadProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Mi proyecto');
    expect(list[0].id).toBe(project.id);
  });

  it('elimina un proyecto del almacén', async () => {
    const a = createProject({ name: 'A', owner: { id: 'u_demo' } });
    const b = createProject({ name: 'B', owner: { id: 'u_demo' } });
    await LocalBackend.saveProject(a);
    await LocalBackend.saveProject(b);
    await LocalBackend.deleteProject(a.id);
    const list = await LocalBackend.loadProjects();
    expect(list.map((p) => p.id)).not.toContain(a.id);
    expect(list.map((p) => p.id)).toContain(b.id);
  });

  it('migra un documento v1/v2 al almacén v3 (idempotente)', async () => {
    const legacy = {
      id: null,
      name: 'Legacy',
      buckets: [],
      tasks: [],
      members: [{ id: 'u_demo', role: 'owner', status: 'active' }],
    };
    localStorage.setItem('gantter.project.v2', JSON.stringify(legacy));

    const first = await LocalBackend.loadProjects();
    expect(first).toHaveLength(1);
    const migrated = first[0];
    expect(migrated.name).toBe('Legacy');
    expect(migrated.ownerId).toBe('u_demo');
    expect(migrated.id).toBeTruthy();

    const second = await LocalBackend.loadProjects();
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(migrated.id);
  });

  it('migra también desde la clave v1', async () => {
    localStorage.setItem('gantter.project.v1', JSON.stringify({ name: 'Viejo', buckets: [], tasks: [] }));
    const [migrated] = await LocalBackend.loadProjects();
    expect(migrated.ownerId).toBe('u_demo');
  });

  it('STORAGE_KEY apunta a v3', () => {
    expect(STORAGE_KEY).toBe('gantter.projects.v3');
  });
});