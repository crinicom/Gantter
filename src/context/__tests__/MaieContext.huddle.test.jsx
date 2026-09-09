// Integración del huddle con el provider REAL de Maie y el motor real
// (sin mockear huddleEngine): abrir sesión (standup demo), el playback del guion
// avanza con timers y aplica en modo auto, pausa/reanuda, y la línea del usuario
// se interpreta con el path LLM (mockeado) dejando la respuesta de Maie en el
// transcript.

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MaieProvider, MaieContext } from '../MaieContext';
import * as useProjectModule from '../../hooks/useProject';
import * as useAuthModule from '../../hooks/useAuth';
import * as maieChatModule from '../../services/maieChat';

vi.mock('../../hooks/useProject');
vi.mock('../../hooks/useAuth');
vi.mock('../../services/maieChat', async (importActual) => {
  const actual = await importActual();
  return { ...actual, requestMaieChat: vi.fn() };
});

function task(overrides = {}) {
  return {
    id: 't_x',
    name: 'Carta',
    description: 'Descripción larga para no disparar preguntas flacas.',
    assignedUsers: [],
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    status: 'todo',
    progress: 0,
    blocked: false,
    blockedReason: '',
    milestone: false,
    comments: [],
    precedents: [],
    dependents: [],
    bucketId: 'b_curso',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-09-06T09:00:00.000Z',
    lastActivityAt: '2026-09-06T09:00:00.000Z',
    ...overrides,
  };
}

const MEMBERS = [
  { id: 'u_lucia', name: 'Lucía Ríos' },
  { id: 'u_martin', name: 'Martín Vega' },
  { id: 'u_ana', name: 'Ana Soler' },
  { id: 'u_sofia', name: 'Sofía Chen' },
  { id: 'u_diego', name: 'Diego Palacios' },
];

function huddleProject() {
  return {
    id: 'proj_huddle',
    version: 1,
    members: MEMBERS,
    buckets: [
      { id: 'b_backlog', name: 'Backlog' },
      { id: 'b_listo', name: 'Listo' },
      { id: 'b_curso', name: 'En curso' },
      { id: 'b_hecho', name: 'Hecho' },
    ],
    tasks: [
      task({
        id: 'card_webhook',
        name: 'Webhook de pagos',
        assignedUsers: [{ id: 'u_ana', name: 'Ana Soler' }],
      }),
      task({
        id: 'card_magic_link',
        name: 'Auth magic link',
        bucketId: 'b_listo',
        assignedUsers: [{ id: 'u_lucia', name: 'Lucía Ríos' }],
      }),
      task({
        id: 'card_onboarding',
        name: 'Rediseñar onboarding',
      }),
      task({
        id: 'card_qa_staging',
        name: 'QA staging release',
        bucketId: 'b_listo',
      }),
      task({
        id: 'card_go_live',
        name: 'Go-live portal',
        milestone: true,
        startDate: '2026-09-13',
        endDate: '2026-09-13',
      }),
    ],
    actionLog: [],
    inquiries: [],
    settings: { applyMode: 'auto' },
  };
}

function Setup({ holder }) {
  vi.mocked(useProjectModule.useProject).mockReturnValue({
    project: holder.project,
    mutateProject: holder.mutateProject,
    setSettings: () => {},
  });
  return null;
}

function mount() {
  const holder = {
    project: huddleProject(),
    mutateProject: vi.fn(),
  };
  let committed = 0;
  const build = () => (
    <div>
      <Setup holder={holder} />
      <MaieProvider>
        <Probe />
      </MaieProvider>
    </div>
  );
  const view = render(build());
  // Replay de TODOS los mutadores pendientes en orden sobre el documento del
  // holder y re-render del provider (efectos del rescan/playback se vuelven a
  // evaluar) hasta quedar estable.
  const commitAll = async () => {
    let guard = 0;
    while (guard < 100) {
      const calls = holder.mutateProject.mock.calls;
      if (committed >= calls.length) break;
      for (; committed < calls.length; committed += 1) {
        holder.project = calls[committed][0](holder.project);
      }
      view.rerender(build());
      await act(async () => {});
      guard += 1;
    }
  };
  return { holder, commitAll, view };
}

function Probe() {
  const ctx = React.useContext(MaieContext);
  const { project } = useProjectModule.useProject();
  const webhook = project.tasks.find((t) => t.id === 'card_webhook');
  return (
    <div>
      <span data-testid="demo-status">{ctx.demoStatus || ''}</span>
      <span data-testid="cursor">{project.huddle?.demo?.cursor || ''}</span>
      <span data-testid="webhook-blocked">{String(webhook?.blocked)}</span>
      <span data-testid="transcript">
        {(ctx.huddle?.transcript || []).map((l) => l.text).join('|') || ''}
      </span>
      <span data-testid="highlights">{ctx.highlightedTaskIds.size}</span>
      <button type="button" onClick={() => ctx.startHuddle({ ritual: 'standup' })}>
        start
      </button>
      <button type="button" onClick={() => ctx.toggleDemo()}>
        toggle
      </button>
      <button type="button" onClick={() => ctx.replayDemo()}>
        replay
      </button>
      <button type="button" onClick={() => ctx.stopHuddle()}>
        stop
      </button>
      <button type="button" onClick={() => ctx.sendHuddleLine('Fecho el QA para el go-live')}>
        line
      </button>
    </div>
  );
}

describe('MaieContext huddle (integración con el engine real)', () => {
  beforeEach(() => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ user: null });
    vi.mocked(maieChatModule.requestMaieChat).mockResolvedValue({
      reply: 'Anotado, lo fechamos de hoy hasta el go-live.',
      actions: [],
      source: 'llm',
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abrir el standup crea la sesión con el demo en playing', async () => {
    const { holder, commitAll } = mount();
    await commitAll();
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await commitAll();

    expect(holder.project.huddle).toBeDefined();
    expect(holder.project.huddle.demo.status).toBe('playing');
    expect(holder.project.huddle.transcript[0].role).toBe('maie');
    expect(screen.getByTestId('demo-status')).toHaveTextContent('playing');
  });

  it('el playback avanza el guion y, en auto, bloquea el webhook con log', async () => {
    const { holder, commitAll } = mount();
    await commitAll();
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await commitAll();

    await act(async () => {
      vi.advanceTimersByTime(2300);
    });
    await commitAll();

    const webhook = holder.project.tasks.find((t) => t.id === 'card_webhook');
    expect(webhook.blocked).toBe(true);
    expect(holder.project.huddle.touchedIds).toContain('card_webhook');
    expect(holder.project.actionLog.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('webhook-blocked')).toHaveTextContent('true');
    // Primer paso aplicado: el cursor avanzó a 1 y sigue el demo.
    expect(holder.project.huddle.demo.cursor).toBe(1);
    expect(holder.project.huddle.demo.status).toBe('playing');
  });

  it('pausar frena el playback y reanudar lo reactiva', async () => {
    const { holder, commitAll } = mount();
    await commitAll();
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await commitAll();

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    await commitAll();
    expect(holder.project.huddle.demo.status).toBe('paused');
    expect(screen.getByTestId('demo-status')).toHaveTextContent('paused');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    await commitAll();
    expect(holder.project.huddle.demo.status).toBe('playing');
  });

  it('la línea del usuario se interpreta y la respuesta de Maie cae en el transcript', async () => {
    const { holder, commitAll } = mount();
    await commitAll();
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await commitAll();

    fireEvent.click(screen.getByRole('button', { name: 'line' }));
    await commitAll();

    const transcript = (holder.project.huddle.transcript || []).map((l) => l.text).join('|');
    expect(transcript).toContain('Fecho el QA');
    expect(transcript).toContain('Anotado, lo fechamos de hoy');
  });

  it('replay crea sesión nueva con transcript limpio y retoma el playback', async () => {
    const { holder, commitAll } = mount();
    await commitAll();
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await commitAll();

    let guard = 0;
    while (guard < 10 && holder.project.huddle?.demo?.status !== 'done') {
      await act(async () => {
        vi.advanceTimersByTime(2300);
      });
      await commitAll();
      guard += 1;
    }
    expect(holder.project.huddle.demo.status).toBe('done');

    fireEvent.click(screen.getByRole('button', { name: 'replay' }));
    await commitAll();

    expect(holder.project.huddle.demo.status).toBe('playing');
    expect(holder.project.huddle.demo.cursor).toBe(0);
    expect(holder.project.huddle.transcript).toHaveLength(1);
    expect(holder.project.huddle.transcript[0].role).toBe('maie');

    await act(async () => {
      vi.advanceTimersByTime(2300);
    });
    await commitAll();
    expect(holder.project.huddle.demo.cursor).toBe(1);
  });
});