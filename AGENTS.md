# AGENTS.md

Reglas de trabajo para agentes de IA (OpenCode) dentro de este repositorio.

## Proyecto

**Gantter** — SPA React 18 + Vite + Tailwind. Dos vistas sobre el mismo estado: **Board** (buckets con drag & drop) y **Gantt** (diagrama con camino crítico). Persistencia en `project.json` (Drive en modo `drive`, `localStorage` en modo `offline`). La fuente de verdad de requisitos está en `docs/requirements.md`; la documentación técnica en `README.md`.

## Comandos

- Instalar deps: `npm install`
- Desarrollo: `npm run dev` (puerto 5173)
- Build: `npm run build`
- Tests: `npm test` (Vitest) · `npm run test:watch`

## Reglas

1. **Backlog**: antes de implementar una historia de usuario, consulta `docs/requirements.md`. Al terminar, actualiza su `Estado` (pendiente → en-progreso → hecho) y marca en `TASKS.md`/`TASKS2.md` si corresponde (legacy). No inventes historias con IDs propios; si agregas una, usa `US-###` secuencial.
2. **Regla de entrega**: la app debe poder arrancar (`npm run dev`) sin errores y pasar `npm run build` y `npm test`. No dejes imports rotos ni dependencias sin instalar.
3. **Arquitectura**: mantén la separación actual — `components/`, `context/`, `hooks/`, `models/`, `services/`, `utils/`. No reintroduzcas duplicados por capitalización (`Auth/` vs `auth/` etc.). Usa rutas con alias `@/` si agregas nuevas.
4. **Persistencia**: cualquier nuevo dato que deba guardarse debe pasar por la capa `services/*` (backend pluggable local/Drive), no escribirse directo en `localStorage` desde componentes.
5. **Código**: sigue el estilo existente (JSX + Tailwind, sin comentarios salvo que aporten contexto). Incluye versión `en` español en textos de UI.
6. **Seguridad**: no commitsé secretos. Las credenciales Google van en `.env` (ignorado) y se leen vía `src/config/appConfig.js`.
7. **Commits**: solo commitea si el usuario lo pide explícitamente. Mensajes concisos en español.
8. **Tests**: al cambiar lógica pura (`utils/`, `models/`, `services/`) añade o actualiza tests en `src/**/__tests__/`.

## Flujo de trabajo con comandos OpenCode

- `/review` — revisar la app y reportar hallazgos priorizados.
- `/add-story` — crear una nueva historia en `docs/requirements.md`.
- `/next-story` — implementar la próxima historia pendiente.
- `/list-stories` — listar el backlog por estado.

Usa `docs/requirements.md` como referencia de alcance para cambios de producto; usa `README.md` para detalles de arquitectura y configuración.