import { Pressable, StyleSheet, View } from "react-native";

import { CatalogPicture } from "@/components/plant-picture";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { Anticipation } from "@/lib/garden/anticipate";

/** « À anticiper » sur Aujourd'hui : le geste qui arrive et ce qu'il faut prévoir. Rien à cocher. */
export function AnticipateCard({ anticipation, onOpen }: { anticipation: Anticipation; onOpen: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`À anticiper. ${anticipation.when} : ${anticipation.title}. ${anticipation.prepare}`} onPress={onOpen} style={({ pressed }) => [glass.card, styles.card, pressed && styles.pressed]}>
      <CatalogPicture entry={anticipation.entry} style={styles.picture} />
      <View style={styles.text}>
        <Text style={[styles.when, { color: colors.primary }]}>À anticiper · {anticipation.when}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{anticipation.title}</Text>
        <Text style={[styles.prepare, { color: colors.muted }]}>{anticipation.prepare}</Text>
      </View>
      <Text style={[styles.arrow, { color: colors.muted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  picture: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  when: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 16, fontWeight: "700" },
  prepare: { fontSize: 14, lineHeight: 19 },
  arrow: { fontSize: 22 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
