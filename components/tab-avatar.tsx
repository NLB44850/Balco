/**
 * L'icône du 5ᵉ onglet « Moi » (retour du 24/10) : le rond avec l'initiale du prénom, vert quand l'onglet est ouvert,
 * gris sinon, et le petit point vert quand un nouveau badge attend (hooks/use-badge-dot.ts).
 */
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { useBadgeDot } from "@/hooks/use-badge-dot";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { initials } from "@/lib/garden/garden-logic";

export function TabAvatar({ color, focused }: { color: string; focused: boolean }) {
  const colors = useColors();
  const { profile } = useGarden();
  const dot = useBadgeDot();
  const letter = initials(profile.firstName);
  return (
    <View>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={letter ? styles.letter : styles.sprout}>{letter ?? "🌱"}</Text>
      </View>
      {dot && !focused && <View accessibilityLabel="Nouveau badge" style={[styles.dot, { backgroundColor: colors.primary }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  letter: { color: "#FFFFFF", fontSize: 13, lineHeight: 16, fontWeight: "800" },
  sprout: { fontSize: 13, lineHeight: 16 },
  dot: { position: "absolute", top: -2, right: -4, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "#FFFFFF" },
});
