import { Pressable, StyleSheet, View } from "react-native";

import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { Tip } from "@/lib/tips/tips";

/** « Astuce de la semaine » sur Aujourd'hui : une phrase vérifiée, « Demander à Nora » et une croix. */
export function TipCard({ tip, onAsk, onClose }: { tip: Tip; onAsk: () => void; onClose: () => void }) {
  const colors = useColors();
  return (
    <View style={[glass.card, styles.card]}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: colors.primary }]}>💡 Astuce de la semaine</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Masquer l’astuce jusqu’à la suivante" hitSlop={10} onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={[styles.closeText, { color: colors.muted }]}>×</Text>
        </Pressable>
      </View>
      <Text style={[styles.text, { color: colors.foreground }]}>{tip.text}</Text>
      <Pressable accessibilityRole="button" onPress={onAsk} hitSlop={6} style={({ pressed }) => pressed && styles.pressed}>
        <Text style={[styles.ask, { color: colors.primary }]}>Demander à Nora ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 6 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "700" },
  close: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22 },
  text: { fontSize: 15, lineHeight: 21 },
  ask: { fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
