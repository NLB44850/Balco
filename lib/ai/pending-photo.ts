/**
 * La photo prise depuis le bouton appareil photo de l'accueil, en attendant qu'Observer la reprenne
 * (une seule fois) pour l'analyser. Rien n'est enregistré : c'est un simple relais entre deux écrans.
 */
import type { PreparedPhoto } from "./photo";

let pending: PreparedPhoto | null = null;

export function setPendingPhoto(photo: PreparedPhoto) {
  pending = photo;
}

/** Rend la photo en attente et l'oublie aussitôt. */
export function takePendingPhoto(): PreparedPhoto | null {
  const photo = pending;
  pending = null;
  return photo;
}
