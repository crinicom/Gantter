import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import BucketColumn from '../BucketColumn';

vi.mock('../TaskCard', () => ({ default: () => null }));
vi.mock('../AddTaskForm', () => ({ default: () => null }));

function renderColumn(bucket, tasks) {
  return render(
    <DndContext>
      <BucketColumn bucket={bucket} tasks={tasks} />
    </DndContext>,
  );
}

describe('BucketColumn', () => {
  it('muestra el WIP n/límite y se pone ámbar si se excede', () => {
    const { container } = renderColumn(
      { id: 'b1', name: 'En curso', color: '#6200ea', wipLimit: 3 },
      [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }],
    );
    expect(screen.getByText('4/3')).toBeInTheDocument();
    expect(container.querySelector('.bg-amber-100')).toBeTruthy();
  });

  it('sin wipLimit el badge no aparece', () => {
    renderColumn({ id: 'b2', name: 'Backlog', color: '#123', wipLimit: null }, []);
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });
});