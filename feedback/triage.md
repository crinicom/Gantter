# Triage de feedback

Ritual de cada planning: leer `feedback/inbox.jsonl`, marcar las entradas **nuevas**
(las que aún no figuran acá) y proponer destino. Fuente de verdad de producto:
`bot_requirements.md`; el trabajo se toma de `HANDOFF.md`.

## Nuevas (pendientes de decidir)

- **1e5c71aa…** (2026-09-08, prod) — formulario de ingreso de comentarios; dice "No hacer nada". → descartado (prueba).

## Decididas este planning

- **d4e880c5…** (2026-09-09, prod) — pantalla Login: botón "Iniciar Sesión" sin sentido + leyenda "Modo offline…"; proponía reemplazar la pantalla por "los últimos cambios". Decisión humana (2026-09-09): **no entra a slice 8**; la UI de Login en v1 es deliberada (§15, sin auth real). → backlog rework, sin agenda.

## Estado del triage

Referencias: `IN` = línea de `feedback/inbox.jsonl` (id) · `DEST` = destino · `EST` = estatus.

| IN | Fecha | Fuente | Resumen | DEST | EST |
|---|---|---|---|---|---|
| 1e5c71aa-22e1-4ff2-9656-a7b060fe8357 | 2026-09-08 | prod | Prueba del formulario; "No hacer nada" | — | descartado |
| d4e880c5-e839-44e1-86bd-e1a5236ca2b1 | 2026-09-09 | prod | Login: botón sin sentido + sugerir mostrar últimos cambios | backlog rework | backlog |

## Estatus

- `nuevo` — llegó al inbox, sin decidir.
- `slice-<n>` — entra al slice N (se anota en `HANDOFF.md`).
- `backlog` — pendiente; etiqueta ligera `feature` / `rework` en `DEST`.
- `done` / `descartado` — resuelto, o no aplica (+ motivo en `Resumen`).

## Acciones por estatus

- `slice-<n>`: el agente lo referencia en el trabajo del slice y lo mueve a `done` al cerrar.
- `backlog`: queda acá hasta que el humano lo agende (no inventar slices).