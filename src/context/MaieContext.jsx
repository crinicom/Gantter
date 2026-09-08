// Contexto de Maie (§7–9). Escucha el tablero: cada cambio de `project.version`
// dispara un rescan determinístico (services/inquiryEngine). El scanner genera
// inquiries (con sus propuestas por defecto de proposalEngine), auto-resuelve
// las vencidas y deja rastro en el actionLog. En modo auto (§9) el rescan
// aplica las propuestas "obvias" (asignar, fechar, bloquear) dejando comentario
// en la carta + log. Maie NO escribe en ProjectContext por otro camino que
// `mutateProject`; su lógica vive acá y en services/inquiryEngine|proposalEngine|
// applyEngine.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProject } from '../hooks/useProject';
import { useAuth } from '../hooks/useAuth';
import { scanInquiries } from '../services/inquiryEngine';
import { autoEligible } from '../services/proposalEngine';
import { canApply, apply as applyAction, selectAutoActions } from '../services/applyEngine';
import { INQUIRY_STATUS, PROPOSAL_STATUS, MAIE_DEFAULTS } from '../constants/maie';
import { ACTIVE_USER } from '../constants/project';

const MaieContext = createContext(null);

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

export function MaieProvider({ children }) {
  const { project, mutateProject, setSettings } = useProject();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [actionLog, setActionLog] = useState([]);
  const [lastScanAt, setLastScanAt] = useState(null);

  const inquiriesRef = useRef(inquiries);
  const logRef = useRef(actionLog);
  inquiriesRef.current = inquiries;
  logRef.current = actionLog;

  const projectIdRef = useRef(null);

  // Reset / hidratación por proyecto: inquiries + actionLog viven en el doc.
  useEffect(() => {
    if (!project) {
      projectIdRef.current = null;
      setInquiries([]);
      setActionLog([]);
      return;
    }

    if (project.id !== projectIdRef.current) {
      projectIdRef.current = project.id;
      const hydrateInquiries = project.inquiries || [];
      const hydrateLog = project.actionLog || [];
      setInquiries(hydrateInquiries);
      setActionLog(hydrateLog);
      inquiriesRef.current = hydrateInquiries;
      logRef.current = hydrateLog;
    }

    const result = scanInquiries(project, { existingInquiries: inquiriesRef.current });
    const autoActions = selectAutoActions(project, result.inquiries, {
      canAutoApply: autoEligible,
    });
    const tick = new Date().toISOString();

    if (
      sameSet(result.inquiries, inquiriesRef.current) &&
      result.logEntries.length === 0 &&
      autoActions.length === 0
    ) {
      setLastScanAt(tick);
      return;
    }

    // Modo auto: aplica las propuestas "obvias" vigentes y deja registro.
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

    const nextLog = dedupeLog(logRef.current, dedupeLog(result.logEntries, logTail));
    const nextInquiries = result.inquiries.map((inq) => {
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

    const composed = {
      ...acc,
      inquiries: nextInquiries,
      actionLog: nextLog,
    };

    inquiriesRef.current = nextInquiries;
    logRef.current = nextLog;
    setInquiries(nextInquiries);
    setActionLog(nextLog);
    setLastScanAt(tick);
    mutateProject(() => composed, { debounce: 0 });
  }, [project, mutateProject]);

  const applyMode = project?.settings?.applyMode ?? 'confirm';
  const staleDays = project?.settings?.staleDays ?? MAIE_DEFAULTS.staleDays;

  const activeUser = user || ACTIVE_USER;

  const sendThreadMessage = React.useCallback(
    (inquiryId, text) => {
      const message = (text || '').trim();
      if (!message) return;
      const at = new Date().toISOString();
      const entry = {
        id: uuidv4(),
        role: 'user',
        authorId: activeUser?.id || ACTIVE_USER.id,
        author: activeUser?.name || ACTIVE_USER.name,
        text: message,
        at,
      };
      mutateProject((prev) => ({
        ...prev,
        inquiries: (prev.inquiries || []).map((inq) =>
          inq.id === inquiryId
            ? { ...inq, status: INQUIRY_STATUS.CHATTING, thread: [...(inq.thread || []), entry], updatedAt: at }
            : inq,
        ),
      }));
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

  const dismissProposal = React.useCallback(
    (inquiryId, proposalId) => {
      const at = new Date().toISOString();
      mutateProject((prev) => ({
        ...prev,
        inquiries: (prev.inquiries || []).map((inq) =>
          inq.id === inquiryId
            ? {
                ...inq,
                proposals: (inq.proposals || []).map((p) =>
                  p.id === proposalId ? { ...p, status: PROPOSAL_STATUS.DISMISSED, dismissedAt: at } : p,
                ),
                updatedAt: at,
              }
            : inq,
        ),
      }));
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
      setApplyMode: (mode) => setSettings({ applyMode: mode }),
      sendThreadMessage,
      applyProposal,
      dismissProposal,
      snoozeInquiry,
    }),
    [
      inquiries,
      actionLog,
      applyMode,
      staleDays,
      lastScanAt,
      setSettings,
      sendThreadMessage,
      applyProposal,
      dismissProposal,
      snoozeInquiry,
    ],
  );

  return <MaieContext.Provider value={value}>{children}</MaieContext.Provider>;
}

export function useMaie() {
  const ctx = useContext(MaieContext);
  if (!ctx) {
    throw new Error('useMaie debe usarse dentro de <MaieProvider>.');
  }
  return ctx;
}

export { MaieContext };