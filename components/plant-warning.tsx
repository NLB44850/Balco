/**
 * L'avertissement d'une plante toxique ou irritante (lib/plants/warnings.ts), en orange « à surveiller » : carte
 * dans le catalogue, la fiche et le pas-à-pas ; `compact` dans le détail d'un geste ; `PlantWarningTag` dans la
 * liste du catalogue.
 */
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { warningOf } from "@/lib/plants/warnings";

export function PlantWarningCard({ catalogId, compact = false }: { catalogId: string; compact?: boolean }) {
  const colors = useColors();
  const warning = warningOf({ id: catalogId });
  if (!warning) return null;
  return (
    <View accessibilityRole="alert" accessibilityLabel={`Attention, ${warning.title} : ${warning.text}`} style={[styles.card, compact && styles.compact, { backgroundColor: colors.heatSoft, borderColor: colors.warning }]}>
      <Text style={[styles.icon, compact && styles.iconCompact]}>⚠️</Text>
      <View style={styles.flex}>
        <Text style={[styles.title, compact && styles.titleCompact, { color: colors.warning }]}>{warning.title}</Text>
        <Text style={[styles.text, compact && styles.textCompact, { color: colors.foreground }]}>{warning.text}</Text>
      </View>
    </View>
  );
}

/** « ⚠️ Toxique », à côté du nom dans la liste du catalogue. */
export function PlantWarningTag({ catalogId }: { catalogId: string }) {
  const colors = useColors();
  if (!warningOf({ id: catalogId })) return null;
  return (
    <View style={[styles.tag, { backgroundColor: colors.heatSoft }]}>
      <Text style={[styles.tagText, { color: colors.warning }]}>⚠️ Toxique</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  compact: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 10 },
  flex: { flex: 1, gap: 2 },
  icon: { fontSize: 22, lineHeight: 26 },
  iconCompact: { fontSize: 16, lineHeight: 20 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: "800" },
  titleCompact: { fontSize: 14, lineHeight: 19 },
  text: { fontSize: 14, lineHeight: 20 },
  textCompact: { fontSize: 13, lineHeight: 18 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: "700" },
});
