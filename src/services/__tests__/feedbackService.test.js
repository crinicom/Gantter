import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { feedbackService } from '../feedbackService';
import * as appConfig from '../../config/appConfig';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(appConfig, 'isServerMode').mockReturnValue(false);
  vi.spyOn(appConfig, 'apiBase').mockReturnValue('');
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe('feedbackService', () => {
  const base = {
    type: 'error',
    message: 'Test',
    screen: 'board · App',
    systemState: { backend: 'local' },
    user: { id: 'u1', name: 'Lucía', email: 'l@test' },
  };

  it('offline: guarda en localStorage y listFeedback lo retorna', async () => {
    const res = await feedbackService.submitFeedback(base);
    expect(res).toEqual({ ok: true, local: true });
    const list = await feedbackService.listFeedback();
    expect(list).toHaveLength(1);
    expect(list[0].message).toBe('Test');
    expect(list[0].type).toBe('error');
    expect(list[0].screen).toBe('board · App');
    expect(list[0]).toHaveProperty('id');
    expect(list[0]).toHaveProperty('at');
    expect(list[0].author).toEqual({ id: 'u1', name: 'Lucía', email: 'l@test' });
  });

  it('offline: mantiene orden LIFO', async () => {
    await feedbackService.submitFeedback({ ...base, message: 'A' });
    await feedbackService.submitFeedback({ ...base, message: 'B' });
    const list = await feedbackService.listFeedback();
    expect(list.map((e) => e.message)).toEqual(['B', 'A']);
  });

  it('server mode: envía POST /api/feedback', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('http://test');    global.fetch = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({}) }));

    const res = await feedbackService.submitFeedback(base);
    expect(res).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/feedback',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('server mode: encola en localStorage ante error de red', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('http://test');
    global.fetch = vi.fn(async () => { throw new Error('network'); });

    const res = await feedbackService.submitFeedback(base);
    expect(res).toEqual({ ok: false, queued: true });
    const pending = JSON.parse(localStorage.getItem('gantter.feedback.pending.v1'));
    expect(pending).toHaveLength(1);
    expect(pending[0].message).toBe('Test');
  });

  it('server mode: encola ante 401', async () => {
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('http://test');
    global.fetch = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));

    const res = await feedbackService.submitFeedback(base);
    expect(res).toEqual({ ok: false, queued: true });
    expect(JSON.parse(localStorage.getItem('gantter.feedback.pending.v1'))).toHaveLength(1);
  });

  it('flushPending: envía los pendientes y limpia la cola', async () => {
    localStorage.setItem(
      'gantter.feedback.pending.v1',
      JSON.stringify([{ ...base, id: 'queued1', at: new Date().toISOString() }]),
    );
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('http://test');
    global.fetch = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({}) }));

    await feedbackService.flushPending();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('gantter.feedback.pending.v1'))).toEqual([]);
  });

  it('flushPending: conserva los que fallan', async () => {
    localStorage.setItem(
      'gantter.feedback.pending.v1',
      JSON.stringify([{ ...base, id: 'queued1', at: new Date().toISOString() }]),
    );
    vi.mocked(appConfig.isServerMode).mockReturnValue(true);
    vi.mocked(appConfig.apiBase).mockReturnValue('http://test');
    global.fetch = vi.fn(async () => { throw new Error('net'); });

    await feedbackService.flushPending();
    expect(JSON.parse(localStorage.getItem('gantter.feedback.pending.v1'))).toHaveLength(1);
  });
});
