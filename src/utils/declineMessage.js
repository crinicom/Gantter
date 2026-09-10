// §9.200: detección determinística de un "No" escueto de Lucía en texto libre.
// Cubre negaciones breves ("No", "No.", "No por ahora", "nah") sin confundir
// respuestas como "No sé" o "No me parece" (que son otras intenciones y sí van
// al chat). El caminó del botón "No" del hilo no depende de esto.

export function isDeclineMessage(value) {
  return /^\s*(?:no|nop|nope|nah|no por ahora|ahora no)[.!?,\s]*$/i.test(String(value || ''));
}