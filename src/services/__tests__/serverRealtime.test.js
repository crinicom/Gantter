import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as appConfig from '../../config/appConfig';

class MockEventSource {
  static instances = [];
  onmessage = null;
  onerror = null;
  constructor(url) {
    this.url = url;
    this.closed = false;
    MockEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
  }
}

async function loadRealtime() {
  vi.resetModules();
  return (await import('../serverRealtime')).default;
}

beforeEach(() => {
  global.EventSource = vi.fn();
  MockEventSource.instances = [];
  global.EventSource.mockImplementation((url) => new MockEventSource(url));
  vi.spyOn(appConfig, 'apiBase').mockReturnValue('http://test');
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.EventSource;
});

describe('ServerRealtime', () => {
  it('abre una conexión SSE solo la primera vez por proyecto', async () => {
    const ServerRealtime = await loadRealtime();
    const h1 = vi.fn();
    const h2 = vi.fn();
    const unsub1 = ServerRealtime.subscribe('p1', h1);
    ServerRealtime.subscribe('p1', h2);
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toContain('/api/realtime');
    expect(MockEventSource.instances[0].url).toContain('projectId=p1');

    unsub1();
    ServerRealtime.subscribe('p2', vi.fn());
    expect(MockEventSource.instances.length).toBe(2);
  });

  it('despacha a los handlers cuando llega un mensaje', async () => {
    const ServerRealtime = await loadRealtime();
    const h1 = vi.fn();
    const h2 = vi.fn();
    ServerRealtime.subscribe('p1', h1);
    ServerRealtime.subscribe('p1', h2);

    MockEventSource.instances[0].onmessage({
      data: JSON.stringify({ type: 'project', projectId: 'p1', project: { id: 'p1' } }),
    });
    expect(h1).toHaveBeenCalledWith({ type: 'project', projectId: 'p1', project: { id: 'p1' } });
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('ignora pings y cierra la conexión al quedar sin handlers', async () => {
    const ServerRealtime = await loadRealtime();
    const unsub = ServerRealtime.subscribe('p1', vi.fn());
    MockEventSource.instances[0].onmessage({ data: 'ping' });
    expect(MockEventSource.instances[0].closed).toBe(false);
    unsub();
    expect(MockEventSource.instances[0].closed).toBe(true);
  });
});
