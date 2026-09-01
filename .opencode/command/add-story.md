---
description: Crea una nueva historia de usuario en docs/requirements.md.
agent: build
---

Agrega una nueva historia de usuario al backlog de `docs/requirements.md`.

$ARGUMENTS contiene la descripción de la nueva funcionalidad.

Pasos:
1. Lee `docs/requirements.md` para conocer el formato y el último ID usado.
2. Determina el siguiente ID (`US-###` secuencial) y verifica que no esté en uso.
3. Añade la historia con el formato del archivo:
   - **Como** [rol], **quiero** [capacidad], **para** [beneficio].
   - **Criterios:** (lista de criterios de aceptación).
   - **Estado:** pendiente.
4. Si el usuario no aportó todos los campos, pregúntale antes de escribir.

No implementes la historia: este comando solo la registra en el backlog.