// Chat de Maie (§11 Contrato de IA). Solo se llama cuando el usuario envía un
// mensaje en el hilo: se arma un contexto acotado del tablero (cartas
// relevantes, miembros, modo) y se pide un reply estructurado a OpenAI
// (`gpt-4o-mini`, elegido por costo mínimo) vía el relay del server (la clave
// vive server-side). Si no hay key, falla el call o la app corre sin server:
// degradar a una respuesta socrática templated por `kind` (§8), sin inventar
// mutaciones. Nunca lanza: el tablero no crashea.
// Presupuesto de tokens (costo): contexto ≤1200 chars, mensaje del usuario
// ≤1000 chars, hilo último 3 turnos y max_tokens 300 del lado server. Respuestas
// largas o tableros enormes quedan fuera del modelo, no de la UI.
// Las acciones que vienen del LLM se validan contra ids reales del proyecto
// (`sanitizeActions`) y se traducen a la misma forma de propuesta que genera
// proposalEngine.

import { v4 as uuidv4 } from 'uuid';
import { INQUIRY_KINDS, MAIE_DEFAULTS } from '../constants/maie';
import { isServerMode, apiBase } from '../config/appConfig';
import { TASK_STATUS } from '../constants/project';

// Tipos de acción que el hilo acepta (whitelist de §11, sin create-card en auto).
export const MAIE_ACTION_TYPES = [
  'assign',
  'move',
  'set-dates',
  'set-description',
  'set-blocked',
  'add-comment',
  'create-card',
];

// Cap de contexto enviado al modelo (costo). La carta en cuestión va primero.
const MAX_CONTEXT_CHARS = 1200;
const MAX_USER_TEXT_CHARS = 1000;
const MAX_THREAD_TURNS = 3;

function truncate(value, max = 160) {
  const s = String(value || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function cardTitleOf(task) {
  return task?.name || task?.title || 'Carta sin título';
}

function isCompleted(task) {
  return Boolean(task) && task.status === TASK_STATUS.COMPLETED;
}

function daysUntil(now, value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(now).setUTCHours(0, 0, 0, 0);
  const end = new Date(d).setUTCHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

function columnNameOf(task, buckets) {
  return (buckets || []).find((b) => b.id === task?.bucketId)?.name || '';
}

// Contexto acotado y determinístico del tablero para el prompt (§11 "cartas
// relevantes"). No escanea el tablero: solo la carta en cuestión, su columna,
// los hitos próximos y —si el kind es overlap— las cartas solapadas.
export function buildBoardContext({ project, inquiry, now = new Date() } = {}) {
  const tasks = project?.tasks || [];
  const buckets = project?.buckets || [];
  const members = project?.members || [];
  const mode = project?.settings?.applyMode ?? 'confirm';
  const staleDays = project?.settings?.staleDays ?? MAIE_DEFAULTS.staleDays;
  const card = inquiry?.cardId ? tasks.find((t) => t.id === inquiry.cardId) || null : null;
  const windowDays = project?.settings?.milestoneWindowDays ?? MAIE_DEFAULTS.milestoneWindowDays;

  const lines = [];
  lines.push(`Proyecto: ${project?.name || 'Sin nombre'}.`);
  lines.push(
    `Modo del tablero: ${mode} (${mode === 'auto' ? 'aplicar y dejar registro' : 'preguntar sí/no'}).`,
  );
  lines.push(`Estancada por defecto: ${staleDays} días.`);
  lines.push(
    `Miembros (id=nombre): ${members.map((m) => `${m.id}=${m.name}`).join(', ') || 'sin miembros.'}`,
  );

  if (card) {
    const column = columnNameOf(card, buckets);
    const assignees = (card.assignedUsers || []).map((u) => u.name).join(', ') || 'sin dueño';
    const dates =
      card.startDate && card.endDate ? `${card.startDate} a ${card.endDate}` : 'sin fechas';
    lines.push(
      `Carta en cuestión: «${cardTitleOf(card)}» (id ${card.id}); columna ${column || 'sin columna'}; responsable: ${assignees}; fechas: ${dates}; bloqueada: ${card.blocked ? 'sí' : 'no'}.`,
    );
    if (card.description) lines.push(`Descripción: ${truncate(card.description, 200)}.`);
  }

  const milestones = tasks
    .filter((t) => t.milestone && !isCompleted(t) && t.endDate)
    .map((t) => ({ task: t, days: daysUntil(now, t.endDate) }))
    .filter((m) => m.days !== null)
    .sort((a, b) => a.days - b.days);
  const near = milestones.filter((m) => m.days >= 0 && m.days <= windowDays);
  if (near.length) {
    lines.push(`Hitos próximos: ${near.map((m) => `«${cardTitleOf(m.task)}» a ${m.days} días (id ${m.task.id})`).join('; ')}.`);
  }

  if (inquiry?.kind === INQUIRY_KINDS.OVERLAP) {
    const overlapped = tasks.filter((t) => !isCompleted(t) && t.startDate && t.endDate);
    if (overlapped.length) {
      lines.push(
        `Cartas con fechas visibles: ${overlapped.map((t) => `«${cardTitleOf(t)}» ${t.endDate}`).join('; ')}.`,
      );
    }
  }

  let context = lines.join('\n');
  if (context.length > MAX_CONTEXT_CHARS) context = context.slice(0, MAX_CONTEXT_CHARS);
  return context;
}

// Respuestas socráticas templated por kind (§11 fallback, §8 tono). Son
// preguntas, no órdenes; español rioplatense; sin emoji; mencionan la carta.
export function templatedMaieReply({ project, inquiry, now = new Date() } = {}) {
  const tasks = project?.tasks || [];
  const buckets = project?.buckets || [];
  const card = inquiry?.cardId ? tasks.find((t) => t.id === inquiry.cardId) || null : null;
  const title = cardTitleOf(card);
  const kind = inquiry?.kind;

  if (kind === INQUIRY_KINDS.THIN) {
    return `Si alguien toma «${title}» sin leer una descripción, lo primero que no sabría es qué implica. ¿Le dedicás dos líneas para anotar el alcance?`;
  }

  if (kind === INQUIRY_KINDS.UNASSIGNED) {
    const column = columnNameOf(card, buckets) || 'la columna';
    return `«${title}» sigue en «${column}» sin dueño. ¿Te quedás vos con el siguiente movimiento, o preferís dejarlo anotado?`;
  }

  const since = card ? Math.max(0, -daysUntil(now, card.lastActivityAt || card.updatedAt || card.createdAt)) : null;
  if (kind === INQUIRY_KINDS.STALE) {
    const when = since === null ? 'varios días' : `${since} días`;
    return `«${title}» lleva ${when} sin moverse. ¿Sigue siendo parte del plan o quedó como recuerdo?`;
  }

  if (kind === INQUIRY_KINDS.MISSING_DATE) {
    const windowDays = project?.settings?.milestoneWindowDays ?? MAIE_DEFAULTS.milestoneWindowDays;
    const milestone = tasks
      .filter((t) => t.milestone && !isCompleted(t) && t.endDate)
      .map((t) => ({ task: t, days: daysUntil(now, t.endDate) }))
      .filter((m) => m.days !== null && m.days >= 0 && m.days <= windowDays)
      .sort((a, b) => a.days - b.days)[0];
    const hito = milestone ? `«${cardTitleOf(milestone.task)}» está a ${milestone.days} días` : 'hay un hito cerca';
    return `«${title}» no tiene fechas y ${hito}. ¿Qué se puede comprometer esta semana?`;
  }

  if (kind === INQUIRY_KINDS.OVERLAP) {
    return `«${title}» aparece en barras que se pisan esta semana. ¿Cuál es la prioridad real y quién la sostiene?`;
  }

  return `Buen momento para mirarlo. ¿Qué es lo primero que habría que destrabar en «${title}»?`;
}

// Valida acciones del LLM contra ids reales del proyecto y descarta lo que no
// corresponde (nunca aplicar algo que no exista).
export function sanitizeActions({ project, actions } = {}) {
  const taskIds = new Set((project?.tasks || []).map((t) => t.id));
  const memberIds = new Set((project?.members || []).map((m) => m.id));
  const bucketIds = new Set((project?.buckets || []).map((b) => b.id));

  return (actions || []).filter((a) => {
    if (!a || typeof a !== 'object') return false;
    if (!MAIE_ACTION_TYPES.includes(a.type)) return false;
    const p = a.payload || {};
    switch (a.type) {
      case 'assign':
        if (!memberIds.has(p.memberId)) return false;
        if (p.taskId && !taskIds.has(p.taskId)) return false;
        break;
      case 'move':
        if (!bucketIds.has(p.bucketId)) return false;
        if (p.taskId && !taskIds.has(p.taskId)) return false;
        break;
      case 'set-dates':
        if (p.taskId && !taskIds.has(p.taskId)) return false;
        if (!p.startDate || !p.endDate || String(p.startDate) > String(p.endDate)) return false;
        break;
      case 'set-description':
        if (p.taskId && !taskIds.has(p.taskId)) return false;
        if (!String(p.text || '').trim()) return false;
        break;
      case 'set-blocked':
        if (p.taskId && !taskIds.has(p.taskId)) return false;
        break;
      case 'add-comment':
        if (p.taskId && !taskIds.has(p.taskId)) return false;
        if (!String(p.text || '').trim()) return false;
        break;
      case 'create-card':
        if (!bucketIds.has(p.bucketId)) return false;
        if (!String(p.title || '').trim()) return false;
        break;
      default:
        return false;
    }
    return true;
  });
}

function memberName(members, id) {
  return (members || []).find((m) => m.id === id)?.name || id;
}

function bucketName(buckets, id) {
  return (buckets || []).find((b) => b.id === id)?.name || id;
}

function taskTitle(tasks, id) {
  const t = (tasks || []).find((x) => x.id === id);
  return t ? cardTitleOf(t) : 'la carta';
}

// Traduce acciones validadas a propuestas con la misma forma que proposalEngine:
// id, inquiryId, action, label, payload, needsInput, status, comment.
export function actionsToProposals({ project, inquiry, actions } = {}) {
  const valid = sanitizeActions({ project, actions });
  const members = project?.members || [];
  const buckets = project?.buckets || [];
  const tasks = project?.tasks || [];

  return valid.map((a) => {
    const p = a.payload || {};
    let label = '';
    let comment = '';
    switch (a.type) {
      case 'assign': {
        const name = memberName(members, p.memberId);
        label = `Asignar «${taskTitle(tasks, p.taskId)}» a ${name}`;
        comment = `Luego de lo charlado en el hilo, la carta quedó en manos de ${name}.`;
        break;
      }
      case 'move': {
        const name = bucketName(buckets, p.bucketId);
        label = `Mover «${taskTitle(tasks, p.taskId)}» a «${name}»`;
        comment = `Tras lo conversado, la carta quedó en «${name}».`;
        break;
      }
      case 'set-dates':
        label = `Fechar «${taskTitle(tasks, p.taskId)}» de ${p.startDate} a ${p.endDate}`;
        comment = 'Según lo que se acordó en el hilo, la carta quedó fechada.';
        break;
      case 'set-description':
        label = `Completar descripción de «${taskTitle(tasks, p.taskId)}»`;
        comment = 'La descripción se completó desde el hilo.';
        break;
      case 'set-blocked':
        label = `Marcar «${taskTitle(tasks, p.taskId)}» como bloqueada`;
        comment = 'Por lo que se dijo en el hilo, la carta quedó marcada como bloqueada.';
        break;
      case 'add-comment':
        label = `Dejar nota en «${taskTitle(tasks, p.taskId)}»`;
        comment = 'Dejé una nota en la carta desde el hilo.';
        break;
      case 'create-card': {
        const name = bucketName(buckets, p.bucketId);
        label = `Crear «${String(p.title).trim()}» en «${name}»`;
        comment = `La carta «${String(p.title).trim()}» quedó anotada en «${name}».`;
        break;
      }
      default:
        return null;
    }
    return {
      id: uuidv4(),
      inquiryId: inquiry?.id || null,
      action: a.type,
      label,
      payload: { taskId: inquiry?.cardId || null, ...p },
      needsInput: false,
      status: 'pending',
      comment,
    };
  }).filter(Boolean);
}

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

function templatedResponse({ project, inquiry, now }) {
  return {
    reply: templatedMaieReply({ project, inquiry, now }),
    actions: [],
    source: 'templated',
  };
}

// Pide la respuesta a Maie. Offline/drive: fallback templated directo. Server:
// POST al relay `/api/maie/chat`; un solo reintento (§11 cap); cualquier
// fallo → fallback templated. Nunca lanza.
export async function requestMaieChat({
  project,
  inquiry,
  userText,
  now = new Date(),
  timeoutMs = 15000,
} = {}) {
  if (!project || !inquiry || !String(userText || '').trim()) {
    return templatedResponse({ project, inquiry, now });
  }

  if (!isServerMode()) {
    return templatedResponse({ project, inquiry, now });
  }

  const body = {
    kind: inquiry.kind,
    mode: project?.settings?.applyMode ?? 'confirm',
    boardContext: buildBoardContext({ project, inquiry, now }),
    userText: String(userText).trim().slice(0, MAX_USER_TEXT_CHARS),
    threadTail: (inquiry.thread || [])
      .slice(-MAX_THREAD_TURNS)
      .map((m) => (typeof m === 'string' ? m : `${m.role || 'maie'}: ${m.text || ''}`)),
  };

  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    try {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/maie/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        },
        timeoutMs,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.reply === 'string' && data.reply.trim()) {
          return {
            reply: data.reply,
            actions: Array.isArray(data.actions) ? data.actions : [],
            source: 'llm',
          };
        }
      }
    } catch {
      // reintento es un solo intento más
    }
  }
  return templatedResponse({ project, inquiry, now });
}

export const maieChat = {
  MAIE_ACTION_TYPES,
  buildBoardContext,
  templatedMaieReply,
  sanitizeActions,
  actionsToProposals,
  requestMaieChat,
};