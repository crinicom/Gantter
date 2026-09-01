---
name: requirements
description: Use when the task involves product behavior, backlog, or user stories in this repo. It instructs agents to treat docs/requirements.md as the single source of truth, consult it before implementing a story, and update the story status when done.
---

# Gestión de requisitos (Gantter)

`docs/requirements.md` es la fuente de verdad del backlog de historias de usuario.

## Cuándo usar

- Antes de implementar un cambio de producto, lee `docs/requirements.md` y localiza la historia US-### relacionada.
- Cuando termines una historia, actualiza su campo `Estado`:
  - `pendiente` → `en-progreso` (al iniciar)
  - `en-progreso` → `hecho` (al completar y verificar)
- Si el cambio no corresponde a ninguna historia existente, proponé agregar una con `/add-story` (IDs `US-###` secuenciales). No inventes IDs propios.

## Reglas de alcance

- Consulta `README.md` para arquitectura y `AGENTS.md` para convenciones de código antes de tocar código.
- No modifiques `docs/requirements.md` para reflejar cambios que aún no estén implementados y verificados.
- Los estados de las historias deben ser consistentes con lo que realmente existe en el código.