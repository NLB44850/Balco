/**
 * Dans Chrome sur Android (surtout en navigation privée), ouvrir l'appareil photo peut décharger la
 * page : au retour, elle se recharge et la photo est perdue. On note l'ouverture de l'appareil photo ;
 * si la page revient rechargée avec cette note, Observer explique quoi faire au lieu de rester muet.
 * Sur le téléphone (APK), rien de tout ça : pas de `localStorage`, ces fonctions ne font rien.
 */
export const CAMERA_OPENING_KEY = "balco.camera.opening.v1";
/** Au-delà, la note est trop vieille pour expliquer un rechargement. */
const RECENT_MS = 10 * 60 * 1000;

type SimpleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): SimpleStorage | null {
  try {
    return (globalThis as { localStorage?: SimpleStorage }).localStorage ?? null;
  } catch {
    return null;
  }
}

export function markCameraOpening(now = Date.now(), store = storage()) {
  try {
    store?.setItem(CAMERA_OPENING_KEY, String(now));
  } catch {
    // Stockage plein ou interdit : tant pis, on ne pourra pas expliquer un rechargement.
  }
}

export function clearCameraOpening(store = storage()) {
  try {
    store?.removeItem(CAMERA_OPENING_KEY);
  } catch {
    // Rien à faire.
  }
}

/** La page a-t-elle été rechargée pendant la prise de vue ? (Ne l'oublie pas.) */
export function cameraWasInterrupted(now = Date.now(), store = storage()) {
  try {
    const since = Number(store?.getItem(CAMERA_OPENING_KEY));
    return Number.isFinite(since) && since > 0 && now - since < RECENT_MS;
  } catch {
    return false;
  }
}

/** Comme `cameraWasInterrupted`, puis oublie la note (le message ne s'affiche qu'une fois). */
export function takeCameraInterrupted(now = Date.now(), store = storage()) {
  const interrupted = cameraWasInterrupted(now, store);
  clearCameraOpening(store);
  return interrupted;
}

export const CAMERA_INTERRUPTED_MESSAGE =
  "Ton téléphone a rechargé la page pendant la photo (ça arrive dans Chrome, surtout en navigation privée). Prends la photo avec l’appareil photo du téléphone, puis touche « Choisir dans ma galerie ».";
