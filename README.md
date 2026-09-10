# Gantter

Aplicación web de gestión de trabajo: **tablero Kanban** + **Gantt** sobre las mismas cartas, más **Maia** (facilitadora socrática) y huddle in-app.

**Producto v1:** [`bot_requirements.md`](bot_requirements.md). **Quién implementa qué:** [`HANDOFF.md`](HANDOFF.md). Este README describe el stack y el código que ya existe (persistencia local/Drive/server, collab). No usar las secciones de Drive/backend como permiso para ampliarlos en v1.

Sin backend propio: la persistencia es un archivo `project.json` que se guarda de forma local (modo offline) o en una carpeta de Google Drive (modo Drive, mediante autenticación OAuth). La colaboración entre pestañas se simula en modo offline con un documento versionado, merge por entidad y `BroadcastChannel` (ver [Colaboración](#colaboración-y-edición-simultánea) y el plan de backend real en `docs/backend-plan.md`).

## Stack

- **React 18 + Vite 5**
- **Tailwind CSS 3**
- **@dnd-kit** (drag & drop en el tablero)
- **date-fns**, **uuid**, **lucide-react**
- **Vitest** (pruebas unitarias)

## Requisitos

- Node.js 18+

## Configuración

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. (Opcional) Configurar `.env` copiando `.env.example`:

   ```bash
   cp .env.example .env
   ```

3. Arrancar en desarrollo (puerto 5173):

   ```bash
   npm run dev
   ```

## Modos de funcionamiento

### Modo offline (por defecto)

Sin credenciales externas. La autenticación usa un usuario demo (o "entrar como" un miembro desde el panel de Miembros) y la persistencia se hace en `localStorage` (`gantter.projects.v3`, un mapa de proyectos por id, con migración automática desde `v1`/`v2`). Ideal para evaluar la aplicación y la edición simultánea entre pestañas.

### Landing multi-proyecto

Tras iniciar sesión se muestra la **landing** con una tarjeta por cada proyecto visible para el usuario (propietario o miembro activo): nombre, portada (imagen aleatoria fijada al crear mediante `coverSeed`, subida por el propietario o degradado SVG local), fechas de creación/modificación y % de avance global. La portada no cambia a lo largo de la vida del proyecto salvo que el propietario suba una imagen propia. Desde ahí se crea un proyecto nuevo, se carga el dataset de demostración en un proyecto nuevo, se elimina (con confirmación) y se navega por hash `#/proyecto/<id>`. El botón "Mis proyectos" de la barra superior vuelve a la landing; "Entrar como" limpia el hash antes de recargar.

### Modo Google Drive

Para habilitarlo, configura en `.env`:

```
VITE_APP_MODE=drive
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_API_KEY=...
VITE_GOOGLE_APP_ID=...
```

Cuando existen las credenciales, el login cambia automáticamente a OAuth de Google (Google Identity Services) y la persistencia apunta a un archivo `project.json` dentro de una carpeta de Drive vinculada. El modo local sigue disponible como respaldo si las credenciales no están configuradas.

### Modo server (backend real)

Backend Node/Express en `server/` con backup real **SQLite** (`better-sqlite3`), **realtime por SSE**, **auth OAuth Google → JWT en cookie httpOnly** e **invitaciones reales por token**. Sirve la API (`/api/*`) y, en producción, el build de la SPA desde el mismo origen. El front se conecta al modo server en `VITE_APP_MODE=server`.

```
# .env del front
VITE_APP_MODE=server
# VITE_API_BASE=            # vacío = mismo origen; en dev usa el proxy de Vite

# .env del server (o entorno)
JWT_SECRET=...              # obligatorio
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
PORT=3001
# DATABASE_PATH=server/data.sqlite    # opcional
```

Arranque en desarrollo (dos terminales):

```
npm install                # deps del front
npm run setup:server       # npm --prefix server install (deps del backend)
npm run dev                # Vite en :5173 con proxy /api -> :3001
node server/src/index.js   # API en :3001 (JWT_SECRET y credenciales OAuth en el entorno)
```

En producción (p. ej. DigitalOcean App Platform), el build compila la SPA y `npm start` levanta el server que sirve `dist/` + API:

```
Build:  npm install && npm run setup:server && npm run build
Start:  npm start    # node server/src/index.js
```

En modo server, tanto la **capa de persistencia** (`ServerBackend`), el **realtime** (`ServerRealtime`) y la **autenticación** (`/api/auth/*`) se seleccionan automáticamente según `VITE_APP_MODE`. El "entrar como" y `DEFAULT_COLLAB_USERS` quedan solo para el modo offline/demo.

## Voz de Maia (prompts en markdown)

La personalidad y las respuestas de Maia viven en `maia/` como markdown editable a nivel app (un solo set global; no por proyecto):

- `maia/system/persona.md` — system prompt del LLM (relay de `/api/maia/chat`, §11).
- `maia/templates/*.md` — fallbacks sin LLM por `kind` (thin/unassigned/stale/missing-date/overlap/generic).
- `maia/huddle/welcome.md`, `reply.md`, `demo.md`, `recap.md` — bienvenidas por ritual, fallback del huddle, guion del standup demo y cierre del recap.

Reglas de edición: las líneas que empiezan con `#` son comentarios (nunca llegan al prompt); los `{vars}` se rellenan con datos del tablero (no borrarlos ni renombrarlos: el código los pasa y un test valida la cobertura). El contrato JSON de salida y los límites de tokens quedan fijos en `server/src/routes/maia.js`. En desarrollo los cambios se aplican al instante (HMR del bundle cliente; el server lee el archivo por request); en producción, editar los `.md` y desplegar (push → build → Fly). `MAIA_PROMPTS_DIR` permite apuntar a otra carpeta (default `./maia`).

## Comandos

| Comando            | Descripción                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Servidor de desarrollo (Vite)           |
| `npm run build`    | Compilar para producción                |
| `npm run preview`  | Previsualizar el build                  |
| `npm run start`    | Levantar API + SPA en producción        |
| `npm run setup:server` | Instalar deps del backend (`server/`) |
| `npm test`         | Ejecutar las pruebas unitarias (Vitest) |
| `npm run test:watch` | Ejecutar pruebas en modo watch        |

## Modelo de datos

`gantter.projects.v3` es un mapa `{ [projectId]: Project }`. Cada `Project` tiene la estructura:

```jsonc
{
  "id": "uuid",
  "name": "Proyecto sin título",
  "description": "",
  "ownerId": "...",          // id del propietario (deducido del miembro con rol owner)
  "image": "data:...",       // portada subida (dataURL) o null → picsum/SVG por seed
  "coverSeed": "...",        // seed de la portada aleatoria, fijado una sola vez al crear el proyecto
  "version": 0,              // incrementa en cada guardado; lo usa la sincronización
  "createdAt": "...",
  "updatedAt": "...",
  "members": [
    { "id": "...", "name": "...", "email": "...", "role": "owner" | "member",
      "status": "invited" | "active", "invitedBy": "...", "invitedAt": "...", "updatedAt": "..." }
  ],
  "buckets": [
    { "id": "...", "name": "Backlog", "color": "#6200ea", "collapsed": false }
  ],
  "tasks": [
    {
      "id": "...",
      "name": "Tarea",
      "description": "",
      "assignedUser": { "id": "...", "name": "...", "email": "..." } | null,
      "startDate": "2026-09-01",
      "endDate": "2026-09-07",
      "status": "todo" | "in-progress" | "completed",
      "progress": 35,       // entero 0–100, % de avance de la tarea
      "comments": [{ "id": "...", "text": "...", "author": {...}, "createdAt": "..." }],
      "precedents": ["taskIdA"],
      "dependents": [],
      "bucketId": "..."
    }
  ]
}
```

### Reglas de dominio

- Una tarea no puede marcarse como **Finalizada** si tiene antecedentes (`precedents`) pendientes; al completarse su `progress` pasa a 100.
- El **avance** es un entero 0–100 por tarea. El progreso de un bucket y el global se ponderan por duración: `% = Σ(progressᵢ × pesoᵢ) / Σ(pesoᵢ)`, con `pesoᵢ = max(1, duración en días)` (sin fechas pesa 1); sin tareas → 0%.
- El camino crítico (CPM) se calcula a partir de fechas y dependencias: las tareas críticas se muestran en rojo en el Gantt.

## Colaboración y edición simultánea

En modo offline se simula la colaboración multi-usuario con **patrones estándar** que un backend real reutilizará (ver `docs/backend-plan.md`):

- **Documento versionado**: `project.version` se incrementa en cada guardado.
- **Identidad por pestaña**: cada pestaña usa un usuario distinto guardado en `sessionStorage` (`AuthService.switchTo` desde el panel de Miembros).
- **Merge por entidad**: al recibir una versión remota, buckets/tareas/miembros se fusionan entidad por entidad con **última-escritura-gana** (`updatedAt`); las entidades tocadas por ambas partes se reportan como conflictos (LWW resuelto).
- **Propagación en vivo**: `BroadcastChannel` (con respaldo en el evento `storage`) notifica a las otras pestañas; el banner muestra versiones y avisos. Cada mensaje lleva `projectId` y solo se aplica a la pestaña que tiene abierto ese proyecto.

Cómo probarlo: abre la app en dos pestañas, en una ve a **Miembros → Entrar como Ana García**, y edita tareas o el avance en ambas; los cambios se propagan en segundos y si editas la misma entidad a la vez verás el aviso de conflicto en la barra inferior.

## Estructura del proyecto

```
src/
├── App.jsx                 # Composición de providers
├── main.jsx                # Entry point
├── components/
│   ├── auth/               # Login, layout protegido, enlace de proyecto
│   ├── board/              # Vista tablero (buckets, tarjetas, drag & drop, %)
│   ├── collab/             # Modal de miembros/invitaciones
│   ├── common/             # Button, Checkbox, Modal
│   ├── gantt/              # Vista Gantt (header, barras con %, flechas, línea HOY)
│   ├── layout/             # AppShell, Navbar (nombre editable + % global), TabsSwitcher
│   ├── projects/           # Landing multi-proyecto y tarjetas con portada
│   └── task/               # Detalle de tarea, comentarios, dependencias, avance
├── config/                 # Config de la app (modo, credenciales)
├── constants/              # Estados y etiquetas
├── context/                # AuthContext, ProjectContext
├── hooks/                  # useAuth, useProject, useDriveSync
├── models/                 # Modelos de dominio (task, bucket, member)
└── services/               # Persistencia (local/Drive), auth, invitaciones, realtime
```

## Limitaciones conocidas

- **Última escritura gana**: entre pestañas (y en modo Drive) los conflictos se resuelven con "última escritura gana" a nivel de entidad; las ediciones concurrentes de la misma entidad pueden perder cambios (se reportan, pero no se fusionan campo a campo).
- **Sin backend propio**: toda la funcionalidad depende de servicios externos (Drive) o de `localStorage` en modo offline. La colaboración es local (pestañas del mismo navegador); no hay servidor real de invite/sincronización.
- **Autenticación básica**: en modo offline la autenticación es simulada; en modo Drive depende de la configuración OAuth de Google.