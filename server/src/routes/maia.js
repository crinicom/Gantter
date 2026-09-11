// Relay de Maia (§11 Contrato de IA, slice 16): recibe el contexto acotado del
// tablero y el mensaje del usuario, compone el system prompt con los prompts
// Markdown de `maia/` (persona + contrato + workflow opcional) y delega la
// llamada en el gateway multi-proveedor `llmGateway` (config `llm.config.json`).
// Devuelve `{ reply, actions }` estructurado. Si no hay clave, falla el
// upstream o se rompe el JSON: responde 50x/400 para que el cliente degrade a
// la respuesta socrática templated, sin gasto. Nunca se llama en page load:
// solo por mensaje.

import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireAuth } from '../middleware/auth.js';
import { callLLM } from '../services/llmGateway.js';

const router = Router();

// Intención del system prompt (§11, no es texto sagrado). La persona y el
// contrato se leen de `maia/system/*.md` (config a nivel app, editable sin
// tocar código); estos textos son solo el fallback si el archivo no existe.
const DEFAULT_PERSONA_PROMPT = [
  'Sos Maia, facilitadora socrática de Gantter, sobre un tablero Kanban + Gantt (contexto: cartas, miembros, fechas, modo auto/confirm).',
  'No das órdenes: preguntás. 2-4 oraciones, español rioplatense, sin emoji.',
  'Si el usuario dio un dato accionable, devolvé acciones concretas con ids reales que existan en el contexto.',
  'Si no alcanza, una sola pregunta más. No interrogatorio. Hablá del trabajo, no de la persona.',
  'Si el tipo de pregunta es "huddle", seguí la conversación del "Hilo reciente" y contestá dentro de ese contexto: no reinicies la misma pregunta que ya respondió.',
].join(' ');

const DEFAULT_SYS_CONTRACT = [
  'Respondé SOLO un JSON válido, sin prosa fuera de llaves: {"reply": "string", "actions": [{"type": "assign|move|set-dates|set-description|set-blocked|add-comment|create-card", "payload": {"taskId":"...","memberId":"...","bucketId":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","text":"...","title":"..."}}]}.',
  'Sin acción concreta y segura: actions va vacío.',
].join(' ');

// Ruta de los prompts de Maia. Default: `maia/` del repo (en Docker se copia a
// /app/maia); se puede overridear con MAIA_PROMPTS_DIR si algún día viven en un
// volumen. Las líneas con `#` son comentarios que no llegan al modelo.
const DEFAULT_PROMPTS_DIR = fileURLToPath(new URL('../../../maia', import.meta.url));

// Lee un prompt Markdown de `maia/`; devuelve el texto plano (sin comentarios)
// o null si falta el archivo. `relativePath` viene saneado por el caller.
function readPromptFile(relativePath) {
  const dir = process.env.MAIA_PROMPTS_DIR || DEFAULT_PROMPTS_DIR;
  try {
    return readFileSync(`${dir}/${relativePath}`, 'utf8')
      .split(/\r?\n/)
      .filter((line) => !/^\s*#/.test(line))
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ');
  } catch {
    return null;
  }
}

function personaPromptText() {
  return readPromptFile('system/persona.md') ?? DEFAULT_PERSONA_PROMPT;
}

function contractPromptText() {
  return readPromptFile('system/contract.md') ?? DEFAULT_SYS_CONTRACT;
}

// Compone el system prompt: persona + contrato + workflow opcional (texto ya
// cargado y validado por el caller).
function systemPrompt({ workflow = null } = {}) {
  const base = `${personaPromptText()} ${contractPromptText()}`;
  return workflow ? `${base}\n\n${workflow}` : base;
}

router.post('/maia/chat', requireAuth, async (req, res) => {
  const { kind, mode, boardContext, userText, threadTail, workflow } = req.body || {};
  if (typeof boardContext !== 'string' || typeof userText !== 'string' || !userText.trim()) {
    return res.status(400).json({ error: 'Faltan contexto y mensaje' });
  }

  // Workflow opcional (e.g. "breakdown"): activa instrucciones + few-shot del
  // desglose. Siempre que llegue algo, el archivo debe existir en maia/workflows.
  const workflowName =
    typeof workflow === 'string' && workflow.trim() ? workflow.trim().toLowerCase() : null;
  if (workflowName && !/^[a-z][a-z0-9-]{0,40}$/.test(workflowName)) {
    return res.status(400).json({ error: 'workflow-invalid' });
  }
  const workflowText = workflowName ? readPromptFile(`workflows/${workflowName}.md`) : null;
  if (workflowName && workflowText === null) {
    return res.status(400).json({ error: 'workflow-missing' });
  }

  const parts = [
    `Contexto del tablero:\n${boardContext.slice(0, 1200)}`,
    `Tipo de pregunta: ${kind || 'general'}`,
    `Modo del tablero: ${mode || 'confirm'}`,
  ];
  if (Array.isArray(threadTail) && threadTail.length) {
    parts.push(`Hilo reciente:\n${threadTail.join('\n').slice(0, 800)}`);
  }
  parts.push(`Mensaje del usuario:\n${String(userText).slice(0, 1000)}`);

  try {
    const result = await callLLM({
      systemPrompt: systemPrompt({ workflow: workflowText }),
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    });
    return res.json(result);
  } catch (err) {
    if (err?.code === 'no-key') {
      return res.status(503).json({ error: 'no-key', message: 'Maia está sin clave' });
    }
    if (err?.code === 'llm-upstream') {
      return res.status(502).json({ error: 'llm-upstream', upstream: err.status });
    }
    return res.status(502).json({ error: err?.code || 'llm-call' });
  }
});

export default router;