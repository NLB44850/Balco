/**
 * Après la récolte d'une plante récoltée en une fois, ou à la fin de saison d'une annuelle
 * (lib/garden/harvest-end.ts) : la feuille du bas qui demande « Tes radis sont-ils tous récoltés ? » ou « Ta
 * saison de basilic est finie ? », puis « Ton pot est libre » et ses trois choix au plus.
 * Partagée par Aujourd'hui et la fiche plante.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CatalogPicture } from "@/components/plant-picture";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { dayKey } from "@/lib/garden/garden-logic";
import {
  answerAllHarvested,
  clearHarvestEnd,
  endsWithSeason,
  freePotChoices,
  HARVEST_QUESTION_DETAIL,
  harvestQuestion,
  potFreedBy,
  SEASON_END_TIP,
  seasonQuestion,
  seasonQuestionDetail,
  type FreePotChoice,
} from "@/lib/garden/harvest-end";
import { startActivity } from "@/lib/plants/calendar";
import type { ClimateInfo } from "@/lib/plants/climate";
import { addSpringWish, nextSpringReminder, SPRING_REMINDER_SOURCE, springReminderContent } from "@/lib/garden/spring";
import { getCatalogPlant, type CatalogPlant } from "@/lib/plants/catalog";
import { loadReminderSnoozes, saveReminderSnoozes, scheduleDatedReminder } from "@/lib/reminders/local-notifications";

type Stage = "question" | "free";

/**
 * `open(plantId, "question")` : la question ; `answerYes(plantId)` : « Oui » (depuis le message du bas), la
 * feuille du pot libre s'ouvre. `sheet` est à poser dans l'écran ; `onDone` affiche le message du bas.
 */
export function useFreePot({ climate, onDone, overlay }: { climate?: ClimateInfo | null; onDone: (text: string, kind: FreePotChoice["kind"]) => void; overlay?: React.ReactNode }) {
  const colors = useColors();
  const { resolvedPlants, onboarding, addPlant, removePlant, restartPlant, updateOnboarding } = useGarden();
  // « Me le reproposer au printemps », cochée d'office à chaque ouverture de la feuille.
  const [remember, setRemember] = useState(true);
  // `detail` : la ligne sous la question, telle que la liste du jour l'a écrite (relance de fin de saison).
  const [open, setOpen] = useState<{ plantId: string; stage: Stage; detail?: string } | null>(null);
  const resolved = open ? resolvedPlants.find(({ plant }) => plant.id === open.plantId) ?? null : null;
  const now = new Date();
  const month = now.getMonth() + 1;
  const choices = resolved ? freePotChoices(resolved, onboarding, { month, climate, ownedCatalogIds: resolvedPlants.map(({ entry }) => entry.id), seed: dayKey(now) }) : [];
  const close = () => setOpen(null);
  const seasonal = resolved ? endsWithSeason(resolved.entry) : false;
  // Proposée quand on ne peut plus ressemer : la plante reviendra dans les envies du printemps.
  const offerSpring = choices.length > 0 && !choices.some((choice) => choice.kind === "restart");
  useEffect(() => {
    if (open?.stage === "free") setRemember(true);
  }, [open?.plantId, open?.stage]);

  /** La plante rejoint les envies du printemps : carte de mars et notification du 1er mars. */
  const rememberForSpring = async (catalogId: string) => {
    const wishes = addSpringWish(onboarding?.springWishes, catalogId);
    if (wishes === onboarding?.springWishes) return;
    await updateOnboarding({ springWishes: wishes });
    const entries = wishes.map((id) => getCatalogPlant(id)).filter((entry): entry is CatalogPlant => Boolean(entry));
    void scheduleDatedReminder(SPRING_REMINDER_SOURCE, springReminderContent(entries), nextSpringReminder(new Date())).catch(() => undefined);
  };

  const answerYes = async (plantId: string) => {
    await saveReminderSnoozes(answerAllHarvested(await loadReminderSnoozes(), plantId, new Date()));
    setOpen({ plantId, stage: "free" });
  };

  const choose = async (choice: FreePotChoice) => {
    if (!resolved) return;
    const plantId = resolved.plant.id;
    close();
    await saveReminderSnoozes(clearHarvestEnd(await loadReminderSnoozes(), plantId));
    if (choice.kind === "restart") {
      await restartPlant(plantId);
      const first = startActivity({ id: plantId, entry: resolved.entry, displayName: resolved.entry.name }, month, { climate });
      return onDone(`« ${first.title} » t’attend sur Aujourd’hui, avec son pas-à-pas`, choice.kind);
    }
    if (offerSpring && remember) await rememberForSpring(resolved.entry.id);
    await removePlant(plantId);
    if (choice.kind === "plant") {
      await addPlant(choice.entry.id, { toPlant: true });
      return onDone(`${choice.entry.name} à planter : le premier geste t’attend sur Aujourd’hui`, choice.kind);
    }
    onDone(`${choice.label.startsWith("Laisser le pot au repos") ? "Pot au repos" : "Pot libéré"} : tes récoltes restent dans ta progression`, choice.kind);
  };

  const sheet = (
    <BottomSheet visible={open !== null && resolved !== null} onClose={close} overlay={open ? overlay : undefined}>
      {resolved && open?.stage === "question" && (
        <View style={styles.sheet}>
          <Text style={[styles.kind, { color: colors.primary }]}>{seasonal ? "🍂  Fin de saison" : "🧺  Fin de la récolte"}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{seasonal ? seasonQuestion(resolved.entry) : harvestQuestion(resolved.entry)}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{open.detail ?? (seasonal ? seasonQuestionDetail(false) : HARVEST_QUESTION_DETAIL)}</Text>
          <Pressable accessibilityRole="button" onPress={() => void answerYes(resolved.plant.id)} style={({ pressed }) => [styles.cta, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
            <Text style={[styles.ctaText, { color: colors.background }]}>{seasonal ? "Oui, la saison est finie" : "Oui, tout est récolté"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={close} style={({ pressed }) => [styles.choice, { borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.choiceText, { color: colors.foreground }]}>Pas encore</Text>
          </Pressable>
        </View>
      )}
      {resolved && open?.stage === "free" && (
        <View style={styles.sheet}>
          <Text style={[styles.kind, { color: colors.primary }]}>{seasonal ? "🍂" : "🧺"}  {potFreedBy(resolved.entry)}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Ton pot est libre</Text>
          {seasonal && <Text style={[styles.tip, { backgroundColor: colors.surface, color: colors.foreground }]}>✂  {SEASON_END_TIP}</Text>}
          <Text style={[styles.body, { color: colors.muted }]}>Que veux-tu y mettre ?</Text>
          {offerSpring && (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} aria-checked={remember} accessibilityLabel="Me le reproposer au printemps" onPress={() => setRemember((value) => !value)} style={({ pressed }) => [styles.remember, pressed && styles.pressed]}>
              <View style={[styles.box, { borderColor: colors.primary, backgroundColor: remember ? colors.primary : "transparent" }]}>{remember && <Text style={styles.boxMark}>✓</Text>}</View>
              <Text style={[styles.rememberText, { color: colors.foreground }]}>Me le reproposer au printemps</Text>
            </Pressable>
          )}
          {choices.map((choice) => (
            <Pressable key={choice.key} accessibilityRole="button" accessibilityLabel={choice.label} onPress={() => void choose(choice)} style={({ pressed }) => [styles.choice, styles.choiceRow, { borderColor: choice.kind === "empty" ? colors.border : colors.primary }, pressed && styles.pressed]}>
              {choice.kind === "plant" ? <CatalogPicture entry={choice.entry} style={styles.picture} /> : choice.kind === "restart" ? <CatalogPicture entry={resolved.entry} style={styles.picture} /> : null}
              <View style={styles.flex}>
                <Text style={[styles.choiceText, { color: choice.kind === "empty" ? colors.foreground : colors.primary }]}>{choice.label}</Text>
                <Text style={[styles.detail, { color: colors.muted }]} numberOfLines={2}>{choice.detail}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </BottomSheet>
  );

  return { openQuestion: (plantId: string, detail?: string) => setOpen({ plantId, stage: "question", detail }), openFreePot: (plantId: string) => setOpen({ plantId, stage: "free" }), answerYes, sheet, isOpen: open !== null };
}

const styles = StyleSheet.create({
  sheet: { gap: 12 },
  kind: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, lineHeight: 27 },
  body: { fontSize: 15, lineHeight: 22 },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontSize: 16, fontWeight: "700" },
  choice: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" },
  choiceRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  choiceText: { fontSize: 15, fontWeight: "700" },
  detail: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  tip: { fontSize: 14, lineHeight: 20, borderRadius: 12, padding: 12, overflow: "hidden" },
  picture: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  remember: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  boxMark: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginTop: -1 },
  rememberText: { fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
