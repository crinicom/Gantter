// Barra de sesión del huddle en el chrome (slice 7): abrir ritual, timer en
// vivo, play/pausa del demo y cerrar sesión.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HuddleSessionBar from '../HuddleSessionBar';
import { MaieContext } from '../../../context/MaieContext';

function baseValue(overrides = {}) {
  return {
    inquiries: [],
    openCount: 0,
    actionLog: [],
    applyMode: 'auto',
    staleDays: 15,
    lastScanAt: null,
    maieReplying: false,
    huddle: null,
    demoStatus: null,
    highlightedTaskIds: new Set(),
    setApplyMode: vi.fn(),
    sendThreadMessage: vi.fn(),
    applyProposal: vi.fn(),
    dismissProposal: vi.fn(),
    snoozeInquiry: vi.fn(),
    startHuddle: vi.fn(),
    stopHuddle: vi.fn(),
    toggleDemo: vi.fn(),
    replayDemo: vi.fn(),
    sendHuddleLine: vi.fn(),
    resolveHuddleProposal: vi.fn(),
    ...overrides,
  };
}

function session(overrides = {}) {
  return {
    id: 's1',
    projectId: 'p1',
    ritual: 'standup',
    mode: 'auto',
    startedAt: '2026-09-09T10:00:00.000Z',
    endedAt: null,
    joinedIds: ['u_lucia'],
    transcript: [],
    pending: [],
    highlights: [],
    touchedIds: [],
    demo: { steps: [], cursor: 0, status: 'playing', appliedCount: 0 },
    ...overrides,
  };
}

function renderBar(value) {
  return render(
    <MaieContext.Provider value={baseValue(value)}>
      <HuddleSessionBar />
    </MaieContext.Provider>,
  );
}

describe('HuddleSessionBar', () => {
  it('sin sesión muestra el botón abrir huddle y deja elegir ritual', () => {
    const startHuddle = vi.fn();
    renderBar({ startHuddle });
    fireEvent.click(screen.getByRole('button', { name: /Abrir huddle/ }));
    expect(screen.getAllByText('Standup de los miércoles').length).toBeGreaterThan(0);
  });

  it('empezar el standup pide al contexto la sesión', () => {
    const startHuddle = vi.fn();
    renderBar({ startHuddle });
    fireEvent.click(screen.getByRole('button', { name: /Abrir huddle/ }));
    fireEvent.click(screen.getAllByText('Standup de los miércoles')[0]);
    expect(startHuddle).toHaveBeenCalledWith({ ritual: 'standup' });
  });

  it('con sesión muestra ritual, timer y botón de cerrar', () => {
    const stopHuddle = vi.fn();
    renderBar({
      huddle: session(),
      demoStatus: 'playing',
      stopHuddle,
    });
    expect(screen.getByText('Standup de los miércoles')).toBeInTheDocument();
    expect(screen.getByText(/Facilitadora en línea/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }));
    expect(stopHuddle).toHaveBeenCalled();
  });

  it('el demo en play ofrece pausa y con la sesión cerrada no', () => {
    const toggleDemo = vi.fn();
    const { rerender } = renderBar({ huddle: session(), demoStatus: 'playing', toggleDemo });
    fireEvent.click(screen.getByRole('button', { name: /Pausar/ }));
    expect(toggleDemo).toHaveBeenCalled();

    rerender(
      <MaieContext.Provider value={baseValue({ huddle: session({ endedAt: '2026-09-09T10:15:00.000Z' }), demoStatus: 'done', toggleDemo })}>
        <HuddleSessionBar />
      </MaieContext.Provider>,
    );
    expect(screen.queryByRole('button', { name: /Pausar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Sesión cerrada/)).toBeInTheDocument();
  });

  it('con el demo terminado ofrece Reproducir de nuevo', () => {
    const replayDemo = vi.fn();
    renderBar({
      huddle: session({ demo: { steps: [], cursor: 4, status: 'done', appliedCount: 3 } }),
      demoStatus: 'done',
      replayDemo,
    });
    expect(screen.queryByRole('button', { name: /Pausar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reanudar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reproducir de nuevo/ }));
    expect(replayDemo).toHaveBeenCalled();
  });
});