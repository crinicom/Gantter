import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaieProvider, MaieContext } from '../MaieContext';
import * as useProjectModule from '../../hooks/useProject';
import * as useAuthModule from '../../hooks/useAuth';
import * as inquiryEngine from '../../services/inquiryEngine';
import * as maieChatModule from '../../services/maieChat';

vi.mock('../../hooks/useProject');
vi.mock('../../hooks/useAuth');
vi.mock('../../services/inquiryEngine');
vi.mock('../../services/maieChat', async (importActual) => {
  const actual = await importActual();
  return { ...actual, requestMaieChat: vi.fn() };
});

const snoozedInquiry = {
  id: 'q_snoozed',
  kind: 'thin',
  cardId: 't1',
  status: 'snoozed',
  question: 'Test',
  evidence: 'Test',
  createdAt: new Date().toISOString(),
};

const actionLogEntry = {
  id: 'log_1',
  at: new Date().toISOString(),
  source: 'auto',
  summary: 'Test entry',
  cardId: 't1',
};

function makeProject(overrides = {}) {
  return {
    id: 'proj_1',
    version: 1,
    inquiries: [snoozedInquiry],
    actionLog: [actionLogEntry],
    buckets: [],
    tasks: [],
    ...overrides,
  };
}

function Consumer() {
  const ctx = React.useContext(MaieContext);
  if (!ctx) return null;
  return (
    <div>
      <span data-testid="inquiry-count">{ctx.inquiries.length}</span>
      <span data-testid="inquiry-id">{ctx.inquiries[0]?.id}</span>
      <span data-testid="log-count">{ctx.actionLog.length}</span>
      <span data-testid="log-id">{ctx.actionLog[0]?.id}</span>
    </div>
  );
}

describe('MaieProvider hydration', () => {
  beforeEach(() => {
    vi.mocked(inquiryEngine.scanInquiries).mockReturnValue({
      inquiries: [snoozedInquiry],
      logEntries: [],
    });
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ user: null });
  });

  function setupProject(project) {
    vi.mocked(useProjectModule.useProject).mockReturnValue({
      project,
      mutateProject: vi.fn(),
      setSettings: vi.fn(),
    });
  }

  it('hidrata inquiries y actionLog desde el proyecto persistido', () => {
    setupProject(makeProject());
    render(
      <MaieProvider>
        <Consumer />
      </MaieProvider>,
    );
    expect(screen.getByTestId('inquiry-count')).toHaveTextContent('1');
    expect(screen.getByTestId('inquiry-id')).toHaveTextContent('q_snoozed');
    expect(screen.getByTestId('log-count')).toHaveTextContent('1');
    expect(screen.getByTestId('log-id')).toHaveTextContent('log_1');
  });

  it('no genera nuevos ids ni regenera inquiries hidratadas', () => {
    setupProject(makeProject());
    render(
      <MaieProvider>
        <Consumer />
      </MaieProvider>,
    );
    expect(inquiryEngine.scanInquiries).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ existingInquiries: [snoozedInquiry] }),
    );
    expect(screen.getByTestId('inquiry-id')).toHaveTextContent('q_snoozed');
  });

  it('resetear al cambiar a proyecto null', () => {
    const { rerender } = render(
      <MaieProvider>
        <Consumer />
      </MaieProvider>,
    );
    expect(screen.getByTestId('inquiry-count')).toHaveTextContent('1');

    setupProject(null);
    rerender(
      <MaieProvider>
        <Consumer />
      </MaieProvider>,
    );
    expect(screen.getByTestId('inquiry-count')).toHaveTextContent('0');
    expect(screen.getByTestId('log-count')).toHaveTextContent('0');
  });
});

// Fixture con una tarea sin dueño y su inquiry/propuesta pending.
function task(tid = 't1') {
  return {
    id: tid,
    title: 'Auth magic link',
    name: 'Auth magic link',
    description: '',
    assignedUsers: [],
    startDate: null,
    endDate: null,
    status: 'todo',
    blocked: false,
    comments: [],
    bucketId: 'b_listo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
}

function actionInquiry() {
  return {
    id: 'q_a',
    cardId: 't1',
    kind: 'unassigned',
    status: 'open',
    question: '¿De quién es el siguiente movimiento?',
    evidence: 'Sin responsable.',
    thread: [],
    proposals: [
      {
        id: 'p_a1',
        action: 'assign',
        label: 'Asignar la carta a Lucía',
        payload: { taskId: 't1', memberId: 'm_lucia' },
        needsInput: false,
        status: 'pending',
        comment: 'Sin dueño, quedó asignada a Lucía.',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function actionProject() {
  return {
    id: 'proj_a',
    version: 2,
    members: [
      { id: 'm_lucia', name: 'Lucía Ríos' },
      { id: 'm_martin', name: 'Martín Vega' },
    ],
    buckets: [
      { id: 'b_backlog', name: 'Backlog' },
      { id: 'b_listo', name: 'Listo' },
    ],
    tasks: [task()],
    actionLog: [],
    inquiries: [actionInquiry()],
    settings: { applyMode: 'confirm' },
  };
}

function Harness({ project }) {
  const ctx = React.useContext(MaieContext);
  if (!ctx) return null;
  return (
    <div>
      <span data-testid="harness-ids">{ctx.inquiries.map((i) => i.id).join(',')}</span>
      <button type="button" onClick={() => ctx.sendThreadMessage('q_a', 'Hola Maie')}>
        send
      </button>
      <button type="button" onClick={() => ctx.applyProposal('q_a', 'p_a1', 'confirm')}>
        aprobar
      </button>
      <button type="button" onClick={() => ctx.applyProposal('q_a', 'p_a1', 'auto')}>
        aplicar-auto
      </button>
      <button type="button" onClick={() => ctx.dismissProposal('q_a', 'p_a1')}>
        descartar
      </button>
      <button type="button" onClick={() => ctx.snoozeInquiry('q_a')}>
        snooze
      </button>
    </div>
  );
}

function mockSetup() {
  const mutateProject = vi.fn((mutator) => mutator);
  vi.mocked(useProjectModule.useProject).mockReturnValue({
    project: actionProject(),
    mutateProject,
    setSettings: vi.fn(),
  });
  return { mutateProject };
}

// Ejecuta el mutador capturado por mutateProject sobre un doc fresco y limpio.
function runLastMutator(mutateProject) {
  const calls = mutateProject.mock.calls;
  const mutator = calls[calls.length - 1][0];
  return mutator(mockProjectFrom(actionProject()));
}

describe('MaieContext acciones del hilo', () => {
  beforeEach(() => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ user: null });
    vi.mocked(inquiryEngine.scanInquiries).mockReturnValue({
      inquiries: [actionInquiry()],
      logEntries: [],
    });
    vi.mocked(maieChatModule.requestMaieChat).mockResolvedValue({
      reply: 'Vamos a verlo.',
      actions: [],
    });
  });

  it('en modo confirm el rescan NO aplica propuestas (Maie no muta sola)', () => {
    const { mutateProject } = mockSetup();
    render(
      <MaieProvider>
        <Harness />
      </MaieProvider>,
    );
    expect(mutateProject).not.toHaveBeenCalled();
  });

  it('sendThreadMessage persiste el mensaje, deja chatting y la respuesta de Maie aterriza en el hilo', async () => {
    let doc = mockProjectFrom(actionProject());
    const mutateProject = vi.fn((mutator) => {
      doc = mutator(doc);
      return doc;
    });
    vi.mocked(useProjectModule.useProject).mockReturnValue({
      project: actionProject(),
      mutateProject,
      setSettings: vi.fn(),
    });
    render(
      <MaieProvider>
        <Harness />
      </MaieProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    expect(mutateProject.mock.calls[0][0]).toBeTypeOf('function');

    await waitFor(() => expect(mutateProject).toHaveBeenCalledTimes(2));
    expect(doc.inquiries[0].thread).toHaveLength(2);
    expect(doc.inquiries[0].thread[0]).toMatchObject({
      role: 'user',
      author: 'Lucía Ríos',
      text: 'Hola Maie',
    });
    expect(doc.inquiries[0].thread[1]).toMatchObject({
      role: 'maie',
      author: 'Maie',
      text: 'Vamos a verlo.',
    });
    expect(doc.inquiries[0].status).toBe('chatting');
    expect(maieChatModule.requestMaieChat).toHaveBeenCalledWith(
      expect.objectContaining({ userText: 'Hola Maie', inquiry: expect.objectContaining({ kind: 'unassigned' }) }),
    );
  });

  it('applyProposal aplica la acción, comenta la carta y registra el log source confirm', () => {
    const { mutateProject } = mockSetup();
    render(
      <MaieProvider>
        <Harness />
      </MaieProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'aprobar' }));
    const next = runLastMutator(mutateProject);
    expect(next.tasks[0].assignedUsers.map((u) => u.id)).toEqual(['m_lucia']);
    expect(next.tasks[0].comments[0]).toMatchObject({ author: 'Maie' });
    expect(next.inquiries[0].proposals[0].status).toBe('applied');
    expect(next.actionLog[0]).toMatchObject({ source: 'confirm', cardId: 't1' });
  });

  it('dismissProposal marca descartada sin mutar tareas', () => {
    const { mutateProject } = mockSetup();
    render(
      <MaieProvider>
        <Harness />
      </MaieProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'descartar' }));
    const next = runLastMutator(mutateProject);
    expect(next.inquiries[0].proposals[0].status).toBe('dismissed');
    expect(next.tasks[0].assignedUsers).toEqual([]);
  });

  it('snoozeInquiry aparca hasta el próximo standup', () => {
    const { mutateProject } = mockSetup();
    render(
      <MaieProvider>
        <Harness />
      </MaieProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'snooze' }));
    const next = runLastMutator(mutateProject);
    expect(next.inquiries[0].status).toBe('snoozed');
    expect(next.inquiries[0].snoozedUntil).toBeDefined();
  });

  it('en modo auto el rescan aplica las propuestas obvias y deja log source auto', () => {
    const projectWithAuto = { ...actionProject(), settings: { applyMode: 'auto' } };
    const mutateProject = vi.fn((mutator) => mutator);
    vi.mocked(useProjectModule.useProject).mockReturnValue({
      project: projectWithAuto,
      mutateProject,
      setSettings: vi.fn(),
    });
    // El effect detecta la propuesta pending aplicable y aplica + log.
    render(
      <MaieProvider>
        <Harness />
      </MaieProvider>,
    );
    const mutator = mutateProject.mock.calls[0][0];
    const next = mutator(mockProjectFrom(projectWithAuto));
    expect(next.tasks[0].assignedUsers.map((u) => u.id)).toEqual(['m_lucia']);
    expect(next.inquiries[0].proposals[0].status).toBe('applied');
    expect(next.actionLog[0]).toMatchObject({ source: 'auto', cardId: 't1' });
  });
});

function mockProjectFrom(project) {
  return JSON.parse(JSON.stringify(project));
}
