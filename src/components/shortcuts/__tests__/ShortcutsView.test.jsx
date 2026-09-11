import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutsView from '../ShortcutsView';
import { ProjectContext } from '../../../context/ProjectContext';

function shortcut(overrides = {}) {
  return {
    id: 's1',
    url: 'https://figma.com/file/x',
    label: 'figma.com',
    createdAt: '2026-09-10T10:00:00.000Z',
    ...overrides,
  };
}

const mocks = {
  addShortcut: vi.fn(),
  removeShortcut: vi.fn(),
};

function renderView({ shortcuts: initial = [] } = {}) {
  function Harness() {
    const [shortcuts, setShortcuts] = useState(initial);
    const value = {
      project: { shortcuts },
      addShortcut: (payload) => {
        mocks.addShortcut(payload);
        setShortcuts((s) => [...s, { ...payload, id: 's_nuevo', createdAt: '2026-09-11T00:00:00.000Z' }]);
      },
      removeShortcut: (id) => {
        mocks.removeShortcut(id);
        setShortcuts((s) => s.filter((x) => x.id !== id));
      },
    };
    return (
      <ProjectContext.Provider value={value}>
        <ShortcutsView />
      </ProjectContext.Provider>
    );
  }
  return render(<Harness />);
}

describe('ShortcutsView', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sin accesos ofrece la creación y explica cómo funciona', () => {
    renderView({ shortcuts: [] });
    expect(screen.getByText('Accesos directos')).toBeInTheDocument();
    expect(screen.getByText(/0\/30/)).toBeInTheDocument();
    expect(screen.getByText(/pestaña nueva del navegador/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nuevo acceso directo/ })).toBeInTheDocument();
  });

  it('abre el modal y crea el acceso con https:// prepend y label manual', () => {
    renderView({ shortcuts: [] });
    fireEvent.click(screen.getByRole('button', { name: /nuevo acceso directo/ }));
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    expect(guardar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nombre (opcional)'), {
      target: { value: 'Figma' },
    });
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'figma.com/file/abc' },
    });
    expect(guardar).toBeEnabled();
    fireEvent.click(guardar);

    expect(mocks.addShortcut).toHaveBeenCalledWith({
      url: 'https://figma.com/file/abc',
      label: 'Figma',
    });
    expect(screen.queryByRole('heading', { name: 'Nuevo acceso directo' })).not.toBeInTheDocument();
    expect(screen.getByText('Figma')).toBeInTheDocument();
  });

  it('sin nombre toma el dominio como label', () => {
    renderView({ shortcuts: [] });
    fireEvent.click(screen.getByRole('button', { name: /nuevo acceso directo/ }));
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://www.jira.example.com/x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(mocks.addShortcut).toHaveBeenCalledWith({
      url: 'https://www.jira.example.com/x',
      label: 'jira.example.com',
    });
    expect(screen.getByText('jira.example.com')).toBeInTheDocument();
  });

  it('rechaza URL inválidas y muestra el error', () => {
    renderView({ shortcuts: [] });
    fireEvent.click(screen.getByRole('button', { name: /nuevo acceso directo/ }));
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(mocks.addShortcut).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Ingresá una URL válida/);
  });

  it('cancelar cierra el modal sin crear', () => {
    renderView({ shortcuts: [] });
    fireEvent.click(screen.getByRole('button', { name: /nuevo acceso directo/ }));
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.addShortcut).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Nuevo acceso directo' })).not.toBeInTheDocument();
  });

  it('lista los accesos y abre el enlace en una pestaña nueva', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderView({ shortcuts: [shortcut()] });
    expect(screen.getByText('figma.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir figma.com' }));
    expect(open).toHaveBeenCalledWith('https://figma.com/file/x', '_blank', 'noopener');
    open.mockRestore();
  });

  it('elimina el acceso tras la confirmación inline', () => {
    renderView({ shortcuts: [shortcut()] });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar acceso' }));
    expect(mocks.removeShortcut).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(mocks.removeShortcut).toHaveBeenCalledWith('s1');
    expect(screen.queryByText('figma.com')).not.toBeInTheDocument();
  });

  it('cancelar la eliminación deja el acceso intacto', () => {
    renderView({ shortcuts: [shortcut()] });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar acceso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar eliminación' }));
    expect(mocks.removeShortcut).not.toHaveBeenCalled();
    expect(screen.getByText('figma.com')).toBeInTheDocument();
  });

  it('en el límite de 30 oculta el botón de nuevo acceso', () => {
    const muchos = Array.from({ length: 30 }, (_, i) =>
      shortcut({ id: `s${i}`, url: `https://x${i}.com`, label: `x${i}.com` }),
    );
    renderView({ shortcuts: muchos });
    expect(screen.getByText(/30\/30/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nuevo acceso directo/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Máximo 30 accesos directos/)).toBeInTheDocument();
  });
});