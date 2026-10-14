/**
 * « Diagnostic de ton balcon » (chantier « Pots et balcon », étape 3b) : à la fin de l'accueil (`?first=1`, bouton
 * « Voir mon balcon ») et depuis Réglages → Mon balcon. Le soleil en grand (heures du simulateur), puis ses atouts et
 * ce qu'il faut surveiller, et trois plantes qui y pousseront bien. Tout est calculé par nos règles, sans IA.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { FadeIn } from "@/components/motion";
import { CatalogPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useNow } from "@/hooks/use-date-simulation";
import { useLocalWeather } from "@/hooks/use-local-weather";
import { diagnoseBalcony, hoursText } from "@/lib/garden/balcony-diagnosis";
import { useGarden } from "@/lib/garden/garden-context";
import { climateZoneFor } from "@/lib/plants/climate";

export default function DiagnosticScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const first = useLocalSearchParams<{ first?: string }>().first === "1";
  const { onboarding, resolvedPlants } = useGarden();
  const { weather } = useLocalWeather();
  const now = useNow();
  const climate = useMemo(() => (weather.isFallback ? null : climateZoneFor(weather.latitude, weather.longitude, weather.snapshot.elevationM)), [weather.isFallback, weather.latitude, weather.longitude, weather.snapshot.elevationM]);
  const installed = useMemo(() => resolvedPlants.filter(({ plant }) => !plant.toPlant).map(({ entry }) => entry), [resolvedPlants]);
  const diagnosis = useMemo(() => diagnoseBalcony({ answers: onboarding?.skipped ? null : onboarding, latitude: weather.latitude, climate, plants: installed, now }), [climate, installed, now, onboarding, weather.latitude]);
  const toneColor = (tone: "good" | "watch" | "info") => (tone === "watch" ? colors.warning : tone === "good" ? colors.primary : colors.foreground);

  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }]}>
        <ScreenHeader back={!first} title="Ton balcon" subtitle={diagnosis.headline} />

        {/* Le soleil en grand : c'est lui qui décide de ce qui poussera. */}
        <FadeIn style={[glass.card, styles.hero]}>
          <Text style={styles.heroIcon}>{diagnosis.sunClass === "sunny" ? "☀️" : diagnosis.sunClass === "partial" ? "⛅" : "☁️"}</Text>
          {diagnosis.sunHours !== null ? (
            <>
              <Text style={[styles.heroValue, { color: colors.foreground }]}>{hoursText(diagnosis.sunHours)}</Text>
              <Text style={[styles.heroLabel, { color: colors.muted }]}>de soleil par jour, d’avril à septembre</Text>
            </>
          ) : (
            <Text style={[styles.heroLabel, { color: colors.muted }]}>Orientation inconnue : Balco compte sur une mi-ombre.</Text>
          )}
        </FadeIn>

        <FadeIn delay={60} style={[glass.card, styles.list]}>
          {diagnosis.items.map((item, index) => (
            <View key={item.key} style={[styles.item, index < diagnosis.items.length - 1 && glass.line]}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={styles.flex}>
                <Text style={[styles.itemTitle, { color: toneColor(item.tone) }]}>{item.title}</Text>
                <Text style={[styles.itemText, { color: colors.muted }]}>{item.text}</Text>
              </View>
            </View>
          ))}
        </FadeIn>

        {diagnosis.bestPlants.length > 0 && (
          <FadeIn delay={120} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ce qui y poussera bien</Text>
            <View style={styles.plants}>
              {diagnosis.bestPlants.map((entry) => (
                <View key={entry.id} style={[glass.card, styles.plant]}>
                  <CatalogPicture entry={entry} style={styles.plantPicture} />
                  <Text style={[styles.plantName, { color: colors.foreground }]} numberOfLines={2}>{entry.name}</Text>
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        {first ? (
          <Button label="Voir mon balcon" onPress={() => (router.canGoBack() ? router.dismissTo("/(tabs)") : router.replace("/(tabs)"))} />
        ) : (
          <Button variant="link" center label="Changer mes réponses dans Réglages" onPress={() => router.push("/settings")} />
        )}
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  flex: { flex: 1 },
  hero: { alignItems: "center", paddingVertical: 22, paddingHorizontal: 16, gap: 4 },
  heroIcon: { fontSize: 40 },
  heroValue: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  heroLabel: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  list: { paddingHorizontal: 16 },
  item: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  itemIcon: { fontSize: 22, width: 30, textAlign: "center" },
  itemTitle: { fontSize: 16, fontWeight: "700" },
  itemText: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  plants: { flexDirection: "row", gap: 10 },
  plant: { flex: 1, padding: 10, alignItems: "center", gap: 8 },
  plantPicture: { width: 64, height: 64, borderRadius: 32 },
  plantName: { fontSize: 14, fontWeight: "700", textAlign: "center" },
});
