/**
 * La carte « Coach d'arrosage » de la fiche d'une plante (étape 6b) : en Balco+, ce qui reste d'eau dans le pot (jauge)
 * et ce qu'il faut faire aujourd'hui ; en offre gratuite, ce que le coach apportera (« bientôt avec Balco+ »).
 */
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { coachSummary, type CoachAdvice } from "@/lib/plants/watering-coach";

export function WateringCoachCard({ advice, isPlus }: { advice: CoachAdvice | undefined; isPlus: boolean }) {
  const colors = useColors();
  const router = useRouter();
  if (!isPlus) {
    return (
      <View style={[glass.card, styles.card]}>
        <Text style={[styles.kind, { color: colors.frost }]}>✨  Coach d’arrosage · bientôt avec Balco+</Text>
        <Text style={[styles.text, { color: colors.muted }]}>La quantité juste pour cette plante, chaque jour, selon la chaleur, le vent et le soleil de ton balcon.</Text>
        {/* Étape 10 : le coach ouvre l'écran Balco+. */}
        <Button variant="link" label="Découvrir Balco+" onPress={() => router.push({ pathname: "/plus", params: { from: "coach" } })} />
      </View>
    );
  }
  if (!advice) return null;
  const summary = coachSummary(advice);
  const percent = Math.round(advice.remaining * 100);
  return (
    <View accessible accessibilityLabel={`Coach d’arrosage : ${summary.title}. ${summary.detail}. Eau dans le pot : environ ${percent} %.`} style={[glass.card, styles.card]}>
      <Text style={[styles.kind, { color: colors.frost }]}>✨  Coach d’arrosage Balco+</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{summary.title}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{summary.detail}</Text>
      <View style={styles.gaugeRow}>
        <Text style={styles.drop}>💧</Text>
        <View style={[styles.track, { backgroundColor: colors.frostSoft }]}>
          <View style={[styles.fill, { width: `${Math.max(4, percent)}%`, backgroundColor: colors.frost }]} />
        </View>
        <Text style={[styles.percent, { color: colors.frost }]}>{percent} %</Text>
      </View>
      <Text style={[styles.small, { color: colors.muted }]}>Eau encore dans le pot, estimée selon la météo du jour.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 6 },
  kind: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  text: { fontSize: 14, lineHeight: 20 },
  gaugeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  drop: { fontSize: 18 },
  track: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  fill: { height: 12, borderRadius: 6 },
  percent: { fontSize: 15, fontWeight: "800", minWidth: 48, textAlign: "right" },
  small: { fontSize: 12, lineHeight: 17 },
});
