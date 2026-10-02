/**
 * « Mode vacances » : les dates en deux touches, puis le plan de départ à cocher, la liste pour la
 * personne qui arrose (à envoyer en un geste) ou les astuces pour garder la terre humide, et le
 * retour. Pendant l'absence, Balco se tait ; les rappels reprennent seuls au retour.
 * S'ouvre depuis Moi, Réglages et l'accueil.
 */
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useVacation } from "@/hooks/use-vacation";
import { useGarden } from "@/lib/garden/garden-context";
import { dayKey, plantDisplayName } from "@/lib/garden/garden-logic";
import { MOISTURE_TIPS, RETURN_STEPS, addDays, dayLabel, helperMessage, helperTasks, preparationSteps, vacationDays, vacationRange, vacationState, type Vacation } from "@/lib/garden/vacation";

const START_CHOICES = [
  { label: "Demain", offset: 1 },
  { label: "Dans 3 jours", offset: 3 },
  { label: "Dans une semaine", offset: 7 },
];
const DURATION_CHOICES = [
  { label: "3 jours", days: 3 },
  { label: "1 semaine", days: 7 },
  { label: "2 semaines", days: 14 },
  { label: "3 semaines", days: 21 },
];
const MAX_DAYS = 60;

export default function VacationScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resolvedPlants, profile } = useGarden();
  const { vacation, loaded, setVacation } = useVacation();
  const now = useMemo(() => new Date(), []);
  const today = dayKey(now);
  const state = vacationState(vacation, now);
  const active = vacation && state.phase !== "none" ? vacation : null;

  const [editing, setEditing] = useState(false);
  const [startOffset, setStartOffset] = useState(3);
  const [days, setDays] = useState(7);
  const [helper, setHelper] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  const draftStart = addDays(today, startOffset);
  const draftEnd = addDays(draftStart, days - 1);

  const edit = () => {
    if (active) {
      const offset = Math.max(0, Math.round((new Date(`${active.start}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000));
      setStartOffset(offset);
      setDays(vacationDays(active));
      setHelper(active.helper);
    }
    setEditing(true);
  };

  const save = async () => {
    const next: Vacation = { start: draftStart, end: draftEnd, helper, done: active?.done ?? [] };
    await setVacation(next);
    setEditing(false);
  };

  const stop = async () => {
    if (!confirmStop) return setConfirmStop(true);
    setConfirmStop(false);
    await setVacation(null);
  };

  const toggleStep = (id: string) => {
    if (!active) return;
    const done = active.done.includes(id) ? active.done.filter((item) => item !== id) : [...active.done, id];
    void setVacation({ ...active, done });
  };

  const share = async (message: string) => {
    try {
      const result = await Share.share({ message });
      if (result.action === Share.dismissedAction) return;
    } catch {
      // Pas de partage possible (certains navigateurs) : le message s'affiche pour être copié.
      setShowMessage(true);
    }
  };

  const stepper = (label: string, value: string, onMinus: () => void, onPlus: () => void, minusDisabled: boolean, plusDisabled: boolean) => (
    <View style={styles.stepper}>
      <View style={styles.flex}>
        <Text style={[styles.small, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.stepperValue, { color: colors.foreground }]}>{value}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : moins`} disabled={minusDisabled} onPress={onMinus} style={({ pressed }) => [styles.round, { borderColor: colors.border }, minusDisabled && styles.disabled, pressed && styles.pressed]}>
        <Text style={[styles.roundText, { color: colors.foreground }]}>−</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : plus`} disabled={plusDisabled} onPress={onPlus} style={({ pressed }) => [styles.round, { borderColor: colors.border }, plusDisabled && styles.disabled, pressed && styles.pressed]}>
        <Text style={[styles.roundText, { color: colors.foreground }]}>+</Text>
      </Pressable>
    </View>
  );

  const chips = <T,>(items: ({ label: string } & T)[], isActive: (item: T) => boolean, onPick: (item: T) => void) => (
    <View style={styles.chips}>
      {items.map((item) => {
        const selected = isActive(item);
        return (
          <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onPick(item)} style={({ pressed }) => [styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }, pressed && styles.pressed]}>
            <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const form = (
    <>
      <View style={[glass.card, styles.card]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Tu pars quand ?</Text>
        {chips(START_CHOICES, (item) => item.offset === startOffset, (item) => setStartOffset(item.offset))}
        {stepper("Départ", dayLabel(draftStart), () => setStartOffset((value) => Math.max(0, value - 1)), () => setStartOffset((value) => Math.min(90, value + 1)), startOffset <= 0, startOffset >= 90)}
        <View style={[glass.line, styles.separator]} />
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Combien de temps ?</Text>
        {chips(DURATION_CHOICES, (item) => item.days === days, (item) => setDays(item.days))}
        {stepper("Absence", `${days} jour${days > 1 ? "s" : ""} · retour ${dayLabel(addDays(draftEnd, 1)).toLowerCase()}`, () => setDays((value) => Math.max(1, value - 1)), () => setDays((value) => Math.min(MAX_DAYS, value + 1)), days <= 1, days >= MAX_DAYS)}
      </View>

      <View style={[glass.card, styles.card]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Quelqu’un passera arroser ?</Text>
        {[{ value: true, title: "Oui, un proche passera", text: "Balco prépare la liste à lui envoyer, plante par plante." }, { value: false, title: "Non, personne", text: "Balco t’aide à installer de quoi tenir sans arrosage." }].map((option) => {
          const selected = helper === option.value;
          return (
            <Pressable key={String(option.value)} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setHelper(option.value)} style={({ pressed }) => [styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.leaf : "transparent" }, pressed && styles.pressed]}>
              <Text style={[styles.optionTitle, { color: selected ? colors.primary : colors.foreground }]}>{option.title}</Text>
              <Text style={[styles.small, { color: colors.muted }]}>{option.text}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable accessibilityRole="button" onPress={() => void save()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
        <Text style={styles.primaryText}>{active ? "Enregistrer" : "Préparer mon départ"}</Text>
      </Pressable>
      {active && (
        <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={[styles.secondaryText, { color: colors.muted }]}>Annuler</Text>
        </Pressable>
      )}
    </>
  );

  const plan = active ? preparationSteps(resolvedPlants, active, now) : [];
  const doneCount = plan.filter((step) => active?.done.includes(step.id)).length;
  const message = active ? helperMessage(resolvedPlants, active, profile.firstName) : "";

  const summary = active && (
    <>
      <View style={[glass.card, styles.card]}>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          {state.phase === "upcoming" ? (state.daysLeft === 1 ? "Départ demain" : `Départ dans ${state.daysLeft} jours`) : state.phase === "away" ? "Bonnes vacances ! 🌴" : "Bon retour ! 🌿"}
        </Text>
        <Text style={[styles.text, { color: colors.muted }]}>
          {state.phase === "back"
            ? "Tes rappels ont repris. Fais le tour de ton balcon :"
            : `Absence ${vacationRange(active)} (${vacationDays(active)} jour${vacationDays(active) > 1 ? "s" : ""}). Balco se tait pendant ce temps, et les rappels reprendront seuls à ton retour.`}
        </Text>
        {state.phase === "upcoming" && plan.length > 0 && (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: colors.leaf }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.round((doneCount / plan.length) * 100)}%` }]} /></View>
            <Text style={[styles.small, { color: colors.muted }]}>{doneCount} sur {plan.length} préparatifs</Text>
          </View>
        )}
        {state.phase === "back" && (
          <>
            {RETURN_STEPS.map((step) => <Text key={step} style={[styles.text, { color: colors.foreground }]}>•  {step}</Text>)}
            <Pressable accessibilityRole="button" onPress={() => void setVacation(null)} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>C’est fait</Text>
            </Pressable>
          </>
        )}
      </View>

      {state.phase !== "back" && plan.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Avant de partir</Text>
          <View style={[glass.card, styles.list]}>
            {plan.map((step, index) => {
              const done = active.done.includes(step.id);
              return (
                <Pressable key={step.id} accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={() => toggleStep(step.id)} style={({ pressed }) => [styles.stepRow, index < plan.length - 1 && glass.line, pressed && styles.pressed]}>
                  <View style={[styles.check, { borderColor: done ? colors.primary : "rgba(18,22,20,0.22)", backgroundColor: done ? colors.primary : "transparent" }]}>{done && <Text style={styles.checkMark}>✓</Text>}</View>
                  <View style={styles.flex}>
                    <Text style={[styles.small, { color: colors.primary, fontWeight: "700" }]}>{step.when}</Text>
                    <Text style={[styles.stepTitle, { color: colors.foreground }, done && styles.doneText]}>{step.title}</Text>
                    <Text style={[styles.small, { color: colors.muted }]}>{step.detail}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {state.phase !== "back" && active.helper && resolvedPlants.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pour la personne qui arrose</Text>
          <View style={[glass.card, styles.list]}>
            {helperTasks(resolvedPlants, active).map(({ resolved, rhythm, harvest }, index, all) => (
              <View key={resolved.plant.id} style={[styles.stepRow, index < all.length - 1 && glass.line]}>
                <PlantPicture resolved={resolved} style={styles.thumb} />
                <View style={styles.flex}>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>{plantDisplayName(resolved)}</Text>
                  <Text style={[styles.small, { color: colors.muted }]}>💧 Arroser {rhythm}</Text>
                  {harvest && <Text style={[styles.small, { color: colors.muted }]}>🧺 {harvest}</Text>}
                </View>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => void share(message)} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Envoyer la liste</Text>
          </Pressable>
          {showMessage && (
            <View style={[glass.card, styles.card]}>
              <Text style={[styles.small, { color: colors.muted }]}>Copie ce message et envoie-le par SMS ou messagerie :</Text>
              <Text selectable style={[styles.text, { color: colors.foreground }]}>{message}</Text>
            </View>
          )}
        </View>
      )}

      {state.phase !== "back" && !active.helper && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Garder la terre humide</Text>
          <View style={[glass.card, styles.list]}>
            {MOISTURE_TIPS.map((tip, index) => (
              <View key={tip} style={[styles.stepRow, index < MOISTURE_TIPS.length - 1 && glass.line]}>
                <Text style={styles.tipIcon}>💧</Text>
                <Text style={[styles.text, styles.flex, { color: colors.foreground }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {state.phase !== "back" && (
        <>
          <Pressable accessibilityRole="button" onPress={edit} style={({ pressed }) => [styles.outline, { borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>Modifier les dates</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void stop()} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={[styles.secondaryText, { color: colors.warning }]}>{confirmStop ? "Touche encore pour arrêter le mode vacances" : "Arrêter le mode vacances"}</Text>
          </Pressable>
        </>
      )}
    </>
  );

  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Mode vacances" subtitle={active && !editing ? vacationRange(active) : "Balco prépare ton balcon et se tait pendant ton absence"} />
        {!loaded ? null : active && !editing ? summary : form}
        {!active && !editing && resolvedPlants.length === 0 && (
          <Pressable accessibilityRole="button" onPress={() => router.push("/garden/add")} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={[styles.secondaryText, { color: colors.primary }]}>Ajoute d’abord tes plantes ›</Text>
          </Pressable>
        )}
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  flex: { flex: 1 },
  card: { padding: 16, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  heroTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  text: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  separator: { marginVertical: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepperValue: { fontSize: 16, fontWeight: "700", marginTop: 1 },
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  roundText: { fontSize: 22, fontWeight: "600", marginTop: -2 },
  option: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 2 },
  optionTitle: { fontSize: 15, fontWeight: "700" },
  primary: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondary: { alignItems: "center", paddingVertical: 8 },
  secondaryText: { fontSize: 15, fontWeight: "700" },
  outline: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  progressRow: { gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  list: { paddingHorizontal: 14 },
  stepRow: { flexDirection: "row", gap: 12, paddingVertical: 12, alignItems: "flex-start" },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkMark: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  stepTitle: { fontSize: 15, fontWeight: "700", marginTop: 1 },
  doneText: { textDecorationLine: "line-through", opacity: 0.6 },
  thumb: { width: 44, height: 44, borderRadius: 12 },
  tipIcon: { fontSize: 18, width: 24, textAlign: "center" },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.78 },
});
