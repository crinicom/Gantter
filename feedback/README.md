# Inbox de comentarios (fuente única para el agente en planning)

`feedback/inbox.jsonl` — una entrada JSON por línea, shape igual al de la app:

```
{"id":"...","at":"ISO","type":"error|sugerencia|comentario","message":"...","screen":"...","systemState":{...}|null,"author":{...}|null}
```

- **Dev**: `POST /dev/feedback` (middleware del dev server) agrega lo que se envía desde la app local.
- **Prod**: `node scripts/pull-prod-feedback.mjs` baja lo de Fly (SQLite `/data/data.sqlite`), deduplicando por `id`.
- **Triage**: mirar `feedback/triage.md`; no borrar entradas del inbox (el estatus vive en el triage).

Cada planning: leer este archivo, marcar los nuevos en `triage.md` y proponer destino (`slice-<n>` | `backlog`).