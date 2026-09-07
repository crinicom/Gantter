import { describe, it, expect, beforeEach } from 'vitest';
import { LocalBackend, STORAGE_KEY } from '../localStorageBackend';
import { createProject } from '../projectStorage';

describe('LocalBackend', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('en el primer arranque siembra los proyectos demo (2)', async () => {
    const list = await LocalBackend.loadProjects();
    expect(list).toHaveLength(2);
    const names = list.map((p) => p.name);
    expect(names).toContain('Portal de clientes');
    expect(names).toContain('App móvil v2');
    // Quedan persistidos canónicos en el almacén.
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const portal = raw['seed_portal'];
    expect(portal.columns).toBeTruthy();
    expect(portal.cards.length).toBeGreaterThan(0);
  });

  it('guarda y recupera un proyecto en el almacén', async () => {
    const project = createProject({ name: 'Mi proyecto', owner: { id: 'u_lucia' } });
    await LocalBackend.saveProject(project);
    const list = await LocalBackend.loadProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Mi proyecto');
    expect(list[0].id).toBe(project.id);
  });

  it('guarda el documento canónico en el almacén', async () => {
    const project = createProject({ name: 'Canónico', owner: { id: 'u_lucia' } });
    await LocalBackend.saveProject(project);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const doc = raw[project.id];
    expect(doc.columns).toBeTruthy();
    expect(doc.cards).toEqual([]);
    expect(doc.buckets).toBeUndefined();
    expect(doc.tasks).toBeUndefined();
  });

  it('elimina un proyecto del almacén', async () => {
    const a = createProject({ name: 'A', owner: { id: 'u_lucia' } });
    const b = createProject({ name: 'B', owner: { id: 'u_lucia' } });
    await LocalBackend.saveProject(a);
    await LocalBackend.saveProject(b);
    await LocalBackend.deleteProject(a.id);
    const list = await LocalBackend.loadProjects();
    expect(list.map((p) => p.id)).not.toContain(a.id);
    expect(list.map((p) => p.id)).toContain(b.id);
  });

  it('migra un documento v1/v2 al almacén (idempotente)', async () => {
    const legacy = {
      id: null,
      name: 'Legacy',
      buckets: [{ id: 'b1', name: 'Hecho', color: '#123' }],
      tasks: [
        {
          id: 't1',
          name: 'Tarea',
          bucketId: 'b1',
          assignedUser: null,
          comments: [],
          precedents: [],
          dependents: [],
        },
      ],
      members: [{ id: 'u_demo', role: 'owner', status: 'active', name: 'Demo', email: 'demo@local' }],
    };
    localStorage.setItem('gantter.project.v2', JSON.stringify(legacy));

    const first = await LocalBackend.loadProjects();
    expect(first).toHaveLength(1);
    const migrated = first[0];
    expect(migrated.name).toBe('Legacy');
    expect(migrated.ownerId).toBe('u_demo');
    expect(migrated.id).toBeTruthy();
    expect(migrated.buckets).toHaveLength(1);

    const second = await LocalBackend.loadProjects();
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(migrated.id);
  });

  it('migra también desde la clave v1 (owner por defecto = Lucía)', async () => {
    localStorage.setItem('gantter.project.v1', JSON.stringify({ name: 'Viejo', buckets: [], tasks: [] }));
    const [migrated] = await LocalBackend.loadProjects();
    expect(migrated.ownerId).toBe('u_lucia');
  });

  it('STORAGE_KEY apunta a v3', () => {
    expect(STORAGE_KEY).toBe('gantter.projects.v3');
  });
});