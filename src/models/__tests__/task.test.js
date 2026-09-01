import { describe, it, expect } from 'vitest';
import { createEmptyTask, canCompleteTask, hasPendingPrecedents, isTaskCompleted } from '../task';
import { TASK_STATUS } from '../../constants/project';

describe('models/task', () => {
  it('createEmptyTask tiene defaults correctos', () => {
    const t = createEmptyTask('b1');
    expect(t.status).toBe(TASK_STATUS.TODO);
    expect(t.bucketId).toBe('b1');
  });

  it('hasPendingPrecedents detecta antecedentes sin completar', () => {
    const tasks = {
      done: { id: 'done', status: TASK_STATUS.COMPLETED },
      pending: { id: 'pending', status: TASK_STATUS.TODO },
    };
    expect(hasPendingPrecedents({ precedents: ['done'] }, tasks)).toBe(false);
    expect(hasPendingPrecedents({ precedents: ['pending'] }, tasks)).toBe(true);
  });

  it('canCompleteTask impide finalizar con antecedentes pendientes', () => {
    const tasks = {
      done: { id: 'done', status: TASK_STATUS.COMPLETED },
      pending: { id: 'pending', status: TASK_STATUS.TODO },
    };
    expect(canCompleteTask({ precedents: ['done'] }, tasks)).toBe(true);
    expect(canCompleteTask({ precedents: ['pending'] }, tasks)).toBe(false);
  });

  it('isTaskCompleted', () => {
    expect(isTaskCompleted({ status: TASK_STATUS.COMPLETED })).toBe(true);
    expect(isTaskCompleted({ status: TASK_STATUS.TODO })).toBe(false);
  });
});