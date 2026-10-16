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
 * La carte de l'hiver de la fiche, toujours à la même place (sous les pastilles) et dans le même ordre pour toutes les
 * plantes (retour du 16/10 : le bouton changeait de place selon l'alerte du jour) : ce qui est choisi, ce qui presse
 * (« Nuit sous 10 °C annoncée : rentre-les aujourd'hui »), le bouton, le pas-à-pas (facultatif), puis « Changer d'avis ».
 */
export function WinterChoiceSummary({ resolved, urgent, onChange, onGuide, onBroughtIn }: { resolved: ResolvedPlant; urgent?: string; onChange: () => void; onGuide?: () => void; onBroughtIn?: () => void }) {
  const colors = useColors();
  if (!resolved.plant.winter) return null;
  const indoors = resolved.plant.winter.choice === "indoors";
  const weeks = indoors ? indoorWeeksNote(resolved.entry) : null;
  return (
    <View style={[styles.summaryCard, { borderColor: colors.border }]}>
      <Text style={[styles.summaryText, { color: colors.foreground }]}>🍂  {winterChoiceSummary(resolved.entry, resolved.plant.winter)}</Text>
      {urgent && <Text style={[styles.urgent, { color: colors.foreground }]}>{urgent}</Text>}
      {weeks && <Text style={[styles.detail, { color: colors.muted }]}>{weeks}</Text>}
      {/* Le pas-à-pas reste facultatif (retour du 16/10) : « C'est rentré » directement, nuit froide annoncée ou non. */}
      {indoors && onBroughtIn && <Button label="C’est rentré" onPress={onBroughtIn} style={styles.stretch} />}
      {indoors && onGuide && <Button variant="link" label={guideLinkText(resolved.entry, "indoors").replace(/ ›$/u, "")} onPress={onGuide} />}
      <Button small variant="secondary" label="Changer d’avis" onPress={onChange} />
    </View>
  );
}

/**
 * Rentrée : « 🏠 À l'intérieur depuis le 20 octobre », ses soins d'hiver et « Le remettre dehors » ; au printemps
 * (`springOut`), le feu vert, « C'est ressorti » et son pas-à-pas, à la même place.
 */
export function IndoorCard({ resolved, springOut, onBackOutside, onBroughtOut, onSpringGuide }: { resolved: ResolvedPlant; springOut?: string; onBackOutside: () => void; onBroughtOut: () => void; onSpringGuide: () => void }) {
  const colors = useColors();
  const since = resolved.plant.winter?.indoorsAt;
  if (!since) return null;
  const day = new Date(since);
  const weeks = indoorWeeksNote(resolved.entry);
  return (
    <View style={[styles.summaryCard, { borderColor: colors.border }]}>
      <Text style={[styles.summaryText, { color: colors.foreground }]}>{INDOORS_LABEL} depuis le {day.getDate() === 1 ? "1ᵉʳ" : day.getDate()} {MONTH_LONG[day.getMonth()]}</Text>
      {springOut ? (
        <>
          <Text style={[styles.urgent, { color: colors.foreground }]}>{springOut}</Text>
          <Button label="C’est ressorti" onPress={onBroughtOut} style={styles.stretch} />
          <Button variant="link" label={guideLinkText(resolved.entry, "spring").replace(/ ›$/u, "")} onPress={onSpringGuide} />
        </>
      ) : (
        <>
          <Text style={[styles.detail, { color: colors.muted }]}>{indoorCareText(resolved.entry, wateringIntervalHours(resolved.entry, resolved.plant.potSize))}</Text>
          {weeks && <Text style={[styles.detail, { color: colors.muted }]}>{weeks}</Text>}
          <Button small variant="secondary" label={`${capitalize(objectPronoun(resolved.entry))} remettre dehors`} onPress={onBackOutside} />
        </>
      )}
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
  framed: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 10 },
  kind: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, lineHeight: 25 },
  body: { fontSize: 15, lineHeight: 21 },
  option: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  optionLabel: { fontSize: 15, fontWeight: "700" },
  detail: { fontSize: 13, lineHeight: 18 },
  summaryCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 10, gap: 8, alignItems: "flex-start" },
  urgent: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  stretch: { alignSelf: "stretch" },
  summaryText: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
