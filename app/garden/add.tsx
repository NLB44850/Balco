/**
 * Le catalogue : ajouter une plante en un toucher. Une recherche, les plantes adaptées à ton balcon
 * d'abord, les familles en pastilles. Le « + » pose une question, « Où en est ton aubergine ? », avec deux cartes qui
 * disent ce qui va se passer (lib/garden/catalog-add.ts) ; un toucher ajoute, avec « Annuler » ; toucher la
 * ligne ouvre la fiche du catalogue dans la feuille du bas (variétés, calendrier, pot). La pastille
 * « À semer en octobre » ne garde que ce qui se sème ou se plante ce mois-là (ouverte depuis Saisons).
 */
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { CatalogPicture } from "@/components/plant-picture";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { advisedPotPhrase, potNeedFor, potNeedText } from "@/lib/plants/pot-sheet";
import { glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/nav-buttons";
import { Text, TextInput } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import {
  CATEGORY_LABELS,
  PLANT_CATALOG,
  SPACE_LABELS,
  SUNLIGHT_LABELS,
  effortLabel,
  describeSowing,
  formatMonthRange,
  getCatalogPlant,
  MONTH_LONG,
  recommendPlants,
  searchCatalog,
  type CatalogPlant,
  type PlantCategory,
  type SpaceSize,
  type Sunlight,
} from "@/lib/plants/catalog";
import { suggestionActionLabel, suggestionFor, type AddChoice } from "@/lib/plants/suggestions";
import { addOptions, addQuestion, installedText, toPlantPlan, toPlantText } from "@/lib/garden/catalog-add";
import { addSpringWish, nextSpringReminder, SPRING_REMINDER_SOURCE, springReminderContent } from "@/lib/garden/spring";
import { scheduleDatedReminder } from "@/lib/reminders/local-notifications";
import { guideLinkText } from "@/lib/plants/guide";
import { now as clockNow } from "@/lib/clock";

const categories = Object.keys(CATEGORY_LABELS) as PlantCategory[];

export default function AddPlantScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plants, onboarding, addPlant, removePlant, updateOnboarding } = useGarden();
  const params = useLocalSearchParams<{ month?: string }>();
  const currentMonth = clockNow().getMonth() + 1;
  const askedMonth = Number(params.month);
  const seasonMonth = askedMonth >= 1 && askedMonth <= 12 ? askedMonth : currentMonth;
  const [inSeason, setInSeason] = useState(Boolean(params.month));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlantCategory | undefined>(undefined);
  const hasBalconyInfo = Boolean(onboarding && !onboarding.skipped && (onboarding.sunlight || onboarding.space));
  const [onlyFitting, setOnlyFitting] = useState(hasBalconyInfo);
  const [sheetId, setSheetId] = useState<string | null>(null);
  // « + » touché : la question « Où en est ton aubergine ? ».
  const [askId, setAskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const hideToast = useCallback(() => setToast(null), []);

  const countByCatalogId = useMemo(() => {
    const counts = new Map<string, number>();
    plants.forEach((plant) => counts.set(plant.catalogId, (counts.get(plant.catalogId) ?? 0) + 1));
    return counts;
  }, [plants]);

  // La liste suit la frappe sans la bloquer : sur un téléphone moyen, la refaire à chaque lettre figeait le clavier.
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => {
    const matching = new Set(searchCatalog(deferredQuery, category).map((entry) => entry.id));
    const ordered = onlyFitting ? recommendPlants(onboarding, { month: clockNow().getMonth() + 1 }) : [...PLANT_CATALOG].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return ordered.filter((entry) => matching.has(entry.id) && (!inSeason || suggestionFor(entry, seasonMonth) !== null));
  }, [category, inSeason, onboarding, onlyFitting, deferredQuery, seasonMonth]);

  const fitLabel = hasBalconyInfo
    ? [onboarding?.sunlight && SUNLIGHT_LABELS[onboarding.sunlight as Sunlight], onboarding?.space && SPACE_LABELS[onboarding.space as SpaceSize]].filter(Boolean).join(" · ").toLowerCase()
    : null;
  const sheetEntry = sheetId ? getCatalogPlant(sheetId) : undefined;
  const askEntry = askId ? getCatalogPlant(askId) : undefined;
  /** La question et ses deux cartes : ce qui va se passer est écrit avant de toucher. */
  const question = (entry: CatalogPlant) => (
    <View style={styles.question}>
      <Text style={[styles.questionTitle, { color: colors.foreground }]}>{addQuestion(entry)}</Text>
      {addOptions(entry, currentMonth).map((option) => (
        <Pressable
          key={option.choice}
          accessibilityRole="button"
          accessibilityLabel={`${entry.name} : ${option.title}`}
          onPress={() => void add(entry.id, option.choice)}
          style={({ pressed }) => [styles.option, { borderColor: colors.primary }, pressed && styles.pressed]}
        >
          <Text style={styles.optionIcon}>{option.choice === "installed" ? "🪴" : "🌱"}</Text>
          <View style={styles.flex}>
            {option.badge && <Text style={[styles.optionBadge, { color: colors.primary }]}>{option.badge}</Text>}
            <Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text>
            <Text style={[styles.optionDetail, { color: colors.muted }]}>{option.detail}</Text>
          </View>
          <Text style={[styles.optionChevron, { color: colors.primary }]}>›</Text>
        </Pressable>
      ))}
    </View>
  );

  const showToast = (message: Omit<ToastMessage, "id">) => {
    toastId.current += 1;
    setToast({ id: toastId.current, ...message });
  };

  /** Envie du printemps : carte de mars et notification du 1er mars (comme « Me le reproposer au printemps »). */
  const setSpringWish = async (catalogId: string, wished: boolean) => {
    const current = onboarding?.springWishes ?? [];
    const wishes = wished ? addSpringWish(current, catalogId) : current.filter((id) => id !== catalogId);
    if (wishes === current) return;
    await updateOnboarding({ springWishes: wishes });
    const entries = wishes.map((id) => getCatalogPlant(id)).filter((item): item is CatalogPlant => Boolean(item));
    if (entries.length > 0) void scheduleDatedReminder(SPRING_REMINDER_SOURCE, springReminderContent(entries), nextSpringReminder(clockNow())).catch(() => undefined);
  };

  /** Ajoute la plante selon la carte touchée, puis le message du bas avec « Annuler ». */
  const add = async (catalogId: string, choice: AddChoice) => {
    const entry = getCatalogPlant(catalogId);
    setAskId(null);
    setSheetId(null);
    if (!entry) return;
    const month = clockNow().getMonth() + 1;
    // Balco dit la taille de pot que conseille sa fiche ; elle n'est notée que quand on la choisit (retour du 14/10).
    const pot = ` ${advisedPotPhrase(entry)}`;
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const plan = choice === "toPlant" ? toPlantPlan(entry, month) : null;
    if (plan?.kind === "spring") {
      // Pas avant le printemps : elle rejoint les envies du printemps au lieu d'attendre sur le balcon.
      await setSpringWish(catalogId, true);
      return showToast({ text: toPlantText(entry, plan, pot), onUndo: () => void setSpringWish(catalogId, false) });
    }
    // À planter : son premier geste sera « Sème… » ou « Plante… » ; déjà là : on l'arrose et on l'entretient.
    const created = await addPlant(catalogId, { toPlant: choice === "toPlant" });
    showToast({ text: plan ? toPlantText(entry, plan, pot) : installedText(entry, month, pot), onUndo: () => void removePlant(created.id) });
  };
  // Des fonctions stables pour les lignes : seules les lignes qui changent se redessinent (101 lignes avec photo).
  const addRef = useRef(add);
  addRef.current = add;
  const onAsk = useCallback((catalogId: string) => setAskId(catalogId), []);
  const onOpen = useCallback((catalogId: string) => setSheetId(catalogId), []);

  return (
    <LightScreen still>
      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: plants.length > 0 ? 20 : insets.bottom + 40 }]}>
        <ScreenHeader back title="Ajouter une plante" subtitle={`${PLANT_CATALOG.length} plantes pour le balcon`} />

        <View style={[glass.card, styles.search]}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Basilic, fraisier, lavande…" placeholderTextColor={colors.muted} returnKeyType="search" autoCorrect={false} accessibilityLabel="Rechercher une plante" style={[styles.searchInput, { color: colors.foreground }]} />
          {query.length > 0 && <CloseButton accessibilityLabel="Effacer la recherche" onPress={() => setQuery("")} />}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {hasBalconyInfo && (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: onlyFitting }} onPress={() => setOnlyFitting((value) => !value)} style={({ pressed }) => [styles.chip, onlyFitting ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}>
              <Text style={[styles.chipText, { color: onlyFitting ? "#FFFFFF" : colors.foreground }]}>{onlyFitting ? "✓ " : ""}Pour mon balcon</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityState={{ selected: inSeason }} onPress={() => setInSeason((value) => !value)} style={({ pressed }) => [styles.chip, inSeason ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}>
            <Text style={[styles.chipText, { color: inSeason ? "#FFFFFF" : colors.foreground }]}>{inSeason ? "✓ " : ""}À semer en {MONTH_LONG[seasonMonth - 1]}</Text>
          </Pressable>
          {[undefined, ...categories].map((value) => {
            const active = category === value;
            return (
              <Pressable key={value ?? "all"} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setCategory(value)} style={({ pressed }) => [styles.chip, active ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}>
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
              const seasonal = inSeason ? suggestionFor(entry, seasonMonth) : null;
              const meta = owned ? `✓ Sur ton balcon${owned > 1 ? ` (${owned})` : ""}` : seasonal ? `${suggestionActionLabel(seasonal)} · ${seasonal.reason}` : effortLabel(entry);
              return <CatalogRow key={entry.id} entry={entry} owned={owned > 0} meta={meta} metaLines={seasonal && !owned ? 2 : 1} last={index === results.length - 1} onOpen={onOpen} onAdd={onAsk} />;
            })}
          </View>
        )}
      </ScrollView>

      {/* Une barre sous la liste (pas par-dessus) : le bouton reste en bas et ne cache aucune plante. */}
      {plants.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
          <Button label={`Voir mon balcon · ${plants.length} plante${plants.length > 1 ? "s" : ""}`} onPress={() => router.dismissTo("/(tabs)/balcony")} />
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
                sheetEntry.sowMonths.length > 0 ? `🌱  Semis : ${describeSowing(sheetEntry)}` : null,
                sheetEntry.plantMonths.length > 0 ? `🪴  Plantation : ${formatMonthRange(sheetEntry.plantMonths)}` : null,
                `🧺  Récolte : ${formatMonthRange(sheetEntry.harvestMonths)}`,
                `🪣  ${potNeedText(potNeedFor(sheetEntry)).replace("Il lui faut u", "U")}`,
                sheetEntry.melliferous ? "🐝  Aimée des abeilles" : null,
              ].filter(Boolean).map((fact) => (
                <View key={fact} style={[styles.fact, { backgroundColor: colors.surface }]}><Text style={[styles.factText, { color: colors.foreground }]}>{fact}</Text></View>
              ))}
            </View>
            {sheetEntry.varieties.length > 0 && (
              <View style={styles.varieties}>
                <Text style={[styles.meta, { color: colors.muted }]}>Variétés conseillées</Text>
                <View style={styles.facts}>
                  {sheetEntry.varieties.map((variety) => (
                    <View key={variety.id} style={[styles.variety, { borderColor: colors.border }]}>
                      <Text style={[styles.factText, { color: colors.foreground }]}>{variety.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <Pressable accessibilityRole="button" onPress={() => { const id = sheetEntry.id; setSheetId(null); router.push({ pathname: "/guide/[catalogId]", params: { catalogId: id, mode: "need" } }); }} style={({ pressed }) => [styles.needLink, pressed && styles.pressed]}>
              <Text style={[styles.factText, { color: colors.primary }]}>🧺  {guideLinkText(sheetEntry, "need")}</Text>
            </Pressable>
            {countByCatalogId.get(sheetEntry.id) ? <Text style={[styles.meta, { color: colors.primary }]}>✓ Déjà sur ton balcon : tu peux en ajouter une autre.</Text> : null}
            {question(sheetEntry)}
          </View>
        )}
      </BottomSheet>
      <BottomSheet visible={askEntry !== undefined} onClose={() => setAskId(null)}>
        {askEntry && (
          <View style={styles.sheet}>
            <View style={styles.sheetTop}>
              <CatalogPicture entry={askEntry} style={styles.bubble} />
              <Text style={[styles.name, { color: colors.foreground }]}>{askEntry.name}</Text>
            </View>
            {question(askEntry)}
          </View>
        )}
      </BottomSheet>
      <UndoToast message={toast} onDone={hideToast} bottom={insets.bottom + (plants.length > 0 ? 86 : 16)} />
    </LightScreen>
  );
}

type RowProps = {
  entry: CatalogPlant;
  owned: boolean;
  meta: string;
  metaLines: number;
  last: boolean;
  onOpen: (catalogId: string) => void;
  onAdd: (catalogId: string) => void;
};

/** Une ligne du catalogue, redessinée seulement quand elle change (plante ajoutée). */
const CatalogRow = memo(function CatalogRow({ entry, owned, meta, metaLines, last, onOpen, onAdd }: RowProps) {
  const colors = useColors();
  return (
    <View style={!last && glass.line}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${entry.name}, voir le détail`} onPress={() => onOpen(entry.id)} style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
          <CatalogPicture entry={entry} style={styles.bubble} />
          <View style={styles.flex}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
            <Text style={[styles.meta, { color: owned ? colors.primary : colors.muted }]} numberOfLines={metaLines}>{meta}</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${entry.name}`} hitSlop={8} onPress={() => onAdd(entry.id)} style={({ pressed }) => [styles.add, { backgroundColor: owned ? colors.leaf : colors.primary }, pressed && styles.pressed]}>
          <Text style={[styles.addText, { color: owned ? colors.primary : "#FFFFFF" }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  flex: { flex: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, minHeight: 52 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -4 },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 20, textAlign: "center" },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  bubble: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, marginTop: 1 },
  add: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  addText: { fontSize: 22, fontWeight: "700", marginTop: -2 },
  needLink: { paddingVertical: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: "rgba(255,255,255,0.92)", borderTopWidth: StyleSheet.hairlineWidth },
  sheet: { gap: 12 },
  sheetTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetPhoto: { height: 190, borderRadius: 18 },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  sheetBody: { fontSize: 15, lineHeight: 22 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fact: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  factText: { fontSize: 13, fontWeight: "600" },
  varieties: { gap: 8 },
  variety: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 6 },
  question: { gap: 10, marginTop: 4 },
  questionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, minHeight: 72 },
  optionIcon: { fontSize: 26, width: 32, textAlign: "center" },
  optionBadge: { fontSize: 12, fontWeight: "800", marginBottom: 1 },
  optionTitle: { fontSize: 16, fontWeight: "800" },
  optionDetail: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  optionChevron: { fontSize: 24, fontWeight: "600" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
});
