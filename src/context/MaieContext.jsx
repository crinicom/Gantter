// Contexto de Maie (§7–8). Escucha el tablero: cada cambio de `project.version`
// dispara un rescan determinístico (services/inquiryEngine). El scanner genera
// inquiries y auto-resuelve las vencidas, dejando rastro en el actionLog.
// Maie NO escribe en ProjectContext por otro camino que `mutateProject`; su
// lógica vive acá y en `services/inquiryEngine.js`.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../hooks/useProject';
import { scanInquiries } from '../services/inquiryEngine';

const MaieContext = createContext(null);

// Campos que definen un inquiry a efectos de estabilidad del set.
const STABLE_FIELDS = ['id', 'kind', 'cardId', 'status', 'question', 'evidence', 'resolvedNote'];

function stableOf(inquiry) {
  return JSON.stringify(
    STABLE_FIELDS.map((f) => inquiry?.[f]),
  );
}

export function MaieProvider({ children }) {
  const { project, mutateProject, setSettings } = useProject();
  const [inquiries, setInquiries] = useState([]);
  const [actionLog, setActionLog] = useState([]);
  const [lastScanAt, setLastScanAt] = useState(null);

  const inquiriesRef = useRef(inquiries);
  const logRef = useRef(actionLog);
  inquiriesRef.current = inquiries;
  logRef.current = actionLog;

  useEffect(() => {
    if (!project) {
      setInquiries([]);
      setActionLog([]);
      return;
    }

    const result = scanInquiries(project, { existingInquiries: inquiriesRef.current });

    const sameSet =
      result.inquiries.length === inquiriesRef.current.length &&
      result.inquiries.every((inq, i) => stableOf(inq) === stableOf(inquiriesRef.current[i]));

    if (sameSet && result.logEntries.length === 0) {
      setLastScanAt(new Date().toISOString());
      return;
    }

    // Deduplica entradas de log idénticas (evita duplicados por doble invocación
    // del efecto en StrictMode / re-entradas).
    const mergedLog = logRef.current.concat(
      result.logEntries.filter(
        (entry) =>
          !logRef.current.some(
            (e) => e.summary === entry.summary && e.cardId === entry.cardId,
          ),
      ),
    );

    setInquiries(result.inquiries);
    setActionLog(mergedLog);
    setLastScanAt(new Date().toISOString());
    mutateProject(
      (prev) => ({
        ...prev,
        inquiries: result.inquiries,
        actionLog: mergedLog,
      }),
      { debounce: 0 },
    );
  }, [project, mutateProject]);

  const applyMode = project?.settings?.applyMode ?? 'confirm';
  const staleDays = project?.settings?.staleDays ?? 15;

  const value = useMemo(
    () => ({
      inquiries,
      openCount: inquiries.filter((i) => i.status === 'open' || i.status === 'chatting').length,
      actionLog,
      applyMode,
      staleDays,
      lastScanAt,
      setApplyMode: (mode) => setSettings({ applyMode: mode }),
    }),
    [inquiries, actionLog, applyMode, staleDays, lastScanAt, setSettings],
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