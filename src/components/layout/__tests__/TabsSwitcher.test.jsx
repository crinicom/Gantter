import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabsSwitcher, { VIEWS } from '../TabsSwitcher';

describe('TabsSwitcher', () => {
  it('ofrece Tablero, Gantt e Información del proyecto', () => {
    const onChange = vi.fn();
    render(<TabsSwitcher activeView={VIEWS.BOARD} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Tablero' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gantt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Información del proyecto' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Información del proyecto' }));
    expect(onChange).toHaveBeenCalledWith(VIEWS.INFO);
  });

  it('marca la vista activa', () => {
    render(<TabsSwitcher activeView={VIEWS.INFO} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Información del proyecto' })).toHaveClass('text-forest-700');
  });
});