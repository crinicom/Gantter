# TASKS.md — Historia de trabajo y plan hacia adelante

Registro único de la evolución de **Gantter** y su plan a futuro. Complementa a
`docs/requirements.md` (única fuente de verdad del backlog de historias de usuario), a
`README.md` (arquitectura) y a `docs/backend-plan.md` (plan del backend real). **No duplica
backlog**: aquí se resume lo ya hecho (con sus commits) y se prioriza lo que viene.

> **Fuentes de verdad:**
> - Backlog de historias → `docs/requirements.md`
> - Arquitectura y configuración → `README.md`
> - Plan de backend real → `docs/backend-plan.md`
> - Buenas prácticas → `AGENTS.md`

---

## Historia de trabajo (completado)

Progresión real del proyecto, en orden, con el commit que lo cierra.

| Etapa | Contenido | Commit | Tests |
| --- | --- | --- | --- |
| Base + Stack | SPA React 18 + Vite + Tailwind, dnd-kit, date-fns, uuid, lucide-react. Autenticación (offline demo / Drive OAuth), Board (buckets + drag & drop), CRUD de tareas, comentarios, dependencias, sincronización local/Drive. | `6dc28e0` | — |
| Workflow OpenCode | AGENTS.md, skill de requisitos y comandos `/review`, `/add-story`, `/next-story`, `/list-stories`. | `70de875` | — |
| Gantt (fix + mejoras) | Corrección de ancho de barras (ms vs días) y de página en blanco; avance por tarea, progreso global y por bucket, nombre de proyecto editable, colaboración multi-usuario (invitaciones, "entrar como", BroadcastChannel). | `8019f51` | 56 |
| Landing multi-proyecto | Tarjetas por proyecto (portada, fechas, % global), crear/abrir/eliminar, navegación por hash `#/proyecto/<id>`, storage v3 (`gantter.projects.v3`) con migración v1/v2, visibilidad por membresía, realtime scoped por proyecto. | `d4c4c75` | 80 |
| Portada fija | `coverSeed` asignado una única vez al crear el proyecto; la imagen aleatoria no cambia salvo upload propio. | `6b42bef` | 84 |
| Compartición por email | `isProjectVisible` empareja al usuario con miembros activos también por email (normalizado), de modo que un invitado aceptado ve el proyecto del propietario en su lista. | `5d10bc9` | 88 |

**Estado actual:** 88 tests verdes · `npm run build` OK · `npm run dev` sin errores.

---

## Plan hacia adelante

Priorizado. Se marca `[x]` cuando se completa.

### P0 — Consolidación
- [ ] **Remoto de git**: hoy `git remote -v` está vacío (antes `http://192.168.0.50:3000/crinicom/202608_gantter.git`). Definir destino y hacer push de `main` (hay ~7 commits locales sin sincronizar).
- [ ] **Prueba manual de 2 pestañas** (parcialmente validada): la edición simultánea entre pestañas de un mismo proyecto ya se confirmó. Falta validar la landing por usuario distinto tras "Entrar como" y el realtime scoped por proyecto (un cambio en el proyecto X no debe tocar el proyecto Y).
- [ ] Reconciliar `TASKS.md` legacy (esto; ya consolidado en un solo archivo).

### P1 — Mejoras de producto (ideas del backlog, sin priorizar en `requirements.md`)
- [ ] **US-F1 — Exportar/importar proyecto como JSON local** (natural tras el storage v3 multi-proyecto).
- [ ] **US-F2 — Badges/notificaciones cuando una tarea tiene dependencias bloqueadas**.
- [ ] **US-F3 — Vista de calendario o agrupación por asignado**.
- [ ] **US-F4 — Reordenamiento visual persistente de tareas dentro de un bucket** (drag ordering con posición).

### P2 — Backend real
- [ ] **US-F6 — Backend multi-usuario** (WebSocket/SSE + autenticación). Seguir `docs/backend-plan.md`:
  - I1 Backend de persistencia (`ServerBackend`, CAS por versión + `409`, rutas `GET/POST /projects`, `DELETE /projects/:id`).
  - I2 Realtime (SSE/WebSocket, canal por `projectId`).
  - I3 Auth real (OAuth Google → JWT); migrar `AuthService` de `sessionStorage` a sesión de servidor.
  - I4 Invitaciones reales (tokens + email + aceptación).
  - I5 Consolidación (offline queue, subida de imágenes de portada, merge por campos si se valida).

---

## Notas legacy

El trabajo de las primeras fases (Stack, Auth/Drive, Board, Gantt/CPM, CRUD de tareas, comentarios,
dependencias) se documentó en detalle en los antiguos `TASKS2.md` y `TASKS_gantter.md`, que fueron
**eliminados** al consolidar: su contenido ya está reflejado en la tabla de historia de arriba y en
los commits referenciados. No reintroducir duplicados.
