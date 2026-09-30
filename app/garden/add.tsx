/**
 * Le catalogue : ajouter une plante en un toucher. Une recherche, les plantes adaptées à ton balcon
 * d'abord, les familles en pastilles. Le « + » ajoute tout de suite (avec « Annuler ») ; toucher la
 * ligne ouvre la fiche du catalogue dans la feuille du bas (variétés, calendrier, pot).
 */
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { CatalogPicture } from "@/components/plant-picture";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { glass } from "@/components/ui/glass";
import { Text, TextInput } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import {
  CATEGORY_LABELS,
  PLANT_CATALOG,
  SPACE_LABELS,
  SUNLIGHT_LABELS,
  effortLabel,
  formatMonthRange,
  getCatalogPlant,
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
  const insets = useSafeAreaInsets();
  const { plants, onboarding, addPlant, removePlant } = useGarden();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlantCategory | undefined>(undefined);
  const hasBalconyInfo = Boolean(onboarding && !onboarding.skipped && (onboarding.sunlight || onboarding.space));
  const [onlyFitting, setOnlyFitting] = useState(hasBalconyInfo);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const hideToast = useCallback(() => setToast(null), []);

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
    ? [onboarding?.sunlight && SUNLIGHT_LABELS[onboarding.sunlight as Sunlight], onboarding?.space && SPACE_LABELS[onboarding.space as SpaceSize]].filter(Boolean).join(" · ").toLowerCase()
    : null;
  const sheetEntry = sheetId ? getCatalogPlant(sheetId) : undefined;

  const add = async (catalogId: string) => {
    const entry = getCatalogPlant(catalogId);
    const created = await addPlant(catalogId);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    toastId.current += 1;
    setToast({ id: toastId.current, text: `Ajouté à ton balcon : ${entry?.name ?? "ta plante"}`, onUndo: () => void removePlant(created.id) });
  };

  return (
    <LightScreen>
      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: plants.length > 0 ? 20 : insets.bottom + 40 }]}>
        <ScreenHeader back title="Ajouter une plante" subtitle={`${PLANT_CATALOG.length} plantes pour le balcon`} />

        <View style={[glass.card, styles.search]}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Basilic, fraisier, lavande…" placeholderTextColor={colors.muted} returnKeyType="search" autoCorrect={false} accessibilityLabel="Rechercher une plante" style={[styles.searchInput, { color: colors.foreground }]} />
          {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" hitSlop={8} onPress={() => setQuery("")}><Text style={[styles.clear, { color: colors.muted }]}>×</Text></Pressable>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {hasBalconyInfo && (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: onlyFitting }} onPress={() => setOnlyFitting((value) => !value)} style={({ pressed }) => [styles.chip, onlyFitting ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}>
              <Text style={[styles.chipText, { color: onlyFitting ? "#FFFFFF" : colors.foreground }]}>{onlyFitting ? "✓ " : ""}Pour mon balcon</Text>
            </Pressable>
          )}
          {[undefined, ...categories].map((value) => {
            const active = category === value;
            return (
              <Pressable key={value ?? "all"} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setCategory(value)} style={({ pressed }) => [styles.chip, active ? { backgroundColor: colors.foreground } : glass.soft, pressed && styles.pressed]}>
                <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.foreground }]}>{value ? CATEGORY_LABELS[value] : "Toutes"}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {onlyFitting && fitLabel && <Text style={[styles.hint, { color: colors.muted }]}>Les plus adaptées d’abord : {fitLabel}, et la saison.</Text>}
        {results.length === 0 && <Text style={[styles.empty, { color: colors.muted }]}>Aucune plante ne correspond. Essaie un autre mot ou retire un filtre.</Text>}

        {results.length > 0 && (
          <View style={[glass.card, styles.list]}>
            {results.map((entry, index) => {
              const owned = countByCatalogId.get(entry.id) ?? 0;
              return (
                <View key={entry.id} style={[styles.row, index < results.length - 1 && glass.line]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${entry.name}, voir le détail`} onPress={() => setSheetId(entry.id)} style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                    <CatalogPicture entry={entry} style={styles.bubble} />
                    <View style={styles.flex}>
                      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
                      <Text style={[styles.meta, { color: owned ? colors.primary : colors.muted }]} numberOfLines={1}>{owned ? `✓ Sur ton balcon${owned > 1 ? ` (${owned})` : ""}` : effortLabel(entry)}</Text>
                    </View>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${entry.name}`} hitSlop={8} onPress={() => void add(entry.id)} style={({ pressed }) => [styles.add, { backgroundColor: owned ? colors.leaf : colors.primary }, pressed && styles.pressed]}>
                    <Text style={[styles.addText, { color: owned ? colors.primary : "#FFFFFF" }]}>+</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Une barre sous la liste (pas par-dessus) : le bouton reste en bas et ne cache aucune plante. */}
      {plants.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
          <Pressable accessibilityRole="button" onPress={() => router.dismissTo("/(tabs)/balcony")} style={({ pressed }) => [styles.doneButton, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
            <Text style={[styles.doneText, { color: colors.background }]}>Voir mon balcon · {plants.length} plante{plants.length > 1 ? "s" : ""}</Text>
          </Pressable>
        </View>
      )}

      <BottomSheet visible={sheetEntry !== undefined} onClose={() => setSheetId(null)}>
        {sheetEntry && (
          <View style={styles.sheet}>
            <CatalogPicture entry={sheetEntry} style={styles.sheetPhoto} />
            <View style={styles.sheetTop}>
              <View style={styles.flex}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{sheetEntry.name}</Text>
                <Text style={[styles.meta, { color: colors.primary }]}>{CATEGORY_LABELS[sheetEntry.category]} · {effortLabel(sheetEntry)}</Text>
              </View>
            </View>
            <Text style={[styles.sheetBody, { color: colors.muted }]}>{sheetEntry.pitch}</Text>
            <View style={styles.facts}>
              {[
                sheetEntry.sowMonths.length > 0 ? `🌱  Semis : ${formatMonthRange(sheetEntry.sowMonths)}` : null,
                sheetEntry.plantMonths.length > 0 ? `🪴  Plantation : ${formatMonthRange(sheetEntry.plantMonths)}` : null,
                `🧺  Récolte : ${formatMonthRange(sheetEntry.harvestMonths)}`,
                `🪣  Pot d’au moins ${sheetEntry.potLiters} L`,
                sheetEntry.melliferous ? "🐝  Aimée des abeilles" : null,
              ].filter(Boolean).map((fact) => (
                <View key={fact} style={[styles.fact, { backgroundColor: colors.surface }]}><Text style={[styles.factText, { color: colors.foreground }]}>{fact}</Text></View>
              ))}
            </View>
            {sheetEntry.varieties.length > 0 && <Text style={[styles.meta, { color: colors.muted }]}>Variétés conseillées : {sheetEntry.varieties.map((variety) => variety.name).join(", ")}</Text>}
            <Pressable accessibilityRole="button" onPress={() => { const id = sheetEntry.id; setSheetId(null); void add(id); }} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>{countByCatalogId.get(sheetEntry.id) ? "En ajouter une autre" : "Ajouter à mon balcon"}</Text>
            </Pressable>
          </View>
        )}
      </BottomSheet>
      <UndoToast message={toast} onDone={hideToast} bottom={insets.bottom + (plants.length > 0 ? 86 : 16)} />
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  flex: { flex: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, minHeight: 52 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  clear: { fontSize: 24, paddingHorizontal: 4 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -4 },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 20, textAlign: "center" },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  bubble: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 23 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, marginTop: 1 },
  add: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  addText: { fontSize: 22, fontWeight: "700", marginTop: -2 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: "rgba(255,255,255,0.92)", borderTopWidth: StyleSheet.hairlineWidth },
  doneButton: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  doneText: { fontSize: 15, fontWeight: "700" },
  sheet: { gap: 12 },
  sheetTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetPhoto: { height: 190, borderRadius: 18 },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  sheetBody: { fontSize: 15, lineHeight: 22 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fact: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  factText: { fontSize: 13, fontWeight: "600" },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
});
