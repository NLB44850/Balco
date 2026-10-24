/**
 * « L'année de tes plantes » dans Saisons (24/10, maquette B) : une ligne par plante, ses 12 mois en cases colorées
 * (semis, plantation, récolte, floraison ou belle saison), le mois en cours entouré, et la légende. Une ligne se
 * touche pour ouvrir la fiche de la plante. Au-delà de 6 plantes, « Voir les N plantes ». Logique dans
 * lib/plants/plant-year.ts.
 */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { PlantPicture } from "@/components/plant-picture";
import { Button } from "@/components/ui/button";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { ResolvedPlant } from "@/lib/garden/garden-logic";
import type { Month } from "@/lib/plants/catalog";
import { describeMonths } from "@/lib/plants/calendar";
import { YEAR_STEP_LABELS, yearLegend, type YearStep } from "@/lib/plants/plant-year";

export const YEAR_STEP_COLORS: Record<YearStep, string> = { sow: "#BFE0C9", plant: "#1F7A4D", harvest: "#E0A030", bloom: "#C77DB5", foliage: "#7FB896" };
const INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const SHOWN = 6;

export type YearRow = { id: string; name: string; resolved: ResolvedPlant; year: YearStep[][] };

/** « Basilic : semis en mars et avril, récolte de juin à octobre ». */
function rowLabel(row: YearRow) {
  const parts = (["sow", "plant", "harvest", "bloom", "foliage"] as const).flatMap((step) => {
    const months = row.year.flatMap((steps, index) => (steps.includes(step) ? [(index + 1) as Month] : []));
    return months.length > 0 ? [`${YEAR_STEP_LABELS[step].toLowerCase()} ${describeMonths(months)}`] : [];
  });
  return `${row.name} : ${parts.join(", ") || "rien de prévu"}. Voir sa fiche`;
}

export function YearStrip({ rows, currentMonth, onOpen }: { rows: YearRow[]; currentMonth: number; onOpen: (plantId: string) => void }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;
  const shown = expanded ? rows : rows.slice(0, SHOWN);
  const legend = yearLegend(rows.map((row) => row.year));
  return (
    <View style={[glass.card, styles.card]}>
      <Text style={[styles.title, { color: colors.foreground }]}>L’année de tes plantes</Text>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.who} />
        <View style={styles.track}>
          {INITIALS.map((letter, index) => (
            <Text key={index} style={[styles.initial, { color: index + 1 === currentMonth ? colors.foreground : colors.muted }, index + 1 === currentMonth && styles.initialNow]}>{letter}</Text>
          ))}
        </View>
      </View>
      {shown.map((row) => (
        <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={rowLabel(row)} onPress={() => onOpen(row.id)} style={({ pressed }) => [styles.row, styles.plantRow, { borderTopColor: colors.border }, pressed && styles.pressed]}>
          <View style={styles.who}>
            <PlantPicture resolved={row.resolved} style={styles.picture} />
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{row.name}</Text>
          </View>
          <View style={styles.track}>
            {row.year.map((steps, index) => (
              <View key={index} style={[styles.cell, index + 1 === currentMonth && [styles.cellNow, { borderColor: colors.foreground }]]}>
                {steps.length === 0 && <View style={[styles.part, { backgroundColor: colors.border }]} />}
                {steps.map((step) => <View key={step} style={[styles.part, { backgroundColor: YEAR_STEP_COLORS[step] }]} />)}
              </View>
            ))}
          </View>
        </Pressable>
      ))}
      {rows.length > SHOWN && <Button variant="link" label={expanded ? "Voir moins" : `Voir les ${rows.length} plantes`} onPress={() => setExpanded((value) => !value)} />}
      <View style={styles.legend}>
        {legend.map((step) => (
          <View key={step} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: YEAR_STEP_COLORS[step] }]} />
            <Text style={[styles.legendText, { color: colors.muted }]}>{YEAR_STEP_LABELS[step]}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendNow, { borderColor: colors.foreground }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Ce mois-ci</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  plantRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.7 },
  who: { width: 112, flexDirection: "row", alignItems: "center", gap: 8 },
  picture: { width: 30, height: 30, borderRadius: 9 },
  name: { flex: 1, fontSize: 14, fontWeight: "600" },
  track: { flex: 1, flexDirection: "row", gap: 2 },
  initial: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600" },
  initialNow: { fontWeight: "800" },
  cell: { flex: 1, height: 16, gap: 2, borderRadius: 4, overflow: "hidden" },
  cellNow: { borderWidth: 1.5, padding: 1 },
  part: { flex: 1, borderRadius: 3 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendNow: { backgroundColor: "transparent", borderWidth: 1.5 },
  legendText: { fontSize: 12 },
});
