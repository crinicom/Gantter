# TASKS.md - Plan de Desarrollo

> **REGLAS DE ENTREGA NOCTURNA:**
> 1. Código 100% conectado e importado en el punto de entrada principal.
> 2. Aplicación ejecutable sin errores de sintaxis con `npm run dev`.
> 3. Documentación en Markdown limpio.

## CONTEXTO DEL PROYECTO

App SPA en React + Vite. No lleva backend propio: la autenticación es Google OAuth (Google Identity Services) y la "base de datos" es un archivo `project.json` guardado dentro de una carpeta de Google Drive vinculada por el usuario (Drive API v3 + Google Picker API para elegir/crear la carpeta). Dos vistas sobre el mismo estado: Board (estilo Trello, con buckets y drag & drop) y Gantt (semanas en eje X, barras, flechas de dependencias, línea de HOY, scroll vertical/horizontal). El cálculo de camino crítico (CPM) se deriva de las fechas de inicio/fin y de los vínculos antecedente/posterior de cada tarea.

---

## FASE 0: Bootstrapping (React + Vite)

### FILE: package.json
- [ ] Definir el proyecto como tipo "module" con scripts `dev`, `build`, `preview` usando Vite.
- [x] Agregar dependencias: `react`, `react-dom`.
- [x] Agregar devDependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`.
- [x] Agregar dependencias funcionales: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `date-fns`, `uuid`.

### FILE: vite.config.js
- [x] Configurar Vite con el plugin de React.
- [x] Exponer el puerto de desarrollo 5173 y `server.open: true`.

### FILE: tailwind.config.js
- [x] Configurar el `content` apuntando a `./index.html` y `./src/**/*.{js,jsx}`.
- [x] Definir paleta de colores simple para estados de tarea (todo, en trabajo, finalizada, crítica).

### FILE: postcss.config.js
- [x] Configurar los plugins `tailwindcss` y `autoprefixer`.

### FILE: index.html
- [x] Crear el documento HTML base con `<div id="root"></div>`.
- [x] Incluir el script `<script src="https://accounts.google.com/gsi/client" async defer></script>` para Google Identity Services.
- [x] Incluir el script `<script src="https://apis.google.com/js/api.js"></script>` para Drive API y Google Picker.
- [x] Enlazar `src/main.jsx` como módulo de entrada.

### FILE: .env.example
- [x] Declarar `VITE_GOOGLE_CLIENT_ID=` (OAuth Client ID de Google Cloud Console).
- [x] Declarar `VITE_GOOGLE_API_KEY=` (API Key habilitada para Drive API y Picker API).
- [x] Declarar `VITE_GOOGLE_APP_ID=` (Project Number de Google Cloud, requerido por el Picker).

### FILE: src/index.css
- [x] Importar las directivas base de Tailwind (`@tailwind base; @tailwind components; @tailwind utilities;`).
- [x] Definir estilos globales mínimos: fuente, fondo, scrollbar delgada para las vistas con scroll.

### FILE: src/main.jsx
- [x] Montar `<App />` dentro de `<React.StrictMode>` sobre `#root` usando `createRoot`.
- [x] Importar `./index.css`.

### FILE: src/App.jsx
- [x] Envolver la aplicación con `AuthProvider` (de `src/context/AuthContext.jsx`) y `ProjectProvider` (de `src/context/ProjectContext.jsx`).
- [x] Importar y renderizar `AppShell` (de `src/components/layout/AppShell.jsx`) como layout principal.
- [x] Este archivo es el punto de montaje: todo componente de fases posteriores debe terminar importado, directa o indirectamente, desde aquí.

---

## FASE 1: Autenticación y vinculación con Google Drive

### FILE: src/config/googleConfig.js
- [x] Exportar constantes `CLIENT_ID`, `API_KEY`, `APP_ID` leídas desde `import.meta.env`.
- [x] Exportar el arreglo de `SCOPES` necesarios: `https://www.googleapis.com/auth/drive.file` y `https://www.googleapis.com/auth/userinfo.profile`.

### FILE: src/services/googleAuth.js
- [x] Implementar `initTokenClient(onTokenReceived)` usando `google.accounts.oauth2.initTokenClient` con los scopes de `googleConfig.js`.
- [x] Implementar `requestAccessToken()` para disparar el popup de consentimiento de Google.
- [x] Implementar `getStoredToken()` / `clearStoredToken()` para persistir el access token en memoria (y su expiración) durante la sesión.
- [x] Implementar `signOut()` que revoca el token con `google.accounts.oauth2.revoke`.

### FILE: src/services/driveApi.js
- [x] Implementar `loadDrivePicker()` que carga los módulos `client` y `picker` de `gapi`.
- [x] Implementar `openFolderPicker(accessToken, onFolderSelected)` que abre el Google Picker limitado a carpetas para elegir o crear la carpeta del proyecto.
- [x] Implementar `readProjectFile(accessToken, folderId)` que busca `project.json` dentro de la carpeta (Drive API `files.list` con query por `parents` y `name`) y descarga su contenido con `alt=media`.
- [x] Implementar `createProjectFile(accessToken, folderId, projectData)` que crea `project.json` en la carpeta si no existe.
- [x] Implementar `updateProjectFile(accessToken, fileId, projectData)` que sobreescribe el contenido del archivo (multipart upload).

### FILE: src/context/AuthContext.jsx
- [x] Crear el contexto de autenticación con estado `{ user, accessToken, isAuthenticated }`.
- [x] Exponer las funciones `login()` y `logout()` conectadas a `src/services/googleAuth.js`.
- [x] Exponer el hook `useAuth()` que se implementa completo en `src/hooks/useAuth.js` y se re-exporta aquí.

### FILE: src/hooks/useAuth.js
- [x] Implementar el hook `useAuth()` que consume `AuthContext` con `useContext` y lanza error si se usa fuera del provider.

### FILE: src/components/auth/LoginScreen.jsx
- [x] Renderizar una pantalla de bienvenida con botón "Iniciar sesión con Google" que llama a `login()` desde `useAuth()`.
- [x] Mostrar breve descripción del producto (tablero + Gantt colaborativo sobre Drive).

### FILE: src/components/auth/ProjectLinker.jsx
- [x] Mostrar la pantalla intermedia post-login que permite "Vincular carpeta de Drive existente" o "Crear nuevo proyecto" usando `openFolderPicker` de `driveApi.js`.
- [x] Al seleccionar la carpeta, intentar `readProjectFile`; si no existe, llamar a `createProjectFile` con un proyecto vacío inicial.
- [x] Guardar `folderId` y `fileId` resultantes en `ProjectContext` mediante `useProject()`.

### FILE: src/components/layout/AppShell.jsx
- [x] Si `!isAuthenticated` (desde `useAuth()`), renderizar `LoginScreen`.
- [x] Si está autenticado pero no hay proyecto vinculado (desde `useProject()`), renderizar `ProjectLinker`.
- [x] Si hay proyecto vinculado, renderizar el layout principal: cabecera con nombre del proyecto + botón de logout, y `TabsSwitcher` (de `src/components/layout/TabsSwitcher.jsx`) para alternar Board/Gantt.
- [x] Importar y montar aquí todos los componentes de layout de fases posteriores.

---

## FASE 2: Modelo de datos y sincronización con Drive

### FILE: src/utils/dateUtils.js
- [x] Implementar `formatISODate(date)`, `parseISODate(str)`, `startOfWeek(date)`, `addDays(date, n)`, `diffInDays(a, b)` usando `date-fns`.
- [x] Implementar `getWeekRange(startDate, endDate)` que devuelve el arreglo de fechas de inicio de cada semana entre dos fechas, para el eje X del Gantt.

### FILE: src/utils/taskHelpers.js
- [x] Implementar `createEmptyTask({ bucketId })` que devuelve un objeto tarea con `id` (uuid), `name`, `description`, `assignee`, `startDate`, `endDate`, `predecessors: []`, `successors: []`, `comments: []`, `completed: false`, `createdAt`, `updatedAt`.
- [x] Implementar `getTaskStatus(task)`: retorna `"todo"` si no tiene comentarios y no está completada, `"en_trabajo"` si tiene al menos un comentario y no está completada, `"finalizada"` si `completed === true`.
- [x] Implementar `linkTasks(tasks, predecessorId, successorId)` que agrega `successorId` a `predecessors[].successors` y `predecessorId` a `successors[].predecessors`, evitando ciclos directos.
- [x] Implementar `unlinkTasks(tasks, taskAId, taskBId)` que remueve la relación en ambos sentidos.

### FILE: src/utils/cpm.js
- [x] Implementar `calculateCPM(tasks)` que realiza pase hacia adelante (early start/finish) y pase hacia atrás (late start/finish) sobre el grafo de dependencias, usando `startDate`/`endDate` de cada tarea como duración base.
- [x] Calcular la holgura (`slack`) de cada tarea como `lateStart - earlyStart`.
- [x] Devolver un mapa `{ [taskId]: { earlyStart, earlyFinish, lateStart, lateFinish, slack, isCritical } }`, marcando `isCritical: true` cuando `slack === 0`.

### FILE: src/services/projectStorage.js
- [x] Implementar `serializeProject(projectState)` que arma el JSON final `{ id, name, folderId, buckets, tasks, members, updatedAt }` a persistir en Drive.
- [x] Implementar `deserializeProject(rawJson)` que valida y devuelve el objeto de proyecto normalizado, aplicando valores por defecto si faltan campos.

### FILE: src/context/ProjectContext.jsx
- [x] Crear el contexto de proyecto con estado `{ project, folderId, fileId, buckets, tasks, isLoading, isDirty }`.
- [x] Exponer acciones: `linkProject`, `addBucket`, `renameBucket`, `moveBucket`, `addTask`, `updateTask`, `moveTaskToBucket`, `addComment`, `toggleTaskCompleted`, `addDependency`, `removeDependency`.
- [x] Cada acción debe marcar `isDirty = true` para disparar el autoguardado gestionado por `useDriveSync`.
- [x] Exponer el hook `useProject()` implementado en `src/hooks/useProject.js` y re-exportado aquí.

### FILE: src/hooks/useProject.js
- [x] Implementar el hook `useProject()` que consume `ProjectContext` con `useContext` y lanza error si se usa fuera del provider.

### FILE: src/hooks/useDriveSync.js
- [x] Implementar un `useEffect` que, cuando `isDirty === true`, espera 2 segundos (debounce) y llama a `updateProjectFile` de `src/services/driveApi.js` con el proyecto serializado por `projectStorage.js`.
- [x] Exponer `lastSavedAt` y `syncStatus` (`"guardado" | "guardando..." | "error"`) para mostrarlos en `AppShell`.
- [x] Este hook debe ser invocado dentro de `ProjectContext.jsx` para que la sincronización sea automática y transversal a toda la app.

---

## FASE 3: Vista Board (estilo Trello)

### FILE: src/components/common/Checkbox.jsx
- [x] Crear un checkbox reutilizable con estado controlado y callback `onChange`, usado para marcar tareas finalizadas.

### FILE: src/components/common/Button.jsx
- [x] Crear un botón reutilizable con variantes `primary`, `secondary`, `ghost`.

### FILE: src/components/common/Modal.jsx
- [x] Crear un componente modal genérico con overlay, cierre por click afuera y botón "X", reutilizado por `TaskModal`.

### FILE: src/components/layout/TabsSwitcher.jsx
- [x] Renderizar dos pestañas "Tablero" y "Carta Gantt" con estado local de tab activo.
- [x] Importar y renderizar condicionalmente `BoardView` (de `src/components/board/BoardView.jsx`) y `GanttView` (de `src/components/gantt/GanttView.jsx`) según la pestaña activa.
- [x] Este componente debe estar montado desde `AppShell.jsx` para que ambas vistas queden conectadas a la app.

### FILE: src/components/board/AddBucketForm.jsx
- [x] Formulario inline para crear un nuevo bucket, invoca `addBucket` de `useProject()`.

### FILE: src/components/board/AddTaskForm.jsx
- [x] Formulario inline al pie de cada bucket para crear una tarea rápida (solo nombre), invoca `addTask` de `useProject()` usando `createEmptyTask`.

### FILE: src/components/board/TaskCard.jsx
- [x] Renderizar la tarjeta con: `Checkbox` de finalización (conectado a `toggleTaskCompleted`), nombre, avatar/iniciales del asignado, rango de fechas, indicador de estado (`todo`/`en_trabajo`/`finalizada`) usando `getTaskStatus`.
- [x] Hacer la tarjeta arrastrable con `@dnd-kit` (`useDraggable`/`useSortable`).
- [x] Al hacer click (fuera del checkbox), abrir `TaskModal` con la tarea seleccionada.
- [x] Ocultar visualmente la tarjeta si `completed === true` y el filtro "mostrar tareas finalizadas" está desactivado.

### FILE: src/components/board/BucketColumn.jsx
- [x] Renderizar el encabezado del bucket (nombre editable) y la lista de `TaskCard` filtradas por `bucketId`.
- [x] Configurar la columna como zona soltable (`useDroppable` de `@dnd-kit`) para recibir tarjetas arrastradas desde otros buckets.
- [x] Montar `AddTaskForm` al final de la columna.

### FILE: src/components/board/BoardView.jsx
- [x] Envolver todas las `BucketColumn` (una por bucket del proyecto, ordenadas por `order`) dentro de un `DndContext` de `@dnd-kit`.
- [x] Manejar `onDragEnd` para invocar `moveTaskToBucket` de `useProject()` cuando una tarjeta se suelta en otro bucket.
- [x] Incluir un toggle "Mostrar tareas finalizadas" en la barra superior de la vista.
- [x] Montar `AddBucketForm` al final de la fila de buckets.

---

## FASE 4: Detalle de tarea, comentarios y dependencias

### FILE: src/components/task/CommentList.jsx
- [x] Renderizar la lista de comentarios de la tarea ordenados cronológicamente, mostrando texto, autor y timestamp formateado con `dateUtils.js`.

### FILE: src/components/task/CommentInput.jsx
- [x] Campo de texto libre con botón "Comentar" que invoca `addComment` de `useProject()`, agregando el comentario con timestamp actual y autor del usuario logueado (desde `useAuth()`).

### FILE: src/components/task/AssigneeSelector.jsx
- [x] Selector desplegable con los miembros conocidos del proyecto (`project.members`) más opción de ingresar un email nuevo, que actualiza `assignee` vía `updateTask`.

### FILE: src/components/task/DependencyPicker.jsx
- [x] Selector de tareas antecedentes y posteriores (excluyendo la propia tarea y evitando duplicados), invoca `addDependency`/`removeDependency` de `useProject()`.
- [x] Mostrar como chips removibles las dependencias actuales de la tarea.

### FILE: src/components/task/TaskModal.jsx
- [x] Usar `Modal` (de `src/components/common/Modal.jsx`) para mostrar el detalle completo de la tarea: nombre editable, descripción en texto libre editable, `AssigneeSelector`, selectores de fecha de inicio y fin, `Checkbox` de finalización.
- [x] Montar `DependencyPicker` para gestionar antecedentes/posteriores.
- [x] Montar `CommentList` y `CommentInput` para el historial de comentarios.
- [x] Todos los cambios deben invocar `updateTask` de `useProject()` para mantener la sincronización con Drive.
- [x] Este modal debe quedar importado y utilizado tanto desde `TaskCard.jsx` (vista Board) como desde `GanttRow.jsx` (vista Gantt).

---

## FASE 5: Vista Carta Gantt

### FILE: src/components/gantt/TodayLine.jsx
- [x] Renderizar una línea vertical absoluta posicionada según la fecha actual dentro del área de scroll horizontal del Gantt, recalculada con `dateUtils.js`.

### FILE: src/components/gantt/GanttHeader.jsx
- [x] Renderizar el eje X con las semanas visibles (fecha de inicio de cada semana) calculadas con `getWeekRange` de `dateUtils.js`, fijo en la parte superior al hacer scroll vertical.

### FILE: src/components/gantt/GanttBar.jsx
- [x] Renderizar la barra horizontal de una tarea posicionada según `startDate`/`endDate` sobre la grilla de semanas.
- [x] Aplicar color/estilo distinto si la tarea es crítica según el resultado de `calculateCPM` (de `src/utils/cpm.js`).
- [x] Aplicar estilo distinto (tachado/atenuado) si la tarea está `finalizada`.

### FILE: src/components/gantt/GanttDependencyArrows.jsx
- [x] Calcular y dibujar (SVG) las flechas entre el fin de cada tarea antecedente y el inicio de cada tarea posterior, en base a `predecessors`/`successors` de cada tarea y sus posiciones verticales/horizontales.

### FILE: src/components/gantt/GanttRow.jsx
- [x] Renderizar una fila: nombre de la tarea a la izquierda (columna fija) y `GanttBar` a la derecha sobre la grilla scrolleable.
- [x] Al hacer click sobre la fila o la barra, abrir `TaskModal` con la tarea seleccionada.
- [x] Ocultar la fila si la tarea está `finalizada` y el filtro "mostrar tareas finalizadas" está desactivado.

### FILE: src/components/gantt/BucketGroupRow.jsx
- [x] Renderizar la fila de encabezado de bucket dentro del Gantt, con botón para colapsar/expandir las `GanttRow` de ese bucket.

### FILE: src/components/gantt/GanttView.jsx
- [x] Componer la vista completa: `GanttHeader` fijo arriba, columna izquierda fija con nombres agrupados por `BucketGroupRow` + `GanttRow`, área derecha con scroll vertical y horizontal sincronizados.
- [x] Montar `TodayLine` superpuesta al área de barras.
- [x] Montar `GanttDependencyArrows` superpuesta al área de barras.
- [x] Calcular `calculateCPM(tasks)` una vez y pasar el resultado a cada `GanttBar` vía props.
- [x] Incluir el mismo toggle "Mostrar tareas finalizadas" que la vista Board.

---

## FASE 6: Documentación

### FILE: README.md
- [x] Escribir ÚNICAMENTE contenido en sintaxis Markdown (prohibido incluir bloques JSON de datos): título del proyecto, descripción breve (tablero + Gantt colaborativo sobre Google Drive).
- [x] Documentar los pasos de configuración: crear credenciales OAuth en Google Cloud Console, habilitar Drive API y Picker API, completar `.env` a partir de `.env.example`.
- [x] Documentar el comando de arranque: `npm install && npm run dev`.
- [x] Describir brevemente el modelo de datos (proyecto → buckets → tareas → comentarios/dependencias) y cómo se persiste en `project.json` dentro de la carpeta de Drive vinculada.
- [x] Listar las limitaciones conocidas (sin resolución de conflictos concurrentes más allá de "última escritura gana", sin backend propio).
