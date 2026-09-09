// feedbackService: el comentario va al inbox del agente (`POST /dev/feedback`,
// middleware del dev server) en cualquier modo; a eso se le suma el flujo del
// modo (local: localStorage; server: `/api/feedback` con queue de respaldo).
// El entorno de tests trae VITE_APP_MODE del `.env`, por eso acá se mockea el
// modo para ser determinista.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const modeMock = vi.hoisted(() => ({ server: false }));

vi.mock('../../config/appConfig', () => ({
  isServerMode: () => modeMock.server,
  apiBase: () => '',
}));

import { feedbackService } from '../feedbackService';

describe('feedbackService · inbox del agente', () => {
  beforeEach(() => {
    modeMock.server = false;
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('modo local: guarda en localStorage y avisa al inbox de dev', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const res = await feedbackService.submitFeedback({
      type: 'sugerencia',
      message: 'Probar el huddle en auto',
      screen: 'huddle',
    });
    expect(res).toEqual({ ok: true, local: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/dev/feedback',
      expect.objectContaining({ method: 'POST' }),
    );
    const saved = JSON.parse(localStorage.getItem('gantter.feedback.v1'));
    expect(saved[0].message).toBe('Probar el huddle en auto');
  });

  it('no rompe si el inbox de dev no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(
      feedbackService.submitFeedback({ type: 'comentario', message: 'x' }),
    ).resolves.toEqual({ ok: true, local: true });
  });

  it('modo server: avisa al inbox igual aunque el push a la API falle', async () => {
    modeMock.server = true;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true }) // dev inbox
      .mockResolvedValueOnce({ ok: false }); // /api/feedback
    vi.stubGlobal('fetch', fetchMock);
    const res = await feedbackService.submitFeedback({
      type: 'comentario',
      message: 'comentario en modo server',
    });
    expect(res).toEqual({ ok: false, queued: true });
    expect(fetchMock.mock.calls[0][0]).toBe('/dev/feedback');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/feedback');
  });
});