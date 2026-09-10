import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectInfoView from '../ProjectInfoView';
import { ProjectContext } from '../../../context/ProjectContext';

function doc(overrides = {}) {
  return {
    id: 'doc_1',
    title: 'Ficha del proyecto',
    content: '# Ficha\n\n## Objetivo\nEntregar en fecha.',
    createdAt: '2026-09-05T12:00:00.000Z',
    updatedAt: '2026-09-05T12:00:00.000Z',
    ...overrides,
  };
}

const mocks = {
  createDocument: vi.fn(() => 'doc_nuevo'),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
};

function renderView({ documents = [doc()] } = {}) {
  return render(
    <ProjectContext.Provider
      value={{
        project: { documents },
        createDocument: mocks.createDocument,
        updateDocument: mocks.updateDocument,
        deleteDocument: mocks.deleteDocument,
      }}
    >
      <ProjectInfoView />
    </ProjectContext.Provider>,
  );
}

describe('ProjectInfoView', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sin documentos ofrece el botón "Nuevo documento"', () => {
    renderView({ documents: [] });
    expect(screen.getByText(/Todavía no hay documentos/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByText(/Nuevo documento/)[0]);
    expect(mocks.createDocument).toHaveBeenCalledWith({
      title: 'Nuevo documento',
      content: '',
    });
  });

  it('lista los documentos y abre el seleccionado con su contenido', () => {
    renderView();
    expect(screen.getByText('Ficha del proyecto')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ficha del proyecto'));
    const editor = screen.getByLabelText(/Contenido del documento/);
    expect(editor.value).toContain('## Objetivo');
    expect(screen.getByText('Guardado')).toBeInTheDocument();
  });

  it('autoguarda el contenido editado tras el debounce', async () => {
    renderView();
    fireEvent.click(screen.getByText('Ficha del proyecto'));
    const editor = screen.getByLabelText(/Contenido del documento/);
    fireEvent.change(editor, { target: { value: '# Cambiado\n' } });
    expect(screen.getByText(/Guardando/)).toBeInTheDocument();
    await waitFor(
      () => {
        expect(mocks.updateDocument).toHaveBeenCalledWith('doc_1', expect.objectContaining({ content: '# Cambiado\n' }));
      },
      { timeout: 2500 },
    );
  });

  it('alterna a "Ver" y renderiza el markdown como preview', () => {
    renderView();
    fireEvent.click(screen.getByText('Ficha del proyecto'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(screen.getByText(/Entregar en fecha/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Objetivo' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Contenido del documento/)).not.toBeInTheDocument();
  });

  it('renombra el documento desde el menú de acciones', () => {
    renderView();
    fireEvent.click(screen.getByText('Ficha del proyecto'));
    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    fireEvent.click(screen.getByRole('button', { name: /Renombrar/ }));
    const input = screen.getByLabelText('Renombrar documento');
    fireEvent.change(input, { target: { value: 'Ficha 2026' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mocks.updateDocument).toHaveBeenCalledWith('doc_1', { title: 'Ficha 2026' });
  });

  it('duplica el documento desde el menú de acciones', () => {
    renderView();
    fireEvent.click(screen.getByText('Ficha del proyecto'));
    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    fireEvent.click(screen.getByRole('button', { name: /Duplicar/ }));
    expect(mocks.createDocument).toHaveBeenCalledWith({
      title: 'Ficha del proyecto (Copia)',
      content: expect.stringContaining('## Objetivo'),
    });
  });

  it('elimina el documento tras la confirmación', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView();
    fireEvent.click(screen.getByText('Ficha del proyecto'));
    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
    expect(mocks.deleteDocument).toHaveBeenCalledWith('doc_1');
    expect(screen.getByText(/Elegí un documento/)).toBeInTheDocument();
  });

  it('descarga el documento como archivo .md', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
    renderView();
    fireEvent.click(screen.getByText('Ficha del proyecto'));
    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    fireEvent.click(screen.getByRole('button', { name: /Descargar .md/ }));
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});