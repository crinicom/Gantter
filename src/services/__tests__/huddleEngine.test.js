// Huddle (§10) y standup demo (§17.5): motor puro determinístico. No requiere
// React: sesión por proyecto, playback auto/confirm y recap al cerrar.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildStandupSteps,
  createHuddleSession,
  applyDemoStep,
  stopSession,
  recapText,
  interpretHuddleLine,
  templatedHuddleReply,
  DEMO_STATUS,
} from '../huddleEngine';
import * as maieChatModule from '../maieChat';
import { PROPOSAL_STATUS } from '../../constants/maie';

vi.mock('../maieChat', async (importActual) => {
  const actual = await importActual();
  return { ...actual, requestMaieChat: vi.fn() };
});

const NOW = new Date('2026-09-09T10:00:00.000Z');
const GO_LIVE = '2026-09-12';

const MEMBERS = [
  { id: 'u_lucia', name: 'Lucía Ríos', email: 'lucia@rio.local' },
  { id: 'u_martin', name: 'Martín Vega', email: 'martin@rio.local' },
  { id: 'u_ana', name: 'Ana Soler', email: 'ana@rio.local' },
  { id: 'u_sofia', name: 'Sofía Chen', email: 'sofia@rio.local' },
  { id: 'u_diego', name: 'Diego Palacios', email: 'diego@rio.local' },
];

function task(overrides) {
  return {
    id: 'x',
    name: 'Carta',
    status: 'todo',
    progress: 0,
    blocked: false,
    blockedReason: '',
    milestone: false,
    assignedUsers: [],
    startDate: null,
    endDate: null,
    comments: [],
    precedents: [],
    dependents: [],
    bucketId: 'c_curso',
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
    lastActivityAt: '2026-08-01T09:00:00.000Z',
    ...overrides,
  };
}

function makeProject({ applyMode = 'auto' } = {}) {
  return {
    id: 'p_demo',
    name: 'Portal de clientes',
    members: MEMBERS,
    actionLog: [],
    inquiries: [],
    settings: { applyMode },
    tasks: [
      task({
        id: 'card_webhook',
        name: 'Webhook de pagos',
        assignedUsers: [{ id: 'u_ana', name: 'Ana Soler', email: 'ana@rio.local' }],
        bucketId: 'c_curso',
      }),
      task({ id: 'card_magic_link', name: 'Auth magic link', bucketId: 'c_listo' }),
      task({ id: 'card_onboarding', name: 'Rediseñar onboarding', bucketId: 'c_curso' }),
      task({ id: 'card_qa_staging', name: 'QA staging release', bucketId: 'c_listo' }),
      task({
        id: 'card_go_live',
        name: 'Go-live portal',
        milestone: true,
        endDate: GO_LIVE,
      }),
    ],
  };
}

const HOST = 'u_lucia';

describe('buildStandupSteps', () => {
  it('arma el guion completo del equipo seed', () => {
    const steps = buildStandupSteps(makeProject(), NOW);
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.id)).toEqual([
      'webhook-blocker',
      'magic-link-owner',
      'onboarding-stale',
      'qa-staging-dates',
    ]);
  });

  it('bloquea el webhook, asigna magic link y fechas QA vs el hito', () => {
    const [webhook, magic, , qa] = buildStandupSteps(makeProject(), NOW);
    expect(webhook.action).toEqual({
      type: 'set-blocked',
      payload: {
        taskId: 'card_webhook',
        blocked: true,
        blockedReason: 'Certificados pendientes del proveedor de pagos.',
      },
    });
    expect(magic.action).toEqual({
      type: 'assign',
      payload: { taskId: 'card_magic_link', memberId: 'u_martin' },
    });
    expect(qa.action).toEqual({
      type: 'set-dates',
      payload: { taskId: 'card_qa_staging', startDate: '2026-09-09', endDate: GO_LIVE },
    });
  });

  it('el paso estancada es pregunta sin acción', () => {
    const [, , onboarding] = buildStandupSteps(makeProject(), NOW);
    expect(onboarding.action).toBeNull();
    expect(onboarding.question).toContain('Rediseñar onboarding');
  });

  it('saca la acción si la carta no existe o ya está hecha', () => {
    const project = makeProject();
    const blocked = task({
      id: 'card_webhook',
      name: 'Webhook de pagos',
      blocked: true,
      blockedReason: 'x',
    });
    const steps = buildStandupSteps({ ...project, tasks: [blocked] }, NOW);
    expect(steps[0].action).toBeNull();
    expect(steps[0].text).toContain('Webhook de pagos');
  });
});

describe('createHuddleSession', () => {
  it('crea sesión por proyecto con demo de standup en playing', () => {
    const s = createHuddleSession({ project: makeProject(), ritual: 'standup', mode: 'auto', now: NOW, userId: HOST });
    expect(s.projectId).toBe('p_demo');
    expect(s.endedAt).toBeNull();
    expect(s.demo.status).toBe(DEMO_STATUS.PLAYING);
    expect(s.demo.steps).toHaveLength(4);
    expect(s.transcript[0].role).toBe('maie');
    expect(s.joinedIds).toContain('u_lucia');
    expect(s.joinedIds).toContain('u_martin');
  });

  it('refinamiento no trae demo', () => {
    const s = createHuddleSession({ project: makeProject(), ritual: 'refinement', mode: 'confirm', now: NOW, userId: HOST });
    expect(s.ritual).toBe('refinement');
    expect(s.demo).toBeUndefined();
  });
});

describe('applyDemoStep en modo auto', () => {
  it('bloquea el webhook con comentario y entrada de log', () => {
    const project = makeProject({ applyMode: 'auto' });
    const session = createHuddleSession({ project, ritual: 'standup', mode: 'auto', now: NOW, userId: HOST });
    const out = applyDemoStep({ project, session, now: NOW });

    const card = out.project.tasks.find((t) => t.id === 'card_webhook');
    expect(card.blocked).toBe(true);
    expect(card.comments.length).toBe(1);
    expect(card.comments[0].author).toBe('Maie');
    expect(out.project.actionLog).toHaveLength(1);
    expect(out.applied).toBe(true);
    expect(out.session.touchedIds).toContain('card_webhook');
    expect(out.session.highlights).toContain('card_webhook');
    expect(out.session.demo.appliedCount).toBe(1);
    expect(out.done).toBe(false);
    expect(out.session.transcript.some((l) => l.role === 'member' && l.speaker === 'Diego Palacios')).toBe(true);
    expect(out.session.transcript.some((l) => l.text.includes('quedó aplicado'))).toBe(true);
  });

  it('sigue con magic link y cierra tras los cuatro pasos con recap', () => {
    let project = makeProject({ applyMode: 'auto' });
    let session = createHuddleSession({ project, ritual: 'standup', mode: 'auto', now: NOW, userId: HOST });
    let last;
    for (let i = 0; i < 5; i += 1) {
      last = applyDemoStep({ project, session, now: NOW });
      project = last.project;
      session = last.session;
    }
    expect(last.done).toBe(true);
    expect(session.demo.status).toBe(DEMO_STATUS.DONE);
    const magic = project.tasks.find((t) => t.id === 'card_magic_link');
    expect(magic.assignedUsers.map((u) => u.id)).toContain('u_martin');
    const qa = project.tasks.find((t) => t.id === 'card_qa_staging');
    expect(qa.startDate).toBe('2026-09-09');
    expect(qa.endDate).toBe(GO_LIVE);
    const recap = session.transcript.find((l) => l.text.startsWith('3 decisiones'));
    expect(recap).toBeDefined();
    expect(recap.text).toContain('¿Qué queda sin dueño');
  });

  it('no avanza si el demo no está playing', () => {
    const project = makeProject({ applyMode: 'auto' });
    const paused = createHuddleSession({ project, ritual: 'standup', mode: 'auto', now: NOW, userId: HOST });
    const session = { ...paused, demo: { ...paused.demo, status: DEMO_STATUS.PAUSED } };
    const out = applyDemoStep({ project, session, now: NOW });
    expect(out.applied).toBe(false);
    expect(out.project).toBe(project);
  });
});

describe('applyDemoStep en modo confirm', () => {
  it('no muta el tablero y deja la propuesta en pending', () => {
    const project = makeProject({ applyMode: 'confirm' });
    const session = createHuddleSession({ project, ritual: 'standup', mode: 'confirm', now: NOW, userId: HOST });
    const out = applyDemoStep({ project, session, now: NOW });

    const card = out.project.tasks.find((t) => t.id === 'card_webhook');
    expect(card.blocked).toBe(false);
    expect(out.project.actionLog).toHaveLength(0);
    expect(out.applied).toBe(false);
    expect(out.session.pending).toHaveLength(1);
    expect(out.session.pending[0].status).toBe(PROPOSAL_STATUS.PENDING);
    expect(out.session.pending[0].label).toContain('Webhook de pagos');
    expect(out.session.transcript.some((l) => l.text.includes('¿Sí o no?'))).toBe(true);
  });
});

describe('stopSession y recap', () => {
  it('cierra la sesión y fija endedAt', () => {
    const project = makeProject({ applyMode: 'confirm' });
    const session = createHuddleSession({ project, ritual: 'standup', mode: 'confirm', now: NOW, userId: HOST });
    const closed = stopSession({ session, now: NOW });
    expect(closed.endedAt).toBe(NOW.toISOString());
    expect(closed.demo.status).toBe(DEMO_STATUS.DONE);
  });

  it('recap cuenta propuestas sin confirmar y sin doble línea al estar done', () => {
    const project = makeProject({ applyMode: 'confirm' });
    const session = createHuddleSession({ project, ritual: 'standup', mode: 'confirm', now: NOW, userId: HOST });
    const stepped = applyDemoStep({ project, session, now: NOW }).session;
    const recap = recapText(stepped);
    expect(recap).toContain('sin confirmar');
    expect(recap).toContain('¿Qué queda sin dueño');

    const closed = stopSession({ session: stepped, now: NOW });
    const recapLines = closed.transcript.filter((l) => l.text.startsWith('1 propuesta')).length;
    expect(recapLines).toBe(1);
  });

  it('un huddle sin demo (refinamiento) se puede cerrar igual', () => {
    const project = makeProject();
    const session = createHuddleSession({ project, ritual: 'planning', mode: 'confirm', now: NOW, userId: HOST });
    const closed = stopSession({ session, now: NOW });
    expect(closed.endedAt).toBeDefined();
  });
});

describe('templatedHuddleReply', () => {
  it('responde en modo socrático y sin emoji', () => {
    const reply = templatedHuddleReply('hay que fechar el QA');
    expect(reply).toContain('¿Qué carta del tablero tendría que tomar');
    expect(reply).toContain('QA');
  });

  it('reconoce la carta mencionada y pregunta sobre ella en vez de repetir la muletilla', () => {
    const reply = templatedHuddleReply('La carta QA staging release necesita fechas', { project: makeProject() });
    expect(reply).toContain('QA staging release');
    expect(reply).not.toContain('¿Qué carta del tablero tendría que tomar');
  });
});

describe('interpretHuddleLine', () => {
  let project;
  let session;

  beforeEach(() => {
    project = makeProject();
    session = createHuddleSession({ project, ritual: 'standup', mode: 'confirm', now: NOW, userId: HOST });
    vi.mocked(maieChatModule.requestMaieChat).mockReset();
  });

  it('pasa el historial a requestMaieChat como entradas { role, text }', async () => {
    const withThread = {
      ...session,
      transcript: [
        ...session.transcript,
        { role: 'user', speaker: 'Lucía Ríos', text: 'Fecho el QA', cardIds: [], at: NOW.toISOString() },
        { role: 'maie', speaker: 'Maie', text: '¿De qué carta hablamos?', cardIds: [], at: NOW.toISOString() },
      ],
    };
    vi.mocked(maieChatModule.requestMaieChat).mockResolvedValue({ reply: 'Ok.', actions: [], source: 'llm' });
    await interpretHuddleLine({ project, session: withThread, userText: 'QA staging release', now: NOW });

    const call = vi.mocked(maieChatModule.requestMaieChat).mock.calls[0][0];
    expect(call.inquiry.thread.every((t) => typeof t === 'object' && typeof t.role === 'string' && typeof t.text === 'string')).toBe(true);
    expect(call.inquiry.thread.map((t) => t.role)).toEqual(expect.arrayContaining(['user', 'maie']));
    const userLine = call.inquiry.thread.find((t) => t.role === 'user');
    expect(userLine.text).toContain('Fecho el QA');
    expect(call.inquiry.thread.some((t) => t.role === 'maie' && t.text.includes('¿De qué carta'))).toBe(true);
  });

  it('con source templated aplica el fallback contextual que reconoce la carta', async () => {
    vi.mocked(maieChatModule.requestMaieChat).mockResolvedValue({ reply: 'x', actions: [], source: 'templated' });
    const out = await interpretHuddleLine({ project, session, userText: 'La carta QA staging release necesita fechas', now: NOW });
    expect(out.reply).toContain('QA staging release');
    expect(out.reply).not.toContain('¿Qué carta del tablero');
  });
});