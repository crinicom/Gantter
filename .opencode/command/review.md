---
description: Revisa la aplicación y reporta hallazgos priorizados (bugs, imports rotos, consistencia).
agent: build
---

Revisa la aplicación Gantter en su estado actual y reporta hallazgos priorizados.

1. Inspecciona la estructura: `src/components`, `src/context`, `src/hooks`, `src/services`, `src/utils`.
2. Verifica que la app compila: ejecuta `npm run build`.
3. Verifica que los tests pasan: ejecuta `npm test`.
4. Busca:
   - Imports rotos o referencias a archivos que no existen.
   - Componentes que no siguen la arquitectura (persistencia directa en localStorage desde componentes, duplicados por capitalización, dependencias no declaradas).
   - Bugs de dominio (validación de dependencias, CPM, fechas).
   - Problemas de UX evidentes en Board y Gantt.
5. Ejecuta `npm run dev` solo si es necesario y no dejes procesos colgados.

Reporta en formato priorizado:
- **ALTA** (bloquea uso / rompe build / pierde datos)
- **MEDIA** (funcionalidad parcial o UX incorrecta)
- **BAJA** (estilo, limpieza)

Para cada hallazgo indica `archivo:línea`, qué ocurre y la corrección sugerida. NO modifiques código en este comando: es solo revisión. Usa $ARGUMENTS si hay un área concreta a revisar.