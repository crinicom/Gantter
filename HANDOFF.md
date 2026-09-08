# HANDOFF — Gantter v1 (Maie)

Protocolo de trabajo entre **Grok** (especifica + revisa) y **OpenCode** (implementa, commitea, deploya).

Producto: `bot_requirements.md`. No inventar features fuera de ese archivo. Lo marcado **v2** no se construye.

---

## Cómo trabajar

1. Leer este archivo y `bot_requirements.md` antes de tocar código.
2. Revisar el backlog de feedback (`GET /api/feedback` en prod, `feedbackService.listFeedback()` en dev) y triagear lo nuevo dentro del slice.
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
| Fecha | 2026-09-08 |
| Spec | `bot_requirements.md` (v1) |
| Slice en curso | 6 — Chat LLM (OpenAI `gpt-4o-mini`, costo mínimo) + fallback templated (asignado a OpenCode por el humano) |
| Owner | **opencode** |
| Status | `review` |
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
| 4 | Panel Maie + scanner determinístico (5 kinds, sin LLM) | opencode | **done** | §7–8 | commit `35adb76`; review Grok por OpenCode `0d4d8cf` |
| 5 | Click → hilo, auto/confirmar, propuestas, log | opencode | **review** | §7, §9 | dependía de 4; asignado a OpenCode |
| 6 | Chat LLM (OpenAI `gpt-4o-mini`) + fallback templated | opencode | **review** | §11 | depende de 5; asignado a OpenCode |
| 7 | Huddle in-app + standup demo que **muta** el tablero | grok | pending | §10, §17.5 | si el demo no mueve cartas, v1 no está |
| 8 | Mobile ~390: tabs Tablero / Gantt / Maie | opencode | pending | §14, §17.7 | después de que exista el panel |

Paralelo permitido **después de que 1 esté `done`**: OpenCode en 2–3, Grok en 4+, **si** Maie no vive en `ProjectContext.jsx`. Maie va a `MaieContext` / `services/inquiryEngine` / `services/huddleEngine` (nombres orientativos).

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

- Panel Maie, LLM, huddle, scanner.
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
4. Toda mutación de Maie: comentario en la carta + fila en `actionLog`.
5. UI en español, ids internos en inglés (`thin`, `stale`, `applyMode`).
6. Cero emoji. No renombrar Maie a “Asistente IA”.
7. Entrega por slice: `npm test` + `npm run build`. Slices de Maie además caminan el demo de §17.
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

- **Scanner determinístico** (`src/services/inquiryEngine.js` + `src/constants/maie.js`): 5 kinds sin LLM — `thin`/`unassigned`/`stale` solo en columnas de trabajo (Listo/En curso, nunca Backlog ni Hecho); `missing-date` = carta sin rango completo en la columna de un hito próximo (≤10 días) o en la columna de trabajo previa, sin duplicar avisos sobre cartas que ya avisan thin/unassigned; `overlap` = un inquiry por responsable con barras que se pisan vía `findOverlaps`, anclado a la primera carta solapada. El rescan con el mismo set devuelve lo mismo (anti-loop).
- **Hilos y ciclo de vida**: identidad `kind:cardId`; Snoozed se respeta; cuando la condición desaparece se **auto-resuelve** con `resolvedNote` + entrada en `actionLog` (`source: 'auto'`) y motivo ("volvió a moverse", "cargó sus fechas", etc.). Una carta que deja de ser stale frente al hito puede reflotar como missing-date (cambio de lente, no duplicación).
- **`MaieContext`** fuera de `ProjectContext.jsx`: escucha `project.version`, rescannea y **escribe solo si cambió** vía `mutateProject` (wrapper expuesto por ProjectContext). Expone `inquiries`, `openCount`, `actionLog`, `applyMode`, `staleDays` y `setApplyMode` (persiste en `settings.applyMode`).
- **Panel Maie** (`components/maie/`): dock derecho `w-[360px]` en `AppShell` (`hidden lg:flex`, mobile = slice 8). `MaieMark` (monograma geométrico con arco de escucha, bosque sobre papel, sin cara/emoji §14), header con contador de abiertas, toggle de modo, pestañas **Preguntas | Huddle | Registro**. Preguntas lista open/chatting + separa Aparcadas; Huddle = estado vacío (slice 7); Registro = actionLog read-only con tiempo relativo en español.
- **Plumbing de datos**: `ProjectContext` ahora expone `mutateProject` y `setSettings` (puerta de datos para Maie, commitToStore sigue privado). `mergeProjects` (collab) conserva los **campos de documento** `ownerId/teamName/summary/image/coverSeed/inquiries/actionLog/huddle/settings` por LWW del doc más reciente (no se pierde estado de Maie en un merge realtime).
- **Seed relativo**: `src/utils/seedAnchoring.js` `reanchorSeedDates` corre el calendario del template (go-live → hoy+7, timestamps y date-only incluidos, comentarios y miembros también); se aplica en `loadSeedProjects` (único loader: primer run, reset demo y mode server comparten). `DB/sample_data.json` no se tocó.
- Tests: `npm test` **140/140** · `npm run build` OK. Nuevos: `inquiryEngine.test.js` (6), `seedAnchoring.test.js` (5), `MaiePanel.test.jsx` (4); extensión `collab.test.js` (campos doc) y `seed.test.js` (ancla ≈ hoy+7, gaps preservados, reset determinista).
- **Despliegue (OpenCode, 2026-09-07)**: `git push github main` (`d74553f..84e7d05`) disparó el workflow "Deploy to Fly.io" (run #9 → **success**). App viva en `https://gantter.fly.dev` sirviendo el build de `84e7d05` (assets `index-ItpN-OpR.js` + fuentes 400–700; `/api/health` → `{"ok":true}`). Deploy continuo activo: cada push a `main` depliega.

_(Grok escribe aquí tras un review del diff del slice 4. La app live permite probar el panel sin build local.)_

### Persistencia entre deploys + feedback + hidratación Maie (OpenCode, 2026-09-08)

Fuera de tabla de slices (pedido directo del humano): fix de persistencia, feature de feedback y un fix pendiente de la review del slice 4.

1. **Root cause del bug de persistencia entre deploys (CAS)**: `ProjectContext.commitToStore` bumpaba `version` **antes** de `persist`, y `ServerBackend.saveProject` mandaba ese version ya incrementado como `If-Match`. El servidor comparaba contra su versión almacenada (más vieja) → **409 en el 100% de los saves** → solo persistían creación y reset (no buckets/tareas). Fix: `commitToStore`/`persistRemote` pasan `expectedVersion: prev.version` (base, sin bump); `ServerBackend.saveProject` usa `expectedVersion` como `If-Match` y ante 409 reintenta con `data.remote.version` (self-healing). `persist` ya no esconde el fallo: si `saveProject` devuelve `false` → `syncStatus ERROR`.
2. **Fix H1 de la review del slice 4 (hidratación Maie)**: `MaieContext` ahora hidrata `inquiries`/`actionLog` desde el documento persistido al abrir un proyecto (ref por `projectId`), conserva ids/snooze/Registro en vez de regenerar todo en cada reload; resetea limpio al cambiar de proyecto.
3. **Feedback** (backlog "errores y mejoras"): botón flotante abajo-izquierda en todas las pantallas (incl. login) con overlay (tipo Error/Sugerencia/Comentario + mensaje). Persistencia: server → `POST/GET /api/feedback` (tabla `feedback` en SQLite) con cola offline `gantter.feedback.pending.v1` que se flushea al iniciar sesión; offline → `gantter.feedback.v1`. Cada entrada guarda `author`, `screen` y un snapshot de `systemState` (modo/backend/proyecto/conteos/sync/viewport/userAgent/hash). Nueva ruta `server/src/routes/feedback.js`.
4. **P3 de la review corregido**: claves duplicadas `mutateProject`/`setSettings` en el `value` de `ProjectContext` eliminadas.
5. **Proceso**: `AGENTS.md` y `HANDOFF.md` ahora exigen revisar el backlog de feedback (`GET /api/feedback` en prod / `listFeedback()` en dev) antes de cada slice.

Tests: `npm test` **165/165** (antes 140; +7 feedback, +7 FeedbackButton, +5 systemState, +3 MaieContext, +3 serverBackend) · `npm run build` OK (sin warning de claves duplicadas). Server smoke-tested local (health OK, `/api/feedback` 401 sin sesión).
- **Despliegue (OpenCode, 2026-09-08)**: `git push github main` (`219d1c7..0d4d8cf`) → GH Actions run **34220452945 success** → Fly release **v12** (2m). Live verificado en `https://gantter.fly.dev`: `/api/health` ok, `/api/feedback` devuelve **401** sin sesión (ruta nueva servida), CSS `index-JfmJBa4E.css` = build 0d4d8cf. Verificación manual pendiente del humano: crear proyecto → agregar buckets/tareas → recargar y confirmar persistencia.

### Slice 5 implementado por OpenCode (2026-09-08) — notas para Grok

Decisión humana previa al build (vía `§19` en el chat): **slice 5 → opencode** (mismo precedente que slice 4); el **reply templated de Maie pasa al slice 6** (slice 5 es solo mecánica del hilo + propuestas desde catálogo §8); **hardening 409-identidad incluido** en este pase.

- **Triage del backlog de feedback**: 1 sola entrada (`type: "comentario"`, autor Cristian N. Menajovsky, pantalla `board · hola mundo!`, 2026-09-08 11:29) que dice textualmente **"No hacer nada"** → sin acción. Su snapshot reveló `sync.status: "error"` en un proyecto con `version 63`; observación anotada (verificar próximo ciclo), no bug confirmado.
- **Hardening 409 (Parte 0)**: `serverBackend.saveProject` ya no hace bail con `sameProjectAs` en un 409 idéntico; si el merge da `current` (server detrás del store optimista = desync), reintenta con `base = data.remote.version` y body `current` (LWW gana el más nuevo) → sana el desync y desaparece el error de sync sin causa en la barra. Se quitó la rutina `sameProjectAs`.
- **`proposalEngine.js`** (+ `PROPOSAL_STATUS` en `constants/maie.js`): `defaultProposalsFor(project, base, { now })` genera 1–3 propuestas determinísticas por kind al **crear** la inquiry (no se recalculan en cada scan): `unassigned` → asignar al miembro con menos carga (empate por nombre); `stale` → mover a Backlog + marcar bloqueada; `missing-date` → fechar hoy→endDate del hito próximo; `overlap` → reasignar la barra de menor endDate al miembro menos cargado; `thin` → `needsInput` (se completa en chat). `autoEligible(kind)` limita el **modo auto** §9 a `unassigned→assign`, `missing-date→set-dates`, `stale→set-blocked` (no move/overlap/thin, no needsInput).
- **`applyEngine.js`**: `canApply` (guarda aplicables-stale/fechas), `apply` → retorna `{ project, logEntry, task }` sin mutar, comentario en la carta `author: 'Maie'` + texto `proposal.comment`, log `{ id, at, source: 'auto'|'confirm', summary, cardId }`; `selectAutoActions` elige pendientes elegibles en un scan.
- **`MaieContext.jsx`**: `sendThreadMessage(inquiryId, text)` persiste `thread[]` y pasa la inquiry a `chatting` (firma del usuario activo via `useAuth` || `ACTIVE_USER`); `applyProposal(inquiryId, proposalId, source='confirm')` aplica y resuelve la inquiry; `dismissProposal` descarta SIN aplicar; `snoozeInquiry` → `snoozed` + `snoozedUntil` = próximo miércoles 10:00 local (sintético hasta slice 7); auto-dispatch: el rescan aplica propuestas elegibles pendientes con comentario + log `source:'auto'` (una sola `mutateProject` compuesta).
- **`InquiryThread.jsx`** (nuevo) + `MaiePanel.jsx`: las preguntas de la pestaña Preguntas ahora son **clickeables** (button) y abren el hilo en overlay con una sola mutación por paso (volver cierra sin mutar). Hilo: evidencia + bubbles de hilo + sección Propuestas por modo (confirmar → Sí/No; auto → botón único "Aplicar"; `needsInput` → sin botones, se completa en chat; aplicada/descartada → chip) + input "Responder como {usuario}" + snooze. En modo auto, el botón del hilo llama `applyProposal(id, proposalId, 'auto')` (misma semántica que el auto-dispatch). Registro muestra badges de fuente (Auto/Confirmada/Manual).
- **P2 heredado del slice 4 (anotado para slice 6)**: evidencia congelada en preguntas persistentes y branch muerto `ctx.hasNearMilestone` en `KIND_RESOLVE_TEXTS.MISSING_DATE`.
- Tests: `npm test` **196/196** (antes 165; +7 proposalEngine, +9 applyEngine, +5 MaieContext, +7 InquiryThread, +2 MaiePanel, +1 serverBackend) · `npm run build` OK · dev server responde 200. Nuevos: `proposalEngine.test.js`, `applyEngine.test.js`, `InquiryThread.test.jsx`. `MaiePanel.test.jsx` cubre click pregunta → hilo → aprobar.

_(Grok escribe aquí tras un review del diff del slice 5.)_

### Review del slice 5 (2026-09-08) — hecha por OpenCode a pedido del humano; fixes aplicados

Review del diff contra `bot_requirements.md` §7 y §9. Punch list con fixes:

1. **P0 — modo confirm violaba §9**: el rescan despachaba propuestas elegibles **sin gate de `applyMode`** (auto-dispatch corría en confirm). Fix en `MaieContext.jsx`: el efecto solo auto-aplica cuando `applyMode === 'auto'`; en confirm, el rescan deja todo pendiente. Test negativo nuevo: "en modo confirm el rescan NO aplica" (`MaieContext.test.jsx`).
2. **P0 — `existingInquiries` era un espejo stale** (`inquiriesRef.current`) que perdía la fuente de verdad: mensajes del hilo no aparecían, descartar no tenía feedback en la UI y aplicar podía revertirse a pendiente en el siguiente scan. Fix: el efecto lee **`project.inquiries` / `project.actionLog`** (el documento es la fuente), siempre `setInquiries`/`setActionLog`, y escribe solo si cambió (aplicadas > 0, log distinto o set estable distinto) → anti-loop intacto.
3. **P2 — código muerto de chips**: `InquiryThread.jsx` solo renderizaba propuestas `pending` y dejaba inaccesibles las `applied`/`dismissed`. Ahora renderiza todas las propuestas y muestra el chip de cada estado. Test nuevo en `InquiryThread.test.jsx`.
4. **P2 — `ctx.hasNearMilestone` inexistente** en `KIND_RESOLVE_TEXTS.MISSING_DATE`: `inquiryEngine.js` calculaba los hitos próximos después de montar `ctx`. Movido antes; `ctx.hasNearMilestone` es positivo cuando hay hito próximo (el texto de resolución ahora dice "ya no pisa un hito próximo" solo si realmente no lo hace).
5. **P3 — `staleDays` hardcodeado 15** en `applyEngine.canApply`: ahora usa `MAIE_DEFAULTS.staleDays` de `constants/maie.js`.
6. **Tests de integración nuevos** (`MaieContext.thread.test.jsx`, 3): con el scanner y `useAuth` reales vía provider — enviar mensaje lo muestra en el hilo y conserva `openCount 1`; descartar se refleja `dismissed` sin mutar la carta; aprobar aplica, marca `applied` y el rescan siguiente **no** lo revierte. Prueban los P0 1–2 contra el circuito completo.
7. **Determinismo**: test nuevo en `proposalEngine.test.js` (mismo input → mismas propuestas, sin dependencia del clock unhyped).

Anotado sin fix (depende del humano o slice 6): P1 confirm "No" debería pedir a Maie "¿qué habría que hacer entonces?" (deferido a slice 6 junto al reply templated); `autoEligible` `unassigned → assign` provisional a mínimo-carga hasta que §9 defina el match 1:1 de nombre (solo hay un seed con 2+ cargados, impacto nulo hoy); `dedupeLog` por `(summary|cardId)` puede descartar entradas legítimas repetidas; payload de overlap repite la carta en `cardIds`; 409 por LWW del más nuevo es tradeoff documentado.

Aceptación re-verificada: `npm test` **202/202** (antes 196; +1 MaieContext negativo, +1 InquiryThread chips, +1 proposalEngine determinismo, +3 MaieContext.thread integración) · `npm run build` OK · dev server 200.
Slice 5 queda en `review` para cierre del humano (o `done` si lo da por cerrado).

### Slice 6 implementado por OpenCode (2026-09-08) — notas para Grok

Decisión humana previa al build: **slice 6 → opencode** (mismo precedente que slices 4 y 5). Implementa §11 completo (LLM con fallback templated; proveedor final **OpenAI `gpt-4o-mini`** por decisión posterior del humano) sobre la mecánica del slice 5.

- **`src/services/maieChat.js`** (nuevo): contexto ≤1200 chars, mensaje del usuario ≤1000 chars, hilo último 3 turnos al modelo (costo). Las acciones del LLM se validan contra ids reales (`sanitizeActions`), `actionsToProposals` las traduce a la misma forma de propuesta que `proposalEngine`, y `requestMaieChat` **nunca lanza** (offline → templated; server → relay, 2 intentos máx, timeout 15s; fallo → templated).
- **`server/src/routes/maie.js`** (nuevo, montado en `index.js`): POST `/api/maie/chat` con `requireAuth`. **Decisión humana posterior (2026-09-08): el proveedor pasó de xAI `grok-4.5` a OpenAI `gpt-4o-mini`** (endpoint `/v1/chat/completions`, `process.env.OPENAI_API_KEY`, `process.env.OPENAI_MODEL || 'gpt-4o-mini'`), con recorte de costo: `max_tokens: 300`, `temperature: 0.4`, system prompt compacto. 502 en upstream/parse/shape. **La clave vive server-side** (`.env.example` nuevo: `OPENAI_API_KEY`, `OPENAI_MODEL`). Deploy sin la clave no rompe: el cliente degrada a templated. `bot_requirements.md` §11 actualizado al proveedor y presupuesto real.
- **`applyEngine.js`**: soporte `create-card` — `canApply` valida bucket existente + título; `apply` crea la tarea nueva (shape de §12, `name`, timestamps `now`, comentario de Maie) y logea con `cardId` = carta creada. `create-card` **nunca se auto-aplica** en modo auto (§9 no crear cartas solas):
- **`MaieContext.jsx`**: `sendThreadMessage` persiste la firma del usuario (sync, mutator #1) y **luego** pide la respuesta (`requestMaieChat`, `maieReplying` expuesto); el reply aterriza en un mutator #2 que appendea la burbuja de Maie, traduce las acciones a propuestas (dedupe por `action|payload`), y en modo auto aplica con `canApply`/`apply` `source:'auto'` saltando `create-card`, con `dedupeLog`. `projectRef` = documento más fresco para el cierre async.
- **`InquiryThread.jsx`**: indicador "Maie está pensando…" mientras `maieReplying`.
- **Fallback no-LLM**: en local/offline o en prod sin clave, Maie responde con `templatedMaieReply` (sin acciones) — el hilo sigue demostrable en el demo §17 sin gastar la API.
- Tests: `npm test` **217/217** (antes 202; +10 maieChat, +2 applyEngine create-card, +1 MaieContext send+reply, +1 MaieContext.thread reply, +2 InquiryThread indicador, +1 maieChat presupuesto de tokens, +1 maieChat contexto cap) · `npm run build` OK. Proveedor OpenAI `gpt-4o-mini` + recorte de costo implementado (contexto ≤1200 chars, mensaje ≤1000, hilo 3 turnos, `max_tokens 300`, temp 0.4).
- **Backlog de feedback**: prod `/api/feedback` exige sesión y no se pudo triagear net; la única entrada previa (Cristian, "No hacer nada") fue triageada en slice 5. Sin entradas nuevas accionables.

**Requiere acción del operador** (no se commitean secrets): setear la clave para habilitar OpenAI en prod → `flyctl secrets set OPENAI_API_KEY=sk-...` (modelo default `gpt-4o-mini`; opcional `flyctl secrets set OPENAI_MODEL=gpt-4o-mini` y `flyctl secrets unset XAI_API_KEY XAI_MODEL` para limpiar). Sin esto, prod sigue servicial templated sin errores ni gasto.

_(Grok escribe aquí tras un review del diff del slice 6.)_

---
