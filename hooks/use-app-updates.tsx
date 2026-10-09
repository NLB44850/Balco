import { useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Updates from "expo-updates";

/**
 * Les mises à jour sans réinstaller l'app (EAS Update) : à l'ouverture et à chaque retour dans l'app, Balco regarde
 * si une nouvelle version a été publiée (fusion dans `main`, workflow « Publier une mise à jour »). Si oui, il la
 * télécharge en silence puis propose de redémarrer ; « Plus tard » : elle s'installera à la prochaine ouverture.
 * Rien sur le web (le site se met à jour tout seul) ni en développement.
 */
export function AppUpdater() {
  const busy = useRef(false);
  const offered = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web" || __DEV__ || !Updates.isEnabled) return;
    const check = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const available = await Updates.checkForUpdateAsync();
        if (!available.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        const id = fetched.manifest && "id" in fetched.manifest ? String(fetched.manifest.id) : "new";
        if (!fetched.isNew || offered.current === id) return;
        offered.current = id;
        Alert.alert("Nouvelle version de Balco", "Une mise à jour vient d’arriver. Redémarrer l’app pour l’utiliser ?", [
          { text: "Plus tard", style: "cancel" },
          { text: "Redémarrer", onPress: () => void Updates.reloadAsync().catch(() => undefined) },
        ]);
      } catch (error) {
        // Pas de réseau, serveur d'Expo injoignable : on réessaiera au prochain retour dans l'app.
        console.warn("[updates] check failed", error);
      } finally {
        busy.current = false;
      }
    };
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => subscription.remove();
  }, []);

  return null;
}

/** La date de la mise à jour en cours, si l'app tourne sur une mise à jour reçue (pas celle de l'installation). */
export function currentUpdateDate(): Date | null {
  if (Platform.OS === "web" || !Updates.isEnabled || Updates.isEmbeddedLaunch) return null;
  return Updates.createdAt ?? null;
}
