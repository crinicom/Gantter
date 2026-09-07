import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GanttView from '../GanttView';
import { ProjectContext } from '../../../context/ProjectContext';
import seedRaw from '../../../../DB/sample_data.json';
import { deserializeProject } from '../../../services/projectStorage';

const seedProject = deserializeProject(JSON.stringify(seedRaw.projects[0]));

function renderGantt(project) {
  const toggleBucketCollapse = vi.fn();
  render(
    <ProjectContext.Provider value={{ project, toggleBucketCollapse }}>
      <GanttView />
    </ProjectContext.Provider>,
  );
  return { toggleBucketCollapse };
}

const cyclicProject = {
  id: null,
  name: 'Ciclo',
  description: '',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  buckets: [{ id: 'b1', name: 'Bucket', color: '#6200ea', collapsed: false }],
  tasks: [
    {
      id: 'a', name: 'A', startDate: '2026-09-01', endDate: '2026-09-03',
      status: 'in-progress', precedents: ['b'], dependents: ['b'], bucketId: 'b1',
    },
    {
      id: 'b', name: 'B', startDate: '2026-09-04', endDate: '2026-09-06',
      status: 'todo', precedents: ['a'], dependents: ['a'], bucketId: 'b1',
    },
  ],
};

describe('GanttView', () => {
  it('renderiza el diagrama con el proyecto sample sin lanzar errores', () => {
    renderGantt(seedProject);
    expect(screen.getByText('Diagrama de Gantt')).toBeInTheDocument();
  });

  it('no revienta con dependencias circulares guardadas', () => {
    renderGantt(cyclicProject);
    expect(screen.getByText('Diagrama de Gantt')).toBeInTheDocument();
  });
});