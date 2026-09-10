// Pestaña Huddle del panel (slice 7): transcript, propuestas sí/no del demo y
// línea del usuario firmada por Lucía.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HuddleTab from '../HuddleTab';
import { MaiaContext } from '../../../context/MaiaContext';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

function session(overrides = {}) {
  return {
    id: 's1',
    projectId: 'p1',
    ritual: 'standup',
    mode: 'auto',
    startedAt: '2026-09-09T10:00:00.000Z',
    endedAt: null,
    joinedIds: ['u_lucia'],
    transcript: [
      { id: 'l1', role: 'maia', speaker: 'Maia', text: 'Empezamos el standup.', cardIds: [], at: '2026-09-09T10:00:00.000Z' },
      {
        id: 'l2',
        role: 'member',
        speaker: 'Diego Palacios',
        text: '«Webhook de pagos» sigue esperando certificados.',
        cardIds: ['card_webhook'],
        at: '2026-09-09T10:00:05.000Z',
      },
      {
        id: 'l3',
        role: 'user',
        speaker: 'Lucía Ríos',
        text: 'Fecho el QA para el go-live.',
        cardIds: [],
        at: '2026-09-09T10:01:00.000Z',
      },
    ],
    pending: [
      {
        id: 'p1',
        action: 'set-blocked',
        label: 'Marcar «Webhook de pagos» como bloqueada',
        payload: { taskId: 'card_webhook' },
        needsInput: false,
        status: 'pending',
        comment: 'x',
        cardId: 'card_webhook',
      },
    ],
    highlights: ['card_webhook'],
    touchedIds: [],
    ...overrides,
  };
}

function baseValue(overrides = {}) {
  return {
    inquiries: [],
    openCount: 0,
    actionLog: [],
    applyMode: 'auto',
    staleDays: 15,
    lastScanAt: null,
    maiaReplying: false,
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
    sendHuddleLine: vi.fn(),
    resolveHuddleProposal: vi.fn(),
    ...overrides,
  };
}

function renderTab(value) {
  return render(
    <MaiaContext.Provider value={baseValue(value)}>
      <HuddleTab />
    </MaiaContext.Provider>,
  );
}

describe('HuddleTab', () => {
  it('sin sesión ofrece los rituales para empezar', () => {
    const startHuddle = vi.fn();
    renderTab({ startHuddle });
    expect(screen.getByText(/El huddle de los miércoles/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Standup de los miércoles/ }));
    expect(startHuddle).toHaveBeenCalledWith({ ritual: 'standup' });
  });

  it('muestra el transcript con speaker y hora', () => {
    renderTab({ huddle: session() });
    expect(screen.getByText('Standup de los miércoles')).toBeInTheDocument();
    expect(screen.getAllByText(/Webhook de pagos/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Diego Palacios/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lucía Ríos/).length).toBeGreaterThan(0);
  });

  it('muestra la propuesta del demo y resuelve sí/no', () => {
    const resolveHuddleProposal = vi.fn();
    renderTab({ huddle: session(), resolveHuddleProposal });
    expect(screen.getByText(/Marcar «Webhook de pagos» como bloqueada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    expect(resolveHuddleProposal).toHaveBeenCalledWith('p1', true);
  });

  it('permite una propuesta aplicada y una descartada', () => {
    renderTab({
      huddle: session({
        pending: [
          {
            id: 'pa',
            action: 'assign',
            label: 'Asignar «Auth magic link» a Martín Vega',
            payload: { taskId: 'card_magic_link' },
            needsInput: false,
            status: 'applied',
            comment: 'x',
            cardId: 'card_magic_link',
          },
          {
            id: 'pd',
            action: 'set-dates',
            label: 'Fechar «QA staging release»',
            payload: { taskId: 'card_qa_staging' },
            needsInput: false,
            status: 'dismissed',
            comment: 'x',
            cardId: 'card_qa_staging',
          },
        ],
      }),
    });
    expect(screen.getByText(/Aplicada: Asignar «Auth magic link»/)).toBeInTheDocument();
    expect(screen.getByText(/Descartada: Fechar «QA staging release»/)).toBeInTheDocument();
  });

  it('firma la línea del usuario como Lucía', () => {
    const sendHuddleLine = vi.fn();
    renderTab({ huddle: session(), sendHuddleLine });
    const input = screen.getByPlaceholderText(/Escribir una línea como Lucía Ríos/);
    fireEvent.change(input, { target: { value: 'Fecho el QA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(sendHuddleLine).toHaveBeenCalledWith('Fecho el QA');
  });

  it('una sesión cerrada no deja escribir', () => {
    renderTab({ huddle: session({ endedAt: '2026-09-09T10:15:00.000Z' }), demoStatus: 'done' });
    expect(screen.queryByPlaceholderText(/Escribir una línea/)).not.toBeInTheDocument();
    expect(screen.getByText(/Sesión cerrada/)).toBeInTheDocument();
  });
});