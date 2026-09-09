// Relay de Maie (§11 Contrato de IA): recibe el contexto acotado del tablero y
// el mensaje del usuario, llama a OpenAI (`gpt-4o-mini`, el modelo grande más
// barato) con la clave del dueño, y devuelve `{ reply, actions }` estructurado.
// Si no hay clave, falla el upstream o se rompe el JSON: responde 50x/400 para
// que el cliente degrade a la respuesta socrática templated, sin gasto. Nunca
// se llama en page load: solo por mensaje.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Intención del system prompt (§11, no es texto sagrado). Corto: cada token de
// entrada cuesta; el cap del presupuesto está en max_tokens.
const SYSTEM_PROMPT = [
  'Sos Maie, facilitadora socrática de Gantter, sobre un tablero Kanban + Gantt (contexto: cartas, miembros, fechas, modo auto/confirm).',
  'No das órdenes: preguntás. 2-4 oraciones, español rioplatense, sin emoji.',
  'Si el usuario dio un dato accionable, devolvé acciones concretas con ids reales que existan en el contexto.',
  'Si no alcanza, una sola pregunta más. No interrogatorio. Hablá del trabajo, no de la persona.',
  'Si el tipo de pregunta es "huddle", seguí la conversación del "Hilo reciente" y contestá dentro de ese contexto: no reinicies la misma pregunta que ya respondió.'
  'Respondé SOLO JSON válido: {"reply": "string", "actions": [{"type": "assign|move|set-dates|set-description|set-blocked|add-comment|create-card", "payload": {"taskId":"...","memberId":"...","bucketId":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","text":"...","title":"..."}}]}.',
  'Sin acción concreta y segura: actions va vacío.',
].join(' ');

router.post('/maie/chat', requireAuth, async (req, res) => {
  const { kind, mode, boardContext, userText, threadTail } = req.body || {};
  if (typeof boardContext !== 'string' || typeof userText !== 'string' || !userText.trim()) {
    return res.status(400).json({ error: 'Faltan contexto y mensaje' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'no-key', message: 'Maie está sin clave' });
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
    const up = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: parts.join('\n\n') },
        ],
        max_tokens: 300,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!up.ok) {
      return res.status(502).json({ error: 'llm-upstream', upstream: up.status });
    }

    const data = await up.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: 'llm-parse' });
    }
    if (
      !parsed ||
      typeof parsed.reply !== 'string' ||
      !parsed.reply.trim() ||
      !Array.isArray(parsed.actions)
    ) {
      return res.status(502).json({ error: 'llm-shape' });
    }
    return res.json({ reply: parsed.reply, actions: parsed.actions });
  } catch {
    return res.status(502).json({ error: 'llm-call' });
  }
});

export default router;