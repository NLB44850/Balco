import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import {
  CATEGORY_LABELS,
  PLANT_CATALOG,
  SPACE_LABELS,
  SUNLIGHT_LABELS,
  effortLabel,
  formatMonthRange,
  recommendPlants,
  searchCatalog,
  type PlantCategory,
  type SpaceSize,
  type Sunlight,
} from "@/lib/plants/catalog";

const categories = Object.keys(CATEGORY_LABELS) as PlantCategory[];

export default function AddPlantScreen() {
  const colors = useColors();
  const router = useRouter();
  const { plants, onboarding, addPlant } = useGarden();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlantCategory | undefined>(undefined);
  const hasBalconyInfo = Boolean(onboarding && !onboarding.skipped && (onboarding.sunlight || onboarding.space));
  const [onlyFitting, setOnlyFitting] = useState(hasBalconyInfo);

  const countByCatalogId = useMemo(() => {
    const counts = new Map<string, number>();
    plants.forEach((plant) => counts.set(plant.catalogId, (counts.get(plant.catalogId) ?? 0) + 1));
    return counts;
  }, [plants]);

  const results = useMemo(() => {
    const matching = new Set(searchCatalog(query, category).map((entry) => entry.id));
    const ordered = onlyFitting ? recommendPlants(onboarding, { month: new Date().getMonth() + 1 }) : [...PLANT_CATALOG].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return ordered.filter((entry) => matching.has(entry.id));
  }, [category, onboarding, onlyFitting, query]);

  const fitLabel = hasBalconyInfo
    ? [onboarding?.sunlight && SUNLIGHT_LABELS[onboarding.sunlight as Sunlight], onboarding?.space && SPACE_LABELS[onboarding.space as SpaceSize]].filter(Boolean).join(" · ")
    : null;

  const add = async (catalogId: string) => {
    await addPlant(catalogId);
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace("/garden"))} style={({ pressed }) => [styles.backButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.backText, { color: colors.foreground }]}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.overline, { color: colors.terracotta }]}>CATALOGUE · {PLANT_CATALOG.length} PLANTES</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Ajouter une plante</Text>
          </View>
        </View>

        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher : basilic, fraisier…" placeholderTextColor={colors.muted} returnKeyType="search" style={[styles.search, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]} />

        {hasBalconyInfo && (
          <Pressable onPress={() => setOnlyFitting((value) => !value)} style={({ pressed }) => [styles.fitToggle, { backgroundColor: onlyFitting ? colors.leaf : colors.cream }, pressed && styles.pressed]}>
            <Text style={[styles.fitText, { color: colors.primary }]}>{onlyFitting ? "✓" : "○"} Adaptées à mon balcon{fitLabel ? ` (${fitLabel.toLowerCase()})` : ""}</Text>
          </Pressable>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[undefined, ...categories].map((value) => {
            const active = category === value;
            return (
              <Pressable key={value ?? "all"} onPress={() => setCategory(value)} style={({ pressed }) => [styles.chip, { borderColor: active ? colors.foreground : colors.border, backgroundColor: active ? colors.foreground : colors.surface }, pressed && styles.pressed]}>
                <Text style={[styles.chipText, { color: active ? colors.sun : colors.foreground }]}>{value ? CATEGORY_LABELS[value] : "Toutes"}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {results.length === 0 && <Text style={[styles.empty, { color: colors.muted }]}>Aucune plante ne correspond. Essaie un autre mot ou retire un filtre.</Text>}

        {results.map((entry) => {
          const owned = countByCatalogId.get(entry.id) ?? 0;
          return (
            <View key={entry.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.emojiBubble, { backgroundColor: colors.leaf }]}><Text style={styles.emoji}>{entry.emoji}</Text></View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{entry.name}</Text>
                  <Text style={[styles.effort, { color: colors.primary }]}>{effortLabel(entry)}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${entry.name}`} onPress={() => void add(entry.id)} style={({ pressed }) => [styles.addButton, { backgroundColor: owned ? colors.leaf : colors.terracotta }, pressed && styles.pressed]}>
                  <Text style={[styles.addText, { color: owned ? colors.primary : "#FFFFFF" }]}>{owned ? `✓ ${owned} · +1` : "+ Ajouter"}</Text>
                </Pressable>
              </View>
              <Text style={[styles.pitch, { color: colors.muted }]}>{entry.pitch}</Text>
              {entry.varieties.length > 0 && <Text style={[styles.facts, { color: colors.foreground }]}>Variétés conseillées : {entry.varieties.map((variety) => variety.name).join(", ")}</Text>}
              <Text style={[styles.facts, { color: colors.muted }]}>
                {entry.sowMonths.length > 0 ? `Semis : ${formatMonthRange(entry.sowMonths)} · ` : ""}
                {entry.plantMonths.length > 0 ? `Plantation : ${formatMonthRange(entry.plantMonths)} · ` : ""}
                Récolte : {formatMonthRange(entry.harvestMonths)} · Pot ≥ {entry.potLiters} L{entry.melliferous ? " · 🐝" : ""}
              </Text>
            </View>
          );
        })}

        {plants.length > 0 && (
          <Pressable onPress={() => router.dismissTo("/garden")} style={({ pressed }) => [styles.doneButton, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
            <Text style={[styles.doneText, { color: colors.sun }]}>Voir mon balcon ({plants.length})</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 40, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 26, fontWeight: "700", marginTop: -3 },
  headerCopy: { flex: 1 },
  overline: { fontSize: 9, letterSpacing: 1.05, fontWeight: "800" },
  title: { fontSize: 27, fontWeight: "800", letterSpacing: -0.7, marginTop: 3 },
  search: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  fitToggle: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, alignSelf: "flex-start" },
  fitText: { fontSize: 12, fontWeight: "800" },
  chips: { gap: 7, paddingRight: 20 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: "800" },
  empty: { fontSize: 13, lineHeight: 19, paddingVertical: 20, textAlign: "center" },
  card: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiBubble: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 23 },
  cardCopy: { flex: 1 },
  name: { fontSize: 15, fontWeight: "800" },
  effort: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  addButton: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 },
  addText: { fontSize: 12, fontWeight: "800" },
  pitch: { fontSize: 12, lineHeight: 17 },
  facts: { fontSize: 11, lineHeight: 16 },
  doneButton: { borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  doneText: { fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
