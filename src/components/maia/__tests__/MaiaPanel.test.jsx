import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MaiaPanel from '../MaiaPanel';
import { MaiaContext } from '../../../context/MaiaContext';
import { ProjectContext } from '../../../context/ProjectContext';
import { INQUIRY_STATUS } from '../../../constants/maia';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

const projectValue = {
  project: null,
  saveOnboardingAnswer: vi.fn(),
  completeOnboarding: vi.fn(),
  updateOnboarding: vi.fn(),
};

function activeProjectWithOnboarding(onbOver = {}, projectOver = null) {
  return {
    id: 'p_new',
    name: 'Proyecto nuevo',
    documents: [],
    onboarding: { answers: {}, currentQuestionId: 'objetivo', done: false, ...onbOver },
    ...(projectOver || {}),
  };
}

function renderTree(maiaOverrides = {}) {
  const maia = { ...baseValue, ...maiaOverrides };
  return (
    <ProjectContext.Provider value={projectValue}>
      <MaiaContext.Provider value={maia}>
        <MaiaPanel />
      </MaiaContext.Provider>
    </ProjectContext.Provider>
  );
}

function renderPanel(valueOverrides = {}) {
  return render(renderTree(valueOverrides));
}

const baseValue = {
  inquiries: [
    {
      id: 'q_overlap',
      kind: 'overlap',
      cardId: 't1',
      status: INQUIRY_STATUS.OPEN,
      question: 'Martín tiene 2 barras que se pisan. ¿Cuál es la prioridad real de esta semana?',
      evidence: '2 barras de Martín Vega que se pisan.',
      thread: [],
      proposals: [],
    },
    {
      id: 'q_stale',
      kind: 'stale',
      cardId: 't2',
      status: INQUIRY_STATUS.OPEN,
      question: 'Lleva 18 días sin movimiento. ¿Sigue siendo trabajo activo?',
      evidence: 'Última actividad hace 18 días.',
      thread: [],
      proposals: [
        {
          id: 'p_stale',
          action: 'move',
          label: 'Mover a «Backlog»',
          payload: { taskId: 't2', bucketId: 'b_backlog' },
          needsInput: false,
          status: 'pending',
        },
      ],
    },
    {
      id: 'q_parqueada',
      kind: 'thin',
      cardId: 't3',
      status: INQUIRY_STATUS.SNOOZED,
      question: 'Recién abierta, esta carta no cuenta qué conlleva.',
      evidence: 'Descripción corta (0 car.).',
      thread: [],
      proposals: [],
    },
  ],
  openCount: 2,
  actionLog: [
    { id: 'L1', at: new Date().toISOString(), source: 'auto', summary: '«QA staging release» cargó sus fechas', cardId: 't4' },
  ],
  applyMode: 'confirm',
  staleDays: 15,
  lastScanAt: null,
  setApplyMode: vi.fn(),
  sendThreadMessage: vi.fn(),
  applyProposal: vi.fn(),
  snoozeInquiry: vi.fn(),
};

describe('MaiaPanel', () => {
  beforeEach(() => {
    projectValue.project = null;
  });

  it('muestra la identidad de Maia y el contador de preguntas abiertas', () => {
    renderPanel();
    expect(screen.getByText('Maia')).toBeInTheDocument();
    expect(screen.getByText('Facilitadora')).toBeInTheDocument();
    expect(screen.getByText('2 abiertas')).toBeInTheDocument();
  });

  it('lista las preguntas abiertas con su badge y separa las aparcadas', () => {
    renderPanel();
    expect(screen.getByText(/2 barras que se pisan/)).toBeInTheDocument();
    expect(screen.getByText('Estancada')).toBeInTheDocument();
    expect(screen.getByText('Solapada')).toBeInTheDocument();
    expect(screen.getByText('Aparcadas')).toBeInTheDocument();
  });

  it('el toggle de modo de Maia persiste el applyMode elegido', () => {
    const setApplyMode = vi.fn();
    renderPanel({ setApplyMode });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar y registrar' }));
    expect(setApplyMode).toHaveBeenCalledWith('auto');
  });

  it('la pestaña Registro lista el actionLog read-only', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Registro' }));
    expect(screen.getByText('«QA staging release» cargó sus fechas')).toBeInTheDocument();
  });

  it('click en una pregunta abre su hilo con las propuestas y al aprobar aplica', () => {
    const applyProposal = vi.fn();
    renderPanel({ applyProposal });
    fireEvent.click(screen.getByRole('button', { name: /Lleva 18 días sin movimiento/ }));
    expect(screen.getByRole('button', { name: /Volver a las preguntas/ })).toBeInTheDocument();
    expect(screen.getByText('Mover a «Backlog»')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    expect(applyProposal).toHaveBeenCalledWith('q_stale', 'p_stale', 'confirm');
  });

  it('el registro muestra la fuente de cada entrada', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Registro' }));
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('un proyecto nuevo con onboarding activo y sin respuestas abre el modal automáticamente', async () => {
    projectValue.project = activeProjectWithOnboarding();
    renderPanel();
    expect(await screen.findByText(/Pregunta 1 de 3/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Escribí acá/)).toBeInTheDocument();
    expect(screen.getByText(/¿Cuál es el objetivo principal/)).toBeInTheDocument();
  });

  it('no abre el modal si ya hay respuestas', async () => {
    projectValue.project = activeProjectWithOnboarding({ answers: { objetivo: 'un objetivo' } });
    renderPanel();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByPlaceholderText(/Escribí acá/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pregunta 1 de 3/)).not.toBeInTheDocument();
  });

  it('no abre el modal si el onboarding quedó done', async () => {
    projectValue.project = activeProjectWithOnboarding({
      done: true,
      answers: { objetivo: 'a', entregable: 'b', equipo: 'c' },
    });
    renderPanel();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByPlaceholderText(/Escribí acá/)).not.toBeInTheDocument();
    expect(screen.getByText(/La Ficha del proyecto está lista/)).toBeInTheDocument();
  });

  it('tras cerrar a mano no se vuelve a abrir en la misma sesión, ni al volver al proyecto', async () => {
    projectValue.project = activeProjectWithOnboarding();
    const { rerender } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByPlaceholderText(/Escribí acá/)).not.toBeInTheDocument();

    projectValue.project = activeProjectWithOnboarding({}, { id: 'p_otro' });
    rerender(renderTree());
    expect(await screen.findByText(/Pregunta 1 de 3/)).toBeInTheDocument();

    projectValue.project = activeProjectWithOnboarding();
    rerender(renderTree());
    expect(screen.queryByText(/Pregunta 1 de 3/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Escribí acá/)).not.toBeInTheDocument();
  });
});