# Plan para la Web App de Gestión de Tareas

## 1. Descripción General
- **Objetivo:** Crear una aplicación web que permita la gestión de tareas mediante una interfaz amigable y colaborativa.

## 2. Estructura de Datos
- **Tarea (archivo JSON):**
  - Nombre
  - Descripción
  - Usuario asignado
  - Fecha de inicio
  - Fecha de fin
  - Comentarios (con timestamp)
  - Estado (En trabajo, Finalizada)
  - Antecedentes y tareas posteriores
- **Bucket:** Agrupaciones de tareas.

## 3. Proceso de Desarrollo
**Fase 1: Interfaz de Usuario y Usabilidad**
- Crear prototipos de la interfaz con herramientas de diseño (p. ej., Figma).
- Implementar la interfaz básica con React.js.
- **Tareas de verificación:**
  - Realizar pruebas de usabilidad con usuarios.
  - Asegurar que la interfaz se ajuste a los requerimientos funcionales y estéticos.

**Fase 2: Gestión de Tareas Locamente**
- Implementar lógica para crear, editar y eliminar tareas almacenadas en archivos JSON en la carpeta "DB" dentro de la carpeta del proyecto.
- Implementar funcionalidad de comentarios y marcación de estado.
- **Tareas de verificación:**
  - Realizar pruebas unitarias sobre la funcionalidad de gestión de tareas.
  - Validar la correcta escritura y lectura de archivos JSON.

**Fase 3: Integración con Google Drive**
- Desarrollar la funcionalidad para guardar archivos JSON en Google Drive.
- Ajustar la lógica de gestión de tareas para que guarde y lea desde Drive.
- **Tareas de verificación:**
  - Pruebas de integración para verificar la comunicación con la API de Google Drive.

**Fase 4: Implementación de Autenticación OAUTH**
- Configurar la autenticación con Google OAuth.
- Asegurar que solo los usuarios autenticados puedan acceder y gestionar las tareas.
- **Tareas de verificación:**
  - Validar el proceso de inicio de sesión y la autorización.
  - Testear el acceso a las funciones de la aplicación.

**Fase 5: Verificación y Pruebas Finales**
- Realizar pruebas integrales de toda la aplicación.
- Asegurar que todas las características funcionen según lo planeado.
