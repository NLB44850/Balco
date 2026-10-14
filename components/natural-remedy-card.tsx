/**
 * Le traitement naturel d'Observer (étape 8b) : le texte vient de Balco (lib/plants/natural-remedies.ts, sources dans
 * docs/sources-traitements.md), jamais de l'IA, qui ne fait que reconnaître le problème.
 */
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { REMEDY_EDIBLE_NOTE, REMEDY_EXPERT_NOTE, REMEDY_PRECAUTIONS, type NaturalRemedy } from "@/lib/plants/natural-remedies";

export function NaturalRemedyCard({ remedy, edible }: { remedy: NaturalRemedy; edible: boolean }) {
  const colors = useColors();
  const precautions = [...(remedy.recipe ? REMEDY_PRECAUTIONS : []), ...(remedy.caution ? [remedy.caution] : []), ...(remedy.recipe && edible ? [REMEDY_EDIBLE_NOTE] : [])];
  return (
    <View accessibilityLabel={`Traitement naturel : ${remedy.name}`} style={[styles.card, { backgroundColor: colors.leaf }]}>
      <Text style={[styles.title, { color: colors.primary }]}>🌿 Traitement naturel : {remedy.name}</Text>
      {remedy.steps.map((step, index) => (
        <View key={step} style={styles.row}>
          <Text style={[styles.number, { color: colors.primary }]}>{index + 1}.</Text>
          <Text style={[styles.text, { color: colors.foreground }]}>{step}</Text>
        </View>
      ))}
      {remedy.recipe && (
        <View style={[styles.recipe, { backgroundColor: colors.background }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>La recette</Text>
          <Text style={[styles.text, { color: colors.foreground }]}>{remedy.recipe}</Text>
        </View>
      )}
      {precautions.length > 0 && (
        <View style={styles.list}>
          <Text style={[styles.label, { color: colors.foreground }]}>Avec prudence</Text>
          {precautions.map((line) => <Text key={line} style={[styles.small, { color: colors.muted }]}>•  {line}</Text>)}
        </View>
      )}
      <Text style={[styles.small, { color: colors.foreground, fontWeight: "600" }]}>{REMEDY_EXPERT_NOTE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 8 },
  title: { fontSize: 15, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8 },
  number: { fontSize: 15, fontWeight: "800", minWidth: 18 },
  text: { flex: 1, fontSize: 15, lineHeight: 21 },
  recipe: { borderRadius: 12, padding: 12, gap: 4 },
  label: { fontSize: 14, fontWeight: "700" },
  list: { gap: 4 },
  small: { fontSize: 13, lineHeight: 18 },
});
