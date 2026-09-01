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

---

## Ideas / futuras mejoras (sin priorizar)

- US-F1: Exportar/importar proyecto como archivo JSON local.
- US-F2: Notificaciones o badges cuando una tarea tiene dependencias bloqueadas.
- US-F3: Vista de calendario o agrupación por asignado.
- US-F4: Reordenamiento visual persistente de tareas dentro de un bucket (drag ordering con posición).
- US-F5: Detección de conflictos de edición concurrente (no solo "última escritura gana").