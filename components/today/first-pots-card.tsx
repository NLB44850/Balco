import { Pressable, StyleSheet, View } from "react-native";

import { PotSizeArt } from "@/components/pot-size-sheet";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { FirstPotsCard as Card } from "@/lib/garden/first-pots";
import type { PotSize } from "@/lib/plants/pot-size";

/**
 * « Prépare tes pots » / « Vérifie tes pots » sur Aujourd'hui, juste après l'accueil (étape 3c) : une ligne par plante
 * qui ouvre sa fiche sur « Dans quel pot ? », et « C'est bon » qui ferme la carte pour de bon.
 */
export function FirstPotsCard({ card, potSizes, onOpen, onDone }: { card: Card; potSizes: Record<string, PotSize>; onOpen: (plantId: string) => void; onDone: () => void }) {
  const colors = useColors();
  return (
    <View style={[glass.card, styles.card]}>
      <Text style={[styles.title, { color: colors.foreground }]}>🪴 {card.title}</Text>
      <Text style={[styles.intro, { color: colors.muted }]}>{card.intro}</Text>
      {card.lines.map((line) => (
        <Pressable key={line.plantId} accessibilityRole="button" accessibilityLabel={`${line.name} : ${line.detail}`} onPress={() => onOpen(line.plantId)} style={({ pressed }) => [styles.line, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
          <PotSizeArt size={potSizes[line.plantId] ?? "unknown"} />
          <View style={styles.flex}>
            <Text style={[styles.name, { color: colors.foreground }]}>{line.name}</Text>
            <Text style={[styles.detail, { color: line.tone === "small" ? colors.warning : colors.muted }]}>{line.detail}</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={onDone} style={({ pressed }) => [styles.done, { backgroundColor: colors.leaf }, pressed && styles.pressed]}>
        <Text style={[styles.doneText, { color: colors.primary }]}>C’est bon</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 4 },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700" },
  intro: { fontSize: 14, lineHeight: 20 },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, fontWeight: "700" },
  detail: { fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 20 },
  done: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  doneText: { fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
