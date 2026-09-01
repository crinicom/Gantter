import { describe, it, expect } from 'vitest';
import { createEmptyTask } from '../../models/task';
import { linkTasks, unlinkTasks, getPrecedentTasks, getDependentTasks } from '../taskHelpers';

describe('taskHelpers', () => {
  it('createEmptyTask genera una tarea con ids y arrays vacíos', () => {
    const task = createEmptyTask('bucket_1');
    expect(task.bucketId).toBe('bucket_1');
    expect(task.precedents).toEqual([]);
    expect(task.dependents).toEqual([]);
    expect(task.comments).toEqual([]);
    expect(task.id).toBeTruthy();
  });

  it('linkTasks crea ambas relaciones sin duplicar', () => {
    let tasks = [
      { id: 'a', precedents: [], dependents: [] },
      { id: 'b', precedents: [], dependents: [] },
    ];
    tasks = linkTasks(tasks, 'a', 'b');
    expect(tasks.find((t) => t.id === 'b').precedents).toContain('a');
    expect(tasks.find((t) => t.id === 'a').dependents).toContain('b');
    // no duplicar
    tasks = linkTasks(tasks, 'a', 'b');
    expect(tasks.find((t) => t.id === 'b').precedents).toHaveLength(1);
  });

  it('unlinkTasks elimina las relaciones', () => {
    let tasks = [
      { id: 'a', precedents: [], dependents: ['b'] },
      { id: 'b', precedents: ['a'], dependents: [] },
    ];
    tasks = unlinkTasks(tasks, 'a', 'b');
    expect(tasks.find((t) => t.id === 'a').dependents).toHaveLength(0);
    expect(tasks.find((t) => t.id === 'b').precedents).toHaveLength(0);
  });

  it('getPrecedentTasks y getDependentTasks resuelven los objetos', () => {
    const tasks = [
      { id: 'a', precedents: [], dependents: ['b'] },
      { id: 'b', precedents: ['a'], dependents: [] },
    ];
    expect(getPrecedentTasks(tasks, 'b')).toEqual([tasks[0]]);
    expect(getDependentTasks(tasks, 'a')).toEqual([tasks[1]]);
  });

  it('linkTasks rechaza un vínculo que cerraría un ciclo directo', () => {
    let tasks = [
      { id: 'a', precedents: [], dependents: ['b'] },
      { id: 'b', precedents: ['a'], dependents: [] },
    ];
    // Ya existe a→b; intentar b→a cerraría el ciclo.
    tasks = linkTasks(tasks, 'b', 'a');
    expect(tasks.find((t) => t.id === 'a').precedents).not.toContain('b');
    expect(tasks.find((t) => t.id === 'b').dependents).not.toContain('a');
  });

  it('linkTasks rechaza un ciclo transitivo (a→b→c, añadir c→a)', () => {
    let tasks = [
      { id: 'a', precedents: [], dependents: ['b'] },
      { id: 'b', precedents: ['a'], dependents: ['c'] },
      { id: 'c', precedents: ['b'], dependents: [] },
    ];
    tasks = linkTasks(tasks, 'c', 'a');
    expect(tasks.find((t) => t.id === 'a').precedents).not.toContain('c');
    expect(tasks.find((t) => t.id === 'c').dependents).not.toContain('a');
  });

  it('linkTasks mantiene un vínculo válido entre ramas independientes', () => {
    let tasks = [
      { id: 'a', precedents: [], dependents: [] },
      { id: 'b', precedents: [], dependents: [] },
    ];
    tasks = linkTasks(tasks, 'a', 'b');
    expect(tasks.find((t) => t.id === 'b').precedents).toContain('a');
    expect(tasks.find((t) => t.id === 'a').dependents).toContain('b');
  });
});