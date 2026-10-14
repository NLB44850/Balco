/**
 * Un message du bas qui survit au changement d'écran (chantier « Cohérence », livraison 2) : « Basilic retiré de ton
 * balcon · Annuler » s'affiche sur Balcon, où l'on revient après avoir retiré la plante depuis sa fiche. Affiché par
 * `GlobalToast` (components/global-toast.tsx), posé une fois dans app/_layout.tsx.
 */
import type { ToastMessage } from "@/components/today/undo-toast";

type Listener = (message: Omit<ToastMessage, "id">) => void;
const listeners = new Set<Listener>();

export function showGlobalToast(message: Omit<ToastMessage, "id">) {
  listeners.forEach((listener) => listener(message));
}

export function subscribeGlobalToast(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
