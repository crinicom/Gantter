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
import { PROJECT_SETTINGS_DEFAULTS } from '../../constants/project';

describe('projectStorage', () => {
  it('createDefaultProject inicializa con las 2 columnas por defecto y vacíos', () => {
    const p = createDefaultProject();
    expect(p.buckets.map((b) => b.name)).toEqual(['Por hacer', 'En curso']);
    expect(p.tasks).toEqual([]);
    expect(p.members).toEqual([]);
    expect(p.ownerId).toBeNull();
    expect(p.image).toBeNull();
    expect(p.coverSeed).toBeNull();
    expect(p.name).toBeTruthy();
    expect(p.settings).toEqual(PROJECT_SETTINGS_DEFAULTS);
    expect(p.inquiries).toEqual([]);
    expect(p.actionLog).toEqual([]);
    expect(p.documents).toEqual([]);
    expect(p.huddle).toBeNull();
    expect(p.onboarding).toMatchObject({ answers: {}, done: false });
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
    expect(p.buckets.map((b) => b.name)).toEqual(['Por hacer', 'En curso']);
    expect(p.columns.map((c) => c.title)).toEqual(['Por hacer', 'En curso']);
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
          assignedUser: null,
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
    // El shape persistido es canónico: pierde runtime, conserva el contenido.
    expect(restored.buckets).toHaveLength(1);
    expect(restored.buckets[0].name).toBe('Backlog');
    expect(restored.tasks).toHaveLength(1);
    expect(restored.tasks[0].precedents).toEqual([]);
  });

  it('round-trip canónico: runtime → doc → runtime es estable', () => {
    const runtime = {
      ...createDefaultProject(),
      id: 'p1',
      name: 'Portal',
      description: 'Resumen del proyecto',
      ownerId: 'u_lucia',
      members: [{ id: 'u_lucia', name: 'Lucía Ríos', email: 'lucia@rio.local', role: 'owner', status: 'active' }],
      buckets: [
        { id: 'b1', name: 'Backlog', color: '#2b4d42', collapsed: false },
        { id: 'b2', name: 'En curso', color: '#7d5247', collapsed: false },
      ],
      tasks: [
        {
          id: 't1',
          name: 'Rediseñar onboarding',
          description: '',
          bucketId: 'b2',
          assignedUser: { id: 'u_lucia', name: 'Lucía Ríos', email: 'lucia@rio.local' },
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          status: 'in-progress',
          progress: 40,
          comments: [],
          precedents: [],
          dependents: [],
        },
      ],
    };

    const doc = JSON.parse(serializeProject(runtime));
    expect(doc.columns).toBeTruthy();
    expect(doc.cards).toHaveLength(1);
    expect(doc.cards[0]).toMatchObject({
      id: 't1',
      title: 'Rediseñar onboarding',
      columnId: 'b2',
      assigneeIds: ['u_lucia'],
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    });
    expect(doc.summary).toBe('Resumen del proyecto');

    const restored = deserializeProject(JSON.stringify(doc));
    expect(restored.name).toBe('Portal');
    expect(restored.buckets.map((b) => b.name)).toEqual(['Backlog', 'En curso']);
    expect(restored.tasks[0].name).toBe('Rediseñar onboarding');
    expect(restored.tasks[0].assignedUsers[0].id).toBe('u_lucia');
    // status deriva de la columna en v1.
    expect(restored.tasks[0].status).toBe('in-progress');
    // Backfill: sin número persistido, recibe 1..N en orden.
    expect(restored.tasks[0].number).toBe(1);
  });

  it('round-trip canónico con múltiples responsables, bloqueada e hito', () => {
    const runtime = {
      ...createDefaultProject(),
      id: 'p1',
      name: 'Portal',
      ownerId: 'u_lucia',
      members: [
        { id: 'u_lucia', name: 'Lucía Ríos', email: 'lucia@rio.local', role: 'owner', status: 'active' },
        { id: 'u_sofia', name: 'Sofía Chen', email: 'sofia@rio.local', role: 'member', status: 'active' },
      ],
      buckets: [{ id: 'b1', name: 'En curso', color: '#2b4d42', collapsed: false, wipLimit: 3 }],
      tasks: [
        {
          id: 't1',
          name: 'Hito go-live',
          bucketId: 'b1',
          assignedUsers: [
            { id: 'u_lucia', name: 'Lucía Ríos', email: 'lucia@rio.local' },
            { id: 'u_sofia', name: 'Sofía Chen', email: 'sofia@rio.local' },
          ],
          startDate: '2026-09-12',
          endDate: '2026-09-12',
          status: 'in-progress',
          progress: 0,
          blocked: true,
          blockedReason: 'Certificados pendientes',
          milestone: true,
          comments: [],
          precedents: [],
          dependents: [],
        },
      ],
    };

    const doc = JSON.parse(serializeProject(runtime));
    expect(doc.cards[0].assigneeIds).toEqual(['u_lucia', 'u_sofia']);
    expect(doc.cards[0].blocked).toBe(true);
    expect(doc.cards[0].blockedReason).toBe('Certificados pendientes');
    expect(doc.cards[0].milestone).toBe(true);
    expect(doc.columns[0].wipLimit).toBe(3);

    const restored = deserializeProject(JSON.stringify(doc));
    expect(restored.tasks[0].assignedUsers.map((u) => u.id)).toEqual(['u_lucia', 'u_sofia']);
    expect(restored.tasks[0].blocked).toBe(true);
    expect(restored.tasks[0].blockedReason).toBe('Certificados pendientes');
    expect(restored.tasks[0].milestone).toBe(true);
    expect(restored.buckets[0].wipLimit).toBe(3);
  });

  it('normaliza un task legacy con assignedUser único a assignedUsers', () => {
    const p = normalizeProject({
      id: 'p-old',
      name: 'Legacy',
      members: [{ id: 'u_demo', name: 'Demo', email: 'demo@local', role: 'owner', status: 'active' }],
      buckets: [{ id: 'b1', name: 'Backlog', color: '#123' }],
      tasks: [
        {
          id: 't1',
          name: 'Tarea',
          bucketId: 'b1',
          assignedUser: { id: 'u_demo', name: 'Demo', email: 'demo@local' },
          status: 'todo',
          progress: 0,
          comments: [],
          precedents: [],
          dependents: [],
        },
      ],
    });
    expect(p.tasks[0].assignedUsers).toEqual([
      { id: 'u_demo', name: 'Demo', email: 'demo@local' },
    ]);
    const doc = JSON.parse(serializeProject(p));
    expect(doc.cards[0].assigneeIds).toEqual(['u_demo']);
  });

  it('números de carta: backfill 1..N en orden y round-trip canónico los conserva', () => {
    const runtime = {
      ...createDefaultProject(),
      id: 'p1',
      name: 'Portal',
      ownerId: 'u_lucia',
      members: [],
      buckets: [
        { id: 'b1', name: 'Backlog', color: '#123', collapsed: false },
        { id: 'b2', name: 'En curso', color: '#456', collapsed: false },
      ],
      tasks: [
        { id: 't1', name: 'Uno', bucketId: 'b1', assignedUser: null, comments: [], precedents: [], dependents: [] },
        { id: 't2', name: 'Dos', bucketId: 'b2', assignedUser: null, comments: [], precedents: [], dependents: [] },
      ],
    };
    const restored = deserializeProject(serializeProject(runtime));
    expect(restored.tasks.map((t) => t.number)).toEqual([1, 2]);

    // Un número ya persistido se conserva y el resto se sigue completando.
    const doc = JSON.parse(serializeProject(runtime));
    doc.cards[0].number = 7;
    const again = deserializeProject(JSON.stringify(doc));
    expect(again.tasks.map((t) => t.number)).toEqual([7, 2]);
    expect(doc.cards[0].number).toBe(7);
  });

  it('normaliza documentos legacy (buckets/tasks) a runtime y genera correos canónicos', () => {
    const legacy = {
      id: 'p-old',
      name: 'Legacy',
      description: 'Desc',
      members: [{ id: 'u_demo', name: 'Demo', email: 'demo@local', role: 'owner', status: 'active' }],
      buckets: [{ id: 'b1', name: 'Hecho', color: '#123' }],
      tasks: [
        {
          id: 't1',
          name: 'Tarea vieja',
          bucketId: 'b1',
          assignedUser: { id: 'u_demo', name: 'Demo', email: 'demo@local' },
          status: 'todo',
          progress: 10,
          comments: [],
          precedents: [],
          dependents: [],
        },
      ],
    };
    const p = normalizeProject(legacy);
    expect(p.id).toBe('p-old');
    expect(p.buckets[0].name).toBe('Hecho');
    // Documento canónico derivado: cartas con columnId mapeado.
    const doc = JSON.parse(serializeProject(p));
    expect(doc.cards[0].columnId).toBe('b1');
    expect(doc.cards[0].title).toBe('Tarea vieja');
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
  });

  it('deserializeProject tolera JSON inválido y devuelve default', () => {
    const p = deserializeProject('{esto no es json');
    expect(p.buckets.map((b) => b.name)).toEqual(['Por hacer', 'En curso']);
    expect(p.tasks).toEqual([]);
  });

  it('normalizeProject aplica defaults cuando faltan campos', () => {
    const p = normalizeProject({ name: 'X' });
    expect(p.buckets.map((b) => b.name)).toEqual(['Por hacer', 'En curso']);
    expect(p.tasks).toEqual([]);
    // Sin rastro de owner, cae en la identidad v1 (Lucía) para no perder visibilidad.
    expect(p.ownerId).toBe('u_lucia');
    expect(p.image).toBeNull();
    expect(p.createdAt).toBeTruthy();
  });

  it('projectStoredVersion es 4', () => {
    expect(projectStoredVersion()).toBe(4);
  });

  it('documentos: round-trip canónico conserva title/content/timestamps', () => {
    const runtime = {
      ...createDefaultProject(),
      id: 'p1',
      name: 'Portal',
      ownerId: 'u_lucia',
      members: [],
      documents: [
        {
          id: 'doc_1',
          title: 'Ficha del proyecto',
          content: '# Ficha\n\n## Objetivo\nEntregar en fecha.',
          createdAt: '2026-09-05T12:00:00.000Z',
          updatedAt: '2026-09-05T12:00:00.000Z',
        },
      ],
    };
    const doc = JSON.parse(serializeProject(runtime));
    expect(doc.documents).toHaveLength(1);
    expect(doc.documents[0]).toMatchObject({
      id: 'doc_1',
      title: 'Ficha del proyecto',
      content: '# Ficha\n\n## Objetivo\nEntregar en fecha.',
    });
    const restored = deserializeProject(serializeProject(runtime));
    expect(restored.documents).toEqual(runtime.documents);
  });

  it('documentos: un documento sin campo documents en legacy se backfillea a []', () => {
    const legacy = { id: 'p-old', name: 'Legacy', members: [], buckets: [], tasks: [] };
    const p = normalizeProject(legacy);
    expect(p.documents).toEqual([]);
    const canonical = deserializeProject(serializeProject(p));
    expect(canonical.documents).toEqual([]);
  });

  it('onboarding: round-trip canónico conserva respuestas y done; legacy queda null', () => {
    const runtime = {
      ...createDefaultProject(),
      id: 'p1',
      name: 'Portal',
      ownerId: 'u_lucia',
      members: [],
      onboarding: {
        answers: { objetivo: 'Entregar el portal', equipo: 'Lucía' },
        currentQuestionId: 'equipo',
        done: false,
      },
    };
    const doc = JSON.parse(serializeProject(runtime));
    expect(doc.onboarding).toMatchObject({
      answers: { objetivo: 'Entregar el portal', equipo: 'Lucía' },
      currentQuestionId: 'equipo',
      done: false,
    });
    const restored = deserializeProject(serializeProject(runtime));
    expect(restored.onboarding).toEqual(runtime.onboarding);

    const legacy = normalizeProject({ id: 'p2', name: 'Sin onboarding', members: [], buckets: [], tasks: [] });
    expect(legacy.onboarding).toBeNull();

    const created = createProject({ name: 'Nuevo', owner: { id: 'u1', name: 'A', email: 'a@b.c' } });
    expect(created.onboarding).not.toBeNull();
    expect(created.onboarding.done).toBe(false);
  });

  it('shortcuts: round-trip canónico conserva url/label y deriva label en normalize', () => {
    const runtime = {
      ...createDefaultProject(),
      id: 'p1',
      name: 'Portal',
      ownerId: 'u_lucia',
      members: [],
      shortcuts: [
        { id: 's1', url: 'https://figma.com/file/x', createdAt: '2026-09-10T10:00:00.000Z' },
        { id: 's2', url: 'https://jira.example.com/x', label: 'Jira', createdAt: '2026-09-10T11:00:00.000Z' },
      ],
    };
    const doc = JSON.parse(serializeProject(runtime));
    expect(doc.shortcuts).toMatchObject([
      { id: 's1', url: 'https://figma.com/file/x', label: 'figma.com' },
      { id: 's2', url: 'https://jira.example.com/x', label: 'Jira' },
    ]);
    const restored = deserializeProject(serializeProject(runtime));
    expect(restored.shortcuts).toEqual([
      { id: 's1', url: 'https://figma.com/file/x', label: 'figma.com', createdAt: '2026-09-10T10:00:00.000Z' },
      { id: 's2', url: 'https://jira.example.com/x', label: 'Jira', createdAt: '2026-09-10T11:00:00.000Z' },
    ]);
  });

  it('shortcuts: un proyecto sin campo shortcuts se backfillea a []', () => {
    const legacy = { id: 'p-old', name: 'Legacy', members: [], buckets: [], tasks: [] };
    const p = normalizeProject(legacy);
    expect(p.shortcuts).toEqual([]);
    const canonical = deserializeProject(serializeProject(p));
    expect(canonical.shortcuts).toEqual([]);
    expect(createDefaultProject().shortcuts).toEqual([]);
  });
});