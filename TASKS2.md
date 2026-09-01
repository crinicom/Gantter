# TASKS.md - Plan de Desarrollo e Implementación

> **Instrucciones para el Agente / Codificador:**
> - Implementa los cambios archivo por archivo siguiendo las secciones de `### FILE: <ruta_del_archivo>`.
> - Marca cada subtarea completada cambiando `- [x] ` por `- [x]`.
> - Mantén una estructura limpia y sigue buenas prácticas de React/Node.js.

---

## FASE 1: Estructura Base y UI/UX (React + Tailwind CSS)

### FILE: package.json
- [x] Inicializar proyecto Vite React con soporte para JavaScript / React.
- [x] Agregar dependencias principales (`lucide-react`, `date-fns`, `clsx`, `tailwind-merge`).
- [x] Configurar scripts de ejecución (`dev`, `build`, `preview`).

### FILE: src/types/task.js
- [x] Definir constantes y estructura de la entidad **Task / Tarea**:
  - `id` (string único / uuid)
  - `name` (string)
  - `description` (string)
  - `assignedUser` (object: id, name, email, avatar)
  - `startDate` (string ISO)
  - `endDate` (string ISO)
  - `comments` (array de objetos: `{ id, user, text, timestamp }`)
  - `status` (string: `'En trabajo'` | `'Finalizada'`)
  - `precedents` (array de IDs de tareas previas)
  - `dependents` (array de IDs de tareas posteriores)
  - `bucketId` (string ID del bucket al que pertenece)
- [x] Definir estructura de la entidad **Bucket**:
  - `id` (string)
  - `name` (string)
  - `color` (string hex/class)

### FILE: src/components/Layout/Navbar.jsx
- [x] Crear barra de navegación superior con logo, título de la aplicación y área de perfil de usuario.
- [x] Agregar indicador de estado de sincronización (Local DB vs. Google Drive).
- [x] Incluir botón de Login/Logout OAUTH.

### FILE: src/components/Buckets/BucketBoard.jsx
- [x] Crear vista tipo tablero/columnas para organizar los Buckets.
- [x] Implementar botón para agregar un nuevo Bucket.
- [x] Permitir renderizar las tarjetas de tareas dentro de cada Bucket correspondiente.

### FILE: src/components/Tasks/TaskCard.jsx
- [x] Mostrar resumen de la tarea: Nombre, Usuario asignado, Fecha límite y Estado (`En trabajo` / `Finalizada`).
- [x] Incluir badge visual distintivo para el Estado de la tarea.
- [x] Agregar botones rápidos para editar, eliminar o cambiar de estado.

### FILE: src/components/Tasks/TaskModal.jsx
- [x] Crear modal interactivo para creación y edición detallada de tareas.
- [x] Añadir campos de formulario: Nombre, Descripción, Usuario Asignado, Fechas (Inicio / Fin), Bucket.
- [x] Añadir selector multiopción para **Antecedentes** (tareas previas) y **Tareas Posteriores**.
- [x] Implementar sección de **Comentarios**:
  - Historial de comentarios con timestamp.
  - Input para redactar y agregar nuevos comentarios.

---

## FASE 2: Gestión Local de Datos (JSON en Carpeta DB)

### FILE: DB/sample_data.json
- [x] Crear archivo JSON inicial con datos de demostración de Buckets y Tareas para desarrollo local.

### FILE: src/services/localStorageService.js
- [x] Implementar lectura y escritura en almacenamiento local/archivos JSON simulados dentro de `/DB`.
- [x] Métodos requeridos:
  - `getTasks()`
  - `saveTask(task)`
  - `updateTask(id, updatedFields)`
  - `deleteTask(id)`
  - `addComment(taskId, commentText, user)`
  - `changeStatus(taskId, newStatus)`
  - `getBuckets()`
  - `saveBucket(bucket)`

### FILE: src/context/TaskContext.jsx
- [x] Crear React Context para el estado global de tareas y buckets.
- [x] Proveer métodos CRUD y manejo de estado a todos los componentes UI.
- [x] Añadir validaciones de dependencias (impedir marcar 'Finalizada' si tiene antecedentes no completados).

### FILE: src/services/__tests__/taskService.test.js
- [x] Crear pruebas unitarias con Jest/Vitest para verificar la lógica de creación, edición y eliminación de tareas.
- [x] Probar agregación correcta de comentarios con timestamp.
- [x] Probar persistencia de lectura/escritura en JSON local.

---

## FASE 3: Integración con Google Drive API

### FILE: src/services/googleDriveService.js
- [x] Configurar cliente para Google Drive API v3.
- [x] Implementar método `findOrCreateAppFolder()` para crear carpeta contenedora en el Drive del usuario.
- [x] Implementar método `uploadTaskJson(taskData)` para guardar/sincronizar tareas como archivos JSON individuales o un master JSON.
- [x] Implementar método `loadTasksFromDrive()` para descargar e integrar las tareas almacenadas en Drive.
- [x] Manejar resolución de conflictos entre cambios locales y remotos.

### FILE: src/components/Sync/SyncStatusBanner.jsx
- [x] Crear componente para mostrar el progreso/estado de la sincronización con Google Drive (Sincronizado, Pendiente, Error).
- [x] Agregar botón de "Sincronizar ahora".

---

## FASE 4: Autenticación OAuth 2.0 (Google)

### FILE: src/config/authConfig.js
- [x] Configurar credenciales OAuth 2.0 (Client ID, Scopes requeridos: `https://www.googleapis.com/auth/drive.file`, `profile`, `email`).

### FILE: src/context/AuthContext.jsx
- [x] Implementar estado global de autenticación utilizando `@react-oauth/google` o Google Identity Services.
- [x] Guardar token de acceso y datos del usuario logueado en sesión.
- [x] Proveer funciones `login()` y `logout()`.

### FILE: src/components/Auth/ProtectedLayout.jsx
- [x] Crear wrapper/guardia de navegación para restringir el acceso a usuarios no autenticados.
- [x] Renderizar pantalla de bienvenida / Login cuando no hay una sesión activa.

---

## FASE 5: Verificación, Pruebas Integrales y Polished Final

### FILE: src/tests/integration.test.js
- [x] Realizar pruebas de flujo completo: Inicio de sesión -> Creación de Bucket -> Creación de Tarea -> Comentario -> Sincronización a Drive.
- [x] Validar que las tareas dependientes/antecedentes mantengan la integridad referencial.

### FILE: README.md
- [x] Documentar el proceso de instalación (`npm install`).
- [x] Explicar la configuración de variables de entorno (`.env` con Google OAuth Client ID).
- [x] Detallar la estructura de almacenamiento JSON en la carpeta `DB` y en Google Drive.