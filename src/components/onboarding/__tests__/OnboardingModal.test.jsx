import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal from '../OnboardingModal';

const state = vi.hoisted(() => ({
  project: {
    onboarding: {
      answers: { objetivo: 'Entregar el portal' },
      currentQuestionId: 'objetivo',
      done: false,
    },
  },
  saveOnboardingAnswer: vi.fn(),
  completeOnboarding: vi.fn(),
  updateOnboarding: vi.fn(),
}));

vi.mock('@/hooks/useProject', () => ({ useProject: () => state }));
vi.mock('@/hooks/useSpeechToText', () => ({
  useSpeechToText: () => ({
    supported: false,
    listening: false,
    interim: '',
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
  }),
}));

import { getOnboardingQuestions } from '../../../services/onboardingService';

function renderModal(open = true) {
  return render(<OnboardingModal open={open} onClose={() => {}} />);
}

describe('OnboardingModal', () => {
  beforeEach(() => {
    state.saveOnboardingAnswer.mockClear();
    state.completeOnboarding.mockClear();
  });

  it('arranca en la primera pregunta sin responder y muestra el progreso', () => {
    renderModal();
    const { questions } = getOnboardingQuestions();
    expect(screen.getByText(questions[1].text)).toBeInTheDocument();
    expect(screen.getByText(/Pregunta 2 de 5/)).toBeInTheDocument();
    expect(screen.getByText(/1 respondida/)).toBeInTheDocument();
  });

  it('guarda la respuesta en Siguiente y avanza', () => {
    renderModal();
    const textarea = screen.getByPlaceholderText(/Escribí acá/);
    fireEvent.change(textarea, { target: { value: 'Migrar checkout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(state.saveOnboardingAnswer).toHaveBeenCalledWith('entregable', 'Migrar checkout');
    expect(screen.getByText(/Pregunta 3 de 5/)).toBeInTheDocument();
  });

  it('al llegar a la última pregunta, Listo cierra el onboarding', () => {
    state.project.onboarding.answers = {
      objetivo: 'a',
      entregable: 'b',
      equipo: 'c',
      fechas: 'd',
    };
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(state.saveOnboardingAnswer).toHaveBeenCalledWith('riesgos', '');
    expect(state.completeOnboarding).toHaveBeenCalled();
  });

  it('Anterior vuelve a la pregunta previa', () => {
    state.project.onboarding.answers = {};
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText(/Pregunta 2 de 5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText(/Pregunta 1 de 5/)).toBeInTheDocument();
  });

  it('avisa cuando el dictado no está disponible', () => {
    renderModal();
    expect(screen.getByText(/Dictado no disponible/)).toBeInTheDocument();
  });
});