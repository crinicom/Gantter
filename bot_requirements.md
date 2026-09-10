# Gantter — Requirements

Producto: tablero Kanban + vista Gantt + facilitadora socrática (Maia) con huddle in-app.

Este archivo es la fuente de verdad para implementar. No inventar features fuera de acá. Lo que está en **v2** no se construye ahora.

**Cómo se implementa:** slices y ownership en `HANDOFF.md`. OpenCode commitea y deploya; Grok especifica y revisa. El backlog `docs/requirements.md` está congelado.

---

## 1. Tesis

Gantter no es un clon de Trello con un notetaker pegado. Es **un Scrum Master / facilitadora de Kanban que vive en el tablero**.

Los notetakers (Otter, Tactiq, tl;dv, Fireflies) transcriben la call y *después* tiran action items a Jira. Gantter invierte el flujo:

- El tablero es la fuente de verdad **durante** la reunión.
- Maia interpela con evidencia del tablero (cartas flacas, sin dueño, estancadas, Gantt en riesgo).
- Lo que se dice en el huddle se propone como cambio concreto sobre cartas.
- Nada queda en un Google Doc paralelo.

La feature de marketing no es “transcripción”. Es: **el tablero queda más honesto**.

---

## 2. Decisiones cerradas

| # | Decisión | Valor |
|---|---|---|
| 1 | Dónde habla Maia | Solo en Gantter. Nunca por voz en un canal de audio. |
| 2 | Cómo se responde | Click en la pregunta → se abre chat en el mismo panel. |
| 3 | Reunión | Huddle propio in-app. No bot de Zoom/Meet en v1. |
| 4 | Tono | Método socrático. Indagación, no órdenes ni scoring de personas. |
| 5 | Aplicación de cambios | Configurable por tablero: **auto** (aplica y deja log) o **confirmar** (sí/no). |
| 6 | Unidad de trabajo | Un tablero por proyecto, un proyecto pertenece a un equipo. |
| 7 | Portfolio | Otro facilitador a nivel portafolio = **v2**. No se construye. |

---

## 3. Personajes

### Equipo (usuarios)

Gente que mueve trabajo en un tablero: PM, diseño, ingeniería, QA. Entran al tablero, miran Kanban o Gantt, responden a Maia, abren huddles cortos.

El usuario activo del MVP se presenta como un miembro del equipo (p. ej. Lucía, PM). No hace falta auth real en v1: identidad demo local, con un equipo seed.

### Maia (facilitadora)

- Nombre: **Maia** (de *mayéutica*).
- Rol: partera del trabajo. No da lecciones. Pregunta para que el equipo descubra qué le falta a una carta.
- Habla español rioplatense, breve (2–4 oraciones).
- Nunca usa emoji.
- Nunca acusa a una persona (“Juan no labura”). Habla del trabajo: “esta carta no tiene dueño”.
- No escribe en el tablero en silencio salvo que el modo **auto** esté prendido, y aún ahí deja un log visible.

---

## 4. Arquitectura de información

```
Gantter
 └── Proyecto (tablero de un equipo)
      ├── Miembros
      ├── Columnas Kanban
      ├── Cartas (las mismas en Kanban y Gantt)
      ├── Maia
      │    ├── Preguntas (interpelaciones)
      │    ├── Chat por pregunta
      │    ├── Propuestas sí/no (modo confirmar)
      │    └── Log de acciones
      └── Huddle (sesión in-app sobre ese tablero)
```

- Home: lista de proyectos del equipo, con un semáforo de higiene (cantidad de preguntas abiertas).
- Entrar a un proyecto: tablero + panel de Maia siempre visible en desktop.
- Un proyecto = un tablero. No hay tablero de portafolio en v1.

---

## 5. Tablero Kanban

Columnas típicas del seed: **Backlog · Listo · En curso · Hecho**.

Cada carta muestra:

- Título
- Avatares de responsables
- Rango de fechas (si hay)
- Semáforos quietos: sin detalle, sin dueño, estancada, bloqueada
- Stripe de bloqueada si aplica

Interacciones:

- Drag & drop entre columnas
- Click abre detalle: título, descripción, responsables, fechas inicio/fin, bloqueada + motivo, comentarios
- Crear carta desde la columna
- Comentarios de personas y de Maia (Maia se distingue con su marca, no con un avatar de humano)

WIP: si la columna En curso tiene límite y se excede, Maia puede preguntar, pero el WIP no bloquea el drop (Kanban informa, no policial).

---

## 6. Vista Gantt

Las **mismas cartas**. No hay entidades distintas “tarea Gantt”.

- Eje X: días (rango que cubra ~10 días atrás y ~3–4 semanas adelante respecto de hoy)
- Eje Y: una fila por carta con fechas
- Barra = `startDate` → `endDate`
- Línea de “hoy”
- Color de barra por responsable (paleta de tierra, baja croma)
- Click en barra abre el mismo detalle de carta
- Cartas **sin fechas** viven en un canal aparte “Sin fechas”, no se inventa una barra
- Overlap: si un mismo responsable tiene barras que se pisan, se marca visualmente (anillo o patrón), y Maia puede preguntar
- Hitos cercanos (p. ej. go-live) se ven en el header del timeline

En v1 el Gantt es sobre todo de lectura + click. Arrastrar barras para cambiar fechas es deseable si sale barato; no es bloqueante del MVP.

El Kanban y el Gantt se conmutan desde el chrome del proyecto. Cambiar de vista no pierde el panel de Maia ni el huddle activo.

---

## 7. Panel de Maia (siempre visible)

Desktop: dock derecho ~360px, no se cierra durante una sesión de tablero.

Mobile: no comprimir el tablero. Maia va a una pestaña o bottom sheet, con badge de preguntas abiertas.

### Capas del panel (no tres apps)

1. **Preguntas** — interpelaciones abiertas, una tarjeta por pregunta. Arriba, cuando el proyecto tiene onboarding activo, va el bloque **Ficha del proyecto** con el botón "Responder estas preguntas" que abre el modal de onboarding en primer plano.
2. **Huddle** — transcript vivo cuando hay sesión.
3. **Registro** — log de acciones de Maia (auto y confirmadas).

Header del panel: marca de Maia + nombre + rol “Facilitadora” + contador de preguntas abiertas.

### Click → chat

Estado inicial de una pregunta: se ve la pregunta socrática + una línea de evidencia (“sin update hace 18 días”, “no hay responsable”, “Martín tiene 3 barras superpuestas”).

Click en la pregunta:

- Se abre el hilo de esa pregunta, no un chat global.
- Input abajo para responder como el usuario activo.
- Maia responde en el hilo (socrática).
- Si hay suficiente información para un cambio concreto, Maia propone acciones según el modo del tablero (ver §9).

No hay un chat general con Maia desanclado de una pregunta, salvo un campo corto “preguntarle a Maia por el tablero” que crea un hilo ad-hoc. Prioridad: hilos anclados a cartas/preguntas.

Snooze: “recordame en el próximo standup”. No un snooze abstracto de 3 días sin contexto.

Resolver: cuando se aplica la acción que originó la pregunta, o cuando el usuario marca “queda así”.

---

## 8. Catálogo de interpelaciones (v1)

Cada pregunta es **evidencia + pregunta socrática + 1–3 acciones posibles + snooze**. Nunca un badge rojo mudo.

Generarlas **en el cliente**, con reglas determinísticas sobre el tablero. No llamar a un LLM al cargar el tablero. El LLM entra cuando la persona responde en el chat (§11).

| Kind | Cuándo | Pregunta tipo (tono, no copy final) | Acciones típicas |
|---|---|---|---|
| `thin` | Carta con título y descripción vacía / trivial | “Si alguien toma esto mañana, ¿qué no sabría todavía?” | Pedir descripción, abrir chat para dictarla |
| `unassigned` | Carta en Listo o En curso sin responsable | “Esta carta está en Listo. ¿De quién es el siguiente movimiento?” | Asignar a un miembro |
| `stale` | Carta activa (no Hecho) sin movimiento ni comentario en N días (default 15, configurable) | “Lleva 18 días sin movimiento. ¿Sigue siendo trabajo activo, o es un recuerdo?” | Mover, comentar, marcar bloqueada, snooze |
| `missing-date` | Carta relevante a un hito cercano y sin `startDate`/`endDate` | “El hito está a 5 días y esta barra no tiene fechas. ¿Qué habría que comprometer?” | Cargar fechas |
| `overlap` | Un miembro con dos o más barras que se pisan | “Martín aparece en tres barras que se pisan. ¿Cuál es la real esta semana?” | Reasignar, mover fechas, sacar a alguien |

Al mutar el tablero, re-escanear. Conservar hilo si sigue existiendo el par `cardId + kind`. Si la condición desapareció (ya tiene dueño, ya tiene descripción), resolver sola y dejar rastro en el log: “se resolvió porque Ana tomó la carta”.

Tono socrático obligatorio. Ejemplos de lo que **no** se dice:

- “Completá la descripción.”
- “Esta tarea está atrasada, asignala.”
- “Sofía no actualiza sus cartas.”

---

## 9. Modos de aplicación (configurable por tablero)

Setting en el proyecto: `applyMode: "auto" | "confirm"`.

Visible, no enterrado: un control en el chrome del tablero o en settings del proyecto, etiquetado en humano:

- **Preguntar sí/no** (default recomendado)
- **Aplicar y dejar registro**

### Modo confirmar

Maia nunca muta el tablero sola.

Cada propuesta se ve como una fila:

> Asignar “Auth magic link” a Martín Vega  
> [Sí] [No]

- Sí → aplica, comenta la carta con el quote/razón, escribe el log, resuelve o actualiza la pregunta.
- No → no aplica. Maia pregunta una sola vez más: “¿Qué habría que hacer entonces?” Si tampoco hay cambio, queda abierta o se snoozea. No insistir en loop.

### Modo auto

Maia aplica el cambio obvio y **siempre** deja:

1. Un comentario en la carta (voz de Maia, con la evidencia).
2. Una entrada en el **log de acciones** del panel (timestamp, resumen, carta, origen `auto`).

El log es visible e irreversible en el sentido de auditoría: se puede deshacer el cambio a mano en el tablero, pero el log no se borra.

Cambios “obvios” para auto: asignar cuando hay un match 1:1 de nombre, marcar bloqueada, cargar fechas que el usuario acaba de decir, mover a Hecho si lo dijeron. **No** auto-crear 20 cartas nuevas por huddle. Crear carta en auto solo si el título es nítido y el usuario lo pidió.

---

## 10. Huddle propio (v1)

No es Zoom. Es una sesión in-app sobre el tablero actual.

### Arranque

Desde el chrome: **Abrir huddle**. Se elige el ritual:

| Ritual | Prioridad de Maia |
|---|---|
| Standup / walk the board | Blockers, estancadas, sin dueño |
| Refinamiento | Cartas flacas, splits, criterios |
| Planning | Capacidad vs barras del Gantt, fechas, corte de scope |
| Huddle de blocker | Una carta, un problema, un next step |

### Qué se ve

- Barra persistente de sesión (quién está, ritual, timer, terminar).
- En el panel, tab **Huddle**: transcript con speaker, timestamp, texto.
- Las cartas mencionadas se iluminan en Kanban/Gantt.
- Maia **no habla por audio**. Solo escribe en el panel, anclada a preguntas/propuestas.

### Cómo entra el habla (v1)

Dos entradas, las dos válidas:

1. **Demo de standup** (obligatoria para que el producto se entienda en 60 segundos). Reproduce un guion del equipo seed. Maia reacciona en vivo: aparecen preguntas y sí/no (o auto-aplica). Las cartas se mueven de verdad. Al cerrar, Maia pregunta: “Antes de cortar, ¿qué de todo esto queda sin dueño?”
2. **Texto del usuario** como si hablara en el huddle (el usuario activo escribe una línea). Maia la interpreta contra el tablero.
3. **Micrófono (Web Speech, Chrome/Edge)** — se trata como otra línea de transcript del usuario activo. Se interpreta **sin LLM**, con un matcher determinístico que ancla por número de carta `#N` (§12) o título exacto y por el nombre del miembro (“me quedo con la 12”, “la toma Sofía”, “se bloqueó la 12”). Cero tokens: nada de reconocimiento ni de matching pasa por el modelo. Si la detección es de alta confianza y el modo es **auto**, la acción se aplica y registra sola; si no, queda como propuesta sí/no; sin señal clara, Maia pregunta con un templated. Crear cartas nunca sale del mic. Sin `SpeechRecognition` disponible, el botón no se muestra y quedan las vías 2 y demo.

Esto no es “transcripción como feature de portada” (§16): no se produce un documento de notas; la línea entra al transcript del huddle, su acción pasa por las mismas propuestas/log del resto de mutaciones de Maia y las cartas se tocan una por una, nunca decenas.

### Cierre

Al terminar el huddle:

- Recap corto de Maia: decisiones, propuestas pendientes, cartas que se mencionaron y no se tocaron.
- Las propuestas no confirmadas siguen en Preguntas, no se tiran.
- El transcript queda guardado en el proyecto y se puede reabrir (lectura).

### Guion demo (seed)

El standup demo tiene que disparar, en orden, al menos:

1. Alguien admite un blocker no marcado → propuesta `set-blocked`.
2. Alguien se ofrece a tomar una carta sin dueño → propuesta `assign`.
3. Alguien admite no tocar una carta estancada → pregunta `stale`.
4. Alguien señala una carta sin fecha pegada a un hito → propuesta `set-dates`.

Si el modo es auto, 1, 2 y 4 se aplican y van al log. Si es confirmar, aparecen sí/no.

---

## 11. Contrato de IA

### Qué es local (sin LLM)

- Escanear el tablero y abrir preguntas del catálogo §8.
- El guion del standup demo y las propuestas asociadas.
- Aplicar / rechazar acciones, log, mutaciones.

### Qué usa LLM (OpenAI, `gpt-4o-mini`)

Solo cuando el usuario **envía un mensaje** en el chat de una pregunta (o una línea de huddle que no es el guion demo).

Nunca en page load, nunca por tecla, nunca en loop.

System prompt (intención, no texto sagrado):

- Sos Maia, facilitadora socrática de Gantter.
- Trabajás sobre un tablero Kanban + Gantt que te pasan como contexto (cartas relevantes, miembros, fechas, modo auto/confirm).
- No das órdenes. Preguntás. 2–4 oraciones, español rioplatense, sin emoji.
- Si el usuario ya dio un dato accionable, devolvé acciones concretas (ids reales de cartas y miembros).
- Si no alcanza, una sola pregunta más. No interrogatorio.
- Hablá del trabajo, no de la persona.

Salida estructurada:

```json
{
  "reply": "string",
  "actions": [
    {
      "type": "assign | move | set-dates | set-description | set-blocked | add-comment | create-card",
      "...payload": "ids y campos reales"
    }
  ]
}
```

`actions` se traduce a propuestas (modo confirmar) o se aplica + log (modo auto). El `reply` se appendea al hilo.

Si no hay API key o falla el call: degradar con una respuesta socrática templated según el `kind` de la pregunta, sin inventar mutaciones. Nunca crashear el tablero.

Cap de tokens bajo: `max_tokens` de salida 300, contexto acotado ~1200 chars y mensaje del usuario ≤1000 chars. Un reintento máximo. El gasto es del dueño de la app: no escanear el tablero con LLM.

---

## 12. Datos

v1: persistencia local (un store en el cliente). Un tablero por proyecto, varios proyectos en el mismo store. No auth. No DB. Identidad = miembro seed elegido como “vos”.

v2 (no implementar): cuentas reales, varios equipos, facilitador de portafolio, bot de Zoom/Meet.

### Entidades

**Project**  
id, name, teamName, summary, members[], columns[], cards[], inquiries[], actionLog[], settings `{ applyMode, staleDays }`

**Member**  
id, name, initials, role

**Column**  
id, title, wipLimit?

**Card**  
id, title, description, columnId, assigneeIds[], startDate, endDate, blocked, blockedReason, comments[], number, createdAt, updatedAt, lastActivityAt

`number` es el número de carta por proyecto (`#N`), inmutable, asignado en orden de creación (1..N). Es la referencia humana en voz ("me quedo con la 12"), el ancla robusta del reconocimiento del huddle y aparece en chips Kanban/Gantt y en labels de propuestas. Se conserva en el round-trip canónico; tareas perseguidas sin número reciben backfill por orden.
**Inquiry**  

id, projectId, cardId?, kind, question, evidence, status (`open | chatting | resolved | snoozed`), `followedUpAt?` (ISO — hora en la que Maia hizo el follow-up único de §9.200), thread[], proposals[]

**ProposedAction**  
id, action, label, status (`pending | applied | dismissed`)

**ActionLogEntry**  
id, at, source (`auto | confirm | manual`), summary, cardId?

**Huddle**  
active, projectId, mode, startedAt, transcript[], joinedIds[], playingDemo

**Document**  
id, title, content (markdown), createdAt, updatedAt

`Project.documents[]` son documentos markdown del proyecto (la "Ficha del proyecto" es el primero, creado por el onboarding). Se editan y persisten como dato del proyecto (viajan en el documento canónico junto con el resto de la entidad, no son "notas desconectadas"). Se muestran en la vista "Información del proyecto" (pestaña en el tab bar: OneNote-like — lista de documentos + editor con Ver/Editar y autosave).

**Onboarding**  
answers `{[qid]: text}`, currentQuestionId?, done (bool)

Las preguntas del onboarding viven en `maia/onboarding/questions.md` (un archivo de markdown, config a nivel app que se re-empaqueta en cada deploy; convenio de `## Título` en los templates de Maia). El panel de Maia muestra un bloque "Ficha del proyecto" con "Responder estas preguntas"; el modal en primer plano responde una por una, con dictado opcional y **autosave** (sin botón guardar). Mientras `done` sea false, la "Ficha del proyecto" se **regenera** desde `answers` (sección `## <pregunta>` por respuesta) en `Project.documents[]`; al cerrar (`done`) queda congelada y libre para edición manual. Proyectos nuevos parten con onboarding activo; proyectos legacy/seeds con ficha de ejemplo lo traen `null` (sin bloque).

Las cartas son la única fuente para Kanban y Gantt. `lastActivityAt` se pisa en cualquier move, comentario, assign, cambio de fechas o de bloqueo.

---

## 13. Seed (para que el producto se sienta en 60s)

Un proyecto principal sucio, un segundo proyecto más limpio para que se vea “un tablero por proyecto”.

### Proyecto 1 — Portal de clientes (equipo Río)

Miembros:

- Lucía Ríos — PM (usuario activo)
- Martín Vega — Frontend
- Ana Soler — Backend
- Sofía Chen — Diseño
- Diego Palacios — QA

Cartas (mínimo, con huecos reales):

| Carta | Columna | Dueño | Fechas | Problema a disparar |
|---|---|---|---|---|
| Rediseñar onboarding | En curso | Sofía | sí | `stale` (~18 días sin actividad) |
| Auth magic link | Listo | — | no | `unassigned` + `thin` |
| Webhook de pagos | En curso | Ana | sí | blocker no marcado (el demo lo destapa) |
| QA staging release | Listo | Diego | no | `missing-date` (hito a ~7 días) |
| Migrar checkout a v3 | En curso | Martín | sí | `overlap` con Analytics |
| Analytics de conversión | Listo | Martín | sí, se pisa | `overlap` |
| Copy legal de reembolsos | Backlog | — | no | `thin` + `unassigned` (Backlog: opcional, no insistir) |
| Fix timeout 3DS | Hecho | Ana | sí | sana, no preguntar |
| Documentar API pública | Listo | Lucía | no | `thin` |

Hito visible en Gantt: go-live del portal, ~7 días desde “hoy”.

### Proyecto 2 — App móvil v2 (equipo Costa)

Pocas cartas, casi todas sanas. Sirve para cambiar de tablero y ver a Maia en silencio (o con 0–1 pregunta).

Debe haber un **reset a datos demo** en settings, para volver a este estado.

---

## 14. UI / marca

Nombre: **Gantter**. Facilitadora: **Maia**.

Dirección visual: estudio de facilitación, editorial, papel cálido. No SaaS violeta. No neon. No emoji en chrome.

Paleta (tokens, no hex suelto en JSX):

- Papel: `#EFEAE2`
- Superficie: `#F7F3EC` / `#FFFCF8`
- Tinta: `#1A1814`
- Muted: `#6F6A62`
- Acento único: bosque `#2B4D42` (botones primarios, Maia, foco)
- Semántica (solo badges chicos): rust para stale/blocked, bosque para ok

Tipografía: una display serif humana (p. ej. Fraunces) para nombre/títulos + una sans para UI (p. ej. Figtree). Máximo 2 familias.

Maia tiene una marca geométrica (monograma / arco de escucha), no una cara fotoreal ni un emoji.

Desktop: tablero | Gantt ocupan el centro; Maia no se puede “perder”.  
Mobile (~390): tabs Tablero / Gantt / Maia; targets ≥ 44px; sin overflow horizontal.

Copy de producto en español. Cero emoji. Cero “✨ magia”. Verbos: Abrir huddle, Sí, No, Preguntar a Maia, Aplicar y dejar registro.

---

## 15. Alcance v1 vs v2

### v1 — hay que poder tocar esto

1. Home con ≥2 proyectos.
2. Kanban usable (crear, mover, asignar, fechas, bloquear, comentar).
3. Gantt de las mismas cartas, con hoy, overlaps y canal “sin fechas”.
4. Panel Maia con las 5 interpelaciones reales sobre el seed.
5. Click en pregunta → chat. LLM si hay key; si no, fallback templated.
6. Setting auto vs confirmar, visible, persiste por proyecto.
7. Log de acciones.
8. Huddle in-app + **standup demo** que muta el tablero de verdad.
9. Reset a demo.
10. Persistencia local.

### v2 — no construir

- Facilitador de portafolio (multi-tablero, hitos de empresa).
- Bot que entra a Zoom / Meet / Teams.
- Voz de Maia en un canal de audio / TTS.
- Video in-app (el huddle es transcript + presencia, no camera grid).
- Auth, billing, invitaciones, SSO.
- Scoring de “quién habla mal” o coaching de oratoria.
- Auto-crear decenas de cartas por reunión.
- Dependencias formales tipo flechas Gantt (el overlap de persona alcanza).
- Multiplayer realtime entre dos navegadores.

---

## 16. Lo que no se hace (nunca, o no sin decisión nueva)

- Maia hablando por el micrófono de una call.
- Interpelar en público la productividad de una persona.
- Transcripción como feature de portada.
- Un documento de notas desconectado del tablero como destino final. (La "Ficha del proyecto" del onboarding **no** es una excepción: es dato del proyecto, viaja en el documento canónico y vive junto a cartas y columnas; su edición sigue siendo local como el resto del store v1.)
- Modo “Maia callada con badges rojos”. Si no puede preguntar, no existe.

---

## 17. Criterios de aceptación (demo de 60s)

Una persona que no leyó este archivo tiene que poder:

1. Abrir Gantter y ver el proyecto **Portal de clientes** con cartas sucias y Maia ya preguntando (sin haber tocado un LLM).
2. Cambiar a Gantt y ver barras, hoy, un overlap de Martín y cartas sin fechas.
3. Clickear una pregunta de Maia, responder en el chat, ver una propuesta.
4. En modo confirmar: Sí aplica y la carta cambia; No no aplica y queda log de la negativa o la pregunta sigue.
5. Pasar a modo auto, reproducir el **standup demo**, ver transcript, ver cartas que se asignan/bloquean/fechan solas, y abrir el **registro**.
6. Cambiar al proyecto **App móvil v2** y notar que Maia no arrastra el ruido del otro tablero.
7. En ~390px de ancho, usar Tablero / Gantt / Maia sin scroll horizontal ni controles de 20px.

Si el huddle demo no mueve el tablero, el producto no está.

---

## 18. Notas para quien implemente

- Un tablero por proyecto significa: el store de Maia, el huddle y el log son **por proyecto**. Cambiar de proyecto desmonta el huddle activo (o lo deja asociado a ese id, no se mezcla el transcript).
- Re-scan de preguntas después de cada mutación, incluyendo las que hace Maia.
- Toda mutación de Maia escribe comentario en la carta + log. Sin excepciones en modo auto. En confirmar, el comentario se escribe al Sí.
- El usuario activo (Lucía) es quien firma los mensajes de chat y las líneas de huddle escritas a mano.
- Idioma de UI: español. IDs internos en inglés (`thin`, `stale`, etc.).
- No agregar auth, DB ni rutas de login “por si acaso”.
- Gantter es el nombre del producto. Maia es el personaje. No renombrar a “Asistente IA”.

---

## 19. Preguntas abiertas (no bloquean v1)

Estas se pueden resolver en implementación con el default entre paréntesis:

- ¿Se puede cambiar el usuario activo para “ser” Martín? (no, quedate en Lucía)
- ¿WIP bloquea el drop? (no)
- ¿Gantt arrastrable? (si sale barato sí; si no, solo click)
- ¿Micrófono? (si el browser lo da, se engancha como línea de huddle; si no, se oculta)
- ¿Varios huddles en paralelo? (no, uno por proyecto)
