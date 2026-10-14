/** Le message du bas commun à toute l'app (lib/ui/global-toast.ts), au-dessus de la barre des onglets. */
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UndoToast, useUndoToast } from "@/components/today/undo-toast";
import { subscribeGlobalToast } from "@/lib/ui/global-toast";

/** La barre des onglets : le message passe juste au-dessus. */
const TAB_BAR_HEIGHT = 64;

export function GlobalToast() {
  const insets = useSafeAreaInsets();
  const { toast, show, hide } = useUndoToast();
  useEffect(() => subscribeGlobalToast(show), [show]);
  return <UndoToast message={toast} onDone={hide} bottom={insets.bottom + TAB_BAR_HEIGHT + 12} />;
}
