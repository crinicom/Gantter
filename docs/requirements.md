# Requisitos — Gantter

Este archivo es la **única fuente de verdad** del backlog de historias de usuario del proyecto.
El agente de OpenCode debe consultarlo y actualizarlo al implementar cambios.

## Formato

Cada historia tiene un ID (`US-###`), un rol, una capacidad, un beneficio, criterios de aceptación y estado.

Estados: `pendiente` (product backlog) · `en-progreso` · `hecho` · `cancelada`.

---

## Historias

### US-001 — Iniciar sesión en la aplicación

- **Como** usuario registrado, **quiero** iniciar sesión con mi cuenta de Google, **para** acceder a mis proyectos de forma segura.
- **Criterios:** se autentica con OAuth (modo Drive) u offline con usuario demo (modo local); la sesión persiste al recargar.
- **Estado:** hecho

### US-002 — Vincular un proyecto en Google Drive

- **Como** usuario autenticado, **quiero** elegir o crear una carpeta de Drive, **para** guardar mi `project.json` ahí y colaborar.
- **Criterios:** en modo Drive el archivo se lee y escribe en la carpeta vinculada; en modo local la persistencia usa `localStorage`.
- **Estado:** parcial (modo local hecho; modo Drive requiere credenciales y queda detrás de la capa de backend)

### US-003 — Gestionar tareas (CRUD)

- **Como** usuario, **quiero** crear, editar y eliminar tareas con nombre, descripción, fechas, asignado y estado, **para** registrar el trabajo del proyecto.
- **Criterios:** se crea tarea dentro de un bucket; se editan todos sus campos; al eliminar se limpian sus dependencias.
- **Estado:** hecho

### US-004 — Organizar tareas en buckets (tablero)

- **Como** usuario, **quiero** agrupar tareas en buckets y moverlas por arrastrar y soltar, **para** organizar el flujo de trabajo.
- **Criterios:** se crean y renombran buckets; mover una tarea a otro bucket la reasigna.
- **Estado:** hecho

### US-005 — Visualizar dependencias entre tareas

- **Como** usuario, **quiero** relacionar tareas como antecedentes/posteriores, **para** reflejar el orden lógico del proyecto.
- **Criterios:** se agregan/eliminan dependencias; una tarea no puede finalizarse si tiene antecedentes pendientes.
- **Estado:** hecho

### US-006 — Comentar tareas

- **Como** usuario, **quiero** dejar y ver comentarios con autor y fecha en cada tarea, **para** comunicarme con el equipo.
- **Criterios:** se agregan comentarios con autor y timestamp; se listan en el detalle de la tarea.
- **Estado:** hecho

### US-007 — Ver el diagrama de Gantt con camino crítico

- **Como** usuario, **quiero** ver las tareas en una línea de tiempo con barras, flechas de dependencias y la línea del día, **para** planificar y detectar cuellos de botella.
- **Criterios:** el eje X muestra semanas; las tareas críticas (CPM) se resaltan; el scroll horizontal es sincronizado.
- **Estado:** hecho

### US-008 — Sincronización automática con respaldo

- **Como** usuario, **quiero** que los cambios se guarden automáticamente y ver el estado de sincronización, **para** no perder trabajo.
- **Criterios:** los cambios se persisten (con debounce en modo Drive); un banner muestra "guardado / error"; existe carga de proyecto demo.
- **Estado:** hecho

### US-009 — Cargar datos de demostración

- **Como** usuario nuevo, **quiero** cargar un proyecto de ejemplo, **para** explorar la aplicación sin crear datos desde cero.
- **Criterios:** desde la pantalla de proyecto vacío se puede cargar la muestra o empezar vacío.
- **Estado:** hecho

### US-010 — Registrar avance de una tarea

- **Como** miembro del equipo, **quiero** indicar el porcentaje de avance de cada tarea con un slider y un campo numérico, **para** reflejar el estado real del trabajo.
- **Criterios:** el avance es un entero 0–100 (paso 5 en el slider); al marcar una tarea como finalizada su avance pasa automáticamente a 100; se persiste y aparece en tarjeta, modal y barra del Gantt.
- **Estado:** hecho

### US-011 — Ver el progreso global del proyecto

- **Como** responsable del proyecto, **quiero** ver el porcentaje de avance global junto al nombre, **para** tener una métrica de avance de un vistazo.
- **Criterios:** el % global se pondera por la duración de cada tarea (una tarea sin fechas pesa 1); sin tareas muestra 0%.
- **Estado:** hecho

### US-012 — Ver el progreso por bucket

- **Como** miembro del equipo, **quiero** ver el avance agrupado por bucket en el tablero y en el Gantt, **para** localizar dónde hace falta avanzar.
- **Criterios:** cada bucket muestra su % (ponderado igual que el global) con una barra; en el Gantt se muestra en la fila de grupo junto al nombre del bucket.
- **Estado:** hecho

### US-013 — Editar el nombre del proyecto

- **Como** responsable del proyecto, **quiero** cambiar el nombre del proyecto directamente desde la barra superior con un lápiz, **para** mantenerlo al día.
- **Criterios:** el nombre se edita en línea (Enter guarda, Escape cancela) y se persiste.
- **Estado:** hecho

### US-014 — Invitar miembros al proyecto

- **Como** propietario del proyecto, **quiero** invitar personas por email, ver su estado y revocar accesos, **para** colaborar con el equipo.
- **Criterios:** se crea un miembro con rol miembro y estado invitado; la lista muestra rol y estado; se puede revocar; en modo offline la entrega se simula y se puede "entrar como" el invitado.
- **Estado:** hecho

### US-015 — Edición simultánea y detección de conflictos

- **Como** miembro del equipo, **quiero** ver en vivo los cambios de otras pestañas y saber cuándo hay conflictos, **para** trabajar sin pisarme con mis compañeros.
- **Criterios:** los cambios de otras pestañas se propagan en vivo (BroadcastChannel); si la misma entidad se edita en dos pestañas se aplica última-escritura-gana y se muestra un aviso; cada pestaña es un usuario distinto (sessionStorage).
- **Estado:** hecho

### US-016 — Landing multi-proyecto

- **Como** usuario autenticado, **quiero** ver todos mis proyectos como tarjetas y crear/abrir/eliminar varios, **para** gestionar varios trabajos a la vez.
- **Criterios:** tras iniciar sesión se muestran las tarjetas de proyectos visibles para el usuario (propietario o miembro activo); cada tarjeta muestra nombre, fecha de creación y modificación, y % de avance global; se puede crear un proyecto nuevo con nombre y descripción, navegar a él por hash `#/proyecto/<id>` y volver a la landing con "Mis proyectos"; eliminar un proyecto pide confirmación; en modo offline también se puede crear un proyecto desde el dataset de demostración.
- **Estado:** hecho

### US-017 — Imagen de portada en los proyectos

- **Como** usuario, **quiero** que cada proyecto tenga una imagen de portada (aleatoria por defecto o subida por mí), **para** identificar cada proyecto de un vistazo.
- **Criterios:** por defecto se muestra una imagen determinista de picsum (seed = id del proyecto); si falla la red se usa un degradado SVG local; el propietario puede subir una imagen que se redimensiona a 640 px (JPEG q0.82) antes de persistirse.
- **Estado:** hecho

---

## Ideas / futuras mejoras (sin priorizar)

- US-F1: Exportar/importar proyecto como archivo JSON local.
- US-F2: Notificaciones o badges cuando una tarea tiene dependencias bloqueadas.
- US-F3: Vista de calendario o agrupación por asignado.
- US-F4: Reordenamiento visual persistente de tareas dentro de un bucket (drag ordering con posición).
- US-F6: Backend real con WebSocket/SSE y autenticación por correo (ver `docs/backend-plan.md`).