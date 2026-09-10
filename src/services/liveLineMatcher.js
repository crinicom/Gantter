// Matcher determinístico de líneas de voz del huddle (§10, Web Speech). Puro y
// sin contexto: mapea una línea hablada de Lucía a acciones del mismo shape que
// el guion del demo (huddleEngine), ancladas por el número de carta (#N, slice
// 10) o por título exacto, y por el nombre del miembro. Cero tokens de LLM.
//
// Confianza:
//  - high: carta resuelta (N o título único) + verbo claro (asignar/bloquear/
//    fechar). En modo auto se aplica sola; en confirmar queda como propuesta.
//  - low: sin señal accionable (o intento de crear una carta, que nunca se
//    deriva de una línea hablada). Maia responde con pregunta templated.
//
// create-card no se emite acá por diseño: derivar bucketId/título de una frase
// hablada sería inventar ($). El LLM del chat y las propuestas del scanner son
// los únicos caminos que crean cartas.

// Referencia numérica de carta: `#12`, `la 12`, `la carta 12`, `el item 12`.
const NUM_REF = /(?:#\s*|(?:la|el|la carta|la tarea|el item|el ítem)\s*(?:número\s*)?)(\d{1,3})\b/i;

// Primera persona: la que habla (Lucía, usuario activo v1).
const ASSIGN_SELF =
  /\b(me quedo|me encargo|me hago cargo|lo tomo|lo agarro|la tomo|la agarro|asumo|lo hago yo)\b/i;

// Derivar responsable por nombre mencionado.
const ASSIGN_OTHER =
  /\b(asign(ar|ás|amos|ale|o|a)|(que )?(lo|la) (tome|toma|agarre|agarra|haga|hace)|en (manos|cabeza) de)\b/i;

const SET_BLOCKED = /\b(se bloque|bloque(ó|o|ada|ado|a)|queda(ó| bloqueada)|está (bloqueada|bloqueado))\b/i;

const SET_DATES = /\b(fech(a|amos|amosla|ámosla|ar|aron|amos)|le (sacamos|sacámos|ponemos|ponémos) fecha|sacámosle|tiene fecha)\b/i;

// "Creemos una carta para X" / "agendemos en backlog" — nunca se aplica solo.
const CREATE_CARD = /\b(cre(emos|ar|aría|áramos) (una|una carta|otra)|nueva carta|agend(emos|ar) en)\b/i;

function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function uniq(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

// Resuelve la carta mencionada: por número (#N) si no, por título exacto único.
// Devuelve `{ card, strong, ambiguous }`.
function resolveCard(line, tasks) {
  const byNumber = NUM_REF.exec(line);
  if (byNumber) {
    const n = parseInt(byNumber[1], 10);
    const hits = (tasks || []).filter((t) => Number.isInteger(t.number) && t.number === n);
    if (hits.length === 1) return { card: hits[0], strong: true, ambiguous: false };
    return { card: null, strong: false, ambiguous: hits.length > 1 };
  }
  const lower = line.toLowerCase();
  const hits = (tasks || []).filter((t) => {
    const name = String(t?.name || '').trim().toLowerCase();
    return name.length >= 3 && lower.includes(name);
  });
  if (hits.length === 1) return { card: hits[0], strong: true, ambiguous: false };
  return { card: null, strong: false, ambiguous: hits.length > 1 };
}

// Resuelve el miembro mencionado por nombre (completo o primer nombre).
function resolveMember(line, members) {
  const lower = line.toLowerCase();
  const hits = (members || []).filter((m) => {
    const full = String(m?.name || '').trim().toLowerCase();
    const first = full.split(/\s+/)[0] || '';
    return (
      (full.length >= 3 && lower.includes(full)) ||
      (first.length >= 3 && lower.includes(first))
    );
  });
  if (hits.length === 1) return { member: hits[0], ambiguous: false };
  return { member: null, ambiguous: hits.length > 1 };
}

// Interpreta una línea hablada. `self` es el usuario activo que habla (Lucía).
export function matchLiveLine(text, { tasks = [], members = [], self = null, now = new Date() } = {}) {
  const line = String(text || '').trim();
  const result = { cardIds: [], actions: [], confidence: 'low', note: '' };
  if (!line) return result;

  const { card, ambiguous: cardAmbiguous } = resolveCard(line, tasks);
  const { member, ambiguous: memberAmbiguous } = resolveMember(line, members);

  if (card) result.cardIds = [card.id];
  if (cardAmbiguous) {
    result.note = 'varias cartas encajan: usá el número #N';
    return result;
  }

  const isSelfAssign = ASSIGN_SELF.test(line);
  const isOtherAssign = ASSIGN_OTHER.test(line);
  const isBlock = SET_BLOCKED.test(line);
  const isDates = SET_DATES.test(line);
  const isCreate = CREATE_CARD.test(line);

  // Asignar a la que habla (Lucía) si la línea es en primera persona.
  if (card && isSelfAssign && self?.id) {
    result.actions.push({ type: 'assign', payload: { taskId: card.id, memberId: self.id } });
    result.confidence = 'high';
    return result;
  }

  // Asignar al miembro nombrado.
  if (card && member && !memberAmbiguous && isOtherAssign) {
    result.actions.push({ type: 'assign', payload: { taskId: card.id, memberId: member.id } });
    result.confidence = 'high';
    return result;
  }

  // Bloquear.
  if (card && isBlock) {
    result.actions.push({
      type: 'set-blocked',
      payload: {
        taskId: card.id,
        blocked: true,
        blockedReason: line.slice(0, 140),
      },
    });
    result.confidence = 'high';
    return result;
  }

  // Fechar: hoy a hoy (no se inventan fechas; entra al Gantt).
  if (card && isDates) {
    const today = isoDay(now);
    result.actions.push({
      type: 'set-dates',
      payload: { taskId: card.id, startDate: today, endDate: today },
    });
    result.confidence = 'high';
    return result;
  }

  // Crear carta nunca sale del mic (§9): se decide desde el tablero o el chat.
  if (isCreate) {
    result.note = 'crear una carta se decide desde el tablero o el chat';
    result.confidence = 'low';
    return result;
  }

  result.note = card ? 'sin verbo claro' : member ? 'sin carta mencionada' : 'sin ancla';
  return result;
}

export const liveLineMatcher = { matchLiveLine };