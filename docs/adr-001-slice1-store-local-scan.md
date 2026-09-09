# ADR-001 — Slice 1: store local + seed + motor de interpelaciones determinístico

Fecha: 2026-09-08 · Estado: aceptado (implementado y deployado) · Decisores: OpenCode (documenta), Grok (spec), humano.

Este ADR documenta el diseño **as-built** del Slice 1 de Gantter. No introduce código nuevo: describe el estado real del repo y las decisiones que lo sostienen, para que cualquier reviewer parta del "por qué" y no del "qué dice el código". Fuente de verdad de producto: `bot_requirements.md` §8 (catálogo de interpelaciones), §12 (datos), §13 (seed).

---

## 1. Contexto y problema

v1 necesita sentirse real en 60 segundos y funcionar **sin backend ni LLM en el camino crítico**:

- **§12**: persistencia local en el cliente, un tablero por proyecto, varios proyectos en el mismo store, sin auth, sin DB.
- **§13**: dos proyectos seed (uno "sucia", otro limpio) para explicar el producto sin build local.
- **§8**: al cargar el tablero, Maie **genera sus preguntas con reglas determinísticas** (`thin`, `unassigned`, `stale`, `missing-date`, `overlap`). El LLM queda **excluido explícitamente** del page load ("No llamar a un LLM al cargar el tablero").

El problema de diseño: cómo persistir, sembrar y escanear sin que una pregunta "computada" rompa el tablero ni genere un loop de escrituras.

## 2. Decisiones de diseño

### D1 — Store: React Context + `localStorage` (no Zustand, no DB)

- `ProjectContext` (`src/context/ProjectContext.jsx`) es la única puerta de mutación; expone `project`, `mutateProject`, `commitToStore`, `resetDemo`, etc.
- La persistencia pasa por un backend intercambiable (`localStorageBackend` en dev/local, `serverBackend` en prod), nunca se escribe `localStorage` desde un componente.
- Se descarta Zustand: el estado ya está en un solo Context con testeo sólido; migrar no aporta valor de producto y viola "no re-tocar lo cerrado" de v1.

### D2 — Lenguaje: JS/JSX, sin TypeScript

- Los "tipos" son el **shape canónico §12** (`src/services/projectStorage.js`) y las fábricas/normalizers de `src/models/*`.
- Migrar a TS es un refactor de todo el repo, fuera del alcance v1. Si se quisiera validación liviana, opción disponible: JSDoc + `@ts-check`; se evalúa por separado, no en este slice.

### D3 — Shape: runtime `buckets/tasks` ↔ canónico §12 `columns/cards`

- El runtime del tablero trabaja con `buckets` y `tasks` (con `assignedUsers[]`), que el Kanban/Gantt consumen directo.
- El documento que viaja al store es **canónico §12**: `columns[]`, `cards[]` (con `assigneeIds[]`), `inquiries[]`, `actionLog[]`, `settings`.
- Conversión bidireccional:
  - runtime → canónico: `toDocument` (`projectStorage.js:251`, deriva `columns`/`cards` con `toColumns`/`toCards`).
  - canónico → runtime: `deserializeProject` (`projectStorage.js:354`) y `normalizeProject` (`projectStorage.js:281`, detecta shape canónico con `hasCanonicalShape`).
- Consecuencia: `tasks` ↔ `cards` y `buckets` ↔ `columns` son la misma fuente (la carta es la única fuente para Kanban y Gantt, §12/§14). El merge realtime (`src/utils/collab.js`) trabaja sobre entidades `bucket/task/member`.

### D4 — Motor determinístico §8 (`scanInquiries`) + trigger anti-loop

- **Función pura:** `scanInquiries(project, { existingInquiries, now })` en `src/services/inquiryEngine.js:97`. Sin efectos, sin LLM, `now` inyectable (tests determinísticos). Reglas:
  - condiciones sobre columnas de trabajo (`WORKING_COLUMNS`: Listo / En curso); Backlog/Hecho no insisten (§13 "Backlog: opcional").
  - `thin`: descripción < `minDescriptionChars` (20).
  - `unassigned`: carta de trabajo sin responsable.
  - `stale`: sin actividad > `staleDays` (default 15, configurable).
  - `missing-date`: carta sin rango en la ruta de un hito a ≤ `milestoneWindowDays` (10).
  - `overlap`: por responsable con barras que se pisan (`findOverlaps` en `src/utils/ganttSchedule`).
- **Trigger:** effect en `MaieContext.jsx:81` con dependencias `[project, mutateProject]`. Cada cambio de `project.version` re-escannea.
- **Anti-loop:** el effect calcula el set nuevo, compara contra el persistido (`sameSet` sobre campos estables: id/kind/cardId/status/question/evidence/resolvedNote) y **solo escribe si cambió**. El rescan del mismo documento devuelve lo mismo (estabilidad garantizada por tests).
- **IDs estables:** los inquiries persisten su `id`; se fusionan por key `kind:cardId` (`inquiryEngine.js:217-250`) conservando hilo, `proposals` y snooze.
- **Auto-resolución:** si la condición desaparece (ganó dueño, ganó descripción, salió del trabajo), la pregunta pasa a `resolved` con motivo + entrada en `actionLog` (§8: "se resolvió porque Ana tomó la carta").
- **Propuestas por inquiry:** `defaultProposalsFor` (`proposalEngine.js:116`) genera las `ProposedAction` típicas de cada kind; las que requieren dictado se marcan `needsInput` (se completan en el chat, slice 6). El modo auto (`autoEligible`, `proposalEngine.js:252`) solo aplica lo "obvio" — asignación 1:1, fechar, bloquear.

### D5 — Seed §13 + reset demo

- `DB/sample_data.json`: `seed_portal` ("Portal de clientes", equipo Río, Lucía Ríos activa) y `seed_app_movil` ("App móvil v2", equipo Costa, casi sano).
- Las fechas del seed son **relativas al primer run**: `reanchorSeedDates(p, SEED_ANCHOR)` en `localStorageBackend.loadSeedProjects` ancla hitos y actividad a "hoy" (go-live ~7 días, stale ~18 días). Ver `src/services/__tests__/seedAnchoring.test.js`.
- Primer run: sembra los 2 proyectos y los persiste; ~Home + tablero nunca quedan vacíos.
- Reset: `resetDemo` (`ProjectContext.jsx:307`) reemplaza los proyectos `seed_*` conservando los creados por el usuario; UI "Restaurar demo" en `ProjectsLanding.jsx:101`.

## 3. Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| **TS + Zustand** | Refactor global sin valor de producto; contradice v1 y el flujo de HANDOFF. |
| **Escanear con LLM** | Viola §8 ("generarlas en el cliente… no llamar a LLM") y §11 (LLM solo cuando la persona responde); costo del dueño de la app. |
| **DB / backend para el scan** | v1 es store local (§12); el scan vive donde vive el tablero. |
| **Rehacer Slice 1 desde cero** | Ya estaba implementado y con review; reescribirlo suma riesgo sin beneficio (decisión del humano en 2026-09-08). |

## 4. Mapeo de referencias (requerimiento → código)

| Requerimiento | Implementación |
|---|---|
| §12 Project canónico | `projectStorage.js:251` (`toDocument`), fields en seed `DB/sample_data.json` |
| §12 Member | `src/models/member.js` (`normalizeMember`) |
| §12 Column / Card | `src/models/column.js`, `src/models/card.js` (canónico: `columns`/`cards`) |
| §12 runtime tickets | `src/models/task.js`, `src/models/bucket.js` (runtime: `tasks`/`buckets`) |
| §12 Inquiry / ProposedAction | `inquiryEngine.js:254-269`, `proposalEngine.js:102` |
| §12 ActionLogEntry | `MaieContext`/`applyEngine` (`source: auto\|confirm\|manual`) |
| §12 Huddle | Campo `huddle` (model completo = slice 7, pendiente) |
| §8 scan determinístico | `src/services/inquiryEngine.js` |
| §8 defaults | `src/constants/maie.js:44` (`MAIE_DEFAULTS`) |
| §8 propuestas | `src/services/proposalEngine.js` |
| §8 re-scan + anti-loop | `src/context/MaieContext.jsx:81` |
| §13 seed + re-anclaje + reset | `DB/sample_data.json`, `localStorageBackend.js:51`, `ProjectContext.jsx:307` |
| Store / persistencia | `src/context/ProjectContext.jsx`, `src/services/storage.js`, `localStorageBackend.js` |

## 5. Tests como evidencia

- `src/services/__tests__/inquiryEngine.test.js` — 5 kinds, autoresolución, conservación de hilo, estabilidad (anti-loop).
- `src/services/__tests__/proposalEngine.test.js` — propuestas por kind y gate de auto.
- `src/services/__tests__/seed.test.js` + `seedAnchoring.test.js` + `localBackend.test.js` + `projectStorage.test.js` — seed §13, anclaje de fechas, migración, idempotencia.
- Suite completa al momento de este ADR: **221/221** (HEAD `ec0f93f`).

## 6. Consecuencias y extensión

- **Costo:** el scan se ejecuta en cada mutación del tablero, pero es O(cartas) y determinístico; el anti-loop evita escrituras espurias.
- **Qué se apoya sobre esto:** slice 5 (mecánica de propuestas aplicar/descartar), slice 6 (chat LLM con fallback templated), y slice 7 (huddle demo que muta el tablero — re-scan reacciona igual).
- **Límites conocidos:** el modelo `Huddle` completo y el huddle real son slice 7; el merge realtime (SSE) es parte del despliegue server de v1 y ya corrigió su loop de guardado (ver HANDOFF, fix prod 2026-09-08).