/**
 * Quand un écran plante : « Oups » et « Réessayer », au lieu d'une app qui se ferme d'un coup (Tour de l'appli,
 * étape 3). Rendu par expo-router à la place de l'écran fautif (`ErrorBoundary` de app/_layout.tsx), sans les
 * fournisseurs de l'app : rien ici ne dépend du jardin, du compte ou du réseau.
 */
import type { ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { Colors } from "@/constants/theme";

// Pas de thème ici (son fournisseur est au-dessus de l'écran qui a planté) : les couleurs du thème clair, et un
// bouton dessiné comme le bouton principal de l'app (vert de marque plein).
const colors = Colors.light;
const BRAND_GREEN = "#1F7A4D";

export function OopsScreen({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[app] écran planté", error);
    // Si l'app plante avant son premier affichage, l'écran de démarrage ne doit pas rester devant.
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [error]);
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} accessibilityRole="alert">
      <Text style={styles.emoji}>🪴</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Oups, cet écran a eu un souci</Text>
      <Text style={[styles.text, { color: colors.muted }]}>Ton balcon et tes gestes sont bien gardés. Réessaie : le plus souvent, ça suffit.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Réessayer" onPress={() => void retry()} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}>
        <Text style={styles.buttonText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emoji: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  text: { fontSize: 16, lineHeight: 22, textAlign: "center" },
  button: { marginTop: 12, alignSelf: "stretch", backgroundColor: BRAND_GREEN, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
