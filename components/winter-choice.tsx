/**
 * Le choix pour l'hiver d'une plante frileuse en fin de saison (chantier « Plante hors saison », étape 3) :
 * « Ton basilic n'aime pas le froid. Que veux-tu faire ? », avec « Tout récolter », « Le rentrer à l'intérieur » et
 * « Le laisser dehors » (lib/garden/winter-choice.ts). La même carte sur la fiche et dans la feuille du bas
 * d'Aujourd'hui ; le choix est gardé sur la plante, donc dans la sauvegarde du compte.
 */
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheet } from "@/components/today/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { now as clockNow } from "@/lib/clock";
import { useGarden } from "@/lib/garden/garden-context";
import type { ResolvedPlant } from "@/lib/garden/garden-logic";
import { offSeasonOf } from "@/lib/garden/off-season";
import { winterChoiceSummary, winterChoiceToast, winterOptions, winterPlanOf, winterQuestion, winterWhy } from "@/lib/garden/winter-choice";
import type { WinterChoice } from "@/lib/garden/winter-plan";
import type { ClimateInfo } from "@/lib/plants/climate";
import { INDOORS_LABEL, indoorCareText, indoorWeeksNote } from "@/lib/garden/indoors";
import { MONTH_LONG } from "@/lib/plants/catalog";
import { capitalize, objectPronoun } from "@/lib/plants/grammar";
import { guideLinkText } from "@/lib/plants/guide";
import { wateringIntervalHours } from "@/lib/plants/watering";

/** Enregistre le choix ; `onDone` affiche le message du bas avec « Annuler ». */
export function useChooseWinter(onDone: (text: string, onUndo: () => void) => void) {
  const { setPlantWinter } = useGarden();
  return async (resolved: ResolvedPlant, choice: WinterChoice) => {
    const previous = resolved.plant.winter;
    await setPlantWinter(resolved.plant.id, winterPlanOf(choice, clockNow()));
    onDone(winterChoiceToast(resolved.entry, choice), () => void setPlantWinter(resolved.plant.id, previous));
  };
}

/** La question et ses réponses : sur la fiche, ou dans la feuille du bas. */
export function WinterChoiceCard({ resolved, climate, onChoose, framed = true }: { resolved: ResolvedPlant; climate?: ClimateInfo | null; onChoose: (choice: WinterChoice) => void; framed?: boolean }) {
  const colors = useColors();
  const { entry } = resolved;
  const off = offSeasonOf(entry, clockNow(), climate);
  return (
    <View style={[styles.card, framed && [styles.framed, { borderColor: colors.border }]]}>
      <Text style={[styles.kind, { color: colors.primary }]}>🍂  {off?.label ?? "Fin de saison"}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{winterQuestion(entry)}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{winterWhy(entry)}</Text>
      {winterOptions(entry).map((option) => (
        <Pressable
          key={option.choice}
          accessibilityRole="button"
          accessibilityLabel={`${entry.name} : ${option.label}`}
          onPress={() => onChoose(option.choice)}
          style={({ pressed }) => [styles.option, { borderColor: option.choice === "outside" ? colors.border : colors.primary }, pressed && styles.pressed]}
        >
          <Text style={[styles.optionLabel, { color: option.choice === "outside" ? colors.foreground : colors.primary }]}>{option.label}</Text>
          <Text style={[styles.detail, { color: colors.muted }]}>{option.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Une fois choisi, sur la fiche : « Pour l'hiver : le rentrer à l'intérieur » et « Changer d'avis » ; à rentrer, le lien
 * vers le pas-à-pas et, pour une plante « quelques semaines de plus », ce qu'on peut en attendre.
 */
export function WinterChoiceSummary({ resolved, onChange, onGuide }: { resolved: ResolvedPlant; onChange: () => void; onGuide?: () => void }) {
  const colors = useColors();
  if (!resolved.plant.winter) return null;
  const weeks = resolved.plant.winter.choice === "indoors" ? indoorWeeksNote(resolved.entry) : null;
  return (
    <View style={[styles.summaryCard, { borderColor: colors.border }]}>
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryText, { color: colors.foreground }]}>🍂  {winterChoiceSummary(resolved.entry, resolved.plant.winter)}</Text>
        <Button small variant="secondary" label="Changer d’avis" onPress={onChange} />
      </View>
      {weeks && <Text style={[styles.detail, { color: colors.muted }]}>{weeks}</Text>}
      {onGuide && resolved.plant.winter.choice === "indoors" && <Button variant="link" label={guideLinkText(resolved.entry, "indoors").replace(/ ›$/u, "")} onPress={onGuide} />}
    </View>
  );
}

/** Rentrée : « 🏠 À l'intérieur depuis le 20 octobre », ses soins d'hiver et « Le remettre dehors ». */
export function IndoorCard({ resolved, onBackOutside }: { resolved: ResolvedPlant; onBackOutside: () => void }) {
  const colors = useColors();
  const since = resolved.plant.winter?.indoorsAt;
  if (!since) return null;
  const day = new Date(since);
  const weeks = indoorWeeksNote(resolved.entry);
  return (
    <View style={[styles.summaryCard, { borderColor: colors.border }]}>
      <Text style={[styles.summaryText, { color: colors.foreground }]}>{INDOORS_LABEL} depuis le {day.getDate() === 1 ? "1ᵉʳ" : day.getDate()} {MONTH_LONG[day.getMonth()]}</Text>
      <Text style={[styles.detail, { color: colors.muted }]}>{indoorCareText(resolved.entry, wateringIntervalHours(resolved.entry, resolved.plant.potSize))}</Text>
      {weeks && <Text style={[styles.detail, { color: colors.muted }]}>{weeks}</Text>}
      <Button small variant="secondary" label={`${capitalize(objectPronoun(resolved.entry))} remettre dehors`} onPress={onBackOutside} />
    </View>
  );
}

/** Aujourd'hui : la feuille du bas ouverte par « Décide pour ton basilic avant le froid ». */
export function useWinterChoiceSheet({ climate, onDone, overlay }: { climate?: ClimateInfo | null; onDone: (text: string, onUndo: () => void) => void; overlay?: ReactNode }) {
  const { resolvedPlants } = useGarden();
  const [plantId, setPlantId] = useState<string | null>(null);
  const resolved = plantId ? resolvedPlants.find(({ plant }) => plant.id === plantId) ?? null : null;
  const choose = useChooseWinter(onDone);
  const close = () => setPlantId(null);
  const sheet = (
    <BottomSheet visible={resolved !== null} onClose={close} overlay={resolved ? overlay : undefined}>
      {resolved && (
        <WinterChoiceCard
          resolved={resolved}
          climate={climate}
          framed={false}
          onChoose={(choice) => {
            close();
            void choose(resolved, choice);
          }}
        />
      )}
    </BottomSheet>
  );
  return { open: setPlantId, sheet, isOpen: plantId !== null };
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  framed: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 16 },
  kind: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, lineHeight: 25 },
  body: { fontSize: 15, lineHeight: 21 },
  option: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  optionLabel: { fontSize: 15, fontWeight: "700" },
  detail: { fontSize: 13, lineHeight: 18 },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16, gap: 8, alignItems: "flex-start" },
  summaryRow: { gap: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", alignSelf: "stretch" },
  summaryText: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
