/**
 * Les erreurs de Nora et d'Observer, en mots simples. Le serveur répond déjà en français (quota, budget,
 * service indisponible) : on garde son message. Sans réponse lisible du serveur (connexion coupée, serveur qui
 * redémarre, délai dépassé par le Codespace…), le message technique du navigateur (« Failed to execute 'json'
 * on 'Response'… ») est remplacé. Logique pure.
 */
export const NORA_CONNECTION_LOST = "La réponse de Nora s’est perdue en route : la connexion avec le serveur s’est coupée. Touche « Réessayer » pour la récupérer.";
export const SCAN_CONNECTION_LOST = "L’analyse n’a pas pu aboutir : la connexion avec le serveur s’est coupée. Réessaie dans un instant.";

/** Un message de navigateur ou de réseau, jamais écrit pour quelqu'un. */
const TECHNICAL = /json|fetch|network|unexpected|load failed|aborted|timed? ?out|econn|socket|status code|internal server error/iu;

/** Pas de réponse lisible du serveur : la question a pu être traitée quand même (on peut la redemander). */
export function isConnectionLost(error: { message?: string; data?: unknown }) {
  return !error.data || TECHNICAL.test(error.message ?? "");
}

/** `data` est présent quand le serveur a répondu (tRPC) : son message est fait pour être lu. */
export function aiErrorText(error: { message: string; data?: unknown }, connectionLost = NORA_CONNECTION_LOST) {
  return isConnectionLost(error) ? connectionLost : error.message;
}

/** Une notice déjà enregistrée dans la conversation (avant cette correction, sans « Réessayer ») : réécrite. */
export const OLD_CONNECTION_LOST = "La réponse de Nora s’est perdue en route : la connexion avec le serveur s’était coupée.";
export function noticeText(text: string) {
  return TECHNICAL.test(text) ? OLD_CONNECTION_LOST : text;
}
