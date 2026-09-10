// Integración del hilo con el provider REAL de Maia y el scanner real
// (sin mockear inquiryEngine): verifica que mensajes, descartes y aplicaciones
// se reflejan en el contexto de UI y que el rescan no los pisa. Replica el
// flujo de ProjectContext.comitToStore: una mutación del documento + re-render
// del provider debe sincronizar el contexto de Maia.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaiaProvider, MaiaContext } from '../MaiaContext';
import * as useProjectModule from '../../hooks/useProject';
import * as useAuthModule from '../../hooks/useAuth';
import * as maiaChatModule from '../../services/maiaChat';

vi.mock('../../hooks/useProject');
vi.mock('../../hooks/useAuth');
vi.mock('../../services/maiaChat', async (importActual) => {
  const actual = await importActual();
  return { ...actual, requestMaiaChat: vi.fn() };
});

function task() {
  return {
    id: 't1',
    title: 'Auth magic link',
    name: 'Auth magic link',
    description: 'Descripcion larga de la carta para no disparar la pregunta thin.',
    assignedUsers: [],
    startDate: null,
    endDate: null,
    status: 'todo',
    blocked: false,
    milestone: false,
    comments: [],
    bucketId: 'b_listo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
}

function project() {
  return {
    id: 'proj_1',
    version: 1,
    members: [
      { id: 'm_lucia', name: 'Lucía Ríos' },
      { id: 'm_martin', name: 'Martín Vega' },
    ],
    buckets: [
      { id: 'b_listo', name: 'Listo' },
      { id: 'b_backlog', name: 'Backlog' },
    ],
    tasks: [task()],
    actionLog: [],
    inquiries: [
      {
        id: 'q_a',
        cardId: 't1',
        kind: 'unassigned',
        status: 'open',
        question: 'Esta carta está en «Listo» sin dueño. ¿De quién sería el siguiente movimiento?',
        evidence: 'Sin responsable en una columna de trabajo.',
        thread: [],
        proposals: [
          {
            id: 'p_a1',
            action: 'assign',
            label: 'Asignar «Auth magic link» a Lucía Ríos',
            payload: { taskId: 't1', memberId: 'm_lucia' },
            needsInput: false,
            status: 'pending',
            comment: 'Sin dueño, quedó asignada a Lucía Ríos.',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    settings: { applyMode: 'confirm' },
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
    project: project(),
    mutateProject: vi.fn(),
  };
  const build = () => (
    <div>
      <Setup holder={holder} />
      <MaiaProvider>
        <Probe />
      </MaiaProvider>
    </div>
  );
  const view = render(build());
  const commit = (mutator) => {
    holder.project = mutator(holder.project);
    view.rerender(build());
  };
  return { holder, commit, view };
}

function Probe() {
  const ctx = React.useContext(MaiaContext);
  const inq = ctx.inquiries.find((i) => i.id === 'q_a');
  const { project } = useProjectModule.useProject();
  const assignees = (project.tasks[0]?.assignedUsers || []).map((u) => u.name).join(',');
  return (
    <div>
      <span data-testid="thread">{inq?.thread?.map((m) => m.text).join('|') || ''}</span>
      <span data-testid="prop-status">{inq?.proposals?.[0]?.status || ''}</span>
      <span data-testid="assignees">{assignees}</span>
      <span data-testid="open-count">{ctx.openCount}</span>
      <span data-testid="doc-thread">
        {(project.inquiries[0]?.thread || []).map((m) => m.text).join('|') || ''}
      </span>
      <button type="button" onClick={() => ctx.sendThreadMessage('q_a', 'Hola Maia')}>
        send
      </button>
      <button type="button" onClick={() => ctx.dismissProposal('q_a', 'p_a1')}>
        descartar
      </button>
      <button
        type="button"
        onClick={() => {
          ctx.dismissProposal('q_a', 'p_a1');
          ctx.sendThreadMessage('q_a', 'No por ahora. ¿Qué habría que hacer entonces?');
        }}
      >
        no-followup
      </button>
      <button type="button" onClick={() => ctx.applyProposal('q_a', 'p_a1', 'confirm')}>
        aprobar
      </button>
    </div>
  );
}

describe('MaiaContext hilo (integración con el engine real)', () => {
  beforeEach(() => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ user: null });
    vi.mocked(maiaChatModule.requestMaiaChat).mockResolvedValue({
      reply: 'Vamos a verlo.',
      actions: [],
    });
  });

it('el mensaje enviado aparece en el hilo vía el provider real y la respuesta de Maia también', async () => {
    const { holder, commit } = mount();
    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('pending'));

    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    commit(holder.mutateProject.mock.calls.at(-1)[0]);

    await waitFor(() => expect(screen.getByTestId('thread')).toHaveTextContent('Hola Maia'));
    expect(screen.getByTestId('open-count')).toHaveTextContent('1');

    // La respuesta de Maia llega en un segundo mutateProject (§11): commitearlo
    // muestra la burbuja en el hilo sin pisar el mensaje del usuario.
    await waitFor(() => expect(holder.mutateProject).toHaveBeenCalledTimes(2));
    commit(holder.mutateProject.mock.calls.at(-1)[0]);
    await waitFor(() => expect(screen.getByTestId('thread')).toHaveTextContent('Hola Maia|Vamos a verlo.'));
  });

  it('descartar refleja el estado en el contexto y no muta la carta', async () => {
    const { holder, commit } = mount();
    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('pending'));

    fireEvent.click(screen.getByRole('button', { name: 'descartar' }));
    commit(holder.mutateProject.mock.calls.at(-1)[0]);

    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('dismissed'));
    expect(screen.getByTestId('assignees')).toHaveTextContent('');
  });

  it('P1: descartar con "No" deja la negativa como burbuja y Maia responde el follow-up', async () => {
    const { holder, commit } = mount();
    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('pending'));

    fireEvent.click(screen.getByRole('button', { name: 'no-followup' }));
    // mutaciones 1 y 2 (sincrónicas): dismiss + burbuja del usuario.
    await waitFor(() => expect(holder.mutateProject).toHaveBeenCalledTimes(2));
    commit(holder.mutateProject.mock.calls[0][0]);
    commit(holder.mutateProject.mock.calls[1][0]);
    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('dismissed'));
    await waitFor(() =>
      expect(screen.getByTestId('thread')).toHaveTextContent(
        'No por ahora. ¿Qué habría que hacer entonces?',
      ),
    );

    // mutación 3 (async, §11): la respuesta de Maia aterriza después de la burbuja.
    await waitFor(() => expect(holder.mutateProject).toHaveBeenCalledTimes(3));
    commit(holder.mutateProject.mock.calls.at(-1)[0]);
    await waitFor(() => expect(screen.getByTestId('thread')).toHaveTextContent('Vamos a verlo.'));
  });

  it('aprobar aplica, marca applied y el rescan siguiente no lo revierte', async () => {
    const { holder, commit } = mount();
    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('pending'));

    fireEvent.click(screen.getByRole('button', { name: 'aprobar' }));
    commit(holder.mutateProject.mock.calls.at(-1)[0]);

    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('applied'));
    await waitFor(() => expect(screen.getByTestId('assignees')).toHaveTextContent('Lucía'));

    // Disparar otro rescan (mensaje) y confirmar que el estado no se revierte.
    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    commit(holder.mutateProject.mock.calls.at(-1)[0]);
    await waitFor(() => expect(screen.getByTestId('prop-status')).toHaveTextContent('applied'));
    expect(screen.getByTestId('thread')).toHaveTextContent('Hola Maia');
  });
});