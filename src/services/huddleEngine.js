// Huddle in-app (§10) y standup demo que muta el tablero (§17.5). Puro y sin
// contexto: toda la máquina de sesión vive en `project.huddle` (§12/§18, por
// proyecto) y el playback avanza paso a paso con `now` inyectable. En modo auto
// las acciones del guion se aplican vía applyEngine (comentario en la carta +
// actionLog = el rescan del tablero reacciona solo); en confirmar quedan como
// propuestas sí/no. Las cartas mencionadas se iluminan en Kanban/Gantt.
// La línea de texto del usuario se interpreta con el mismo path LLM del slice 6
// (requestMaiaChat) y cae a un fallback socrático templated si no hay key.

import { v4 as uuidv4 } from 'uuid';
import { requestMaiaChat, actionsToProposals, MAIA_ACTION_TYPES } from './maiaChat';
import { apply as applyAction } from './applyEngine';
import { PROPOSAL_STATUS } from '../constants/maia';
import { TASK_STATUS } from '../constants/project';
import { renderPrompt, sectionText } from '../utils/renderPrompt';
import welcomeMd from '@maia/huddle/welcome.md?raw';
import replyMd from '@maia/huddle/reply.md?raw';
import demoMd from '@maia/huddle/demo.md?raw';
import recapMd from '@maia/huddle/recap.md?raw';

// Fallback por si un ritual no tiene sección en welcome.md (nunca crashear).
const WELCOME_DEFAULT =
  'Hoy es el standup de la semana. Reproduzco la ronda del equipo seed y, si algo pide decisión, queda listo para aprobar. Atenti a las cartas que se iluminan.';

// Velocidad del autoplay del standup demo (§17.5).
export const DEMO_STEP_MS = 2200;

export const DEMO_STATUS = {
  PLAYING: 'playing',
  PAUSED: 'paused',
  DONE: 'done',
};

const SPEAKERS = [
  { id: 'u_diego', fallback: 'Diego Palacios' },
  { id: 'u_martin', fallback: 'Martín Vega' },
  { id: 'u_sofia', fallback: 'Sofía Chen' },
  { id: 'u_ana', fallback: 'Ana Soler' },
];

function iso(now) {
  return new Date(now).toISOString().slice(0, 10);
}

function isCompleted(task) {
  return Boolean(task) && task.status === TASK_STATUS.COMPLETED;
}

function memberName(project, id, fallback) {
  return (project?.members || []).find((m) => m.id === id)?.name || fallback || id;
}

// Busca la carta del guion por id de seed y, si no la encuentra (proyecto
// propio), por título. Sin match → null (el paso sale como línea sin mutación).
function findCard(project, seedId, title) {
  const tasks = project?.tasks || [];
  return (
    tasks.find((t) => t.id === seedId) ||
    tasks.find((t) => String(t.name || '').trim().toLowerCase() === String(title || '').trim().toLowerCase()) ||
    null
  );
}

function nearestMilestone(project, now) {
  const start = new Date(now).toISOString().slice(0, 10);
  const candidates = (project?.tasks || [])
    .filter((t) => t.milestone && !isCompleted(t) && t.endDate && String(t.endDate) >= start)
    .map((t) => ({ task: t, days: Math.round((Date.parse(t.endDate) - Date.parse(start)) / 86400000) }))
    .sort((a, b) => a.days - b.days || a.task.id.localeCompare(b.task.id));
  return candidates[0] || null;
}

export function welcomeFor(ritual) {
  const byRitual = sectionText(welcomeMd, ritual) || sectionText(welcomeMd, 'standup');
  return byRitual || WELCOME_DEFAULT;
}

function makeLine({ role, speaker, text, cardIds = [], at, id }) {
  return {
    id: id || uuidv4(),
    role, // 'maia' | 'member' | 'user'
    speaker: speaker || 'Maia',
    text,
    cardIds: cardIds.filter(Boolean),
    at,
  };
}

function dedupe(list) {
  return Array.from(new Set(list || []));
}

// Pasos del guion de standup (§10, orden y acciones del equipo seed). Cada paso
// es un descriptor; la propuesta/acción se resuelve contra el tablero vivo en
// `applyDemoStep`. `question` evita aplicar: Maia pregunta y la carta se ilumina.
// El copy de cada paso vive en `maia/huddle/demo.md` (config a nivel app); acá
// quedan los ids, speakers, acciones y el cálculo de {vars} contra el tablero.
export function buildStandupSteps(project, now) {
  const webhook = findCard(project, 'card_webhook', 'Webhook de pagos');
  const magicLink = findCard(project, 'card_magic_link', 'Auth magic link');
  const onboarding = findCard(project, 'card_onboarding', 'Rediseñar onboarding');
  const qaStaging = findCard(project, 'card_qa_staging', 'QA staging release');
  const milestone = nearestMilestone(project, now);
  const webhookName = webhook?.name || 'Webhook de pagos';
  const magicLinkName = magicLink?.name || 'Auth magic link';
  const onboardingName = onboarding?.name || 'Rediseñar onboarding';
  const qaStagingName = qaStaging?.name || 'QA staging release';

  return [
    {
      id: 'webhook-blocker',
      speakerId: 'u_diego',
      cardId: webhook?.id || null,
      text: renderPrompt(sectionText(demoMd, 'webhook-blocker'), { webhook: webhookName }),
      action:
        webhook && !webhook.blocked && !isCompleted(webhook)
          ? { type: 'set-blocked', payload: { taskId: webhook.id, blocked: true, blockedReason: 'Certificados pendientes del proveedor de pagos.' } }
          : null,
    },
    {
      id: 'magic-link-owner',
      speakerId: 'u_martin',
      cardId: magicLink?.id || null,
      text: renderPrompt(sectionText(demoMd, 'magic-link-owner'), { magicLink: magicLinkName }),
      action:
        magicLink &&
        !isCompleted(magicLink) &&
        !(magicLink.assignedUsers || []).some((u) => u && u.id === 'u_martin')
          ? { type: 'assign', payload: { taskId: magicLink.id, memberId: 'u_martin' } }
          : null,
    },
    {
      id: 'onboarding-stale',
      speakerId: 'u_sofia',
      cardId: onboarding?.id || null,
      text: renderPrompt(sectionText(demoMd, 'onboarding-stale'), { onboarding: onboardingName }),
      question: renderPrompt(sectionText(demoMd, 'onboarding-stale-pregunta'), { onboarding: onboardingName }),
      action: null,
    },
    {
      id: 'qa-staging-dates',
      speakerId: 'u_ana',
      cardId: qaStaging?.id || null,
      text: milestone
        ? renderPrompt(sectionText(demoMd, 'qa-staging-dates-con-hito'), {
            qa: qaStagingName,
            milestone: milestone.task.name,
            milestoneDays: milestone.days,
            milestonePlural: milestone.days === 1 ? '' : 's',
          })
        : renderPrompt(sectionText(demoMd, 'qa-staging-dates-sin-hito'), { qa: qaStagingName }),
      action:
        qaStaging &&
        !isCompleted(qaStaging) &&
        !qaStaging.startDate &&
        milestone
          ? { type: 'set-dates', payload: { taskId: qaStaging.id, startDate: iso(now), endDate: milestone.task.endDate } }
          : null,
    },
  ];
}

// Armador de propuesta en la forma de proposalEngine (§12 ProposedAction).
// La etiqueta se resuelve contra el tablero vivo (título de la carta, nombre del
// dueño, hito) para que el sí/no del transcript sea legible.
function proposalFromAction(cardId, action, project) {
  const payload = { taskId: cardId, ...(action.payload || {}) };
  const task = (project?.tasks || []).find((t) => t.id === cardId);
  const title = task?.name || 'la carta';
  let label = '';
  let comment = '';
  switch (action.type) {
    case 'set-blocked':
      label = `Marcar «${title}» como bloqueada`;
      comment = action.payload?.blockedReason
        ? `Por lo que se dijo en el standup, la carta quedó marcada como bloqueada: ${action.payload.blockedReason}`
        : `Por lo que se dijo en el standup, «${title}» quedó marcada como bloqueada.`;
      break;
    case 'assign': {
      const member = (project?.members || []).find((m) => m.id === action.payload?.memberId);
      const name = member?.name || memberId(action.payload?.memberId);
      label = `Asignar «${title}» a ${name}`;
      comment = `En el standup, «${title}» quedó en manos de ${name}.`;
      break;
    }
    case 'set-dates':
      label = `Fechar «${title}» de ${payload.startDate} a ${payload.endDate}`;
      comment = `En el standup, «${title}» quedó fechada de ${payload.startDate} a ${payload.endDate}.`;
      break;
    default:
      label = `Aplicar acción en «${title}»`;
      comment = 'Según lo que se acordó en el standup, la carta quedó actualizada.';
  }
  return {
    id: uuidv4(),
    inquiryId: null,
    action: action.type,
    label,
    payload,
    needsInput: false,
    status: PROPOSAL_STATUS.PENDING,
    comment,
  };
}

function memberId(id) {
  return id || '';
}

// Crea la sesión de huddle de un proyecto (§18: una por proyecto).
export function createHuddleSession({ project, ritual, mode, now = new Date(), userId } = {}) {
  const membersIds = SPEAKERS.map((s) => s.id).filter((id) =>
    (project?.members || []).some((m) => m.id === id),
  );
  const joined = dedupe([userId, ...membersIds].filter(Boolean));
  const at = new Date(now).toISOString();
  const session = {
    id: uuidv4(),
    projectId: project?.id || null,
    ritual: ritual || 'standup',
    mode: mode || project?.settings?.applyMode || 'confirm',
    startedAt: at,
    endedAt: null,
    joinedIds: joined,
    transcript: [makeLine({ role: 'maia', speaker: 'Maia', text: welcomeFor(ritual), at })],
    pending: [],
    highlights: [],
    touchedIds: [],
  };
  if (ritual === 'standup') {
    session.demo = {
      steps: buildStandupSteps(project, now),
      cursor: 0,
      status: DEMO_STATUS.PLAYING,
      appliedCount: 0,
    };
  }
  return session;
}

export function addLine(session, { role, speaker, text, cardIds = [], at = new Date().toISOString(), id } = {}) {
  if (!session) return session;
  const line = makeLine({ role, speaker, text, cardIds, at, id });
  return {
    ...session,
    transcript: [...(session.transcript || []), line],
    highlights: dedupe([...(session.highlights || []), ...line.cardIds]),
  };
}

function confirmText(proposal) {
  return `Propuesta en pantalla: ${proposal.label}. ¿Sí o no?`;
}

// Avanza un paso del demo (§10/§17.5). `mode` es el applyMode del tablero AL
// MOMENTO de cada paso (auto → aplica y registra; confirm → propuesta sí/no).
export function applyDemoStep({ project, session, now = new Date() } = {}) {
  const demo = session?.demo;
  if (!demo) {
    return { project, session, done: false, applied: false };
  }
  if (demo.status !== DEMO_STATUS.PLAYING) {
    return { project, session, done: demo.status === DEMO_STATUS.DONE, applied: false };
  }

  const at = new Date(now).toISOString();
  const steps = demo.steps || [];
  const step = steps[demo.cursor];
  if (!step) {
    const finished = finishPlayback({ session, now });
    return { project: { ...project, huddle: finished }, session: finished, done: true, applied: false };
  }

  const mode = project?.settings?.applyMode ?? 'confirm';
  const speakerName = memberName(project, step.speakerId, SPEAKERS.find((s) => s.id === step.speakerId)?.fallback);
  const cardIds = step.cardId ? [step.cardId] : [];

  let nextSession = addLine(session, {
    role: 'member',
    speaker: speakerName,
    text: step.text,
    cardIds,
    at,
  });

  let nextProject = project;
  let applied = false;

  if (step.question) {
    nextSession = addLine(nextSession, {
      role: 'maia',
      speaker: 'Maia',
      text: step.question,
      cardIds,
      at,
    });
  } else if (step.action) {
    const proposal = proposalFromAction(step.cardId, step.action, project);
    if (mode === 'auto') {
      const { project: np } = applyAction(nextProject, proposal, { source: 'auto', now });
      nextProject = np;
      nextSession = {
        ...nextSession,
        touchedIds: dedupe([...(nextSession.touchedIds || []), step.cardId]),
        highlights: dedupe([...(nextSession.highlights || []), step.cardId]),
        demo: {
          ...nextSession.demo,
          appliedCount: (nextSession.demo?.appliedCount || 0) + 1,
        },
      };
      nextSession = addLine(nextSession, {
        role: 'maia',
        speaker: 'Maia',
        text: `Listo, quedó aplicado: ${proposal.label}. En la carta quedó un comentario y en el registro una entrada.`,
        cardIds,
        at,
      });
      applied = true;
    } else {
      nextSession = addLine(nextSession, {
        role: 'maia',
        speaker: 'Maia',
        text: confirmText(proposal),
        cardIds,
        at,
      });
      nextSession = {
        ...nextSession,
        pending: [...(nextSession.pending || []), proposal],
      };
    }
  }

  const cursor = (demo.cursor || 0) + 1;
  const isLast = cursor >= steps.length;
  const status = isLast ? DEMO_STATUS.DONE : DEMO_STATUS.PLAYING;
  nextSession = {
    ...nextSession,
    demo: {
      ...(nextSession.demo || demo),
      steps,
      cursor,
      status,
    },
  };

  if (isLast) {
    nextSession = finishPlayback({ session: nextSession, now });
  }

  return {
    project: { ...nextProject, huddle: nextSession },
    session: nextSession,
    done: isLast,
    applied,
  };
}

// Recap al cerrar/terminar: decisiones aplicadas, propuestas sin confirmar y
// cartas mencionadas sin tocar (§10 "¿Qué queda sin dueño?"). Las frases
// numéricas son cálculo (plurales); el cierre vive en `maia/huddle/recap.md`.
export function recapText(session) {
  const pendingCount = (session.pending || []).filter((p) => p.status === PROPOSAL_STATUS.PENDING).length;
  const applied = session.demo?.appliedCount || 0;
  const touched = new Set(session.touchedIds || []);
  const mentionedUntouched = (session.highlights || []).filter((id) => !touched.has(id));
  const parts = [];
  if (applied > 0) {
    parts.push(`${applied} ${applied === 1 ? 'decisión se aplicó' : 'decisiones se aplicaron'} al tablero.`);
  }
  if (pendingCount > 0) {
    parts.push(`${pendingCount} propuesta${pendingCount > 1 ? 's' : ''} ${pendingCount === 1 ? 'quedó' : 'quedaron'} sin confirmar.`);
  }
  if (mentionedUntouched.length > 0) {
    parts.push(`Cartas mencionadas y sin tocar: ${mentionedUntouched.length}.`);
  }
  parts.push(renderPrompt(sectionText(recapMd, 'final'), {}));
  return parts.join(' ');
}

export function finishPlayback({ session, now = new Date() } = {}) {
  if (!session || !session.demo) return session;
  const at = new Date(now).toISOString();
  return addLine(
    {
      ...session,
      demo: { ...session.demo, status: DEMO_STATUS.DONE },
    },
    { role: 'maia', speaker: 'Maia', text: recapText(session), at },
  );
}

export function stopSession({ session, now = new Date() } = {}) {
  if (!session || session.endedAt) return session;
  const at = new Date(now).toISOString();
  const alreadyDone = session.demo?.status === DEMO_STATUS.DONE;
  const next = alreadyDone ? session : finishPlayback({ session, now });
  return { ...next, endedAt: at };
}

// Interpreta una línea del usuario como endpoint de huddle (§10 via 2, §11):
// mismo path LLM del chat (contexto acotado, caps) con fallback templated.
export async function interpretHuddleLine({ project, session, userText, now = new Date() } = {}) {
  const text = String(userText || '').trim();
  if (!text || !project) {
    return { reply: '', proposals: [] };
  }
  // El historial se pasa como entradas { role, text } (requestMaiaChat las
  // formatea), para que el modelo reciba el hilo real y no "undefined: …".
  const threadTail = (session?.transcript || [])
    .filter((m) => m.role === 'user' || m.role === 'member' || m.role === 'maia')
    .slice(-6)
    .map((m) => ({
      role: m.role === 'user' || m.role === 'member' ? 'user' : 'maia',
      text: m.role === 'maia' ? m.text : `${m.speaker}: ${m.text}`,
    }));
  const inquiry = { id: null, kind: 'huddle', cardId: null, thread: threadTail };
  const res = await requestMaiaChat({ project, inquiry, userText: text, now });
  const proposals = actionsToProposals({ project, inquiry, actions: res.actions });
  if (res.source === 'llm') {
    return { reply: res.reply, proposals };
  }
  return { reply: templatedHuddleReply(text, { project, session }), proposals: [] };
}

// Fallback socrático sin LLM: si la línea menciona una carta del tablero la
// reconoce (sigue el hilo); si no, la pregunta genérica de siempre. El copy
// vive en `maia/huddle/reply.md`; la lista de gaps (sin dueño/sin fechas/
// bloqueada) se usa también en tests y matching, por eso queda en código.
export function templatedHuddleReply(userText, { project } = {}) {
  const text = String(userText || '').trim();
  const short = text.slice(0, 60);
  const mentioned = (project?.tasks || []).find((t) => {
    const name = String(t.name || '').trim().toLowerCase();
    return name && text.toLowerCase().includes(name);
  });
  if (mentioned) {
    const gaps = [];
    if (!(mentioned.assignedUsers || []).length) gaps.push('sin dueño');
    if (!mentioned.startDate || !mentioned.endDate) gaps.push('sin fechas');
    if (mentioned.blocked) gaps.push('bloqueada');
    const detail = gaps.length ? ` la noto ${gaps.join(', ')}` : '';
    return renderPrompt(sectionText(replyMd, 'contextual'), { card: mentioned.name, gaps: detail });
  }
  return renderPrompt(sectionText(replyMd, 'generica'), { line: short || 'la línea' });
}

export const huddleEngine = {
  DEMO_STEP_MS,
  DEMO_STATUS,
  createHuddleSession,
  addLine,
  applyDemoStep,
  stopSession,
  recapText,
  buildStandupSteps,
  interpretHuddleLine,
  templatedHuddleReply,
  welcomeFor,
  MAIA_ACTION_TYPES,
};