# Gantter

Aplicación web de gestión colaborativa de tareas y proyectos con dos vistas sobre el mismo estado: un **tablero** (estilo Kanban/Trello con buckets y drag & drop) y un **diagrama de Gantt** (semanas en el eje X, barras de tareas, flechas de dependencias, línea de HOY y cálculo de camino crítico).

Sin backend propio: la persistencia es un archivo `project.json` que se guarda de forma local (modo offline) o en una carpeta de Google Drive (modo Drive, mediante autenticación OAuth).

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

Sin credenciales externas. La autenticación usa un usuario demo y la persistencia se hace en `localStorage` (`gantter.project.v1`). Ideal para evaluar la aplicación.

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

`project.json` tiene la estructura:

```jsonc
{
  "id": null,
  "name": "Proyecto sin título",
  "description": "",
  "createdAt": "...",
  "updatedAt": "...",
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
      "comments": [{ "id": "...", "text": "...", "author": {...}, "createdAt": "..." }],
      "precedents": ["taskIdA"],
      "dependents": [],
      "bucketId": "..."
    }
  ]
}
```

### Reglas de dominio

- Una tarea no puede marcarse como **Finalizada** si tiene antecedentes (`precedents`) pendientes.
- El camino crítico (CPM) se calcula a partir de fechas y dependencias: las tareas críticas se muestran en rojo en el Gantt.

## Estructura del proyecto

```
src/
├── App.jsx                 # Composición de providers
├── main.jsx                # Entry point
├── components/
│   ├── auth/               # Login, layout protegido, enlace de proyecto
│   ├── board/              # Vista tablero (buckets, tarjetas, drag & drop)
│   ├── common/             # Button, Checkbox, Modal
│   ├── gantt/              # Vista Gantt (header, barras, flechas, línea HOY)
│   ├── layout/             # AppShell, Navbar, TabsSwitcher
│   └── task/               # Detalle de tarea, comentarios, dependencias
├── config/                 # Config de la app (modo, credenciales)
├── constants/              # Estados y etiquetas
├── context/                # AuthContext, ProjectContext
├── hooks/                  # useAuth, useProject, useDriveSync
├── models/                 # Modelos de dominio (task, bucket)
└── services/               # Persistencia (local/Drive), auth, storage
```

## Limitaciones conocidas

- **Última escritura gana**: en modo Drive usa estrategia "última escritura gana"; puede perderse información en ediciones concurrentes.
- **Sin backend propio**: toda la funcionalidad depende de servicios externos (Drive) o de `localStorage` en modo offline.
- **Autenticación básica**: en modo offline la autenticación es simulada; en modo Drive depende de la configuración OAuth de Google.