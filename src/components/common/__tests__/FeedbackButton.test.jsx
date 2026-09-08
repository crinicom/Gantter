import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackButton from '../FeedbackButton';
import * as useAuthModule from '../../../hooks/useAuth';
import * as useProjectModule from '../../../hooks/useProject';
import * as useMaieModule from '../../../context/MaieContext';
import * as feedbackServiceModule from '../../../services/feedbackService';

vi.mock('../../../hooks/useAuth');
vi.mock('../../../hooks/useProject');
vi.mock('../../../context/MaieContext');
vi.mock('../../../services/feedbackService');

function setup(overrides = {}) {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: { id: 'u1', name: 'Lucía', email: 'l@test' },
    isAuthenticated: true,
    ...overrides.auth,
  });
  vi.mocked(useProjectModule.useProject).mockReturnValue({
    project: { id: 'p1', name: 'App', version: 1, buckets: [], tasks: [], members: [], actionLog: [] },
    syncStatus: 'synced',
    lastSyncAt: new Date().toISOString(),
    ...overrides.project,
  });
  vi.mocked(useMaieModule.useMaie).mockReturnValue({
    applyMode: 'confirm',
    staleDays: 15,
    openCount: 1,
    ...overrides.maie,
  });
  vi.mocked(feedbackServiceModule.feedbackService.submitFeedback).mockResolvedValue({ ok: true });
}

describe('FeedbackButton', () => {
  beforeEach(() => {
    setup();
    document.documentElement.dataset.activeView = 'board';
  });

  it('renderiza el FAB', () => {
    render(<FeedbackButton />);
    expect(screen.getByRole('button', { name: /reportar/i })).toBeInTheDocument();
  });

  it('abre overlay al hacer click', () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));
    expect(screen.getByText('Enviar feedback')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje de feedback')).toBeInTheDocument();
  });

  it('muestra selector de tipo con 3 opciones', () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));
    expect(screen.getByRole('button', { name: 'Error' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sugerencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comentario' })).toBeInTheDocument();
  });

  it('permite escribir y enviar', async () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));
    fireEvent.change(screen.getByLabelText('Mensaje de feedback'), {
      target: { value: 'Bug en el tablero' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => {
      expect(feedbackServiceModule.feedbackService.submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'comentario',
          message: 'Bug en el tablero',
          screen: expect.any(String),
          systemState: expect.any(Object),
        }),
      );
    });
  });

  it('cambia de tipo al hacer click', () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    fireEvent.change(screen.getByLabelText('Mensaje de feedback'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(feedbackServiceModule.feedbackService.submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('cierra con ESC', () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));
    expect(screen.getByText('Enviar feedback')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Enviar feedback')).not.toBeInTheDocument();
  });

  it('cierra al hacer click fuera del overlay', () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByRole('button', { name: /reportar/i }));
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop);
    expect(screen.queryByText('Enviar feedback')).not.toBeInTheDocument();
  });
});
