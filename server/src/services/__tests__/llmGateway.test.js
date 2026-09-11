import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  callLLM,
  loadLlmConfig,
  extractJson,
  parseLlmResponse,
} from '../llmGateway.js';

// Config hermética para los tests: no depende del archivo real.
const baseConfig = {
  activeProvider: 'openai',
  timeoutMs: 12000,
  providers: {
    openai: {
      adapter: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      apiKeyEnv: 'OPENAI_API_KEY',
      maxTokens: 1000,
      temperature: 0.3,
      jsonObject: true,
    },
    openrouter: {
      adapter: 'openai-compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3.5-haiku',
      apiKeyEnv: 'OPENROUTER_API_KEY',
      maxTokens: 1000,
      temperature: 0.3,
      jsonObject: false,
    },
    anthropic: {
      adapter: 'anthropic-native',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-haiku-20241022',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      maxTokens: 1000,
      temperature: 0.3,
    },
  },
};

const openaiResponse = {
  ok: true,
  json: async () => ({
    choices: [{ message: { content: '{"reply":"Sí, te consulto","actions":[]}' } }],
  }),
};

const anthropicResponse = {
  ok: true,
  json: async () => ({ content: [{ type: 'text', text: '{"reply":"Sí","actions":[]}' }] }),
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('directo (utils del gateway)', () => {
  it('lee la config estática del repo: openai activo y 3 proveedores', () => {
    const cfg = loadLlmConfig();
    expect(cfg.activeProvider).toBe('openai');
    expect(Object.keys(cfg.providers).sort()).toEqual(['anthropic', 'openai', 'openrouter']);
    expect(cfg.providers.openai.apiKeyEnv).toBe('OPENAI_API_KEY');
    expect(cfg.providers.openai.model).toBe('gpt-4o-mini');
    expect(cfg.providers.openai.jsonObject).toBe(true);
    expect(cfg.providers.openrouter.jsonObject).toBe(false);
    expect(cfg.providers.anthropic.adapter).toBe('anthropic-native');
  });

  it('extractJson toma entre el primer { y el último }', () => {
    expect(extractJson('algo {"a": 1} y más {"b": 2}')).toBe('{"a": 1} y más {"b": 2}');
    expect(extractJson('sin llaves')).toBeNull();
    expect(extractJson('{}')).toBe('{}');
  });

  it('parseLlmResponse tolera prosa y bloques markdown', () => {
    const raw = 'Claro:\n```json\n{"reply":"ok","actions":[]}\n```';
    expect(parseLlmResponse(raw)).toEqual({ reply: 'ok', actions: [] });
    expect(parseLlmResponse('nada')).toBeNull();
    expect(parseLlmResponse('{"roto":')).toBeNull();
  });
});

describe('callLLM', () => {
  it('openai: posts a /chat/completions con Bearer, modelo, max_tokens y json_object', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    globalThis.fetch.mockResolvedValue(openaiResponse);

    const out = await callLLM({
      systemPrompt: 'Sos Maia',
      messages: [{ role: 'user', content: 'hola' }],
      config: baseConfig,
    });

    expect(out).toEqual({ reply: 'Sí, te consulto', actions: [] });
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(opts.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.max_tokens).toBe(1000);
    expect(body.temperature).toBe(0.3);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Sos Maia' });
  });

  it('openrouter: headers HTTP-Referer/X-Title y sin json_object', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'or-test');
    globalThis.fetch.mockResolvedValue(openaiResponse);

    await callLLM({
      systemPrompt: 'x',
      messages: [],
      config: { ...baseConfig, activeProvider: 'openrouter' },
    });

    const [, opts] = globalThis.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer or-test');
    expect(typeof opts.headers['HTTP-Referer']).toBe('string');
    expect(opts.headers['X-Title']).toBe('Gantter');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('anthropic/claude-3.5-haiku');
    expect(body.response_format).toBeUndefined();
  });

  it('anthropic: posts a /messages con x-api-key, anthropic-version y system separado', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
    globalThis.fetch.mockResolvedValue(anthropicResponse);

    const out = await callLLM({
      systemPrompt: 'Sos Maia',
      messages: [{ role: 'user', content: 'hola' }],
      config: { ...baseConfig, activeProvider: 'anthropic' },
    });

    expect(out.reply).toBe('Sí');
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(opts.headers['x-api-key']).toBe('sk-ant-test');
    expect(opts.headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(opts.body);
    expect(body.system).toBe('Sos Maia');
    expect(body.model).toBe('claude-3-5-haiku-20241022');
    expect(body.messages[0]).toEqual({ role: 'user', content: 'hola' });
  });

  it('parsea JSON embebido en prosa y devuelve actions', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    const messy =
      'Claro, acá va:\n\n```json\n{"reply":"Hola","actions":[{"type":"move","payload":{"taskId":"t1","bucketId":"b1"}}]}\n```';
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: messy } }] }),
    });

    const out = await callLLM({ systemPrompt: 'x', messages: [], config: baseConfig });
    expect(out.actions).toHaveLength(1);
    expect(out.actions[0].type).toBe('move');
  });

  it('sin API key lanza no-key y no llama al proveedor', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    await expect(
      callLLM({ systemPrompt: 'x', messages: [], config: baseConfig }),
    ).rejects.toMatchObject({ code: 'no-key' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('timeout corto: aborta la señal y falla con llm-call', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    globalThis.fetch.mockImplementation(
      (_url, opts) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    await expect(
      callLLM({ systemPrompt: 'x', messages: [], config: baseConfig, timeoutMs: 30 }),
    ).rejects.toMatchObject({ code: 'llm-call' });
  });

  it('upstream 429: lanza llm-upstream con status', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    globalThis.fetch.mockResolvedValue({ ok: false, status: 429 });

    await expect(
      callLLM({ systemPrompt: 'x', messages: [], config: baseConfig }),
    ).rejects.toMatchObject({ code: 'llm-upstream', status: 429 });
  });

  it('JSON sin reply/actions: lanza llm-shape', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"foo": 1}' } }] }),
    });

    await expect(
      callLLM({ systemPrompt: 'x', messages: [], config: baseConfig }),
    ).rejects.toMatchObject({ code: 'llm-shape' });
  });
});