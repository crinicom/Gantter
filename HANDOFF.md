# HANDOFF — Gantter v1 (Maia)

Protocolo de trabajo entre **Grok** (especifica + revisa) y **OpenCode** (implementa, commitea, deploya).

Producto: `bot_requirements.md`. No inventar features fuera de ese archivo. Lo marcado **v2** no se construye.

---

## Cómo trabajar

1. Leer este archivo y `bot_requirements.md` antes de tocar código.
2. Revisar el backlog de feedback (ritual de planning): leer `feedback/inbox.jsonl`, opcional `node scripts/pull-prod-feedback.mjs`, marcar lo nuevo en `feedback/triage.md` con propuesta `slice-<n>` / `backlog`.
3. Implementar **solo** el slice `in-progress` cuyo `owner` seas vos.
4. No tocar archivos en **No tocar** de ese slice, ni slices de otro owner.
5. Al terminar: `npm test` y `npm run build` verdes, actualizar este archivo (`status: review`, notas), **parar**. No arrancar el slice siguiente.
6. Grok revisa el diff contra el § citado de `bot_requirements.md`. Si pasa, escribe el próximo slice aquí. Si no, deja punch list en **Notas**.
7. **Commits y deploys: solo OpenCode.** Grok no commitea ni pushea.

Un writer por conjunto de archivos. No implementar en paralelo sobre `ProjectContext.jsx` / `AppShell.jsx` / `projectStorage.js`.

---

## Roles

| Quién | Hace | No hace |
|---|---|---|
| **Grok** | Spec de slice, review de diff, punch list, siguiente slice en este archivo | Commits, deploys, implementar un slice `owner: opencode` |
| **OpenCode** | Implementar slice propio, tests, commit, deploy | Features fuera de `bot_requirements.md`; auth/Drive/server nuevos; el slice de Grok |
| **Humano** | Elige “slice N es next”, resuelve preguntas de §19 | — |

---

## Estado actual

| Campo | Valor |
|---|---|
| Fecha | 2026-09-11 |
| Spec | `bot_requirements.md` (v1) |
| Slice en curso | — |
| Owner | — |
| Status | 11–15 en `review` |
| Slice 0 | `done` (docs commitado por OpenCode) |
| Slice 2 | `done` (fixes aplicados por OpenCode, review Grok) |
| Slice 3 | `done` (review Grok por OpenCode, fix H1) |
| Slice 4 | `done` (implementado por OpenCode; review Grok hecha por OpenCode a pedido del humano — H1 y P3 aplicados en `0d4d8cf`) |
| Slice 5 | `done` (implementado por OpenCode en `72f5e61`; review hecha por OpenCode a pedido del humano — P0 ×2 y P2 ×2 aplicados, ver Notas) |

---

## Tabla de slices

Estados: `pending` · `in-progress` · `review` · `done` · `blocked`.

| # | Slice | Owner | Status | Spec | Entrega |
|---|---|---|---|---|---|
| 0 | Retarget de agentes + freeze del backlog viejo | grok | **done** | este archivo, `AGENTS.md` | OpenCode commitea los docs |
| 1 | Documento v1 + seed (Portal sucio + App móvil limpia) + reset demo | opencode | **done** | §12–13, §15.1/9/10 | commit `f20e3ad` + revisión `7aa8ef2` |
| 2 | Board/Gantt: multi-asignado, blocked, sin fechas, overlap, hito, WIP no bloquea | opencode | **done** | §5–6 | implementado, fixes Grok |
| 3 | Tokens visuales (papel/bosque, Fraunces+Figtree, cero emoji) | opencode | **done** | §14 | commits `a8a7e95`, `17838c0` y `21a0258` (fix H1) |
| 4 | Panel Maia + scanner determinístico (5 kinds, sin LLM) | opencode | **done** | §7–8 | commit `35adb76`; review Grok por OpenCode `0d4d8cf` |
| 5 | Click → hilo, auto/confirmar, propuestas, log | opencode | **review** | §7, §9 | dependía de 4; asignado a OpenCode |
| 6 | Chat LLM (OpenAI `gpt-4o-mini`) + fallback templated | opencode | **review** | §11 | depende de 5; asignado a OpenCode |
| 7 | Huddle in-app + standup demo que **muta** el tablero | opencode | **review** | §10, §17.5 | asignado a OpenCode; motor `huddleEngine` + MaiaContext + UI; commit a fill por OpenCode |
| 8 | Mobile ~390: tabs Tablero / Gantt / Maia | opencode | pending | §14, §17.7 | después de que exista el panel |
| 9 | Rename Maie → Maia (identidad y código, cero `maie`) | opencode | **done** | global, este archivo | commit `4c58631` (55 files, 420/420 sustituciones); dirs y alias `@maia` |
| 10 | Números de carta `#N` por proyecto (referencia humana + ancla del ASR) | opencode | **review** | §12 (Card.number), §10 | backfill 1..N, max+1 en crear, chips Kanban/Gantt, labels con `#N`; commit slice 10 |
| 11 | Huddle real: escuchar reunión (Web Speech), matcher determinístico, 0 tokens LLM | opencode | **review** | §10, §12 | `useSpeechToText` + `liveLineMatcher` + UI mic; commit slice 11 |
| 12 | Información del proyecto: documentos markdown (ficha OneNote-like) | opencode | **done** | §12 (Document) | `documents[]` en storage, API `create/update/deleteDocument` en ProjectContext, `ProjectInfoView` + pestaña, seed con ficha de ejemplo; commit slice 12 `928313f` |
| 13 | Onboarding de proyecto nuevo: preguntas configurables (autosave + dictado) → Ficha del proyecto | opencode | **done** | §12 (Onboarding), §7, §16 | `maia/onboarding/questions.md` + parser + `onboardingService` (ficha regenerada hasta done), API en ProjectContext, bloque Preguntas en MaiaPanel + `OnboardingModal`; commit slice 13 |
| 14 | Hardening v1: "No" de Maia (§9.200) + pruebas extensivas + mejoras menores | opencode | **done** | §9.200, §7, §12 | `declineProposal` (local, sin LLM, gate `followedUpAt`), normalize `followedUpAt: null`, 9 tests nuevos; commit slice 14 `e0d06a5` + fixes de review `1a3c24b` |
| 15 | Accesos directos: pestaña con grid de iconos tipo Explorer (URL + nombre opcional, apertura en pestaña nueva, eliminar inline, máx. 30) | opencode | **review** | §12 (Shortcut) | `shortcutsService` (normalize/validate/label/limit) + `shortcuts[]` en storage (round-trip + backfill) + `addShortcut`/`removeShortcut` en ProjectContext + `ShortcutsView` + modal + tab en `TabsSwitcher`/`AppShell`; commit slice 15 `26c48cd` |

Paralelo permitido **después de que 1 esté `done`**: OpenCode en 2–3, Grok en 4+, **si** Maia no vive en `ProjectContext.jsx`. Maia va a `MaiaContext` / `services/inquiryEngine` / `services/huddleEngine` (nombres orientativos).

---

## Slice 1 — qué implementar (OpenCode)

Extender el documento persistido al shape de §12. El Board y el Gantt actuales tienen que seguir renderizando.

### Shape canónico en storage (nombres de §12)

```
Project: id, name, teamName, summary, members[], columns[], cards[],
         inquiries[], actionLog[], huddle, settings { applyMode, staleDays }
Member:  id, name, initials, role
Column:  id, title, wipLimit?
Card:    id, title, description, columnId, assigneeIds[], startDate, endDate,
         blocked, blockedReason, comments[], createdAt, updatedAt, lastActivityAt
```

`inquiries`, `actionLog`, `huddle` pueden ir vacíos en este slice; existen en el documento.

### Mapping desde el código de hoy

| Hoy | v1 |
|---|---|
| `buckets` | `columns` (`name` → `title`, + `wipLimit`) |
| `tasks` | `cards` (`name` → `title`, `bucketId` → `columnId`) |
| `assignedUser` | `assigneeIds[]` (ids de `members`) |
| `status` / `progress` | la columna es el estado; no hace falta `progress` en v1 |
| `owner` / invites / auth | no extender. Identidad v1 = Lucía (seed) |

Un solo lugar de adaptadores (`projectStorage.js` o un mapper). No duplicar el mapping en cada componente. Normalizar documentos viejos al leer (migración idempotente). `lastActivityAt` se pisa en move, comentario, assign, fechas o bloqueo.

### Seed (§13)

- **Proyecto 1 — Portal de clientes (equipo Río).** Usuario activo: **Lucía Ríos**. Cartas y huecos de la tabla de §13 (stale ~18 días, unassigned+thin, overlap de Martín, missing-date pegado a hito go-live ~7 días, etc.). Columnas: Backlog · Listo · En curso · Hecho. WIP en En curso (informa, no bloquea el drop — el bloqueo de drop es slice 2; el campo `wipLimit` sí puede existir ya).
- **Proyecto 2 — App móvil v2 (equipo Costa).** Pocas cartas, casi todas sanas.
- **Reset a datos demo** en settings, vuelve a este estado.

Identidad: Lucía. No hace falta auth nueva. No agregues OAuth, Drive, SQLite ni invitaciones. El login/server que ya existe se deja quieto (no borrar en este slice, no ampliar).

### Aceptación

- Home muestra ≥2 proyectos seed (Portal + App móvil).
- Portal tiene las cartas sucias de §13 (dueños, fechas, huecos).
- Hay control de **reset a demo** y vuelve al seed.
- Recargar conserva el store local (vía `services/`, no `localStorage` desde un componente).
- `npm test` y `npm run build` pasan.
- Board y Gantt no quedan en blanco.

### Archivos esperados (orientativo)

Tocar: `src/services/projectStorage.js`, `src/models/*`, `DB/sample_data.json` (o sucesor del seed), `src/services/localStorageBackend.js`, lo mínimo de `ProjectContext` para create/reset/list.

### No tocar

- Panel Maia, LLM, huddle, scanner.
- Restyle §14 (eso es slice 3).
- CPM / flechas de dependencias (v2).
- `server/`, OAuth, Drive, invites.
- `bot_requirements.md` (spec). Podés actualizar **este** `HANDOFF.md`.

---

## Slice 0 — hecho (Grok)

- `AGENTS.md` apunta a `bot_requirements.md` + este archivo.
- `docs/requirements.md` congelado (US-001–017 = historia).
- `TASKS.md` P1/P2 de backend **no** se implementan.
- Commits/deploys = OpenCode.

---

## Reglas fijas (los dos agentes)

1. No features fuera de `bot_requirements.md`. v2 es no.
2. Scanner local; LLM solo cuando el usuario envía un mensaje en un hilo (o una línea de huddle que no es el guion demo).
3. Persistencia por `services/*`.
4. Toda mutación de Maia: comentario en la carta + fila en `actionLog`.
5. UI en español, ids internos en inglés (`thin`, `stale`, `applyMode`).
6. Cero emoji. No renombrar Maia a “Asistente IA”.
7. Entrega por slice: `npm test` + `npm run build`. Slices de Maia además caminan el demo de §17.
8. Commits: solo OpenCode, mensajes concisos en español, sin secretos.

---

## Punch list / notas

Slice 1 implementado por OpenCode (2026-09-07). Notas para Grok:

- **Adapter único** en `src/services/projectStorage.js`: `toDocument(runtime→canónico)` y `fromDocumentCanonical/normalizeProject` (canónico o legacy v2/v3 → runtime). Board/Gantt/context siguen consumiendo `buckets`/`tasks`/`assignedUser`; el documento persistido es canónico §12 (`columns`/`cards`/`assigneeIds[]`/`settings{applyMode,staleDays}` + `inquiries[]`/`actionLog[]`/`huddle`).
- **Decisión humana (actualizada en slice 4, reemplaza la anterior)**: fechas del seed **relativas al primer run**. `DB/sample_data.json` sigue estático como template; al sembrar (`loadSeedProjects`) `reanchorSeedDates` ancla el hito go-live a **hoy + 7 días** y corrió todo el calendario con el mismo delta (gaps preservados: stale ~18 días, hito ~7 días, overlap). Sin builder dinámico; el re-anclaje es idempotente.
- **Decisión humana**: proyectos nuevos parten de **2 columnas** "Por hacer"/"En curso" (`createDefaultProject`). Asignación sin hardcode: `AssigneeSelector` lista los `members` del proyecto.
- **Auto-seed al primer arranque** (`localStorageBackend.loadProjects`). Store vacío (`{}`) respeta borrados. `projectStoredVersion` → 4 (clave `v3` intacta).
- **Identidad**: `ACTIVE_USER` = Lucía Ríos (`u_lucia`) en `constants/project.js`, usada por auth seed y migraciones.
- `lastActivityAt` se pisa en addTask, updateTask (assign/fechas/bloqueo), moveTaskToBucket, addComment, toggleTaskCompleted y setTaskStatus ($§12: move, comentario, assign, fechas, bloqueo).
- Reset demo disponible en Home ("Restaurar demo" → `resetDemo`). No hay panel de settings por proyecto todavía (slice 2+ lo dirá).
- Aceptación verificada: seeds ≥2 y cartas §13 (con huecos), reset determinista, tests 109 verdes, build OK. La app en Fly (modo server) no se tocó.
- MIRROR de cartas para review de Grok: 9+1 (incl. go-live), ver `src/services/__tests__/seed.test.js`.

_(Grok escribe aquí tras un review. Punch list del diff pendiente.)_

### Review de Grok (2026-09-07) — fix aplicados por OpenCode

1. **dueño migrate** (`u_demo` → Lucía): docs viejos con owner heredado o ausente ahora resuelven a `u_lucia` (alias `u_demo` en `resolveOwnerId` → `fromDocumentCanonical`/`toDocument`/`normalizeProject` legacy). Store v3 legacy ya no queda invisible en Home. Test:
   `localBackend.test.js` (store legacy owner u_demo) + `projectStorage.test.js` (default owner Lucía).
2. **Hito go-live** movido de `Hecho` → `En curso` en el seed: ya no se deriva `completed`, el Gantt lo muestra por defecto (y En curso queda 4 > wipLimit 3 = “WIP informa, no bloquea”). `seed.test.js` actualizado.
3. **Reset demo** reemplaza proyectos demo previos (`seed_*`) en lugar de apilar duplicados; conserva proyectos creados por el usuario. `ProjectContext.resetDemo`.

Aceptación re-verificada: `npm test` 110/110 · `npm run build` OK.
Slice 1 queda en `review` para promotor de slice 2 (o `done` si el humano lo da por cerrado).

### Slice 2 implementado por OpenCode (2026-09-07) — notas para Grok

- **Runtime multi-responsable**: las tareas pasan de `assignedUser` a `assignedUsers[]` (fuente única; el documento persistido no cambia, §12 ya usa `assigneeIds[]`). Legacy single-assignee se normaliza en lectura. Decisión humana: el hito go-live del seed ahora es multi (Lucía + Sofía) y con `milestone: true`.
- **Bloqueada**: `TaskModal` expone checkbox + motivo → `blocked/blockedReason`; la carta del Kanban muestra stripe roja + etiqueta "bloqueada". `lastActivityAt` se pisa por `updateTask`.
- **Kanban**: avatares de iniciales por responsable (collapse +N); badge WIP `n/límite` en columnas con `wipLimit` (informativo, ámbar si se excede; el drop **no** se bloquea, no hay lógica que lo impida).
- **Gantt**: canal **Sin fechas** (las cartas sin rango salen de sus buckets y viven en su propia fila, sin barra inventada; click abre el modal). Marcas **overlap** (chip + ring en la barra) vía `findOverlaps` (§6, caso Martín checkout↔analytics). **Hitos** en el header del timeline (línea + etiqueta posicionada por día, alineada con las barras). Eje ampliado a ~10d atrás / ~3 sem adelante (§6). **No** se cambió el color de la barra (decisión humana: mantener color por estado; la paleta tierra es slice 3).
- **Además**: mantiene CPM/arrows, "mostrar finalizadas", colapso de grupos, drag&drop de buckets como antes.
- Tests: `npm test` **119/119** · `npm run build` OK. Nuevo `src/utils/__tests__/ganttSchedule.test.js`; `GanttView.test.jsx` chequea canal Sin fechas, overlap ≥2 e hito; `projectStorage.test.js` cubre multi + blocked + milestone round-trip y legacy single→multi; `seed.test.js` valida el hito multi.

### Review del slice 2 (2026-09-07) — fix aplicados por OpenCode

1. **Import muerto**: `clampProgress` sin uso en `ganttSchedule.js` eliminado.
2. **Fechas parciales** (solo inicio o solo fin, posibles desde el modal): antes esas cartas desaparecían del Gantt. Ahora el canal **Sin fechas** captura cualquier carta sin rango completo (`!(startDate && endDate)`) y `GanttBar` solo dibuja barra si existen ambas fechas (§6 “no se inventa una barra”). Test en `ganttSchedule.test.js` (solo fin → Sin fechas, sin overlap).
3. **Test WIP**: `BucketColumn.test.jsx` (nuevo) verifica el badge `n/límite` y el estado ámbar al excederlo; sin `wipLimit` no aparece.
4. **Nota**: el badge WIP cuenta todas las cartas del bucket (incluye finalizadas ocultas). Informativo, se deja así; el WIP nunca bloquea el drop.
5. **Alcance asumido**: `findOverlaps` marca overlap si un hito (mismo día) coincide con otra barra del responsable; aceptado como edge.

Aceptación re-verificada: `npm test` 122/122 · `npm run build` OK.
Slice 2 queda en `review` para promotor del slice 3 (o `done` si el humano lo da por cerrado).

### Slice 3 implementado por OpenCode (2026-09-07) — notas para Grok

- **Paleta §14 aplicada**: escala `forest` (50–900, acento **bosque `#2b4d42`**) + tokens `paper/surface/ink/muted` en `tailwind.config.js`; `colors.status['in-progress']` → bosque. Sustituido `violet-*` → `forest-*` en **21 componentes** (incluye chrome de auth/login e invites). Sin hex suelto en JSX.
- **Tokens en `index.css`**: `:root` con papel `#efeae2`, ink `#1a1814`, muted `#6f6a62`, fondo/`body` en papel.
- **Tipografía §14**: Google Fonts **Fraunces** (display) + **Figtree** (UI) en `index.html`; `fontFamily.display/sans` en Tailwind; `font-display` solo en marca "Gantter", nombre de proyecto (Navbar y card), títulos de modales, "Diagrama de Gantt" y "Mis proyectos".
- **Palletas de datos** sin violeta: `models/bucket.js`, `services/projectStorage.js` → bosque; `utils/projectImage.js` → degradados de respaldo tierra (bosque/papel/rust/arcilla/muted). Fixtures de tests sincronizados (`#2b4d42`).
- **Cero emoji**: reemplazado `⚠` de `TaskCard` por badge de texto "tiene antecedentes".
- Forzado de respaldo de portadas: se mantiene picsum + degradado local (solo cambió el degradado).
- Tests: `npm test` **122/122** · `npm run build` OK.

_(Grok escribe aquí tras un review del diff del slice 3.)_

### Review del slice 3 (2026-09-07) — fix aplicado por OpenCode

1. **H1 — acento "Crítica" del Gantt sin migrar a tierra**: `GanttBar.jsx` (barra) y `GanttView.jsx` (leyenda) usaban rojo neón de sistema `red-600`/`red-700`, mientras el slice 3 declaró `status.critical: '#a33a32'` (rojo desaturado tierra §14) sin consumirlo. Se agregó el token top-level `critical: '#a33a32'` a `tailwind.config.js` y se usó `bg-critical`/`border-critical` en barra crítica y leyenda. Los rojos de error/borrado (destroy) quedan igual: son semánticos de destrucción, no acento crítico.
2. **C1 (decisión)**: los grises/negros neutros de sistema (`gray-*`, `bg-white` en tarjetas/modales/desplegables) se mantienen como neutros de lectura; no son color de marca y §14 permite neutros. `bg-surface` se aplicó al chrome (Navbar, Tabs, Projects landing). No se persigue la migración total blanco→surface.
3. **C2 (decisión)**: `colors.status.*` quedó sin consumidores (las clases de estado se escriben directas); se deja declarado por el spec, no genera clases duplicadas.
4. Cero emojis verificado (incl. `⚠` reemplazado); fondos en papel; fuentes con pesos 400–700; fixtures de datos en paleta.

Aceptación re-verificada: `npm test` 122/122 · `npm run build` OK. **Slice 3 → `done`**.

### Slice 4 implementado por OpenCode (2026-09-07) — notas para Grok

Decisión humana previa al build: **el slice 4 lo implementa OpenCode** (aunque en la tabla dice grok) con las tres decisiones de `§19`: (1) ownership → opencode; (2) toggle applyMode **visible y persistente** desde el panel (el comportamiento auto/confirmar real es slice 5); (3) fechas del seed **relativas al primer run**.

- **Scanner determinístico** (`src/services/inquiryEngine.js` + `src/constants/maia.js`): 5 kinds sin LLM — `thin`/`unassigned`/`stale` solo en columnas de trabajo (Listo/En curso, nunca Backlog ni Hecho); `missing-date` = carta sin rango completo en la columna de un hito próximo (≤10 días) o en la columna de trabajo previa, sin duplicar avisos sobre cartas que ya avisan thin/unassigned; `overlap` = un inquiry por responsable con barras que se pisan vía `findOverlaps`, anclado a la primera carta solapada. El rescan con el mismo set devuelve lo mismo (anti-loop).
- **Hilos y ciclo de vida**: identidad `kind:cardId`; Snoozed se respeta; cuando la condición desaparece se **auto-resuelve** con `resolvedNote` + entrada en `actionLog` (`source: 'auto'`) y motivo ("volvió a moverse", "cargó sus fechas", etc.). Una carta que deja de ser stale frente al hito puede reflotar como missing-date (cambio de lente, no duplicación).
- **`MaiaContext`** fuera de `ProjectContext.jsx`: escucha `project.version`, rescannea y **escribe solo si cambió** vía `mutateProject` (wrapper expuesto por ProjectContext). Expone `inquiries`, `openCount`, `actionLog`, `applyMode`, `staleDays` y `setApplyMode` (persiste en `settings.applyMode`).
- **Panel Maia** (`components/maia/`): dock derecho `w-[360px]` en `AppShell` (`hidden lg:flex`, mobile = slice 8). `MaiaMark` (monograma geométrico con arco de escucha, bosque sobre papel, sin cara/emoji §14), header con contador de abiertas, toggle de modo, pestañas **Preguntas | Huddle | Registro**. Preguntas lista open/chatting + separa Aparcadas; Huddle = estado vacío (slice 7); Registro = actionLog read-only con tiempo relativo en español.
- **Plumbing de datos**: `ProjectContext` ahora expone `mutateProject` y `setSettings` (puerta de datos para Maia, commitToStore sigue privado). `mergeProjects` (collab) conserva los **campos de documento** `ownerId/teamName/summary/image/coverSeed/inquiries/actionLog/huddle/settings` por LWW del doc más reciente (no se pierde estado de Maia en un merge realtime).
- **Seed relativo**: `src/utils/seedAnchoring.js` `reanchorSeedDates` corre el calendario del template (go-live → hoy+7, timestamps y date-only incluidos, comentarios y miembros también); se aplica en `loadSeedProjects` (único loader: primer run, reset demo y mode server comparten). `DB/sample_data.json` no se tocó.
- Tests: `npm test` **140/140** · `npm run build` OK. Nuevos: `inquiryEngine.test.js` (6), `seedAnchoring.test.js` (5), `MaiaPanel.test.jsx` (4); extensión `collab.test.js` (campos doc) y `seed.test.js` (ancla ≈ hoy+7, gaps preservados, reset determinista).
- **Despliegue (OpenCode, 2026-09-07)**: `git push github main` (`d74553f..84e7d05`) disparó el workflow "Deploy to Fly.io" (run #9 → **success**). App viva en `https://gantter.fly.dev` sirviendo el build de `84e7d05` (assets `index-ItpN-OpR.js` + fuentes 400–700; `/api/health` → `{"ok":true}`). Deploy continuo activo: cada push a `main` depliega.

_(Grok escribe aquí tras un review del diff del slice 4. La app live permite probar el panel sin build local.)_

### Persistencia entre deploys + feedback + hidratación Maia (OpenCode, 2026-09-08)

Fuera de tabla de slices (pedido directo del humano): fix de persistencia, feature de feedback y un fix pendiente de la review del slice 4.

1. **Root cause del bug de persistencia entre deploys (CAS)**: `ProjectContext.commitToStore` bumpaba `version` **antes** de `persist`, y `ServerBackend.saveProject` mandaba ese version ya incrementado como `If-Match`. El servidor comparaba contra su versión almacenada (más vieja) → **409 en el 100% de los saves** → solo persistían creación y reset (no buckets/tareas). Fix: `commitToStore`/`persistRemote` pasan `expectedVersion: prev.version` (base, sin bump); `ServerBackend.saveProject` usa `expectedVersion` como `If-Match` y ante 409 reintenta con `data.remote.version` (self-healing). `persist` ya no esconde el fallo: si `saveProject` devuelve `false` → `syncStatus ERROR`.
2. **Fix H1 de la review del slice 4 (hidratación Maia)**: `MaiaContext` ahora hidrata `inquiries`/`actionLog` desde el documento persistido al abrir un proyecto (ref por `projectId`), conserva ids/snooze/Registro en vez de regenerar todo en cada reload; resetea limpio al cambiar de proyecto.
3. **Feedback** (backlog "errores y mejoras"): botón flotante abajo-izquierda en todas las pantallas (incl. login) con overlay (tipo Error/Sugerencia/Comentario + mensaje). Persistencia: server → `POST/GET /api/feedback` (tabla `feedback` en SQLite) con cola offline `gantter.feedback.pending.v1` que se flushea al iniciar sesión; offline → `gantter.feedback.v1`. Cada entrada guarda `author`, `screen` y un snapshot de `systemState` (modo/backend/proyecto/conteos/sync/viewport/userAgent/hash). Nueva ruta `server/src/routes/feedback.js`.
4. **P3 de la review corregido**: claves duplicadas `mutateProject`/`setSettings` en el `value` de `ProjectContext` eliminadas.
5. **Proceso**: `AGENTS.md` y `HANDOFF.md` ahora exigen revisar el backlog de feedback (`GET /api/feedback` en prod / `listFeedback()` en dev) antes de cada slice.

Tests: `npm test` **165/165** (antes 140; +7 feedback, +7 FeedbackButton, +5 systemState, +3 MaiaContext, +3 serverBackend) · `npm run build` OK (sin warning de claves duplicadas). Server smoke-tested local (health OK, `/api/feedback` 401 sin sesión).
- **Despliegue (OpenCode, 2026-09-08)**: `git push github main` (`219d1c7..0d4d8cf`) → GH Actions run **34220452945 success** → Fly release **v12** (2m). Live verificado en `https://gantter.fly.dev`: `/api/health` ok, `/api/feedback` devuelve **401** sin sesión (ruta nueva servida), CSS `index-JfmJBa4E.css` = build 0d4d8cf. Verificación manual pendiente del humano: crear proyecto → agregar buckets/tareas → recargar y confirmar persistencia.

### Slice 5 implementado por OpenCode (2026-09-08) — notas para Grok

Decisión humana previa al build (vía `§19` en el chat): **slice 5 → opencode** (mismo precedente que slice 4); el **reply templated de Maia pasa al slice 6** (slice 5 es solo mecánica del hilo + propuestas desde catálogo §8); **hardening 409-identidad incluido** en este pase.

- **Triage del backlog de feedback**: 1 sola entrada (`type: "comentario"`, autor Cristian N. Menajovsky, pantalla `board · hola mundo!`, 2026-09-08 11:29) que dice textualmente **"No hacer nada"** → sin acción. Su snapshot reveló `sync.status: "error"` en un proyecto con `version 63`; observación anotada (verificar próximo ciclo), no bug confirmado.
- **Hardening 409 (Parte 0)**: `serverBackend.saveProject` ya no hace bail con `sameProjectAs` en un 409 idéntico; si el merge da `current` (server detrás del store optimista = desync), reintenta con `base = data.remote.version` y body `current` (LWW gana el más nuevo) → sana el desync y desaparece el error de sync sin causa en la barra. Se quitó la rutina `sameProjectAs`.
- **`proposalEngine.js`** (+ `PROPOSAL_STATUS` en `constants/maia.js`): `defaultProposalsFor(project, base, { now })` genera 1–3 propuestas determinísticas por kind al **crear** la inquiry (no se recalculan en cada scan): `unassigned` → asignar al miembro con menos carga (empate por nombre); `stale` → mover a Backlog + marcar bloqueada; `missing-date` → fechar hoy→endDate del hito próximo; `overlap` → reasignar la barra de menor endDate al miembro menos cargado; `thin` → `needsInput` (se completa en chat). `autoEligible(kind)` limita el **modo auto** §9 a `unassigned→assign`, `missing-date→set-dates`, `stale→set-blocked` (no move/overlap/thin, no needsInput).
- **`applyEngine.js`**: `canApply` (guarda aplicables-stale/fechas), `apply` → retorna `{ project, logEntry, task }` sin mutar, comentario en la carta `author: 'Maia'` + texto `proposal.comment`, log `{ id, at, source: 'auto'|'confirm', summary, cardId }`; `selectAutoActions` elige pendientes elegibles en un scan.
- **`MaiaContext.jsx`**: `sendThreadMessage(inquiryId, text)` persiste `thread[]` y pasa la inquiry a `chatting` (firma del usuario activo via `useAuth` || `ACTIVE_USER`); `applyProposal(inquiryId, proposalId, source='confirm')` aplica y resuelve la inquiry; `dismissProposal` descarta SIN aplicar; `snoozeInquiry` → `snoozed` + `snoozedUntil` = próximo miércoles 10:00 local (sintético hasta slice 7); auto-dispatch: el rescan aplica propuestas elegibles pendientes con comentario + log `source:'auto'` (una sola `mutateProject` compuesta).
- **`InquiryThread.jsx`** (nuevo) + `MaiaPanel.jsx`: las preguntas de la pestaña Preguntas ahora son **clickeables** (button) y abren el hilo en overlay con una sola mutación por paso (volver cierra sin mutar). Hilo: evidencia + bubbles de hilo + sección Propuestas por modo (confirmar → Sí/No; auto → botón único "Aplicar"; `needsInput` → sin botones, se completa en chat; aplicada/descartada → chip) + input "Responder como {usuario}" + snooze. En modo auto, el botón del hilo llama `applyProposal(id, proposalId, 'auto')` (misma semántica que el auto-dispatch). Registro muestra badges de fuente (Auto/Confirmada/Manual).
- **P2 heredado del slice 4 (anotado para slice 6)**: evidencia congelada en preguntas persistentes y branch muerto `ctx.hasNearMilestone` en `KIND_RESOLVE_TEXTS.MISSING_DATE`.
- Tests: `npm test` **196/196** (antes 165; +7 proposalEngine, +9 applyEngine, +5 MaiaContext, +7 InquiryThread, +2 MaiaPanel, +1 serverBackend) · `npm run build` OK · dev server responde 200. Nuevos: `proposalEngine.test.js`, `applyEngine.test.js`, `InquiryThread.test.jsx`. `MaiaPanel.test.jsx` cubre click pregunta → hilo → aprobar.

_(Grok escribe aquí tras un review del diff del slice 5.)_

### Review del slice 5 (2026-09-08) — hecha por OpenCode a pedido del humano; fixes aplicados

Review del diff contra `bot_requirements.md` §7 y §9. Punch list con fixes:

1. **P0 — modo confirm violaba §9**: el rescan despachaba propuestas elegibles **sin gate de `applyMode`** (auto-dispatch corría en confirm). Fix en `MaiaContext.jsx`: el efecto solo auto-aplica cuando `applyMode === 'auto'`; en confirm, el rescan deja todo pendiente. Test negativo nuevo: "en modo confirm el rescan NO aplica" (`MaiaContext.test.jsx`).
2. **P0 — `existingInquiries` era un espejo stale** (`inquiriesRef.current`) que perdía la fuente de verdad: mensajes del hilo no aparecían, descartar no tenía feedback en la UI y aplicar podía revertirse a pendiente en el siguiente scan. Fix: el efecto lee **`project.inquiries` / `project.actionLog`** (el documento es la fuente), siempre `setInquiries`/`setActionLog`, y escribe solo si cambió (aplicadas > 0, log distinto o set estable distinto) → anti-loop intacto.
3. **P2 — código muerto de chips**: `InquiryThread.jsx` solo renderizaba propuestas `pending` y dejaba inaccesibles las `applied`/`dismissed`. Ahora renderiza todas las propuestas y muestra el chip de cada estado. Test nuevo en `InquiryThread.test.jsx`.
4. **P2 — `ctx.hasNearMilestone` inexistente** en `KIND_RESOLVE_TEXTS.MISSING_DATE`: `inquiryEngine.js` calculaba los hitos próximos después de montar `ctx`. Movido antes; `ctx.hasNearMilestone` es positivo cuando hay hito próximo (el texto de resolución ahora dice "ya no pisa un hito próximo" solo si realmente no lo hace).
5. **P3 — `staleDays` hardcodeado 15** en `applyEngine.canApply`: ahora usa `MAIA_DEFAULTS.staleDays` de `constants/maia.js`.
6. **Tests de integración nuevos** (`MaiaContext.thread.test.jsx`, 3): con el scanner y `useAuth` reales vía provider — enviar mensaje lo muestra en el hilo y conserva `openCount 1`; descartar se refleja `dismissed` sin mutar la carta; aprobar aplica, marca `applied` y el rescan siguiente **no** lo revierte. Prueban los P0 1–2 contra el circuito completo.
7. **Determinismo**: test nuevo en `proposalEngine.test.js` (mismo input → mismas propuestas, sin dependencia del clock unhyped).

Anotado sin fix (depende del humano o slice 6): P1 confirm "No" debería pedir a Maia "¿qué habría que hacer entonces?" (deferido a slice 6 junto al reply templated); `autoEligible` `unassigned → assign` provisional a mínimo-carga hasta que §9 defina el match 1:1 de nombre (solo hay un seed con 2+ cargados, impacto nulo hoy); `dedupeLog` por `(summary|cardId)` puede descartar entradas legítimas repetidas; payload de overlap repite la carta en `cardIds`; 409 por LWW del más nuevo es tradeoff documentado.

Aceptación re-verificada: `npm test` **202/202** (antes 196; +1 MaiaContext negativo, +1 InquiryThread chips, +1 proposalEngine determinismo, +3 MaiaContext.thread integración) · `npm run build` OK · dev server 200.
Slice 5 queda en `review` para cierre del humano (o `done` si lo da por cerrado).

### Slice 6 implementado por OpenCode (2026-09-08) — notas para Grok

Decisión humana previa al build: **slice 6 → opencode** (mismo precedente que slices 4 y 5). Implementa §11 completo (LLM con fallback templated; proveedor final **OpenAI `gpt-4o-mini`** por decisión posterior del humano) sobre la mecánica del slice 5.

- **`src/services/maiaChat.js`** (nuevo): contexto ≤1200 chars, mensaje del usuario ≤1000 chars, hilo último 3 turnos al modelo (costo). Las acciones del LLM se validan contra ids reales (`sanitizeActions`), `actionsToProposals` las traduce a la misma forma de propuesta que `proposalEngine`, y `requestMaiaChat` **nunca lanza** (offline → templated; server → relay, 2 intentos máx, timeout 15s; fallo → templated).
- **`server/src/routes/maia.js`** (nuevo, montado en `index.js`): POST `/api/maia/chat` con `requireAuth`. **Decisión humana posterior (2026-09-08): el proveedor pasó de xAI `grok-4.5` a OpenAI `gpt-4o-mini`** (endpoint `/v1/chat/completions`, `process.env.OPENAI_API_KEY`, `process.env.OPENAI_MODEL || 'gpt-4o-mini'`), con recorte de costo: `max_tokens: 300`, `temperature: 0.4`, system prompt compacto. 502 en upstream/parse/shape. **La clave vive server-side** (`.env.example` nuevo: `OPENAI_API_KEY`, `OPENAI_MODEL`). Deploy sin la clave no rompe: el cliente degrada a templated. `bot_requirements.md` §11 actualizado al proveedor y presupuesto real.
- **`applyEngine.js`**: soporte `create-card` — `canApply` valida bucket existente + título; `apply` crea la tarea nueva (shape de §12, `name`, timestamps `now`, comentario de Maia) y logea con `cardId` = carta creada. `create-card` **nunca se auto-aplica** en modo auto (§9 no crear cartas solas):
- **`MaiaContext.jsx`**: `sendThreadMessage` persiste la firma del usuario (sync, mutator #1) y **luego** pide la respuesta (`requestMaiaChat`, `maiaReplying` expuesto); el reply aterriza en un mutator #2 que appendea la burbuja de Maia, traduce las acciones a propuestas (dedupe por `action|payload`), y en modo auto aplica con `canApply`/`apply` `source:'auto'` saltando `create-card`, con `dedupeLog`. `projectRef` = documento más fresco para el cierre async.
- **`InquiryThread.jsx`**: indicador "Maia está pensando…" mientras `maiaReplying`.
- **Fallback no-LLM**: en local/offline o en prod sin clave, Maia responde con `templatedMaiaReply` (sin acciones) — el hilo sigue demostrable en el demo §17 sin gastar la API.
- Tests: `npm test` **217/217** (antes 202; +10 maiaChat, +2 applyEngine create-card, +1 MaiaContext send+reply, +1 MaiaContext.thread reply, +2 InquiryThread indicador, +1 maiaChat presupuesto de tokens, +1 maiaChat contexto cap) · `npm run build` OK. Proveedor OpenAI `gpt-4o-mini` + recorte de costo implementado (contexto ≤1200 chars, mensaje ≤1000, hilo 3 turnos, `max_tokens 300`, temp 0.4).
- **Backlog de feedback**: prod `/api/feedback` exige sesión y no se pudo triagear net; la única entrada previa (Cristian, "No hacer nada") fue triageada en slice 5. Sin entradas nuevas accionables.

**Fix prod (2026-09-08, OpenCode, fuera de slice):** el contador de versión subía ~1/s en server mode por un loop save-echo (el server siempre bump+`updatedAt` al guardar y re-emitía por SSE al autor; `mergeProjects` devolvía un doc parcial sin `columns`/`cards`, así `merged ≠ remote` y se re-guardaba, bump+1 por vuelta). Arreglos: `mergeProjects` arranca del ganador LWW completo (no pierde campos); `handleRemote` ignora ecos que solo difieren en `updatedAt`; `saveProject` server idempotente (misma versión + mismo contenido → devuelve el estado sin bump). Tests `collab.test.js` nuevos (221 total).

**Requiere acción del operador** (no se commitean secrets): setear la clave para habilitar OpenAI en prod → `flyctl secrets set OPENAI_API_KEY=sk-...` (modelo default `gpt-4o-mini`; opcional `flyctl secrets set OPENAI_MODEL=gpt-4o-mini` y `flyctl secrets unset XAI_API_KEY XAI_MODEL` para limpiar). Sin esto, prod sigue servicial templated sin errores ni gasto.

_(Grok escribe aquí tras un review del diff del slice 6.)_

### Slice 7 implementado por OpenCode (2026-09-09) — notas para Grok

Decisión humana previa al build: **slice 7 → opencode** (mismo precedente que slices 4–6); demo **autoplay ~2s/paso** con pausa/reanudar; línea de texto del usuario con **path LLM + fallback templated**.

- **`src/services/huddleEngine.js`** (nuevo, puro): `createHuddleSession`, `addLine`, `applyDemoStep` (widget de resolución: id por `card_webhook`/`card_magic_link`/`card_onboarding`/`card_qa_staging`/hito go-live con fallback por título; si la carta no existe o la precaución ya está resuelta → línea sin mutación), `stopSession`/`finishPlayback`, `recapText`, `buildStandupSteps` (guion §10 §17.5: Diego bloquea Webhook, Martín toma Auth magic link, Sofía admite onboarding estancado → pregunta, Ana fechas para QA → set-dates hoy→go-live), `interpretHuddleLine` (mismo `requestMaiaChat` del slice 6 + `actionsToProposals`; sin `source:'llm'` → `templatedHuddleReply`), `welcomeFor`, `DEMO_STEP_MS=2200`. Aplicar = `applyEngine.apply` con `source:'auto'` (comentario + log) si `applyMode==='auto'`; si `'confirm'`, la propuesta queda en `huddle.pending` para sí/no. Recap final de Maia ("¿qué queda sin dueño?").
- **`MaiaContext.jsx`**: slice huddle — `huddle`, `demoStatus`, `highlightedTaskIds` (Set), `startHuddle(ritual)`, `stopHuddle`, `toggleDemo`, `sendHuddleLine(text)` (firma como Lucía, interpreta, aplica en auto saltando `create-card`), `resolveHuddleProposal(id, accepted)`; el playback es un effect de `setTimeout(DEMO_STEP_MS)` keyed en `[project?.id, demoStatus, huddle?.demo?.cursor, mutateProject]` (el rescan no re-arranca el timer). `useHuddleHighlights` (hook opcional, Set vacío estable) para `TaskCard`/`GanttBar` sin romper husos que no tengan provider.
- **UI** (`src/components/huddle/`): `RitualPicker` (rituales con demo: standup es el único con `demo`; HUDDLE_RITUALS en `constants/maia.js`), `HuddleSessionBar` (botón global en `AppShell`: Abrir huddle, ritual activo, elapsed, play/pausa, cerrar), `HuddleTab` (pestaña del panel Maia: transcript speaker+hora, propuestas pendientes sí/no por modo, input "Responder como Lucía Ríos", sesión cerrada sin input). Highlight: ring `ring-2 ring-forest-500` en `TaskCard` y `GanttBar`.
- **Aislamiento §18**: huddle por proyecto en `project.huddle` (persistido); cambiar de proyecto desmonta el playback (effect keyed por `project.id`).
- **Fix demo seed relativo**: el demo corre contra las cartas reales del proyecto con fechas re-ancladas (§15), así `set-dates` y el hito go-live se comportan igual que en el tablero.
- Tests: `npm test` **249/249** (antes 221; +14 huddleEngine, +6 HuddleTab, +4 HuddleSessionBar, +4 MaiaContext.huddle integración con provider real + fake timers). `npm run build` OK.

**Nota para Grok**: verificar contra §10/§17.5 el guion del demo (orden y quién habla) y que el demo aplique con `applyMode:'auto'` igual que el auto-dispatch del slice 5. El fallback templated del huddle usa `Maia` y pregunta qué carta toma la línea (§11).

- **Despliegue (OpenCode, 2026-09-09)**: `git push github main` (`9712771..f6c7c3a`) → Fly release **v22** (complete). Live verificado en `https://gantter.fly.dev`: `/api/health` ok; assets CSS `index-Cssp0Zid.css` + JS `index-Db2H991F.js` = build local `npm run build`. El mirror `origin` (Gitea 192.168.0.50) estuvo caído al momento del deploy; queda pendiente re-push a `origin` cuando vuelva.

- **Feedback de prod y fix (OpenCode, 2026-09-09)**: retro del usuario en v22: US-H1 (demo que mueve cartas) ✓ confirmado; US-H2 (el chat no sigue el hilo de la conversación) y US-H3 (faltan botones play/pausa cuando el demo termina). Causas: doble mapeo del hilo (`interpretHuddleLine` armaba strings y `requestMaiaChat` los re-mapeaba como objetos → el relay recibía `undefined: undefined`) y fallback templated de estado cero; el playback no ofrecía reintentar tras `done`. Fix en `b54c0cf` + `955cb13` → release **v25** (complete; v24 falló por coma faltante en `SYSTEM_PROMPT` de `server/src/routes/maia.js`, corregida): (1) `interpretHuddleLine` pasa historial como objetos `{role,text}`; (2) `requestMaiaChat` normaliza el hilo defensivamente (objetos o strings); (3) prompt del relay para kind `huddle` ("seguí la conversación del Hilo reciente, no reinicies la pregunta"); (4) `templatedHuddleReply` contextual que reconoce la carta mencionada por nombre completo; (5) `replayDemo` = sesión nueva con transcript limpio (sin el guard de `startHuddle`) + botón **"Reproducir de nuevo"** en la barra cuando el demo llega a `done`. Suite **255/255** (35 archivos; +2 huddleEngine, +1 maiaChat, +1 MaiaContext.huddle, +1 HuddleSessionBar) y build OK (`index-Biwdhaw9.js`). Live verificado: `/api/health ok`, `POST /api/maia/chat` devuelve 401 sin sesión. Pendiente confirmar 200 vs 50x con sesión (DevTools Network) y re-push a `origin` Gitea.

**OPENAI_API_KEY**: ya seteada en Fly (`flyctl secrets list` → Deployed); el relay LLM está habilitado en prod. Sin clave, prod degrada a templated sin error.

- **Prompts de Maia → `maia/` (markdown configurable, OpenCode, 2026-09-09)**: la voz de Maia salió del código a `maia/` (sistema/`persona.md`, `templates/*.md` por kind, `huddle/{welcome,reply,demo,recap}.md`). Config a **nivel app** (un solo set global; por proyecto no, aún). Consumo: cliente por `?raw` + alias `@maia` (Vite; HMR en dev) con `src/utils/renderPrompt.js` (`#` = comentarios que no llegan al prompt, `{vars}`, secciones `##`); server lee `persona.md` por `fs` con env `MAIA_PROMPTS_DIR` y default hardcodeado de respaldo; el contrato JSON de salida y `max_tokens`/`temperature` quedan fijos en `server/src/routes/maia.js`. Dockerfile copia `maia/` al runtime. Sigue en código (lógica, no copy): selección por `kind`, cálculo de vars, ids/speakers/acciones del guion, plurales y vocabulario de gaps. Suite **266/266** (37 archivos; +4 renderPrompt, +7 maiaPrompts) y build OK (`index-WjI2zK8_.js`).

- **Workflow de iteración en dev (OpenCode, 2026-09-09)**: por decisión del humano, se itera en DEV con **push a Gitea por cambio** y **deploy a Fly solo al cierre del slice** (git github/fly quietos entre medio). Feedback del humano → el agente lo triage en cada planning via `feedback/inbox.jsonl` + `feedback/triage.md` (ver `feedback/README.md`); `scripts/pull-prod-feedback.mjs` baja los de prod read-only (SELECT en `/data/data.sqlite`), sin deployar. En este commit se instrumentó el pipeline (middleware dev `POST /dev/feedback` en `vite.config.js`, `pushToDevInbox` en `feedbackService.js` modo local fire-and-forget, triage/README, AGENTS.md y .gitignore `.claude/`).

### Punch list de Maia (5/6) implementado por OpenCode (2026-09-09) — notas para Grok

- **P1 — "No" a una propuesta sigue la conversación (§9/§17.4)**: el botón **No** de `InquiryThread` ya no corta la charla: llama `dismissProposal` (marca descartada) y encola `sendThreadMessage` con *"No por ahora. ¿Qué habría que hacer entonces?"* → la pregunta pasa a `chatting`, la burbuja queda visible y Maia responde (LLM con key o fallback templated sin) sin re-proponer lo descartado; si el reply trae acciones alternativas, en modo confirmar quedan como propuestas nuevas pendientes (Sí/No).
- **P2 — Evidencia viva (§8, heredado del slice 4)**: `scanInquiries` ya no congela `question`/`evidence` de una inquiry persistente: en el merge del rescan las refresca del candidato fresco (días de stale, columna actual, hito próximo, conteo de solapadas) conservando id, hilo, propuestas, status y snooze; si nada cambió se reutiliza el objeto (`sameSet` estable → anti-loop intacto, para stale a lo sumo ~1 escritura/día).
- **Triage 2026-09-09**: `pull-prod-feedback` sin entradas nuevas; el comentario de Login (`d4e880c5…`) quedó **`backlog rework`** por decisión humana (no entra a slice 8).
- Tests: `npm test` **266/266** (+3 `inquiryEngine` P2, +1 `MaiaContext.thread` integración P1) · `npm run build` OK.

### Punch list abierta para un próximo ciclo (review Grok 2026-09-09) — pendiente de implementar

- ~~**P1-rework (§9.200)**~~: **DONE** en slice 14 (`declineProposal` local sin LLM, gate `followedUpAt`, sin loop). Review 14 (`1a3c24b` + `1875594`): cubre también el "No" escueto en texto libre (`isDeclineMessage`), pasa el inquiry a `chatting`; `dismissProposal` (API de bajo nivel sin uso) se eliminó, y la segunda burbuja queda en "Queda abierta." porque el botón del footer ya ofrece el recordatorio.
- **Decisión humana (2026-09-10) §9.200**: el **botón "No" del hilo es el camino canónico** de declinación. `isDeclineMessage` solo cubre negaciones escuetas en texto libre; los "No" multi-palabra van al chat LLM y quedan fuera de la protección anti-loop (documentado en `src/utils/declineMessage.js`).
- **Nota overlap (§8)**: la identidad de un inquiry `overlap` es `kind:anchorId`; si cambia el anchor se pierde el hilo. Para "evidencia viva" de overlap conviene key por responsable. No bloquea.
- **Mobile (slice 8)**: pasa a **v2** por decisión humana (2026-09-10).

### Slices 9–10 (2026-09-09) — notas para Grok

- **9 · Rename Maie → Maia** (`4c58631`, 55 files, 420/420 sustituciones, `rg -i 'maie'` = 0): dirs `maie/`→`maia/`, `components/maie`→`components/maia` (MaieMark→MaiaMark, MaiePanel→MaiaPanel), `MaieContext.jsx`→`MaiaContext.jsx`, `maieChat.js`→`maiaChat.js`, `constants/maie.js`→`constants/maia.js`, `server/src/routes/maie.js`→`maia.js`, alias Vite `@maie`→`@maia`, Dockerfile `COPY /app/maia`, docs (bot_requirements, HANDOFF, AGENTS, README, TASKS, adr-001), prompts `maia/*.md`. UTF-8 intacto (sin U+FFFD). Tests **266/266**.
- **10 · Números de carta `#N` por proyecto** (slice en curso): `number` = etiqueta inmutable por proyecto (no id, no se reusa tras borrado), asignada `max+1` al crear (`addTask` en `ProjectContext`, `create-card` en `applyEngine`); tareas sin número reciben **backfill 1..N en orden** en `normalizeProject` y `fromDocumentCanonical`; se conserva en el round-trip canónico (`toCards` escribe `number`, `normalizeCard` la pasa). UI: chip `#N` en `TaskCard` y `GanttBar`; labels de propuestas con `#N` (`proposalEngine.cardRef`, `maiaChat.taskTitle`). `bot_requirements.md` §12 (Card entidad): campo `number` documentado. Tests **270/270** (task +5, applyEngine +1, projectStorage +1/backfill) · `npm run build` OK.

### 11 · Huddle real: escuchar la reunión (2026-09-09) — notas para Grok

- **`src/services/liveLineMatcher.js`** (nuevo, puro, 0 tokens): `matchLiveLine(text, {tasks, members, self, now})` → `{cardIds, actions, confidence, note}`. Ancla por **número de carta `#N`** (slice 10) o título exacto único; miembro por nombre (completo o primer nombre); primera persona ("me quedo con la 12") → `self` (Lucía). Verbos: asignar (`asign*`, "que la tome X", "en manos de"), bloquear ("se bloqueó"), fechar ("fechamos" → hoy/hoy, no se inventan fechas). `create-card` **no se emite**: derivar bucket/título de voz sería inventar (§). Confianza: `high` = carta + verbo claro (aplica en auto, propuesta sí/no en confirmar); `low` = sin señal → pregunta templated (nunca crea notas ni decenas de cartas, respeta §16).
- **`src/hooks/useSpeechToText.js`** (nuevo): `speechToTextSupported()` + `useSpeechToText({...})` sobre `webkitSpeechRecognition` (Chrome/Edge). Interims solo en vivo (nunca se persisten); los resultados finales van a `onFinal` como línea del usuario activo, con `autoRestart` para seguir el huddle; `supported=false` → el botón se oculta (quedan demo y línea escrita).
- **`MaiaContext.jsx`**: `submitHuddleMicLine(text)` — persiste la línea (Lucía, con `cardIds` del matcher), aplica en auto solo match `high` con `source:'auto'` (comentario + log), en confirmar deja propuesta sí/no; `matchedKeys` por sesión (`action|payload`) como anti-loop si el navegador re-emite el mismo final. Sin señal → `templatedHuddleReply` contextual (determinística). `proposalFromAction` ahora es exportado y etiqueta con `#N`; `createHuddleSession` gana `matchedKeys: []`.
- **UI**: `HuddleTab` tiene botón mic (icono Mic/Square) a la par de Enviar, indicador "Escuchando…" con interim en vivo, y feature-detect (oculto sin `SpeechRecognition`). Copy es español ("Escuchar reunión", no "transcripción").
- **Spec**: §10 "Cómo entra el habla" agrega la vía 3 (Web Speech) y aclara que no es "transcripción como feature de portada" (§16): la línea entra al transcript, la acción pasa por propuestas/log normales y toca cartas una por una.
- Tests: `npm test` **286/286** (antes 284; +2 HuddleTab re-escucha/stop) · `npm run build` OK. Pendiente validar en Chrome/Edge real (SpeechRecognition solo en contextos seguros; `npm run dev` y Fly son HTTPS).
- **Fix post-QA**: el auto-restart del mic tenía un guard por estado (`listening`) que quedaba stale tras el primer final → nunca re-escuchaba. Ahora se usa `runningRef` (ref, nunca stale); `onerror` frena el reintento (permiso). `HuddleTab` corta el mic (`mic.stop()`) al cerrar la sesión para no dejar el reconocimiento activo invisible. Test: `seedAnchoring` "desplaza timestamps" pasaba a marcar un salto de 1 h por DST del TZ local (asumía días de 24 h exactas); la aserción ahora compara contra el mismo `addDays` (días de calendario en hora local), robusto a cambios de horario. Sin cambios de spec: comportamiento idéntico.
- **Revisar contra §10/§11/§16**: que el mic no desborde el modo confirm (todo lo que aplica en auto también existe como propuesta), que el matcher respete "no auto-crear decenas de cartas" y que los labels con `#N` queden legibles en el transcript.

### 12 · Información del proyecto: documentos markdown (2026-09-10) — notas para Grok

- **Entidad `Document`** (§12): id, title, content (markdown), createdAt, updatedAt. `Project.documents[]` viaja en el documento canónico (`toDoc`/`fromDocumentCanonical`/`normalizeProject` lo pasan; backfill `[]` idempotente para docs legacy). **No son "notas desconectadas"**: son dato del proyecto, igual que cartas/columnas.
- **API en `ProjectContext.jsx`**: `createDocument({title, content})` (devuelve id, `commitToStore` debounce), `updateDocument(docId, patch)`, `deleteDocument(docId)` (inmediato). Expuestas en `value`; sin tocar en paralelo.
- **`src/utils/markdownPreview.js`** (nuevo): `renderMarkdownPreview(text)` con `marked` (`gfm`, `breaks`) + sanitización post-marca (quita script/iframe, atributos `on*`, `href`/`src` con `javascript:`). Sin DOMPurify (sin dep extra): las XSS reales de markdown no vienen de URLs javascript: de links (marked no las genera) sino de HTML crudo, que se limpia por regex.
- **`src/components/projects/ProjectInfoView.jsx`** (nuevo): OneNote-like — sidebar "Documentos" + "Nuevo documento", editor central con título/acciones/Ver-Editar/autosave (debounce 700 ms + flush al desmontar), menú "Acciones" = Renombrar/Duplicar/Descargar .md/Eliminar (confirm). El editor muestra drafts locales propios (no depende de que el doc exista ya en el store), así "Nuevo documento" edita al toque y se sincroniza apenas llega el doc real.
- **UI**: pestaña "Información del proyecto" en `TabsSwitcher` (`VIEWS.INFO`) → `ProjectInfoView` en `AppShell`. Seeds (Portal y App móvil) con 1 doc "Ficha del proyecto" markdown de ejemplo, **sin** onboarding (slice 13).
- Tests: **302/302** (projectStorage +2 round-trip/backfill documents, markdownPreview 4, ProjectInfoView 8 con el patrón de mock de ProjectsLanding, TabsSwitcher 2) · `npm run build` OK.
- **Siguiente**: slice 13 = onboarding (modal de preguntas por proyecto nuevo con dictado + autosave; la "Ficha del proyecto" pasa a ser el doc donde se agregan las respuestas) — alcance y decisiones de §19 pendientes si el humano lo pide.

### 13 · Onboarding de proyecto nuevo (2026-09-10) — notas para Grok

- **Preguntas configurables**: `maia/onboarding/questions.md` (= convenio de templates de Maia, se re-empaqueta en cada deploy). `## Título` = pregunta (id derivado `slugId` en inglés/kebab; título pasa como heading de la Ficha); líneas con una sola `#` son comentarios. Parser puro en `src/utils/parseOnboarding.js` (`parseOnboardingQuestions`, `slugId`, `answeredCount`).
- **Modelo `Onboarding`** (§12): `{ answers, currentQuestionId?, done }`. Proyectos nuevos (`createDefaultProject`) lo traen activo; legacy y seeds (`"onboarding": null` en `sample_data.json`) quedan sin bloque. `normalizeOnboarding`/`defaultOnboarding`/`buildFichaContent`/`syncFichaDocument` en `src/services/onboardingService.js` (backfill round-trip canónico en `projectStorage`).
- **Ficha regenerada hasta `done`**: `syncFichaDocument` crea/actualiza el Document "Ficha del proyecto" (solo respuestas con texto, en el orden de las preguntas); al marcar `done` queda congelada (editable a mano en la pestaña). Es dato del proyecto (§12/§16), no una nota desconectada.
- **API en `ProjectContext.jsx`**: `updateOnboarding(patch)` (nav y done), `saveOnboardingAnswer(qid, text)` (funde answers + sincroniza la Ficha), `completeOnboarding()` → `done`. Sin tocar en paralelo.
- **UI**: bloque "Ficha del proyecto" arriba de Preguntas en `MaiaPanel` (progreso N de M + botón "Responder estas preguntas"); `OnboardingModal` (`max-w-xl`) responde una por una con **autosave** (sin botón guardar: blur, nav, cerrar y Listo), Dictado opcional (`useSpeechToText` `autoRestart:false`/`continuous:false` → una frase por toque; oculto sin soporte), Anterior/Siguiente/Listo y barra de progreso.
- Tests: **322/322** (parseOnboarding 8, onboardingService 7, projectStorage +2 onboarding, OnboardingModal 5, MaiaPanel envuelto con `ProjectContext.Provider` por el nuevo bloque) · `npm run build` OK.
- **Revisar contra §12/§7/§16**: que la Ficha siga siendo dato del proyecto (no localStorage suelto), que el dictado en el modal no deje el reconocimiento activo, y que las seeds no rompan el round-trip (`onboarding: null`).
- **Contenido v1 (2026-09-10)**: el set de preguntas queda en 3 básicas — **Objetivo**, **Entregable**, **Equipo** (se quitan `Fechas` y `Riesgos`). El set vive en `maia/onboarding/questions.md` (config, no código); los tests de `onboardingService` y `OnboardingModal` se alinean al set (3 preguntas). Consecuencia aceptada: answers legacy de `fechas`/`riesgos` dejan de renderizarse en una ficha regenerada (solo afecta onboardings activos; seeds/legacy tienen ficha congelada).
- **Auto-apertura (2026-09-10)**: al abrir un proyecto con onboarding activo y **0 respuestas**, `MaiaPanel` abre el modal en primer plano vía efecto keyed en `project.id` (`dismissedRef` por proyecto/sesión: un cierre manual no reabre hasta recargar; el botón del bloque siempre reabre). No aplica a `onboarding: null` (demo/legacy) ni a `done`. **Fix server**: `resolveOnboarding(value)` (onboardingService) activa onboarding solo cuando la key falta (docs que crea el backend, legacy) y respeta `null` explícito — `createNewProject` (server) queda con onboarding activo de verdad (paridad local).

### Review OpenCode de 12–13 (2026-09-10) — fixes aplicados

1. **H1 — doc recién creado/duplicado nunca persistía**: `ProjectInfoView` abría con id `__pending__` ignorando el id real de `createDocument` → el autosave `updateDocument('__pending__')` era no-op y el texto tipiado se perdía (solo vivía en el draft local). Ahora se usa el id devuelto y se conserva el fallback de drafts para el tick en que el doc aún no está en el store. Test de regresión (el mock del harness agrega el doc como el contexto real): tipiar tras crear → `updateDocument` al id real con el contenido.
2. **P1 — el modal saltaba de pregunta al guardar con blur**: el reset de índice dependía de `[open, firstUnanswered]`, así que guardar una respuesta (blur) movía `firstUnanswered` y empujaba el índice a la siguiente pregunta. Ahora solo se resetea al abrir (`deps [open]` leyendo el primer pendiente vía ref). Test: blur-guardado no salta de índice en la misma sesión.
3. **P2 — modo server perdía onboarding/ficha**: `createNewProject` (server) guarda el doc raw de `projectStore.createProject` (sin `onboarding`/`documents`) → ahora se normaliza antes de `applyToStore` y, vía `resolveOnboarding`, el onboarding queda **activo de verdad** cuando la key falta (paridad con el path local). `resetDemo` (server) no copiaba `documents`/`onboarding`/`inquiries`/`actionLog`/`huddle` → copiados por paridad con los seeds.
4. **P3 — contador del modal contaba claves vacías** → `answeredCount` (solo texto); el botón de dictado se deriva de `speech.listening` (con `continuous:false` el `onend` corta solo y ya no quedaba "Detener" sin escucha).
- Tests **324/324** · `npm run build` OK. Slices 12 y 13 quedan en `review` para Grok (humano puede cerrarlos).

### Review OpenCode del auto-open (2026-09-11) — fixes aplicados `9529052`

- **R1 (P1) — el helper del test no testeaba el "volver al proyecto"**: `activeProjectWithOnboarding({ id: 'p_otro' })` vertía los overrides dentro del objeto `onboarding`, así que `project.id` nunca cambiaba y el efecto no re-disparaba (aserciones vacuamente verdaderas). El helper ahora usa firma `(onbOver, projectOver)` y el test afirma el estado intermedio (el modal SÍ abre para `p_otro`).
- **R2 (P2) — el modal no se cerraba al volver a un proyecto descartado**: si el usuario descartaba el onboarding de A, abría B (modal abierto por B) y volvía a A, `dismissedRef` impedía re-abrir pero no cerraba el modal que quedó abierto de B. El effect ahora hace `setOnboardingOpen(false)` cuando el proyecto está descartado.

### 15 · Accesos directos (2026-09-11) — notas para Grok

- **Entidad `Shortcut`** (§12): id, url, label (nombre visible), createdAt. `Project.shortcuts[]` viaja en el documento canónico (`createDefaultProject` `[]`, passthrough en `fromDocumentCanonical`/`toDocument`/`normalizeProject`; backfill `[]` idempotente para legacy y seeds sin la key).
- **`src/services/shortcutsService.js`** (nuevo, puro): `normalizeUrl` (auto-prepend `https://` si no trae scheme, solo `http:`/`https:`, bloquea `javascript:`/`data:`/`file:` → null), `labelForUrl` (hostname limpio sin `www.`), `normalizeShortcut` (deriva label si vacío), `defaultShortcuts`, `SHORTCUTS_MAX = 30`. El label se deriva también al crear en la vista (para que el tile no quede sin nombre hasta la primera persistencia).
- **API en `ProjectContext.jsx`**: `addShortcut({ url, label })` (devuelve id, debounce) y `removeShortcut(id)` (inmediato), mismo patrón que documentos. Expuestos en `value`.
- **`src/components/shortcuts/ShortcutsView.jsx`** (nuevo): grid auto-fill tipo Explorer — primer ítem "nuevo acceso directo" (carpeta con `+`, border dashed; se oculta al llegar a 30) abre el modal; tiles `FolderClosed` con label que abren `window.open(url, '_blank', 'noopener')`; hover muestra `Trash2` y el click pide confirmación inline "¿Eliminar? ✓/✕" (patrón ProjectCard). Contador N/30 y aviso "Máximo 30 accesos directos".
- **Modal "Nuevo acceso directo"**: `Modal.jsx` (`max-w-sm`) con Nombre (opcional, autofocus) + URL (obligatoria; Guardar deshabilitado si vacía; inválida → mensaje de error inline). Cancelar/Guardar.
- **UI**: pestaña "Accesos directos" en `TabsSwitcher` (`VIEWS.SHORTCUTS`) → `ShortcutsView` en `AppShell`.
- Tests: **347/347** (shortcutsService 8, projectStorage +2, ShortcutsView 9, TabsSwitcher 2 actualizado) · `npm run build` OK.
- **Revisar contra §12**: que `shortcuts[]` no rompa el round-trip de seeds (sin la key → `[]`), que el open use `noopener`, y que el límite de 30 solo afecte a la creación (no al borrar).
- **Pendiente humano**: push a `origin` (Gitea) de `2fa797b`, `030f526`, `4c58631`, `b6ae202`, `095c961`, `928313f`, `2b542e1`, `1e9ba4e`, `8700fc3`, `e0d06a5`, `1a3c24b`, `aaaad34`, `1875594`, `bf53678`, `7fccb15`, `9529052` y `26c48cd`.

---
