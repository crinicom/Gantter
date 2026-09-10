// Contexto de Maia (§7–9). Escucha el tablero: cada cambio de `project.version`
// dispara un rescan determinístico (services/inquiryEngine). El scanner genera
// inquiries (con sus propuestas por defecto de proposalEngine), auto-resuelve
// las vencidas y deja rastro en el actionLog. En modo auto (§9) el rescan
// aplica las propuestas "obvias" (asignar, fechar, bloquear) dejando comentario
// en la carta + log. Maia NO escribe en ProjectContext por otro camino que
// `mutateProject`; su lógica vive acá y en services/inquiryEngine|proposalEngine|
// applyEngine.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProject } from '../hooks/useProject';
import { useAuth } from '../hooks/useAuth';
import { scanInquiries } from '../services/inquiryEngine';
import { autoEligible } from '../services/proposalEngine';
import { canApply, apply as applyAction, selectAutoActions } from '../services/applyEngine';
import { requestMaiaChat, actionsToProposals } from '../services/maiaChat';
import {
  createHuddleSession,
  applyDemoStep,
  stopSession,
  addLine as huddleLine,
  interpretHuddleLine,
  proposalFromAction,
  templatedHuddleReply,
  DEMO_STEP_MS,
  DEMO_STATUS,
} from '../services/huddleEngine';
import { matchLiveLine } from '../services/liveLineMatcher';
import { isDeclineMessage } from '../utils/declineMessage';
import { INQUIRY_STATUS, PROPOSAL_STATUS, MAIA_DEFAULTS } from '../constants/maia';
import { ACTIVE_USER } from '../constants/project';

const MaiaContext = createContext(null);

// Set vacío estable para consumidores sin provider (TaskCard/GanttBar
// resaltan cartas mencionadas en el huddle §10, pero nunca crashean).
const EMPTY_HIGHLIGHTS = new Set();

export function useHuddleHighlights() {
  const ctx = useContext(MaiaContext);
  return ctx?.highlightedTaskIds || EMPTY_HIGHLIGHTS;
}

// Campos que definen un inquiry a efectos de estabilidad del set.
const STABLE_FIELDS = ['id', 'kind', 'cardId', 'status', 'question', 'evidence', 'resolvedNote'];

function stableOf(inquiry) {
  return JSON.stringify(
    STABLE_FIELDS.map((f) => inquiry?.[f]),
  );
}

function sameSet(a, b) {
  return (
    a.length === b.length &&
    a.every((inq, i) => stableOf(inq) === stableOf(b[i]))
  );
}

function dedupe(list) {
  return Array.from(new Set(list || []));
}

// Concatena entradas de log deduplicando por (summary, cardId).
function dedupeLog(base, extra) {
  const seen = new Set(base.map((e) => `${e.summary}|${e.cardId || ''}`));
  return base.concat(
    (extra || []).filter((e) => {
      const k = `${e.summary}|${e.cardId || ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
  );
}

// Próximo standup sintético (slice 6/7 lo conecta al huddle real): miércoles
// 10:00 local, o la semana siguiente si hoy ya pasó.
function nextStandupAt(now = new Date()) {
  const target = new Date(now);
  const diff = (3 - target.getDay() + 7) % 7 || 7;
  target.setDate(target.getDate() + diff);
  target.setHours(10, 0, 0, 0);
  return target.toISOString();
}

export function MaiaProvider({ children }) {
  const { project, mutateProject, setSettings } = useProject();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [actionLog, setActionLog] = useState([]);
  const [lastScanAt, setLastScanAt] = useState(null);
  const [maiaReplying, setMaiaReplying] = useState(false);

  // El documento es la fuente de verdad; para el flujo async de chat
  // necesitamos el proyecto más fresco aunque la promesa tarde (§11).
  const projectRef = useRef(project);
  projectRef.current = project;

  // Reset / rescan por proyecto. El documento es la fuente de verdad (§12): el
  // escaneo parte de `project.inquiries` persistido, no de un espejo local, para
  // que mensajes del hilo y estados de propuestas decididos por el usuario nunca
  // queden invisibles ni sean pisados por el rescan. Escribe solo si cambió
  // (anti-loop). El modo auto (§9) está gateado por `applyMode`: en "confirmar"
  // Maia no muta el tablero sola.
  useEffect(() => {
    if (!project) {
      setInquiries([]);
      setActionLog([]);
      setLastScanAt(null);
      return;
    }

    const docInquiries = project.inquiries || [];
    const docLog = project.actionLog || [];
    const result = scanInquiries(project, { existingInquiries: docInquiries });
    const isAuto = (project?.settings?.applyMode ?? 'confirm') === 'auto';
    const autoActions = isAuto
      ? selectAutoActions(project, result.inquiries, { canAutoApply: autoEligible })
      : [];
    const tick = new Date().toISOString();

    let acc = project;
    const applied = [];
    const logTail = [];
    for (const { inquiry, proposal } of autoActions) {
      if (!canApply(acc, proposal)) continue;
      const { project: np, logEntry } = applyAction(acc, proposal, { source: 'auto' });
      acc = np;
      logTail.push(logEntry);
      applied.push({ inquiryId: inquiry.id, proposalId: proposal.id });
    }

    const nextLog = dedupeLog(docLog, dedupeLog(result.logEntries, logTail));
    const nextInquiries =
      applied.length === 0
        ? result.inquiries
        : result.inquiries.map((inq) => {
            const hit = applied.find((x) => x.inquiryId === inq.id);
            if (!hit) return inq;
            return {
              ...inq,
              proposals: (inq.proposals || []).map((p) =>
                p.id === hit.proposalId ? { ...p, status: PROPOSAL_STATUS.APPLIED } : p,
              ),
              updatedAt: tick,
            };
          });

    setInquiries(nextInquiries);
    setActionLog(nextLog);
    setLastScanAt(tick);

    const changed =
      applied.length > 0 ||
      nextLog.length !== docLog.length ||
      !sameSet(nextInquiries, docInquiries);

    if (!changed) return;
    mutateProject(
      () => ({ ...acc, inquiries: nextInquiries, actionLog: nextLog }),
      { debounce: 0 },
    );
  }, [project, mutateProject]);

  const applyMode = project?.settings?.applyMode ?? 'confirm';
  const staleDays = project?.settings?.staleDays ?? MAIA_DEFAULTS.staleDays;

  const activeUser = user || ACTIVE_USER;

  // Huddle (§10/§17.5): la sesión vive en `project.huddle` (§12/§18, una por
  // proyecto). El playback del standup avanza con un timer que se re-arma solo
  // cuando avanza el cursor o cambia el estado del demo; el rescan del tablero
  // reacciona a cada mutación que aplica el guion.
  const huddle = project?.huddle || null;
  const demoStatus = huddle?.demo?.status || null;

  useEffect(() => {
    const session = projectRef.current?.huddle;
    if (!session || session.endedAt || session.demo?.status !== DEMO_STATUS.PLAYING) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const base = projectRef.current;
      const s = base?.huddle;
      if (!s || s.demo?.status !== DEMO_STATUS.PLAYING) return;
      const out = applyDemoStep({ project: base, session: s, now: new Date() });
      mutateProject(() => out.project, { debounce: 0 });
    }, DEMO_STEP_MS);
    return () => clearTimeout(timer);
  }, [project?.id, demoStatus, huddle?.demo?.cursor, mutateProject]);

  const startHuddle = React.useCallback(
    ({ ritual, mode } = {}) => {
      const at = new Date();
      mutateProject((prev) => {
        if (prev.huddle && !prev.huddle.endedAt) return prev;
        const session = createHuddleSession({
          project: prev,
          ritual: ritual || 'standup',
          mode: mode || prev.settings?.applyMode || 'confirm',
          now: at,
          userId: activeUser?.id || ACTIVE_USER.id,
        });
        return { ...prev, huddle: session };
      }, { debounce: 0 });
    },
    [mutateProject, activeUser],
  );

  const stopHuddle = React.useCallback(() => {
    mutateProject((prev) => {
      if (!prev.huddle) return prev;
      return { ...prev, huddle: stopSession({ session: prev.huddle, now: new Date() }) };
    }, { debounce: 0 });
  }, [mutateProject]);

  const toggleDemo = React.useCallback(() => {
    mutateProject((prev) => {
      const s = prev.huddle;
      if (!s?.demo || s.endedAt || s.demo.status === DEMO_STATUS.DONE) return prev;
      const status = s.demo.status === DEMO_STATUS.PLAYING ? DEMO_STATUS.PAUSED : DEMO_STATUS.PLAYING;
      return { ...prev, huddle: { ...s, demo: { ...s.demo, status } } };
    }, { debounce: 0 });
  }, [mutateProject]);

  // Reproduce el demo de nuevo desde cero: sesión nueva con transcript limpio y
  // guion reconstruido contra el tablero vivo (las cartas ya aplicadas quedan
  // inertes por la precondición de cada paso). Sin el guard de `startHuddle`.
  const replayDemo = React.useCallback(() => {
    const at = new Date();
    mutateProject((prev) => {
      const s = prev.huddle;
      if (!s?.demo || s.endedAt) return prev;
      const session = createHuddleSession({
        project: prev,
        ritual: s.ritual || 'standup',
        mode: prev.settings?.applyMode || 'confirm',
        now: at,
        userId: activeUser?.id || ACTIVE_USER.id,
      });
      return { ...prev, huddle: session };
    }, { debounce: 0 });
  }, [mutateProject, activeUser]);

  const resolveHuddleProposal = React.useCallback(
    (proposalId, accepted) => {
      const at = new Date();
      mutateProject((prev) => {
        const s = prev.huddle;
        if (!s) return prev;
        const item = (s.pending || []).find((p) => p.id === proposalId);
        if (!item || item.status !== PROPOSAL_STATUS.PENDING) return prev;

        if (!accepted) {
          const pending = (s.pending || []).map((p) =>
            p.id === proposalId ? { ...p, status: PROPOSAL_STATUS.DISMISSED, dismissedAt: at.toISOString() } : p,
          );
          return {
            ...prev,
            huddle: huddleLine({ ...s, pending }, {
              role: 'maia',
              speaker: 'Maia',
              text: 'Lo dejo así; no aplico por ahora.',
              at: at.toISOString(),
            }),
          };
        }

        const proposal = {
          action: item.action,
          payload: item.payload,
          label: item.label,
          comment: item.comment,
          needsInput: false,
          status: PROPOSAL_STATUS.PENDING,
        };
        const { project: np } = applyAction(prev, proposal, { source: 'confirm', now: at });
        const cardId = item.cardId || item.payload?.taskId || null;
        let next = {
          ...s,
          pending: (s.pending || []).map((p) =>
            p.id === proposalId ? { ...p, status: PROPOSAL_STATUS.APPLIED, appliedAt: at.toISOString() } : p,
          ),
          touchedIds: dedupe([...(s.touchedIds || []), cardId]),
          highlights: dedupe([...(s.highlights || []), cardId]),
        };
        next = huddleLine(next, {
          role: 'maia',
          speaker: 'Maia',
          text: `Aplicado: ${item.label}.`,
          cardIds: cardId ? [cardId] : [],
          at: at.toISOString(),
        });
        return { ...np, huddle: next };
      }, { debounce: 0 });
    },
    [mutateProject],
  );

  const sendHuddleLine = React.useCallback(
    async (text) => {
      const message = (text || '').trim();
      if (!message) return;
      const at = new Date();
      const userLine = {
        id: uuidv4(),
        role: 'user',
        speaker: activeUser?.name || ACTIVE_USER.name,
        text: message,
        cardIds: [],
        at: at.toISOString(),
      };
      mutateProject((prev) => {
        if (!prev.huddle) return prev;
        return { ...prev, huddle: huddleLine(prev.huddle, userLine) };
      }, { debounce: 0 });
      setMaiaReplying(true);
      try {
        const base = projectRef.current;
        if (!base?.huddle) return;
        const { reply, proposals } = await interpretHuddleLine({
          project: base,
          session: base.huddle,
          userText: message,
          now: at,
        });
        const maiaLine = {
          id: uuidv4(),
          role: 'maia',
          speaker: 'Maia',
          text: reply,
          cardIds: dedupe((proposals || []).map((p) => p.payload?.taskId).filter(Boolean)),
          at: new Date().toISOString(),
        };
        mutateProject((prev) => {
          const s = prev.huddle;
          if (!s) return prev;
          let acc = prev;
          let next = huddleLine(s, maiaLine);
          const applied = [];
          const isAuto = (prev.settings?.applyMode ?? 'confirm') === 'auto';
          if (isAuto) {
            for (const p of proposals || []) {
              if (p.action === 'create-card' || !canApply(acc, p)) continue;
              const { project: np } = applyAction(acc, p, { source: 'auto', now: new Date() });
              acc = np;
              applied.push(p.id);
              const cardId = p.payload?.taskId || null;
              if (cardId) {
                next = { ...next, touchedIds: dedupe([...(next.touchedIds || []), cardId]) };
              }
            }
          }
          const added = (proposals || []).map((p) =>
            applied.includes(p.id) ? { ...p, status: PROPOSAL_STATUS.APPLIED, appliedAt: at.toISOString() } : p,
          );
          if (added.length) next = { ...next, pending: [...(next.pending || []), ...added] };
          return { ...acc, huddle: next };
        }, { debounce: 0 });
      } finally {
        setMaiaReplying(false);
      }
    },
    [activeUser, mutateProject],
  );

  // Línea de voz del usuario activo (Lucía) sin LLM (§10, Web Speech). El
  // matcher determinístico ancla por #N/título + verbo; en modo auto una
  // coincidencia alta se aplica y registra sola (anti-loop por sesión vía
  // `matchedKeys`); en confirmar, o si la confianza no amerita, queda como
  // propuesta sí/no. Sin señal, Maia responde con pregunta templated.
  const submitHuddleMicLine = React.useCallback(
    (text) => {
      const message = String(text || '').trim();
      if (!message) return;
      const at = new Date();
      const base = projectRef.current;
      if (!base?.huddle || base.huddle.endedAt) return;
      const match = matchLiveLine(message, {
        tasks: base.tasks,
        members: base.members,
        self: { id: activeUser?.id || ACTIVE_USER.id, name: activeUser?.name || ACTIVE_USER.name },
        now: at,
      });

      mutateProject(
        (prev) => {
          if (!prev.huddle || prev.huddle.endedAt) return prev;
          const userLine = {
            id: uuidv4(),
            role: 'user',
            speaker: activeUser?.name || ACTIVE_USER.name,
            text: message,
            cardIds: match.cardIds,
            at: at.toISOString(),
          };
          let next = huddleLine(prev.huddle, userLine);
          let acc = prev;
          const appliedKeys = [];
          const keysOf = (s) => new Set(s?.matchedKeys || []);

          for (const action of match.actions || []) {
            const cardId = action.payload?.taskId || null;
            if (!cardId) continue;
            const key = `${action.type}|${cardId}`;
            if (keysOf(next).has(key)) continue;
            const proposal = proposalFromAction(cardId, action, prev);
            const isApply = (prev.settings?.applyMode ?? 'confirm') === 'auto' && match.confidence === 'high';
            if (isApply) {
              if (!canApply(acc, proposal)) continue;
              const { project: np } = applyAction(acc, proposal, { source: 'auto', now: new Date() });
              acc = np;
              appliedKeys.push(key);
              next = {
                ...next,
                touchedIds: dedupe([...(next.touchedIds || []), cardId]),
              };
              next = huddleLine(next, {
                role: 'maia',
                speaker: 'Maia',
                text: `Listo, quedó aplicado: ${proposal.label}. En la carta quedó un comentario y en el registro una entrada.`,
                cardIds: [cardId],
                at: new Date().toISOString(),
              });
            } else {
              next = huddleLine(next, {
                role: 'maia',
                speaker: 'Maia',
                text: `Propuesta en pantalla: ${proposal.label}. ¿Sí o no?`,
                cardIds: [cardId],
                at: new Date().toISOString(),
              });
              next = { ...next, pending: [...(next.pending || []), proposal] };
              appliedKeys.push(key);
            }
          }

          // Sin señal accionable: pregunta templated (determinística, 0 tokens).
          if ((match.actions || []).length === 0) {
            const spokenCard = (prev.tasks || []).find((t) => t.id === match.cardIds[0]);
            const seededLine = spokenCard ? `Hablemos de ${spokenCard.name}` : message;
            const replyText = templatedHuddleReply(seededLine, { project: prev });
            next = huddleLine(next, {
              role: 'maia',
              speaker: 'Maia',
              text: replyText,
              cardIds: match.cardIds,
              at: new Date().toISOString(),
            });
          }

          return {
            ...acc,
            huddle: {
              ...next,
              matchedKeys: dedupe([...(next.matchedKeys || []), ...appliedKeys]),
            },
          };
        },
        { debounce: 0 },
      );
    },
    [activeUser, mutateProject],
  );

  // Pide la respuesta de Maia (§11): LLM con fallback templated, nunca lanza.
  // Las acciones del LLM se validan (ids reales) y llegan como propuestas; en
  // modo auto se aplican solas, con excepción de create-card (§9) que siempre
  // queda en confirmar. Todo dentro de un mismo mutateProject.
  const deliverMaiaReply = async (inquiryId, userText) => {
    const base = projectRef.current;
    if (!base) return;
    const inq = (base.inquiries || []).find((i) => i.id === inquiryId);
    if (!inq) return;
    setMaiaReplying(true);
    try {
      const res = await requestMaiaChat({ project: base, inquiry: inq, userText });
      const tick = new Date().toISOString();
      mutateProject((prev) => {
        const current = (prev.inquiries || []).find((i) => i.id === inquiryId);
        if (!current) return prev;
        const bubble = { id: uuidv4(), role: 'maia', author: 'Maia', text: res.reply, at: tick };
        const fresh = actionsToProposals({ project: prev, inquiry: current, actions: res.actions });
        const key = (p) => `${p.action}|${JSON.stringify(p.payload || {})}`;
        const existing = new Set((current.proposals || []).map(key));
        const added = fresh.filter((p) => !existing.has(key(p)));

        const isAuto = (prev?.settings?.applyMode ?? 'confirm') === 'auto';
        const applied = new Set();
        const logTail = [];
        let acc = prev;
        if (isAuto) {
          for (const p of added) {
            if (p.action === 'create-card') continue;
            if (!canApply(acc, p)) continue;
            const { project: np, logEntry } = applyAction(acc, p, { source: 'auto' });
            acc = np;
            logTail.push(logEntry);
            applied.add(p.id);
          }
        }

        const proposals = [
          ...(current.proposals || []),
          ...added.map((p) =>
            applied.has(p.id) ? { ...p, status: PROPOSAL_STATUS.APPLIED, updatedAt: tick } : p,
          ),
        ];
        const nextInquiry = {
          ...current,
          status: INQUIRY_STATUS.CHATTING,
          thread: [...(current.thread || []), bubble],
          proposals,
          updatedAt: tick,
        };
        return {
          ...acc,
          inquiries: (acc.inquiries || []).map((i) => (i.id === inquiryId ? nextInquiry : i)),
          actionLog: logTail.length ? dedupeLog(acc.actionLog || [], logTail) : acc.actionLog,
        };
      });
    } finally {
      setMaiaReplying(false);
    }
  };

  const sendThreadMessage = React.useCallback(
    (inquiryId, text) => {
      const message = (text || '').trim();
      if (!message || !inquiryId) return;
      const at = new Date().toISOString();
      const entry = {
        id: uuidv4(),
        role: 'user',
        authorId: activeUser?.id || ACTIVE_USER.id,
        author: activeUser?.name || ACTIVE_USER.name,
        text: message,
        at,
      };
      // §9.200: un "No" escueto en texto libre no va al LLM: deriva al mismo
      // gate local del botón (burbuja Maia + followedUpAt + descarta pending).
      if (isDeclineMessage(message)) {
        mutateProject((prev) => {
          const inq = (prev.inquiries || []).find((i) => i.id === inquiryId);
          if (!inq) return prev;
          return {
            ...prev,
            inquiries: (prev.inquiries || []).map((i) =>
              i.id === inquiryId ? declineInquiry(i, at, { entry, dismissPending: true }) : i,
            ),
          };
        });
        return;
      }
      mutateProject((prev) => ({
        ...prev,
        inquiries: (prev.inquiries || []).map((inq) =>
          inq.id === inquiryId
            ? { ...inq, status: INQUIRY_STATUS.CHATTING, thread: [...(inq.thread || []), entry], updatedAt: at }
            : inq,
        ),
      }));
      void deliverMaiaReply(inquiryId, message);
    },
    [activeUser, mutateProject],
  );

  const applyProposal = React.useCallback(
    (inquiryId, proposalId, source = 'confirm') => {
      const at = new Date().toISOString();
      mutateProject((prev) => {
        const inquiry = (prev.inquiries || []).find((i) => i.id === inquiryId);
        const proposal = inquiry?.proposals?.find((p) => p.id === proposalId);
        if (!inquiry || !proposal || proposal.status !== PROPOSAL_STATUS.PENDING) return prev;
        if (!canApply(prev, proposal)) return prev;
        const { project: np, logEntry } = applyAction(prev, proposal, { source });
        return {
          ...np,
          inquiries: (prev.inquiries || []).map((inq) =>
            inq.id === inquiryId
              ? {
                  ...inq,
                  proposals: (inq.proposals || []).map((p) =>
                    p.id === proposalId ? { ...p, status: PROPOSAL_STATUS.APPLIED } : p,
                  ),
                  updatedAt: at,
                }
              : inq,
          ),
          actionLog: np.actionLog,
        };
      });
    },
    [mutateProject],
  );

  // §9.200: "No" de Lucía → burbuja Maia "¿Qué habría que hacer entonces?"
  // (local, sin LLM). Segunda vez → offer snooze, sin loop. Cambia el estado
  // del inquiry (CHATTING), descarta la propuesta apuntada (o todas en el texto
  // libre) y deja el gate `followedUpAt`.
  const declineInquiry = (inq, at, { entry = null, onlyProposalId = null, dismissPending = false } = {}) => {
    const alreadyAsked = Boolean(inq.followedUpAt);
    const maiaBubble = {
      id: uuidv4(),
      role: 'maia',
      author: 'Maia',
      text: alreadyAsked
        ? 'Queda abierta.'
        : '¿Qué habría que hacer entonces?',
      at,
    };
    return {
      ...inq,
      status: INQUIRY_STATUS.CHATTING,
      followedUpAt: alreadyAsked ? inq.followedUpAt : at,
      proposals: (inq.proposals || []).map((p) =>
        p.status === PROPOSAL_STATUS.PENDING &&
        (dismissPending || p.id === onlyProposalId)
          ? { ...p, status: PROPOSAL_STATUS.DISMISSED, dismissedAt: at }
          : p,
      ),
      thread: [...(inq.thread || []), entry, maiaBubble].filter(Boolean),
      updatedAt: at,
    };
  };

  const declineProposal = React.useCallback(
    (inquiryId, proposalId) => {
      const at = new Date().toISOString();
      mutateProject((prev) => {
        const inq = (prev.inquiries || []).find((i) => i.id === inquiryId);
        if (!inq) return prev;
        return {
          ...prev,
          inquiries: (prev.inquiries || []).map((i) =>
            i.id === inquiryId
              ? declineInquiry(i, at, { onlyProposalId: proposalId })
              : i,
          ),
        };
      });
    },
    [mutateProject],
  );

  const snoozeInquiry = React.useCallback(
    (inquiryId) => {
      const at = new Date().toISOString();
      mutateProject((prev) => ({
        ...prev,
        inquiries: (prev.inquiries || []).map((inq) =>
          inq.id === inquiryId
            ? {
                ...inq,
                status: INQUIRY_STATUS.SNOOZED,
                snoozedAt: at,
                snoozedUntil: nextStandupAt(new Date()),
                updatedAt: at,
              }
            : inq,
        ),
      }));
    },
    [mutateProject],
  );

  const value = useMemo(
    () => ({
      inquiries,
      openCount: inquiries.filter((i) => i.status === 'open' || i.status === 'chatting').length,
      actionLog,
      applyMode,
      staleDays,
      lastScanAt,
      maiaReplying,
      huddle,
      demoStatus,
      highlightedTaskIds: new Set(huddle?.highlights || []),
      setApplyMode: (mode) => setSettings({ applyMode: mode }),
      sendThreadMessage,
      applyProposal,
      declineProposal,
      snoozeInquiry,
      startHuddle,
      stopHuddle,
      toggleDemo,
      replayDemo,
      sendHuddleLine,
      submitHuddleMicLine,
      resolveHuddleProposal,
    }),
    [
      inquiries,
      actionLog,
      applyMode,
      staleDays,
      lastScanAt,
      maiaReplying,
      huddle,
      demoStatus,
      setSettings,
      sendThreadMessage,
      applyProposal,
      declineProposal,
      snoozeInquiry,
      startHuddle,
      stopHuddle,
      toggleDemo,
      replayDemo,
      sendHuddleLine,
      submitHuddleMicLine,
      resolveHuddleProposal,
    ],
  );

  return <MaiaContext.Provider value={value}>{children}</MaiaContext.Provider>;
}

export function useMaia() {
  const ctx = useContext(MaiaContext);
  if (!ctx) {
    throw new Error('useMaia debe usarse dentro de <MaiaProvider>.');
  }
  return ctx;
}

export { MaiaContext };