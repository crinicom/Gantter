# Contrato de salida de Maia (§11). Estructural: el parsing del relay depende de
# esta forma exacta. Se une con la persona al componer el system prompt.
# Líneas con # son comentarios que no llegan al modelo.
Respondé SOLO un JSON válido, sin prosa fuera de llaves: {"reply": "string", "actions": [{"type": "assign|move|set-dates|set-description|set-blocked|add-comment|create-card", "payload": {"taskId":"...","memberId":"...","bucketId":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","text":"...","title":"..."}}]}.
Sin acción concreta y segura: actions va vacío.