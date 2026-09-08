import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaieProvider, MaieContext } from '../MaieContext';
import * as useProjectModule from '../../hooks/useProject';
import * as inquiryEngine from '../../services/inquiryEngine';

vi.mock('../../hooks/useProject');
vi.mock('../../services/inquiryEngine');

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
