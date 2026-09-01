---
description: Implementa la próxima historia pendiente del backlog.
agent: build
---

Implementa la próxima historia de usuario pendiente de `docs/requirements.md`.

Pasos:
1. Lee `docs/requirements.md` y elige la primera historia con **Estado: pendiente**.
2. Marca su estado como **en-progreso** en el archivo.
3. Lee `README.md` y `AGENTS.md` para contexto de arquitectura y reglas.
4. Implementa la funcionalidad siguiendo las convenciones existentes (JSX + Tailwind, layer `services/*` para persistencia, textos en español).
5. Si toca lógica pura (`utils/`, `models/`, `services/`), añade o actualiza tests en `src/**/__tests__/`.
6. Verifica: `npm run build` y `npm test`. No dejes imports rotos.
7. Al terminar, marca la historia como **hecho**.
8. Reporta resumen de lo implementado, archivos tocados y estado de los checks.

No commitees a menos que el usuario lo pida. Usa $ARGUMENTS si hay una historia concreta a implementar (por ID o fragmento del título); si no, toma la primera pendiente.