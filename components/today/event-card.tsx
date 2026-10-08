import { Pressable, StyleSheet, View } from "react-native";

import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

/**
 * La carte compacte d'un événement (« 🌳 La Sainte-Catherine · Ce que tu plantes maintenant… › ») ou de son bilan,
 * sous le bandeau météo d'Aujourd'hui. Une croix la ferme.
 */
export function EventCard({ emoji, title, text, onOpen, onClose }: { emoji: string; title: string; text: string; onOpen?: () => void; onClose: () => void }) {
  const colors = useColors();
  return (
    <View style={[glass.card, styles.card]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${text}`} disabled={!onOpen} onPress={onOpen} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{text}{onOpen ? " ›" : ""}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Masquer : ${title}`} hitSlop={10} onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <Text style={[styles.closeText, { color: colors.muted }]}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 6, paddingVertical: 12 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 28 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 19 },
  close: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22, fontWeight: "500" },
  pressed: { opacity: 0.78 },
});
