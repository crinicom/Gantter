# Plan de implementación del backend real — Gantter

> Documento de trabajo. Describe cómo llevar la colaboración y persistencia que hoy se simulan
> en el cliente (localStorage + `BroadcastChannel`) a un backend multi-usuario real, reutilizando
> los contratos de servicio ya existentes en `src/services/` y `src/context/ProjectContext.jsx`.

## 1. Contexto y punto de partida

Hoy la app es 100 % client-side:

- **Persistencia**: `ProjectContext` habla con un *backend pluggable* seleccionado en `src/services/storage.js`
  (`getBackend()/setBackend()`). Hay una sola implementación, `LocalBackend`
  (`src/services/localStorageBackend.js`), con clave de documentos `gantter.projects.v3`
  (un mapa `{ [projectId]: Project }`; migración automática en cadena desde `v1`/`v2`).
- **Colaboración (simulada)**: cada pestaña es un usuario distinto (`AuthService` usa `sessionStorage`);
  los cambios se propagan entre pestañas con `RealtimeService` (`BroadcastChannel` + respaldo en el
  evento `storage`); el receptor hace un merge por entidad con última-escritura-gana
  (`src/utils/collab.js`) y muestra la versión y los avisos de conflicto en la barra de estado.
- **Invitaciones (simuladas)**: `InviteService` añade/activa/revoca miembros en el propio documento;
  el miembro pasa a "activo" cuando una pestaña "entra como" él (`AuthService.switchTo` +
  `acceptInvite`).
- **Modo Drive**: `authServiceDrive.js` (GIS/OAuth de Google) existe pero no hay backend de Drive
  implementado; el modo real requiere credenciales en `.env`.

### Lo que ya es "backend-real-friendly"

- Los contratos (`loadProject`, `saveProject`, `broadcast/subscribe`, `login/switchTo`,
  `sendInvite/acceptInvite/revokeMember`) están aislados detrás de servicios; en principio solo hay
  que **sustituir la implementación**, no tocar componentes.
- El documento es **versionado** (`project.version`) y el merge es **conmutativo e idempotente**
  (adecuado para ediciones que no tocan la misma entidad a la vez).
- El modelo de datos ya incluye `members` (rol: owner/member, estado: invited/active).

## 2. Contratos que el backend debe satisfacer

### 2.1 Backend de persistencia (ya encaja en `storage.js`)

```js
{
  name: 'server',
  loadProjects(): Promise<Record<string, Project>>,  // proyectos visibles para el usuario actual
  loadProject(projectId): Promise<Project>,          // carga un proyecto (403 si no es miembro activo)
  saveProject(project): Promise<boolean>,            // persiste una versión del documento
  deleteProject(projectId): Promise<void>,           // elimina el proyecto (solo owner)
}
```

`ProjectContext` ya usa ese shape (resa en modo offline y se ocupa del routing por
`activeProjectId`); añade `saveProject` con **versión condicional** (ver §4).

### 2.2 Realtime (ver §6)

`RealtimeService` ya expone `broadcast(payload)` y `subscribe(handler)` con `payload = { type:'project', project }`.
El `ServerRealtimeService` debe mantener el mismo par de funciones, ahora sobre WebSocket/SSE.

### 2.3 Auth (ver §5)

`AuthService` debe conservar el mismo API async: `getCurrentUser()`, `login()`, `logout()`. El
`switchTo(user)` local es solo simulación; en producción desaparece y la identidad la decide la
sesión del servidor.

### 2.4 Invitaciones (ver §7)

`InviteService` ya separa la capa de servicio; las funciones
`sendInvite(project, {...})`, `acceptInvite(project, memberId)`, `revokeMember(project, memberId)`
pasan a delegar en la API del backend (creación real de tokens, email, expiración).

## 3. Modelo de datos persistido (v3)

El backend guarda una **colección de proyectos por usuario** (uno por fila), y cada proyecto se
mantiene como fuente de verdad cliente:

```jsonc
{
  "id": "proj_abc",            // asignado por el backend en el primer guardado (uuid)
  "name": "...", "description": "...",
  "ownerId": "...",            // propietario (deducido del miembro con rol owner)
  "image": "data:...",         // portada subida (dataURL) o null → picsum/SVG por seed
  "version": 42,               // nº de documento; el backend lo valida (optimistic concurrency)
  "createdAt": "...", "updatedAt": "...",
  "members": [{ "id", "name", "email", "role": "owner|member", "status": "invited|active",
                "invitedBy", "invitedAt", "updatedAt" }],
  "buckets": [{ "id", "name", "color", "collapsed", "createdAt", "updatedAt" }],
  "tasks": [{ "id", "name", "description", "assignedUser", "startDate", "endDate",
              "status", "progress", "comments", "precedents", "dependents", "bucketId",
              "createdAt", "updatedAt" }]
}
```

La landing multi-proyecto consume una lista ligera de tarjetas (id, name, image, created/updatedAt,
avance global) — puede servirse desde los propios documentos o desde una tabla derivada de proyecto.
**Debe migrarse la tabla sin cliente a servidor** con un import automático (ver §8). Cada entidad que
participa del merge (bucket, task, member) lleva `updatedAt` (ISO-8601 UTC) — es el único requisito
temporal del algoritmo LWW actual.

## 4. Estrategia de concurrencia y versión de documento

### Opción recomendada (iteración 1): LWW por entidad + CAS por documento

- El merge actual (`mergeProjects`) se **mantiene intacto en el cliente**.
- El servidor guarda el documento con **versión condicional** (`UPDATE ... WHERE version = :v` /
  `optimistic locking`). Si el cliente manda una versión obsoleta, el servidor responde `409
  Conflict` con el documento actual; el cliente hace el merge y reintenta una vez (bucle limitado).
- Como el merge está en el cliente, el servidor no necesita lógica de resolución: es un "almacén
  de documentos versionado".

Detalles:
- `saveProject` del `ServerBackend` envía `PUT /api/projects/:id` con `If-Match: <version>`; un
  `409` dispara el ciclo `merge → persist → broadcast`.
- El `RealtimeService` del servidor reenvía a los suscriptores la última versión aceptada
  (`type: 'project'`, mismo payload que hoy).
- Los conflictos por entidad (misma tarea editada a la vez) se resuelven con LWW por `updatedAt`;
  el cliente ya reporta el aviso de conflicto.

### Iteración 2 (si se necesita): merge de campos, no de entidades

Para "no perder ediciones dentro de la misma tarea", evolucionar `mergeEntities` a un merge a nivel
de campo: por cada propiedad se compara `updatedAt` de la entidad (o un `version` por entidad).
Coste: cambios en `collab.js` + test de regresión, sin tocar el transporte.

### Alternativa estudiada: CRDT (tipo Yjs / Automerge)

- Pro: convergencia automática sin LWW, ideal para duplicación de esquemas complejos.
- Contra: serialización no es JSON plano (rompe el `project.json` legible y la compatibilidad con la
  muestra), más coste de adopción, quizá innecesario para edición granular de ~docenas de tareas.
- **Decisión**: no en el corto plazo; documentar como opción futura para aceleración de comentarios
  en vivo o canvas colaborativo.

## 5. Autenticación y autorización

### Flujo
1. **Login**: OAuth 2.0 con Google (ya existe GIS en el cliente, `authServiceDrive.js`) → el
   navegador recibe `id_token`/`access_token`.
2. El cliente lo envía a `POST /api/auth/login`; el backend verifica la firma del token
   (`google-auth-library`), crea/vincula el usuario y responde con **JWT de sesión** + perfil
   `{ id, name, email, picture }` (el mismo shape que usa hoy `useAuth`).
3. `AuthService.getCurrentUser()` devuelve el usuario a partir del JWT en `localStorage`
   (o cookie `HttpOnly` + `SameSite=Lax` — preferible por seguridad XSS).

### Autorización
- `POST /api/projects` → propietario (owner) del documento.
- `GET/PUT /api/projects/:id` → solo miembros `active` del proyecto (autorización por lista blanca
  de `member_id × user_id`).
- `GET /api/projects` → proyectos donde el usuario es propietario o miembro activo.
- `DELETE /api/projects/:id` → solo `owner`.
- `POST /api/projects/:id/image` → solo `owner` (multipart; el servidor redimensiona/valida).
- `POST /api/projects/:id/revoke` → solo `owner`.
- Los tokens JWT expiran (p. ej. 15 min) y se renuevan con refresh token; validar `user_id` en cada
  request mediante middleware.

### Tabla propuesta
| Ruta | Rol requerido |
| --- | --- |
| `GET /api/projects` | cualquier autenticado (mis proyectos) |
| `POST /api/projects` | cualquier autenticado |
| `GET /api/projects/:id` | member activo |
| `PUT /api/projects/:id` | member activo |
| `DELETE /api/projects/:id` | owner |
| `POST /api/projects/:id/image` | owner |
| `POST /api/projects/:id/revoke` | owner |
| `POST /api/projects/:id/invites` | owner |
| `GET /api/users/me/invitations` | cualquier autenticado |

## 6. Tiempo real (WebSocket/SSE)

- **Transporte**: SSE para la lectura de cambios (unidireccional, más simple) + `BroadcastChannel`
  como ya existe para el bucle local, **o** WebSocket bidireccional. Recomendación: empezar con
  **SSE** (`EventSource`) para `subscribe` (baja fricción, reconnection state built-in) y mantener
  `broadcast` como un `POST` interno del servidor que reenvía a los suscriptores del canal
  `project:<projectId>`.
- **Payloads** idénticos a los de hoy: `{ type: 'project', project: <documento v>` }.
- **Nombrado de canales**: `gantter:v2:project:<projectId>` (evita colisión con el canal local
  `gantter.sync.v1`).
- **Vida del canal**: se suscribe al entrar al proyecto y se cierra al salir; el servidor
  desconecta canales huérfanos con heartbeat (ping cada 25 s).

## 7. Invitaciones reales

1. `POST /api/projects/:id/invites  { name, email }` (owner):
   - Crea miembro `status: invited` + token de invitación (`invite_<uuid>` con `expiresAt`, 7 días).
   - Envía email con enlace `https://app/invite/<token>`.
   - El cliente escribe el miembro en el documento local (mismo flujo visual que
     `InviteService.sendInvite`).
2. El invitado entra por el enlace → `POST /api/invites/:token/accept`:
   - Valida token no expirado y no revocado; une el `member_id` al `user_id` autenticado.
   - Marca `status: active`; el documento se actualiza y llega por SSE a todos.
3. Revocación: `DELETE /api/projects/:projectId/members/:memberId` (owner) → invalida el token y
   revoca acceso de lectura/escritura en el canal.

## 8. Migración de datos (localStorage → servidor)

1. Mantener `projectStorage` v3 como formato canónico de export (mapa de proyectos).
2. Opción A (recomendada, sin fricción): al primer login con proyectos locales existentes
   (`gantter.projects.v3` presente), ofrecer "Migrar mis proyectos al servidor":
   `POST /api/projects/import { name, document }` → devuelve `{ id, version }` por cada proyecto.
3. A partir de ahí, `ServerBackend` pasa a ser el backend activo (`setBackend`) y el documento local
   se mantiene como copia de respaldo ("modo sin conexión").
4. Export/import manual JSON (la idea US-F1 del backlog) como camino alternativo para equipos
   remotos.

## 9. Propuesta de arquitectura del backend

```
server/
├── src/
│   ├── index.ts               # Express/Fastify + WebSocket/SSE
│   ├── routes/
│   │   ├── auth.routes.ts     # login OAuth, refresh
│   │   ├── projects.routes.ts # CRUD documento (CAS por version), import
│   │   ├── invites.routes.ts  # crear/aceptar/revocar
│   │   └── realtime.routes.ts # SSE (canal por projectId)
│   ├── services/
│   │   ├── documentStore.ts   # guards + CAS (Postgres/Prisma o Redis JSON)
│   │   ├── merge.ts           # (reusa lógica collab.js si se quiere doble-validación server-side)
│   │   ├── invite.ts          # tokens, emails (nodemailer/Resend)
│   │   └── auth.ts            # verificación id_token Google, JWT emit/verify
│   ├── models/                # tipos del documento (espejo de src/models/* del cliente)
│   └── db/schema.sql          # users, projects, members, document_versions, invites
└── test/                      # integración: 2 clientes concurrentes (§10)
```

**Elección de stack** (sugerida, reemplazable): Node + TypeScript + Fastify + Prisma/PostgreSQL para
estado; el documento JSON se guarda en una columna `jsonb` con `version` comparada por CAS. En una
deploy mínima (un usuario), SQLite bastaría; para el objetivo multi-usuario real, Postgres.

## 10. Pruebas de concurrencia (dos usuarios simultáneos)

El requisito del usuario es que la edición simultánea "no se pise". Escenario e2e a automatizar con
Playwright:

1. `usuarioA` y `usuarioB` abren la misma URL (dos contextos de navegador distintos).
2. A edita la tarea t1; B edita la tarea t2 **a la vez**.
3. Asserts: ambos ven ambas ediciones al cabo de < 2 s (evento SSE recibido + merge aplicado);
   `version` final es consistente en las dos pestañas (mismo documento tras converger).
4. Conflicto: A y B editan t1 concurrentemente → ambos ven el aviso "conflicto resuelto";
   el resultado converge a la edición con `updatedAt` más tardío y a la misma `version`.
5. A invita a C, C acepta por token → A y B ven `status: active`; C puede leer/escribir.
6. A revoca a C → C recibe `403`/desconexión del canal.

Unitarias adicionales en `src/utils/__tests__/collab.test.js` para el merge a nivel de campo (§4, iteración 2).

## 11. Roadmap por iteraciones

> Estado: **I1–I4 implementadas en `server/`** (persistencia SQLite + CAS, SSE, OAuth Google→JWT,
> invitaciones reales) y **clientes conectados por modo** (`VITE_APP_MODE=server`). Verificado con
> smoke E2E (13/13) y tests (96). I5 queda para una iteración posterior.

1. **I1 — Backend de persistencia**: ✅ `ServerBackend` (CAS por versión + `409` + merge) + `getBackend()`
   por modo. La app funciona contra servidor con el mismo aspecto. Migración local→servidor.
2. **I2 — Realtime**: ✅ SSE `ServerRealtime` (hub por canal de proyecto) + suscripción del
   `ProjectContext` por `projectId`. Satisfacen las pruebas de cuenta 1–4 del §10.
3. **I3 — Auth real**: ✅ login OAuth Google (PKCE server-side) → JWT en cookie httpOnly; `AuthService`
   delega en `/api/auth/*` en modo server; `DEFAULT_COLLAB_USERS`/`switchTo` quedan solo en modo offline.
4. **I4 — Invitaciones reales**: ✅ tokens + aceptación + revocación en `server/` y delegación del
   front por modo. Rutas de la §7.
5. **I5 — Consolidación**: ⏳ pendiente. Cola de cambios offline con reintento y badge; export JSON;
   opcionalmente merge por campos (§4 iteración 2) o CRDT si se valida necesidad.

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Perder ediciones de una misma entidad (LWW) | Iteración 2 del §4 (merge por campos); aviso visible de conflicto |
| Latencia de red rompe la UX de "guardado" | Debounce local (ya existe `SYNC_DEBOUNCE_MS`), estado optimista y badge "Pendiente de sincronizar" |
| El documento crece (comentarios largos) | Límite por entidad y paginado de comentarios en iteración futura |
| Imágenes subidas saturan el localStorage/Drive | Redimensionar a 640 px (JPEG q0.82) antes de persistir (ya se hace en `projectImage`); imágenes "lazy" con `loading="lazy"` |
| Migración de datos desde claves v1/v2 falla | Import idempotente validado con `deserializeProject` + test e2e de migración |