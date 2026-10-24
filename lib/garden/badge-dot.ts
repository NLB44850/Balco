/**
 * Le petit point vert sur l'onglet « Moi » (retour du 24/10) : il s'allume quand un badge arrive (palier d'un badge,
 * badge de saison, Sainte-Catherine…) et s'éteint dès qu'on ouvre Moi. On garde sur le téléphone la date du plus
 * récent badge déjà vu ; l'herbier (une plante de plus) n'allume pas le point. Logique pure.
 */
import type { Awards } from "./awards";

/** Les clés du carnet qui sont des badges montrés dans Moi. */
export function isBadgeAward(key: string) {
  return key.startsWith("badge:") || /^(season|event):[^:]+:\d{4}$/.test(key);
}

/** La date du plus récent badge obtenu ("" : aucun). */
export function latestBadgeAt(awards: Awards) {
  return Object.entries(awards).reduce((latest, [key, at]) => (isBadgeAward(key) && at > latest ? at : latest), "");
}

/** `seenAt` : la date du plus récent badge déjà vu ("" : aucun encore), null tant qu'elle n'est pas lue. */
export function hasNewBadge(awards: Awards, seenAt: string | null) {
  return seenAt !== null && latestBadgeAt(awards) > seenAt;
}
