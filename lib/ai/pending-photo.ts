/**
 * La photo prise depuis le bouton appareil photo de l'accueil, en attendant qu'Observer la reprenne
 * (une seule fois) pour l'analyser. Rien n'est enregistré : c'est un simple relais entre deux écrans.
 * Observer la prend en arrivant, ou tout de suite s'il est déjà ouvert (abonnement). Une photo qui n'a
 * pas pu être préparée est signalée, pour qu'Observer le dise au lieu d'une zone vide.
 */
import type { PreparedPhoto } from "./photo";

export type PendingPhoto = { status: "ok"; photo: PreparedPhoto } | { status: "failed" };

let pending: PendingPhoto | null = null;
const listeners = new Set<(photo: PendingPhoto) => void>();

function deliver(next: PendingPhoto) {
  pending = next;
  for (const listener of listeners) {
    const photo = takePending();
    if (photo) listener(photo);
  }
}

function takePending() {
  const photo = pending;
  pending = null;
  return photo;
}

export function setPendingPhoto(photo: PreparedPhoto) {
  deliver({ status: "ok", photo });
}

/** La photo a été prise mais n'a pas pu être préparée (fichier illisible, mémoire…). */
export function setPendingPhotoFailed() {
  deliver({ status: "failed" });
}

/** Rend la photo en attente et l'oublie aussitôt. */
export function takePendingPhoto(): PendingPhoto | null {
  return takePending();
}

/** Observer ouvert : reçoit la photo dès qu'elle arrive. */
export function onPendingPhoto(listener: (photo: PendingPhoto) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** L'aperçu à afficher : les données de la photo elles-mêmes (le fichier en cache restait vide sur Android). */
export function photoPreviewUri(photo: PreparedPhoto) {
  return photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
}
