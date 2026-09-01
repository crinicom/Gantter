# Gantter

Aplicación web de gestión colaborativa de tareas y proyectos con dos vistas sobre el mismo estado: un **tablero** (estilo Kanban/Trello con buckets y drag & drop) y un **diagrama de Gantt** (semanas en el eje X, barras de tareas, flechas de dependencias, línea de HOY y cálculo de camino crítico).

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

Tras iniciar sesión se muestra la **landing** con una tarjeta por cada proyecto visible para el usuario (propietario o miembro activo): nombre, portada (imagen determinista de picsum con seed = id, subida por el propietario o degradado SVG local), fechas de creación/modificación y % de avance global. Desde ahí se crea un proyecto nuevo, se carga el dataset de demostración en un proyecto nuevo, se elimina (con confirmación) y se navega por hash `#/proyecto/<id>`. El botón "Mis proyectos" de la barra superior vuelve a la landing; "Entrar como" limpia el hash antes de recargar.

### Modo Google Drive

Para habilitarlo, configura en `.env`:

```
VITE_APP_MODE=drive
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_API_KEY=...
VITE_GOOGLE_APP_ID=...
```

Cuando existen las credenciales, el login cambia automáticamente a OAuth de Google (Google Identity Services) y la persistencia apunta a un archivo `project.json` dentro de una carpeta de Drive vinculada. El modo local sigue disponible como respaldo si las credenciales no están configuradas.

## Comandos

| Comando            | Descripción                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Servidor de desarrollo (Vite)           |
| `npm run build`    | Compilar para producción                |
| `npm run preview`  | Previsualizar el build                  |
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