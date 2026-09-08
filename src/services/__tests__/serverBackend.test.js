import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServerBackend } from '../serverBackend';
import * as appConfig from '../../config/appConfig';

function mockFetch(impl) {
  global.fetch = vi.fn(impl);
}

beforeEach(() => {
  vi.spyOn(appConfig, 'apiBase').mockReturnValue('http://test');
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe('ServerBackend', () => {
  it('carga proyectos visibles con credentials', async () => {
    mockFetch(async () => ({ status: 200, ok: true, json: async () => [{ id: '1' }] }));
    const list = await ServerBackend.loadProjects();
    expect(list).toEqual([{ id: '1' }]);
    expect(fetch).toHaveBeenCalledWith('http://test/api/projects', {
      method: 'GET',
      headers: {},
      credentials: 'include',
    });
  });

  it('pide el proyecto por id', async () => {
    mockFetch(async (url) => ({ status: 200, ok: true, json: async () => ({ id: 'p1' }) }));
    const doc = await ServerBackend.loadProject('p1');
    expect(doc).toEqual({ id: 'p1' });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/projects/p1'), expect.anything());
  });

  it('guarda con If-Match de la version y acierta', async () => {
    mockFetch(async (_url, opts) => ({
      status: 200,
      ok: true,
      json: async () => ({ id: 'p1', version: 5 }),
    }));
    const ok = await ServerBackend.saveProject({ id: 'p1', version: 4 });
    expect(ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/p1'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ 'If-Match': '4' }),
      }),
    );
  });

  it('reintenta con merge en conflicto 409', async () => {
    let calls = 0;
    mockFetch(async (_url, opts) => {
      calls += 1;
      if (calls === 1) {
        return {
          status: 409,
          ok: false,
          json: async () => ({ remote: { id: 'p1', version: 5, name: 'Remoto' } }),
        };
      }
      return { status: 200, ok: true, json: async () => ({ id: 'p1', version: 5 }) };
    });
    const ok = await ServerBackend.saveProject({ id: 'p1', version: 4, name: 'Local' });
    expect(ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('usa expectedVersion como If-Match cuando se provee', async () => {
    mockFetch(async () => ({ status: 200, ok: true, json: async () => ({}) }));
    await ServerBackend.saveProject({ id: 'p1', version: 5 }, { expectedVersion: 2 });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/p1'),
      expect.objectContaining({ headers: expect.objectContaining({ 'If-Match': '2' }) }),
    );
  });

  it('reintento 409 usa remote.version como base (no merged.version)', async () => {
    const sentHeaders = [];
    mockFetch(async (_url, opts) => {
      sentHeaders.push(opts.headers?.['If-Match']);
      if (sentHeaders.length === 1) {
        return {
          status: 409,
          ok: false,
          json: async () => ({ remote: { id: 'p1', version: 2, name: 'Servidor' } }),
        };
      }
      return { status: 200, ok: true, json: async () => ({}) };
    });
    const ok = await ServerBackend.saveProject({ id: 'p1', version: 3, name: 'Local' });
    expect(ok).toBe(true);
    expect(sentHeaders).toEqual(['3', '2']);
  });

  it('409 con merge identico (server detras) se sana reintentando y acierta', async () => {
    let calls = 0;
    mockFetch(async (_url, opts) => {
      calls += 1;
      if (calls === 1) {
        return {
          status: 409,
          ok: false,
          json: async () => ({ remote: { id: 'p1', version: 2, name: 'X' } }),
        };
      }
      return { status: 200, ok: true, json: async () => ({ id: 'p1', version: 3 }) };
    });
    const ok = await ServerBackend.saveProject({ id: 'p1', version: 2, name: 'X' });
    expect(ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('false tras agotar reintentos con 409 persistente', async () => {
    mockFetch(async () => ({
      status: 409,
      ok: false,
      json: async () => ({ remote: { id: 'p1', version: 2, name: 'X' } }),
    }));
    const ok = await ServerBackend.saveProject({ id: 'p1', version: 2, name: 'X' });
    expect(ok).toBe(false);
  });

  it('devuelve null/[] ante respuestas de error', async () => {
    mockFetch(async () => ({ status: 401, ok: false, json: async () => ({}) }));
    expect(await ServerBackend.loadProjects()).toEqual([]);
    expect(await ServerBackend.loadProject('x')).toBeNull();
  });
});
