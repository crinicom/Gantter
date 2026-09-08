// Relay de Maie (§11 Contrato de IA): recibe el contexto acotado del tablero y
// el mensaje del usuario, llama a grok-4.5 (xAI) con la clave del dueño, y
// devuelve `{ reply, actions }` estructurado. Si no hay clave, falla el
// upstream o se rompe el JSON: responde 50x/400 para que el cliente degrade a la
// respuesta socrática templated. Nunca se llama en page load: solo por mensaje.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const XAI_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = process.env.XAI_MODEL || 'grok-4.5';

// Intención del system prompt (§11, no es texto sagrado).
const SYSTEM_PROMPT = [
  'Sos Maie, facilitadora socrática de Gantter.',
  'Trabajás sobre un tablero Kanban + Gantt que te pasan como contexto (cartas relevantes, miembros, fechas, modo auto/confirm).',
  'No das órdenes. Preguntás. 2-4 oraciones, español rioplatense, sin emoji.',
  'Si el usuario ya dio un dato accionable, devolvé acciones concretas con ids reales de cartas y miembros. Las acciones se aplican solo si el id existe y tiene sentido.',
  'Si no alcanza, hacés una sola pregunta más. No interrogatorio.',
  'Hablá del trabajo, no de la persona.',
  'Respondé SOLO JSON válido con esta forma exacta: {"reply": "string", "actions": [{"type": "assign|move|set-dates|set-description|set-blocked|add-comment|create-card", "payload": {"taskId": "...", "memberId": "...", "bucketId": "...", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "text": "...", "title": "..."}}]}.',
  'Si no hay acción concreta y segura, actions va vacío.',
].join(' ');

router.post('/maie/chat', requireAuth, async (req, res) => {
  const { kind, mode, boardContext, userText, threadTail } = req.body || {};
  if (typeof boardContext !== 'string' || typeof userText !== 'string' || !userText.trim()) {
    return res.status(400).json({ error: 'Faltan contexto y mensaje' });
  }
  if (!process.env.XAI_API_KEY) {
    return res.status(503).json({ error: 'no-key', message: 'Maie está sin clave' });
  }

  const parts = [
    `Contexto del tablero:\n${boardContext.slice(0, 3000)}`,
    `Tipo de pregunta: ${kind || 'general'}`,
    `Modo del tablero: ${mode || 'confirm'}`,
  ];
  if (Array.isArray(threadTail) && threadTail.length) {
    parts.push(`Hilo reciente:\n${threadTail.join('\n')}`);
  }
  parts.push(`Mensaje del usuario:\n${String(userText).slice(0, 2000)}`);

  try {
    const up = await fetch(XAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: parts.join('\n\n') },
        ],
        max_tokens: 400,
        temperature: 0.6,
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