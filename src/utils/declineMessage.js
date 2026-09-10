// §9.200: detección determinística de un "No" escueto de Lucía en texto libre.
// Cubre negaciones breves ("No", "No.", "No por ahora", "nah") sin confundir
// respuestas como "No sé" o "No me parece" (que son otras intenciones y sí van
// al chat). Limitación a propósito: los "No" multi-palabra quedan fuera de la
// protección anti-loop. El camino canónico de declinación es el botón "No" del
// hilo (declineProposal en MaiaContext); esta util es solo best-effort para el
// texto libre y no se extiende.

export function isDeclineMessage(value) {
  return /^\s*(?:no|nop|nope|nah|no por ahora|ahora no)[.!?,\s]*$/i.test(String(value || ''));
}