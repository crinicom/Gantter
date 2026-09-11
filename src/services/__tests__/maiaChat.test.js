import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as maiaChatModule from '../maiaChat';
import * as appConfig from '../../config/appConfig';

vi.mock('../../config/appConfig', () => ({
  isServerMode: vi.fn(() => false),
  apiBase: vi.fn(() => ''),
}));

function project(overrides = {}) {
  return {
    id: 'proj_1',
    name: 'Gantter v1',
    members: [
      { id: 'm_lucia', name: 'Lucía Ríos' },
      { id: 'm_martin', name: 'Martín Vega' },
    ],
    buckets: [
      { id: 'b_curso', name: 'En curso' },
      { id: 'b_backlog', name: 'Backlog' },
    ],
    tasks: [
      {
        id: 't1',
        name: 'Auth magic link',
        description: 'Descripcion larga de la carta para no disparar la pregunta thin.',
        assignedUsers: [],
        startDate: '2026-09-09',
        endDate: '2026-09-14',
        status: 'todo',
        blocked: false,
        milestone: true,
        comments: [],
        bucketId: 'b_curso',
        createdAt: '2026-08-20T10:00:00.000Z',
        updatedAt: '2026-08-20T10:00:00.000Z',
        lastActivityAt: '2026-08-20T10:00:00.000Z',
      },
    ],
    settings: { applyMode: 'confirm', staleDays: 15 },
    actionLog: [],
    inquiries: [],
    ...overrides,
  };
}

const inquiry = (overrides = {}) => ({
  id: 'q1',
  kind: 'unassigned',
  cardId: 't1',
  status: 'open',
  question: '¿De quién es el siguiente movimiento?',
  evidence: 'Sin responsable.',
  thread: [],
  proposals: [],
  ...overrides,
});

function fetchStub() {
  global.fetch = vi.fn();
}

describe('buildBoardContext', () => {
  it('incluye la carta en cuestión, miembros, hitos próximos y modo', () => {
    const ctx = maiaChatModule.buildBoardContext({
      project: project(),
      inquiry: inquiry(),
      now: new Date('2026-09-08T00:00:00Z'),
    });
    expect(ctx).toContain('Gantter v1');
    expect(ctx).toContain('m_lucia=Lucía Ríos');
    expect(ctx).toContain('confirm');
    expect(ctx).toContain('Auth magic link');
    expect(ctx).toContain('Hitos próximos');
  });

  it('nunca supera el cap de contexto aunque el tablero sea enorme', () => {
    const big = project({
      tasks: Array.from({ length: 60 }, (_, i) => ({
        ...project().tasks[0],
        id: `t${i}`,
        name: `Carta numero ${i} de descripcion larga para inflar el contexto`,
        milestone: i % 2 === 0,
      })),
    });
    const ctx = maiaChatModule.buildBoardContext({
      project: big,
      inquiry: inquiry(),
      now: new Date('2026-09-08T00:00:00Z'),
    });
    expect(ctx.length).toBeLessThanOrEqual(1200);
  });

  it('en kind overlap suma las cartas con fechas visibles', () => {
    const ctx = maiaChatModule.buildBoardContext({
      project: project(),
      inquiry: inquiry({ kind: 'overlap' }),
      now: new Date('2026-09-08T00:00:00Z'),
    });
    expect(ctx).toContain('Cartas con fechas visibles');
  });

  it('en kind breakdown anuncia la columna inicial y la Ficha para que el lote use bucketId real', () => {
    const withFicha = project({ documents: [{ title: 'Ficha del proyecto', content: '# Ficha\nObjetivo: landing que convierta.' }] });
    const ctx = maiaChatModule.buildBoardContext({
      project: withFicha,
      inquiry: inquiry({ kind: 'breakdown' }),
      now: new Date('2026-09-08T00:00:00Z'),
    });
    expect(ctx).toContain('Columna inicial para las tareas');
    expect(ctx).toContain('Columnas (id=nombre)');
    expect(ctx).toContain('Ficha del proyecto');
    expect(ctx).toContain('b_backlog');
  });
});

describe('templatedMaiaReply', () => {
  const base = { project: project(), inquiry: inquiry({ cardId: 't1' }), now: new Date('2026-09-08T00:00:00Z') };

  it('responde por kind con tono socrático rioplatense y menciona la carta', () => {
    expect(maiaChatModule.templatedMaiaReply({ ...base, inquiry: inquiry({ cardId: 't1' }) })).toMatch(/¿/);
    expect(maiaChatModule.templatedMaiaReply({ ...base, inquiry: inquiry({ cardId: 't1' }) })).toContain('Auth magic link');
  });

  it('distingue thin, unassigned, stale, missing-date y overlap', () => {
    const replies = [
      maiaChatModule.templatedMaiaReply({ ...base, inquiry: inquiry({ kind: 'thin', cardId: 't1' }) }),
      maiaChatModule.templatedMaiaReply({ ...base, inquiry: inquiry({ kind: 'unassigned', cardId: 't1' }) }),
      maiaChatModule.templatedMaiaReply({ ...base, inquiry: inquiry({ kind: 'stale', cardId: 't1' }) }),
      maiaChatModule.templatedMaiaReply({ ...base, inquiry: inquiry({ kind: 'missing-date', cardId: 't1' }) }),
      maiaChatModule.templatedMaiaReply({ ...base, inquiry: inquiry({ kind: 'overlap', cardId: 't1' }) }),
    ];
    const unique = new Set(replies);
    expect(unique.size).toBe(5);
  });

  it('nunca pierde la carta aunque el título venga de name', () => {
    const small = project({
      tasks: [{ ...project().tasks[0], name: 'Solo obra', title: undefined }],
    });
    expect(maiaChatModule.templatedMaiaReply({ ...base, project: small })).toContain('Solo obra');
  });
});

describe('sanitizeActions / actionsToProposals', () => {
  it('descarta tipos fuera de whitelist y ids inexistentes', () => {
    const p = project();
    const ok = [
      { type: 'assign', payload: { taskId: 't1', memberId: 'm_lucia' } },
      { type: 'create-card', payload: { bucketId: 'b_backlog', title: 'Setup CI' } },
    ];
    const bad = [
      { type: 'delete-project', payload: {} },
      { type: 'assign', payload: { taskId: 't1', memberId: 'm_fantasma' } },
      { type: 'create-card', payload: { bucketId: 'b_ausente', title: 'X' } },
      null,
    ];
    const clean = maiaChatModule.sanitizeActions({ project: p, actions: [...ok, ...bad] });
    expect(clean).toHaveLength(2);
    expect(clean.map((a) => a.type)).toEqual(['assign', 'create-card']);
  });

  it('traduce acciones válidas a propuestas con id, label, payload y comment', () => {
    const p = project();
    const proposals = maiaChatModule.actionsToProposals({
      project: p,
      inquiry: inquiry(),
      actions: [
        { type: 'assign', payload: { taskId: 't1', memberId: 'm_martin' } },
        { type: 'create-card', payload: { bucketId: 'b_backlog', title: 'Setup CI' } },
      ],
    });
    expect(proposals).toHaveLength(2);
    expect(proposals[0]).toMatchObject({
      inquiryId: 'q1',
      action: 'assign',
      needsInput: false,
      status: 'pending',
    });
    expect(proposals[0].label).toContain('Martín Vega');
    expect(proposals[0].payload.taskId).toBe('t1');
    expect(proposals[1].action).toBe('create-card');
    expect(proposals[1].payload.title).toBe('Setup CI');
  });
});

describe('requestMaiaChat', () => {
  beforeEach(() => {
    fetchStub();
    vi.mocked(appConfig.isServerMode).mockReturnValue(false);
  });

  it('sin server degrada a la respuesta templated sin fetch ni llanto', async () => {
    const res = await maiaChatModule.requestMaiaChat({
      project: project(),
      inquiry: inquiry(),
      userText: 'Lo toma Ana.',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.source).toBe('templated');
    expect(res.actions).toEqual([]);
    expect(typeof res.reply).toBe('string');
  });

  it('breakdown sin server degrada a un desglose templated con 4 create-card y bucketId real', async () => {
    const res = await maiaChatModule.requestMaiaChat({
      project: project(),
      inquiry: inquiry({ kind: 'breakdown', cardId: null }),
      userText: 'Dale, desglosá.',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.source).toBe('templated');
    expect(res.actions).toHaveLength(4);
    res.actions.forEach((a) => {
      expect(a.type).toBe('create-card');
      expect(['b_curso', 'b_backlog']).toContain(a.payload.bucketId);
      expect(String(a.payload.title).trim()).not.toBe('');
      expect(String(a.payload.description || '').trim()).not.toBe('');
    });
  });

  it('en server mode llama al relay y devuelve reply + acciones del LLM', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('https://gantter.fly.dev');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Vamos a verlo.', actions: [{ type: 'assign', payload: { taskId: 't1', memberId: 'm_lucia' } }] }),
    });
    const res = await maiaChatModule.requestMaiaChat({
      project: project(),
      inquiry: inquiry(),
      userText: 'Lo toma Ana.',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://gantter.fly.dev/api/maia/chat',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(res.source).toBe('llm');
    expect(res.reply).toBe('Vamos a verlo.');
    expect(res.actions).toHaveLength(1);
  });

  it('breakdown en server mode manda workflow breakdown en el body', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('https://gantter.fly.dev');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Armemos el primer paso.', actions: [] }),
    });
    const res = await maiaChatModule.requestMaiaChat({
      project: project(),
      inquiry: inquiry({ kind: 'breakdown', cardId: null }),
      userText: 'Dale.',
    });
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.workflow).toBe('breakdown');
    expect(res.source).toBe('llm');

    const normal = inquiry();
    await maiaChatModule.requestMaiaChat({ project: project(), inquiry: normal, userText: 'Dale.' });
    const [, normalOptions] = global.fetch.mock.calls[1];
    expect(JSON.parse(normalOptions.body).workflow).toBeUndefined();
  });

  it('con fallo del upstream reintenta una vez y degrada a templated', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    global.fetch.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const res = await maiaChatModule.requestMaiaChat({
      project: project(),
      inquiry: inquiry(),
      userText: 'Hola Maia',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(res.source).toBe('templated');
  });

  it('recorta mensaje largo, contexto y hilo al presupuesto de tokens', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('https://gantter.fly.dev');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Ok.', actions: [] }),
    });
    const inq = inquiry({
      thread: Array.from({ length: 8 }, (_, i) => ({
        id: `m${i}`,
        role: i % 2 ? 'maia' : 'user',
        author: 'X',
        text: `mensaje del turno ${i}`,
      })),
    });
    const res = await maiaChatModule.requestMaiaChat({
      project: project(),
      inquiry: inq,
      userText: 'a'.repeat(3000),
    });
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.userText).toHaveLength(1000);
    expect(body.threadTail).toHaveLength(3);
    expect(body.boardContext.length).toBeLessThanOrEqual(1200);
    expect(res.source).toBe('llm');
  });

  it('normaliza el hilo: convive objetos y strings pasados por el huddle', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('https://gantter.fly.dev');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Ok.', actions: [] }),
    });
    const inq = inquiry({
      thread: [
        { role: 'maia', text: '¿Qué carta?' },
        'usuario: Me refiero al webhook',
        { role: 'user', text: 'Fecho el QA' },
        { role: 'maia', text: 'Listo' },
      ],
    });
    const res = await maiaChatModule.requestMaiaChat({
      project: project(),
      inquiry: inq,
      userText: 'Sí.',
    });
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.threadTail).toEqual([
      'usuario: Me refiero al webhook',
      'user: Fecho el QA',
      'maia: Listo',
    ]);
    expect(res.source).toBe('llm');
  });
});