# HANDOFF — Gantter v1 (Maie)

Protocolo de trabajo entre **Grok** (especifica + revisa) y **OpenCode** (implementa, commitea, deploya).

Producto: `bot_requirements.md`. No inventar features fuera de ese archivo. Lo marcado **v2** no se construye.

---

## Cómo trabajar

1. Leer este archivo y `bot_requirements.md` antes de tocar código.
2. Implementar **solo** el slice `in-progress` cuyo `owner` seas vos.
3. No tocar archivos en **No tocar** de ese slice, ni slices de otro owner.
4. Al terminar: `npm test` y `npm run build` verdes, actualizar este archivo (`status: review`, notas), **parar**. No arrancar el slice siguiente.
5. Grok revisa el diff contra el § citado de `bot_requirements.md`. Si pasa, escribe el próximo slice aquí. Si no, deja punch list en **Notas**.
6. **Commits y deploys: solo OpenCode.** Grok no commitea ni pushea.

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
| Fecha | 2026-09-07 |
| Spec | `bot_requirements.md` (v1) |
| Slice en curso | 2 — Board/Gantt (en review) |
| Owner | **opencode** |
| Status | `review` |
| Slice 0 | `done` (docs commitado por OpenCode) |

---

## Tabla de slices

Estados: `pending` · `in-progress` · `review` · `done` · `blocked`.

| # | Slice | Owner | Status | Spec | Entrega |
|---|---|---|---|---|---|
| 0 | Retarget de agentes + freeze del backlog viejo | grok | **done** | este archivo, `AGENTS.md` | OpenCode commitea los docs |
| 1 | Documento v1 + seed (Portal sucio + App móvil limpia) + reset demo | opencode | **done** | §12–13, §15.1/9/10 | commit `f20e3ad` + revisión `7aa8ef2` |
| 2 | Board/Gantt: multi-asignado, blocked, sin fechas, overlap, hito, WIP no bloquea | opencode | **review** | §5–6 | implementado, esperando Grok |
| 3 | Tokens visuales (papel/bosque, Fraunces+Figtree, cero emoji) | opencode | pending | §14 | un solo owner de CSS |
| 4 | Panel Maie + scanner determinístico (5 kinds, sin LLM) | grok | pending | §7–8 | propio contexto/servicio |
| 5 | Click → hilo, auto/confirmar, propuestas, log | grok | pending | §7, §9 | depende de 4 |
| 6 | Chat LLM (`grok-4.5`) + fallback templated | grok | pending | §11 | depende de 5 |
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
- **Decisión humana**: fechas del seed **fijas en `DB/sample_data.json`** (hoy_ref ≈ 2026-09-05; stale ≈ 18d → lastActivityAt 2026-08-18; hito go-live → 2026-09-12). Sin builder dinámico.
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

_(Grok escribe aquí tras un review del diff del slice 2.)_

---
