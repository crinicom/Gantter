import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InquiryThread from '../InquiryThread';
import { MaieContext } from '../../../context/MaieContext';
import { INQUIRY_STATUS } from '../../../constants/maie';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

const pendingProposal = (overrides = {}) => ({
  id: 'p1',
  action: 'assign',
  label: 'Asignar «Auth magic link» a Lucía Ríos',
  payload: { taskId: 't1', memberId: 'm_lucia' },
  needsInput: false,
  status: 'pending',
  comment: 'Sin dueño, quedó asignada a Lucía.',
  ...overrides,
});

function baseValue(overrides = {}) {
  return {
    inquiries: [
      {
        id: 'q1',
        kind: 'unassigned',
        cardId: 't1',
        status: INQUIRY_STATUS.CHATTING,
        question: 'Esta carta está en «Listo» sin dueño. ¿De quién sería el siguiente movimiento?',
        evidence: 'Sin responsable en una columna de trabajo.',
        thread: [
          {
            id: 'm1',
            role: 'user',
            author: 'Lucía Ríos',
            text: 'Lo toma Ana mañana.',
            at: '2026-09-08T09:00:00.000Z',
          },
        ],
        proposals: [pendingProposal()],
        createdAt: '2026-09-08T08:00:00.000Z',
        updatedAt: '2026-09-08T09:00:00.000Z',
      },
    ],
    applyMode: 'confirm',
    maieReplying: false,
    sendThreadMessage: vi.fn(),
    applyProposal: vi.fn(),
    dismissProposal: vi.fn(),
    snoozeInquiry: vi.fn(),
    ...overrides,
  };
}

function renderThread(valueOverrides = {}) {
  const value = baseValue(valueOverrides);
  return render(
    <MaieContext.Provider value={value}>
      <InquiryThread inquiryId="q1" onClose={vi.fn()} />
    </MaieContext.Provider>,
  );
}

describe('InquiryThread', () => {
  it('muestra la pregunta, la evidencia y el hilo persistido', () => {
    renderThread();
    expect(screen.getByText(/¿De quién sería el siguiente movimiento\?/)).toBeInTheDocument();
    expect(screen.getByText('Sin responsable en una columna de trabajo.')).toBeInTheDocument();
    expect(screen.getByText('Lo toma Ana mañana.')).toBeInTheDocument();
    expect(screen.getByText('Lucía Ríos')).toBeInTheDocument();
    expect(screen.queryByText('Maie está pensando…')).not.toBeInTheDocument();
  });

  it('mientras Maie responde muestra el indicador de escritura', () => {
    renderThread({ maieReplying: true });
    expect(screen.getByText('Maie está pensando…')).toBeInTheDocument();
  });

  it('envia mensajes firmados por el usuario activo y limpia el texto', () => {
    const sendThreadMessage = vi.fn();
    renderThread({ sendThreadMessage });
    fireEvent.change(screen.getByPlaceholderText(/Responder como Lucía Ríos/), {
      target: { value: 'Ella va a tomarla' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(sendThreadMessage).toHaveBeenCalledWith('q1', 'Ella va a tomarla');
  });

  it('en modo confirmar la propuesta se aprueba (Sí) o se descarta (No)', () => {
    const applyProposal = vi.fn();
    const dismissProposal = vi.fn();
    renderThread({ applyProposal, dismissProposal });
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    expect(applyProposal).toHaveBeenCalledWith('q1', 'p1', 'confirm');
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(dismissProposal).toHaveBeenCalledWith('q1', 'p1');
  });

  it('en modo auto aplica con un solo paso y registra source auto', () => {
    const applyProposal = vi.fn();
    renderThread({ applyMode: 'auto', applyProposal });
    expect(screen.queryByRole('button', { name: 'Sí' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(applyProposal).toHaveBeenCalledWith('q1', 'p1', 'auto');
  });

  it('las propuestas needsInput no ofrecen aplicar: se completan en el chat', () => {
    renderThread({
      inquiries: [
        {
          ...baseValue().inquiries[0],
          proposals: [{ ...pendingProposal(), needsInput: true }],
        },
      ],
    });
    expect(screen.queryByRole('button', { name: 'Sí' })).not.toBeInTheDocument();
    expect(screen.getByText(/se completa conversando con Maie/)).toBeInTheDocument();
  });

  it('snooze aparca la pregunta hasta el próximo standup', () => {
    const snoozeInquiry = vi.fn();
    renderThread({ snoozeInquiry });
    fireEvent.click(screen.getByRole('button', { name: /Recordármelo en el próximo standup/ }));
    expect(snoozeInquiry).toHaveBeenCalledWith('q1');
  });

  it('pregunta resuelta: no muestra propuestas ni input', () => {
    const { inquiries } = baseValue();
    renderThread({
      inquiries: [
        { ...inquiries[0], status: INQUIRY_STATUS.RESOLVED, thread: [], proposals: [] },
      ],
    });
    expect(screen.getByText('Esta pregunta ya se resolvió sola.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Responder como/)).not.toBeInTheDocument();
  });

  it('refleja propuestas aplicadas y descartadas como chips, no solo las pendientes', () => {
    renderThread({
      inquiries: [
        {
          ...baseValue().inquiries[0],
          proposals: [
            pendingProposal({ id: 'p1', status: 'applied' }),
            pendingProposal({ id: 'p2', label: 'Mover a «Backlog»', status: 'dismissed' }),
            pendingProposal({ id: 'p3', label: 'Asignar «Auth magic link» a Martín Vega' }),
          ],
        },
      ],
    });
    expect(screen.getByText(/Aplicada:/)).toBeInTheDocument();
    expect(screen.getByText(/Descartada:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sí' })).toBeInTheDocument();
  });
});