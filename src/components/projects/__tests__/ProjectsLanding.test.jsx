import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectsLanding from '../ProjectsLanding';
import { ProjectContext } from '../../../context/ProjectContext';
import { AuthContext } from '../../../context/AuthContext';

const mocks = {
  openProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  setProjectImage: vi.fn(),
  resetDemo: vi.fn(),
  closeProject: vi.fn(),
  logout: vi.fn(),
};

const authValue = { user: { id: 'u_demo', name: 'Demo' }, logout: mocks.logout };

const renderLanding = (projects) =>
  render(
    <AuthContext.Provider value={authValue}>
      <ProjectContext.Provider
        value={{
          projects,
          activeProjectId: null,
          createProject: mocks.createProject,
          deleteProject: mocks.deleteProject,
          setProjectImage: mocks.setProjectImage,
          openProject: mocks.openProject,
          resetDemo: mocks.resetDemo,
          closeProject: mocks.closeProject,
        }}
      >
        <ProjectsLanding />
      </ProjectContext.Provider>
    </AuthContext.Provider>,
  );

const project = (overrides = {}) => ({
  id: 'p1',
  name: 'Proyecto A',
  description: '',
  ownerId: 'u_demo',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-10T12:00:00.000Z',
  tasks: [{ id: 't1', progress: 35, startDate: null, endDate: null }],
  ...overrides,
});

describe('ProjectsLanding', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear());
  });

  it('muestra el estado vacío sin proyectos', () => {
    renderLanding([]);
    expect(screen.getByText('Mis proyectos')).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes proyectos.')).toBeInTheDocument();
  });

  it('muestra tarjetas con nombre, fechas y % de avance', () => {
    renderLanding([project(), project({ id: 'p2', name: 'Proyecto B', tasks: [] })]);
    expect(screen.getByText('Proyecto A')).toBeInTheDocument();
    expect(screen.getByText('Proyecto B')).toBeInTheDocument();
    expect(screen.getAllByText(/Creado/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Modificado/).length).toBeGreaterThan(0);
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('abre el proyecto al hacer clic en la tarjeta', () => {
    renderLanding([project()]);
    fireEvent.click(screen.getByText('Proyecto A'));
    expect(mocks.openProject).toHaveBeenCalledWith('p1');
  });

  it('crea un proyecto desde el modal', () => {
    renderLanding([]);
    fireEvent.click(screen.getAllByText('Nuevo proyecto')[0]);
    fireEvent.change(screen.getByPlaceholderText('Nombre del proyecto'), {
      target: { value: 'Mi app' },
    });
    fireEvent.click(screen.getByText('Crear proyecto'));
    expect(mocks.createProject).toHaveBeenCalledWith({ name: 'Mi app', description: '' });
  });

  it('desloguea desde la landing', () => {
    renderLanding([]);
    fireEvent.click(screen.getByText('Salir'));
    expect(mocks.logout).toHaveBeenCalled();
  });
});