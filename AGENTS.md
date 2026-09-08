# AGENTS.md

Reglas de trabajo para agentes de IA dentro de este repositorio.

## Proyecto

**Gantter** — SPA React 18 + Vite + Tailwind. Tablero Kanban + Gantt sobre las **mismas cartas**, más **Maie** (facilitadora socrática) y huddle in-app.

- **Spec v1 (única fuente de verdad de producto):** `bot_requirements.md`
- **Slices y ownership:** `HANDOFF.md`
- **Arquitectura / cómo arrancar:** `README.md`
- **Backlog viejo (congelado):** `docs/requirements.md` — no implementar US nuevas ni P2 de backend

Lo marcado **v2** en `bot_requirements.md` no se construye. No inventar features.

## Comandos

- Instalar deps: `npm install`
- Desarrollo: `npm run dev` (puerto 5173)
- Build: `npm run build`
- Tests: `npm test` (Vitest) · `npm run test:watch`

## Antes de codear

1. Leer `HANDOFF.md` (slice en curso, owner, archivos prohibidos).
2. Revisar el backlog de feedback (errores y mejoras): `GET /api/feedback` en prod o `feedbackService.listFeedback()` en dev. Triagear entradas nuevas dentro del alcance del slice.
3. Leer el § de `bot_requirements.md` que cita ese slice.
4. Si tu owner no coincide con el slice `in-progress`, no implementes: actualizá notas o pará.

## Reglas

1. **Backlog:** el trabajo se toma de `HANDOFF.md`, no de `docs/requirements.md`. No inventes IDs `US-###`. No retomes invitaciones, OAuth, Drive, SQLite ni realtime como features de v1.
2. **Entrega:** la app arranca (`npm run dev`) y pasan `npm run build` y `npm test`. Sin imports rotos ni deps sin instalar.
3. **Arquitectura:** `components/`, `context/`, `hooks/`, `models/`, `services/`, `utils/`. Alias `@/`. Maie no se mete en `ProjectContext.jsx`: va a su propio contexto/servicios cuando toque ese slice.
4. **Persistencia:** todo dato durable pasa por `services/*`. Nunca `localStorage` desde un componente. v1 es store local; no agregues DB ni auth “por si acaso”.
5. **Código:** JSX + Tailwind, comentarios solo si aportan contexto. UI en **español**. Ids internos en inglés (`thin`, `stale`, `applyMode`). Cero emoji. Maie no se llama “Asistente IA”.
6. **Seguridad:** no commitear secretos. API keys en `.env` (ignorado).
7. **Commits y deploys: solo OpenCode.** Grok no commitea ni pushea. Mensajes concisos en español. OpenCode commitea cuando el slice está listo o el humano lo pide; no mezclar dos slices en un commit si se puede evitar.
8. **Tests:** al cambiar lógica pura (`utils/`, `models/`, `services/`) añadir o actualizar tests en `src/**/__tests__/`.
9. **v1 no incluye:** auth real, billing, invitaciones, bot de Zoom/Meet, voz de Maie, facilitador de portafolio, flechas de dependencias Gantt, multiplayer entre navegadores, escanear el tablero con LLM.

## Flujo

| Quién | Comando / acción |
|---|---|
| OpenCode | Implementar el slice `owner: opencode` en `HANDOFF.md`. Al terminar: tests, pasar a `review`, commit. |
| Grok | Spec + review del diff. Punch list o promover el siguiente slice. |
| `/review` | Revisar contra `bot_requirements.md` + slice actual, no contra el backlog US viejo. |
| `/next-story` | = el slice `in-progress` de `HANDOFF.md` cuyo owner es OpenCode. Si no hay, parar. |
| `/list-stories` | Listar la tabla de slices de `HANDOFF.md`. |
| `/add-story` | No. El alcance se cambia en `bot_requirements.md` / `HANDOFF.md` con el humano. |

## Identidad v1

Equipo seed, usuario activo **Lucía Ríos**. No hace falta login real para el MVP de Maie.
