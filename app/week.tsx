/**
 * « Ma semaine » : le bilan de la semaine en un coup d'œil. Les 7 jours en points, tes gestes,
 * tes récoltes et tes photos, puis chaque plante avec ce que tu as fait pour elle.
 * S'ouvre depuis « Tout est fait » (Aujourd'hui, Saisons) et depuis Moi.
 */
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { FadeIn, PopIn } from "@/components/motion";
import { PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { plantDisplayName } from "@/lib/garden/garden-logic";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { formatLiters } from "@/lib/garden/progress";
import { comparedToLastWeek, startOfWeek, weekSummary } from "@/lib/garden/week";

const shortDate = (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

export default function WeekScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resolvedPlants, events } = useGarden();
  const { photos } = usePlantPhotos();
  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => weekSummary(resolvedPlants, events, photos, now), [events, now, photos, resolvedPlants]);
  const monday = startOfWeek(now);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const compared = comparedToLastWeek(summary);

  const tiles = [
    { value: summary.gestures, label: summary.gestures > 1 ? "gestes" : "geste", hint: compared },
    { value: summary.streak, label: summary.streak > 1 ? "jours de suite" : "jour de suite", hint: summary.streak >= 3 ? "Belle régularité" : "" },
    { value: summary.harvests, label: summary.harvests > 1 ? "récoltes" : "récolte", hint: "" },
    { value: summary.photos, label: summary.photos > 1 ? "photos" : "photo", hint: "" },
  ];

  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Ma semaine" subtitle={`Du ${shortDate(monday)} au ${shortDate(sunday)}`} />

        <PopIn delay={40}>
          <View style={[glass.card, styles.hero]}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>{summary.title}</Text>
            <Text style={[styles.text, { color: colors.muted }]}>{summary.message}</Text>
            <View style={styles.days} accessibilityLabel={`${plural(summary.activeDays, "jour")} avec au moins un geste cette semaine`}>
              {summary.days.map((day) => {
                const done = day.gestures > 0;
                return (
                  <View key={day.key} style={styles.day}>
                    <View style={[styles.dot, { backgroundColor: done ? colors.primary : "rgba(18,22,20,0.06)", borderColor: day.today ? colors.primary : "transparent", opacity: day.future ? 0.45 : 1 }]}>
                      {done && <Text style={styles.dotText}>{day.gestures > 9 ? "9+" : day.gestures}</Text>}
                    </View>
                    <Text style={[styles.letter, { color: day.today ? colors.primary : colors.muted }, day.today && styles.letterToday]}>{day.letter}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </PopIn>

        <View style={styles.tiles}>
          {tiles.map((tile, index) => (
            <FadeIn key={tile.label} delay={80 + index * 40} style={[glass.card, styles.tile]}>
              <Text style={[styles.tileValue, { color: colors.foreground }]}>{tile.value}</Text>
              <Text style={[styles.tileLabel, { color: colors.muted }]}>{tile.label}</Text>
              {!!tile.hint && <Text style={[styles.tileHint, { color: colors.primary }]}>{tile.hint}</Text>}
            </FadeIn>
          ))}
        </View>
        <Text style={[styles.text, { color: colors.muted }]}>Jours de suite : un jour compte quand chaque plante qui avait soif a été arrosée (ou que la pluie s’en est chargée), ou quand il n’y avait rien à arroser.</Text>
        {summary.weatherTips > 0 && (
          <Text style={[styles.text, { color: colors.muted }]}>🌦  {plural(summary.weatherTips, "conseil")} météo suivi{summary.weatherTips > 1 ? "s" : ""} : tu as agi au bon moment.</Text>
        )}
        {summary.avoidedWaterings > 0 && (
          <FadeIn delay={260} style={[glass.card, styles.water]}>
            <Text style={styles.waterIcon}>💧</Text>
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>≈ {formatLiters(summary.waterSavedLiters)} d’eau économisés</Text>
              <Text style={[styles.rowText, { color: colors.muted }]}>{plural(summary.avoidedWaterings, "arrosage")} évité{summary.avoidedWaterings > 1 ? "s" : ""} grâce à la pluie.</Text>
            </View>
          </FadeIn>
        )}

        {summary.upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tes récoltes à venir</Text>
            <View style={[glass.card, styles.list]}>
              {summary.upcoming.map((item, index) => (
                <Pressable key={item.resolved.plant.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/garden/[id]", params: { id: item.resolved.plant.id } })} style={({ pressed }) => [styles.row, index < summary.upcoming.length - 1 && glass.line, pressed && styles.pressed]}>
                  <PlantPicture resolved={item.resolved} style={styles.thumb} />
                  <View style={styles.flex}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{plantDisplayName(item.resolved)}</Text>
                    <Text style={[styles.rowText, { color: item.now ? colors.primary : colors.muted }]}>🧺 {item.label}</Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {summary.plants.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tes plantes cette semaine</Text>
            <View style={[glass.card, styles.list]}>
              {summary.plants.map((item, index) => {
                const detail = [item.gestures ? plural(item.gestures, "geste") : null, item.photos ? plural(item.photos, "photo") : null].filter(Boolean).join(" · ") || "Rien de noté cette semaine";
                return (
                  <Pressable key={item.resolved.plant.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/garden/[id]", params: { id: item.resolved.plant.id } })} style={({ pressed }) => [styles.row, index < summary.plants.length - 1 && glass.line, pressed && styles.pressed]}>
                    <PlantPicture resolved={item.resolved} style={styles.thumb} />
                    <View style={styles.flex}>
                      <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{plantDisplayName(item.resolved)}</Text>
                      <Text style={[styles.rowText, { color: item.gestures || item.photos ? colors.muted : colors.warning }]}>{detail}</Text>
                    </View>
                    <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.replace("/(tabs)")} style={({ pressed }) => [styles.cta, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
          <Text style={[styles.ctaText, { color: colors.background }]}>Retour à aujourd’hui</Text>
        </Pressable>
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  flex: { flex: 1 },
  hero: { padding: 18, gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  text: { fontSize: 14, lineHeight: 20 },
  days: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  day: { alignItems: "center", gap: 6 },
  dot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dotText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  letter: { fontSize: 12, fontWeight: "600" },
  letterToday: { fontWeight: "800" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, flexBasis: "45%", padding: 14, gap: 2 },
  tileValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  tileLabel: { fontSize: 13 },
  tileHint: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  section: { gap: 10 },
  water: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  waterIcon: { fontSize: 24 },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  thumb: { width: 44, height: 44, borderRadius: 12 },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowText: { fontSize: 13, marginTop: 1 },
  chevron: { fontSize: 24, fontWeight: "300" },
  cta: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  ctaText: { fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
