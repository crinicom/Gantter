// Gateway LLM multi-proveedor (§11 Contrato de IA, slice 16). Puente puro en
// el relay de Maia: no conoce Express ni el contexto del tablero; recibe el
// system prompt ya compuesto y los mensajes, y devuelve `{ reply, actions }`
// parseado del JSON del modelo. Los proveedores viven en `llm.config.json`
// (config estática: cambiar modelo/proveedor no toca código). Errores tipados
// por `code` para que el route los mapee a HTTP:
//   no-key | llm-upstream | llm-parse | llm-shape | llm-call | config
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Resuelve la config por CWD (no por import.meta.url, que Vitest reescribe y
// rompe el esquema `file:`). Vale tanto desde la raíz del repo (`server/...`)
// como desde adentro de `server/` (`src/...`). Sobrescribible con LLM_CONFIG_PATH.
function resolveDefaultConfigPath() {
  const candidates = [
    ['server', 'src', 'config', 'llm.config.json'],
    ['src', 'config', 'llm.config.json'],
  ];
  const found = candidates
    .map((parts) => path.resolve(process.cwd(), ...parts))
    .find((p) => existsSync(p));
  return found || path.resolve(process.cwd(), ...candidates[0]);
}

export function loadLlmConfig({
  path: configPath = process.env.LLM_CONFIG_PATH || resolveDefaultConfigPath(),
} = {}) {
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function gatewayError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

// Timeout estricto (§11): AbortSignal.timeout donde exista (Node >= 17.3 y
// browsers modernos); fallback con AbortController por compatibilidad.
export function createAbortSignal(timeoutMs) {
  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener('abort', () => clearTimeout(timer));
  return controller.signal;
}

// Parseo defensivo (§11): el modelo suele meter prosa o bloques de código
// markdown alrededor del JSON. Se extrae lo que va del primer `{` al último
// `}`; si no hay llaves o no parsea, devuelve null (no lanza).
export function extractJson(raw) {
  if (typeof raw !== 'string') return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

export function parseLlmResponse(raw) {
  const candidate = extractJson(raw);
  if (candidate === null) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function hasValidShape(parsed) {
  return Boolean(
    parsed &&
      typeof parsed === 'object' &&
      typeof parsed.reply === 'string' &&
      parsed.reply.trim() &&
      Array.isArray(parsed.actions),
  );
}

async function postJson(url, { headers, body, signal, fetchImpl }) {
  const up = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!up.ok) {
    const err = gatewayError('llm-upstream', `Upstream respondió ${up.status}`);
    err.status = up.status;
    throw err;
  }
  try {
    return await up.json();
  } catch {
    throw gatewayError('llm-call', 'La respuesta del upstream no es JSON');
  }
}

// Adapter openai-compatible (OpenAI, OpenRouter y otros con /chat/completions).
// jsonObject solo si el proveedor lo declara en config (OpenAI lo garantiza;
// OpenRouter sobre modelos Anthropic no siempre).
async function openAiCompatible({ provider, systemPrompt, messages, signal, fetchImpl }) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env[provider.apiKeyEnv]}`,
  };
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = process.env.APP_BASE_URL || 'https://gantter.fly.dev';
    headers['X-Title'] = process.env.APP_TITLE || 'Gantter';
  }
  const body = {
    model: provider.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      })),
    ],
    max_tokens: provider.maxTokens,
    temperature: provider.temperature,
  };
  if (provider.jsonObject) {
    body.response_format = { type: 'json_object' };
  }
  const data = await postJson(`${provider.baseUrl}/chat/completions`, {
    headers,
    body,
    signal,
    fetchImpl,
  });
  return data?.choices?.[0]?.message?.content || '';
}

// Adapter anthropic-native (Messages API, /v1/messages): el system prompt va
// separado y la respuesta sale en content[].text.
async function anthropicNative({ provider, systemPrompt, messages, signal, fetchImpl }) {
  const data = await postJson(`${provider.baseUrl}/messages`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env[provider.apiKeyEnv],
      'anthropic-version': '2023-06-01',
    },
    body: {
      model: provider.model,
      max_tokens: provider.maxTokens,
      temperature: provider.temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      })),
    },
    signal,
    fetchImpl,
  });
  return data?.content?.find((c) => c?.type === 'text')?.text || '';
}

// Pide la respuesta estructurada a Maia. Devuelve `{ reply, actions }` o lanza
// un error con `code` (nunca crashea: el route mapea y el cliente degrada).
export async function callLLM({
  systemPrompt = '',
  messages = [],
  timeoutMs,
  config,
  fetchImpl = globalThis.fetch,
} = {}) {
  const cfg = config || loadLlmConfig();
  const active = cfg.activeProvider || 'openai';
  const base = (cfg.providers || {})[active];
  if (!base) throw gatewayError('config', `Proveedor desconocido: ${active}`);
  const provider = { id: active, ...base };

  if (!process.env[provider.apiKeyEnv]) {
    throw gatewayError('no-key', `Falta ${provider.apiKeyEnv}`);
  }

  const effectiveTimeoutMs = timeoutMs ?? cfg.timeoutMs ?? 12000;
  const signal = createAbortSignal(effectiveTimeoutMs);

  let raw;
  try {
    if (provider.adapter === 'anthropic-native') {
      raw = await anthropicNative({ provider, systemPrompt, messages, signal, fetchImpl });
    } else {
      raw = await openAiCompatible({ provider, systemPrompt, messages, signal, fetchImpl });
    }
  } catch (err) {
    if (err && typeof err.code === 'string' && err.code.startsWith('llm-')) throw err;
    throw gatewayError('llm-call', `Falló el call al proveedor: ${err?.message || 'desconocido'}`);
  }

  const parsed = parseLlmResponse(raw);
  if (parsed === null) throw gatewayError('llm-parse', 'El modelo no respondió JSON usable');
  if (!hasValidShape(parsed)) throw gatewayError('llm-shape', 'Faltan reply o actions');

  return { reply: parsed.reply, actions: parsed.actions };
}

export const llmGateway = { loadLlmConfig, callLLM, extractJson, parseLlmResponse };