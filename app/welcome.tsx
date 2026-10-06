/**
 * L'accueil de la première ouverture, sur la lumière du balcon. Une promesse, « C'est parti » (ou
 * « Passer »), puis une question par écran : un toucher suffit, l'écran suivant arrive tout seul.
 * « Tu as déjà des plantes ? » ouvre deux chemins (lib/garden/onboarding.ts, `onboardingSteps`) :
 * - Oui : lesquelles (recherche + raccourcis), ajoutées installées ; puis soleil et espace.
 * - Pas encore : soleil, espace, envies, puis « Tes premières plantes », de saison, ajoutées à planter.
 * La ville est demandée juste avant les plantes (« Utiliser ma position » : la fenêtre du téléphone n'arrive
 * qu'à ce moment-là), puis, sur un téléphone, les rappels. « Plus tard » laisse Paris par défaut.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { FadeIn } from "@/components/motion";
import { CatalogPicture } from "@/components/plant-picture";
import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Text, TextInput } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { type CityResult, useLocalWeather } from "@/hooks/use-local-weather";
import { ONBOARDING_STORAGE_KEY, useGarden } from "@/lib/garden/garden-context";
import {
  COMMON_PLANT_IDS,
  GOAL_OPTIONS,
  onboardingSteps,
  SPACE_OPTIONS,
  SUNLIGHT_OPTIONS,
  SUNLIGHT_UNKNOWN,
  sunlightFromChoice,
  type OnboardingOption,
  type OnboardingStep,
} from "@/lib/garden/onboarding";
import { getCatalogPlant, searchCatalog, type CatalogPlant, type OnboardingAnswers } from "@/lib/plants/catalog";
import { seasonalStarters } from "@/lib/plants/suggestions";
import { climateZoneFor } from "@/lib/plants/climate";
import { notificationsUnavailableReason } from "@/lib/notifications/module";
import { activateReminders, NOTIFICATIONS_DENIED } from "@/lib/reminders/activate";
import { loadLocalReminderSettings, requestLocalNotificationPermission, saveLocalReminderSettings } from "@/lib/reminders/local-notifications";

const HAS_OPTIONS: OnboardingOption[] = [
  { id: "yes", icon: "🪴", title: "Oui", text: "Balco te dit quoi faire pour celles que tu as." },
  { id: "no", icon: "🌱", title: "Pas encore", text: "Balco te propose quoi planter maintenant." },
];

type Question = { title: string; subtitle: string; options: OnboardingOption[]; multiple?: boolean };

const QUESTIONS: Partial<Record<OnboardingStep, Question>> = {
  has: { title: "Tu as déjà des plantes sur ton balcon ?", subtitle: "Même une seule, même en pot sur le rebord.", options: HAS_OPTIONS },
  sun: { title: "Combien de soleil reçoit ton balcon ?", subtitle: "Une estimation suffit : tes conseils seront plus justes.", options: [...SUNLIGHT_OPTIONS, SUNLIGHT_UNKNOWN] },
  space: { title: "Quelle place as-tu ?", subtitle: "Même un rebord de fenêtre peut devenir un petit potager.", options: SPACE_OPTIONS },
  goals: { title: "Qu'aimerais-tu cultiver ?", subtitle: "Choisis tout ce qui te donne envie.", options: GOAL_OPTIONS, multiple: true },
};

/** Le temps de voir son choix coché avant de passer à la question suivante. */
const ADVANCE_MS = 280;
const SEARCH_RESULTS = 6;
const LOCATE_TIMEOUT_MS = 20_000;

type Answers = { has?: "yes" | "no"; sun?: string; space?: string; goals: string[] };

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const garden = useGarden();
  // 0 : la bienvenue ; ensuite, l'écran `steps[index - 1]`.
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ goals: [] });
  const [owned, setOwned] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const location = useLocalWeather();
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [cityMessage, setCityMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [remindersDenied, setRemindersDenied] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasPlants = answers.has === "yes";
  const steps = onboardingSteps({ hasPlants, reminders: notificationsUnavailableReason === null });
  const step = index > 0 ? steps[index - 1] : null;
  const question = step ? QUESTIONS[step] ?? null : null;

  const onboardingAnswers: OnboardingAnswers = useMemo(
    () => ({ hasPlants: answers.has === undefined ? undefined : answers.has === "yes", sunlight: answers.sun ? sunlightFromChoice(answers.sun) : undefined, space: answers.space, goals: answers.has === "yes" ? [] : answers.goals }),
    [answers],
  );
  // Seulement ce qui se sème ou se plante ce mois-ci, dans le climat de la ville choisie (Paris sinon).
  const { weather } = location;
  const climate = useMemo(() => (weather.isFallback ? null : climateZoneFor(weather.latitude, weather.longitude, weather.snapshot.elevationM)), [weather.isFallback, weather.latitude, weather.longitude, weather.snapshot.elevationM]);
  const starters = useMemo(() => seasonalStarters(onboardingAnswers, { month: new Date().getMonth() + 1, climate }), [climate, onboardingAnswers]);
  const suggestions = starters.plants;
  // Les trois premières idées sont cochées d'office : moins de touchers pour démarrer.
  const chosen = (picked ?? suggestions.slice(0, 3).map((entry) => entry.id)).filter((id) => suggestions.some((entry) => entry.id === id));

  const found = useMemo(() => (query.trim().length >= 2 ? searchCatalog(query).slice(0, SEARCH_RESULTS) : []), [query]);
  const shortcuts = useMemo(() => COMMON_PLANT_IDS.map((id) => getCatalogPlant(id)).filter((entry): entry is CatalogPlant => Boolean(entry)), []);

  const next = () => {
    if (index >= steps.length) {
      void finish();
      return;
    }
    setIndex((current) => current + 1);
  };
  // L'écran suivant arrive après un court délai : il doit lire les réponses à jour, pas celles du toucher.
  const nextRef = useRef(next);
  nextRef.current = next;

  const isSelected = (id: string) => {
    if (step === "goals") return answers.goals.includes(id);
    if (step === "has") return answers.has === id;
    if (step === "sun") return answers.sun === id;
    return answers.space === id;
  };

  const choose = (id: string) => {
    if (step === "goals") {
      setAnswers((current) => ({ ...current, goals: current.goals.includes(id) ? current.goals.filter((goal) => goal !== id) : [...current.goals, id] }));
      return;
    }
    if (step === "has") setAnswers((current) => ({ ...current, has: id as Answers["has"] }));
    else if (step === "sun") setAnswers((current) => ({ ...current, sun: id }));
    else setAnswers((current) => ({ ...current, space: id }));
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => nextRef.current(), ADVANCE_MS);
  };

  const locateMe = async () => {
    setLocating(true);
    setCityMessage(null);
    // Fenêtre de permission ignorée : on ne laisse pas le bouton bloqué sur « Un instant… ».
    const found = await Promise.race([location.requestDeviceLocation(), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), LOCATE_TIMEOUT_MS))]);
    setLocating(false);
    if (found) next();
    else setCityMessage("Position indisponible : cherche ta ville, ou passe pour l’instant.");
  };

  const searchCity = async () => {
    setCityMessage(null);
    try {
      const results = await location.searchCities(cityQuery);
      setCityResults(results);
      if (results.length === 0) setCityMessage("Aucune ville trouvée : vérifie l’orthographe.");
    } catch (error) {
      setCityMessage(error instanceof Error ? error.message : "Recherche indisponible.");
    }
  };

  const chooseCity = async (city: CityResult) => {
    await location.selectCity(city);
    next();
  };

  // Même logique qu'Aujourd'hui : l'autorisation d'abord, les rappels activés seulement après un accord.
  const turnOnReminders = async () => {
    const result = await activateReminders(await loadLocalReminderSettings(), { requestPermission: requestLocalNotificationPermission, save: (settings) => saveLocalReminderSettings(settings) });
    if (result.status === "denied") setRemindersDenied(true);
    else void finish();
  };

  const toggleOwned = (id: string) => setOwned((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const back = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setIndex((current) => Math.max(0, current - 1));
  };

  const finish = async () => {
    setSaving(true);
    // Déjà là : installées. Choisies ici : à planter (premier geste « Sème… » ou « Plante… »).
    if (hasPlants) for (const id of owned) await garden.addPlant(id);
    else for (const id of chosen) await garden.addPlant(id, { toPlant: true });
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ ...onboardingAnswers, completedAt: new Date().toISOString() }));
    await garden.reloadOnboarding();
    router.replace("/(tabs)");
  };

  const skip = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ skipped: true, completedAt: new Date().toISOString() }));
    await garden.reloadOnboarding();
    router.replace("/(tabs)");
  };

  // Onboarding déjà fait : on ne repose pas les questions à chaque lancement.
  if (!garden.loaded) return null;
  if (garden.onboarding) return <Redirect href="/(tabs)" />;

  const plantRow = (entry: CatalogPlant, active: boolean, onPress: () => void, last: boolean, text = entry.pitch) => (
    <Pressable key={entry.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={entry.name} onPress={onPress} style={({ pressed }) => [styles.plant, !last && glass.line, pressed && styles.pressed]}>
      <CatalogPicture entry={entry} style={styles.plantIcon} />
      <View style={styles.flex}>
        <Text style={[styles.optionTitle, { color: colors.foreground }]}>{entry.name}</Text>
        <Text style={[styles.optionText, { color: colors.muted }]} numberOfLines={2}>{text}</Text>
      </View>
      <View style={[styles.check, { borderColor: active ? colors.primary : "rgba(18,22,20,0.22)", backgroundColor: active ? colors.primary : "transparent" }]}>{active && <Text style={styles.checkMark}>✓</Text>}</View>
    </Pressable>
  );

  return (
    <LightScreen bottom>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        {index > 0 && (
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Revenir à l'étape précédente" hitSlop={10} onPress={back} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <IconSymbol name="chevron.left" size={26} color={colors.foreground} />
            </Pressable>
            <View style={styles.progress} accessibilityLabel={`Étape ${index} sur ${steps.length}`}>
              {steps.map((key, position) => (
                <View key={key} style={[styles.progressSegment, { backgroundColor: position < index ? colors.primary : "rgba(18,22,20,0.1)" }]} />
              ))}
            </View>
          </View>
        )}

        {index === 0 && (
          <FadeIn style={styles.welcome}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}><Text style={styles.logoText}>🌱</Text></View>
            <Text style={[styles.title, styles.bigTitle, { color: colors.foreground }]}>Ton balcon, au bon moment.</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Chaque jour, Balco te dit le geste utile pour tes plantes, selon la météo de chez toi.</Text>
            <Pressable accessibilityRole="button" onPress={() => setIndex(1)} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>C’est parti</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void skip()} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
              <Text style={[styles.ghostText, { color: colors.muted }]}>Passer</Text>
            </Pressable>
          </FadeIn>
        )}

        {question && (
          <FadeIn key={step} style={styles.step}>
            <Text style={[styles.title, { color: colors.foreground }]}>{question.title}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{question.subtitle}</Text>
            <View style={styles.options}>
              {question.options.map((option) => {
                const active = isSelected(option.id);
                return (
                  <Pressable key={option.id} accessibilityRole={question.multiple ? "checkbox" : "radio"} accessibilityState={{ checked: active }} onPress={() => choose(option.id)} style={({ pressed }) => [glass.card, styles.option, active && { borderColor: colors.primary, borderWidth: 2, backgroundColor: "rgba(227,241,232,0.92)" }, pressed && styles.pressed]}>
                    <View style={[styles.optionIcon, { backgroundColor: active ? "#FFFFFF" : colors.leaf }]}><Text style={styles.optionEmoji}>{option.icon}</Text></View>
                    <View style={styles.flex}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text>
                      <Text style={[styles.optionText, { color: colors.muted }]}>{option.text}</Text>
                    </View>
                    <View style={[styles.check, { borderColor: active ? colors.primary : "rgba(18,22,20,0.22)", backgroundColor: active ? colors.primary : "transparent" }]}>{active && <Text style={styles.checkMark}>✓</Text>}</View>
                  </Pressable>
                );
              })}
            </View>
            {question.multiple && (
              <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.ctaText}>{answers.goals.length > 0 ? "Continuer" : "Passer cette question"}</Text>
              </Pressable>
            )}
          </FadeIn>
        )}

        {step === "which" && (
          <FadeIn style={styles.step}>
            <Text style={[styles.title, { color: colors.foreground }]}>Lesquelles ?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Touche celles que tu as. Tu pourras en ajouter d’autres à tout moment.</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher : fraisier, romarin…" placeholderTextColor={colors.muted} accessibilityLabel="Rechercher une plante" returnKeyType="search" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
            {found.length > 0 && <View style={[glass.card, styles.plants]}>{found.map((entry, position) => plantRow(entry, owned.includes(entry.id), () => toggleOwned(entry.id), position === found.length - 1))}</View>}
            {query.trim().length >= 2 && found.length === 0 && <Text style={[styles.optionText, { color: colors.muted }]}>Aucune plante trouvée : essaie un autre nom.</Text>}
            <View style={styles.chips}>
              {[...shortcuts, ...owned.map((id) => getCatalogPlant(id)).filter((entry): entry is CatalogPlant => Boolean(entry) && !COMMON_PLANT_IDS.includes(entry!.id))].map((entry) => {
                const active = owned.includes(entry.id);
                return (
                  <Pressable key={entry.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={entry.name} onPress={() => toggleOwned(entry.id)} style={({ pressed }) => [styles.chip, { backgroundColor: active ? colors.primary : "rgba(255,255,255,0.78)", borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}>
                    <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.foreground }]}>{entry.emoji} {entry.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>{owned.length > 0 ? `Continuer · ${owned.length} plante${owned.length > 1 ? "s" : ""}` : "Je les ajouterai plus tard"}</Text>
            </Pressable>
          </FadeIn>
        )}

        {step === "city" && (
          <FadeIn style={styles.step}>
            <Text style={[styles.title, { color: colors.foreground }]}>Où est ton balcon ?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Pour te prévenir du gel, de la pluie et de la chaleur chez toi.</Text>
            <Pressable accessibilityRole="button" disabled={locating} onPress={() => void locateMe()} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>{locating ? "Un instant…" : "⌖ Utiliser ma position"}</Text>
            </Pressable>
            <Text style={[styles.optionText, { color: colors.muted, textAlign: "center" }]}>ou</Text>
            <View style={styles.searchRow}>
              <TextInput value={cityQuery} onChangeText={setCityQuery} onSubmitEditing={() => void searchCity()} placeholder="Rechercher une ville…" placeholderTextColor={colors.muted} returnKeyType="search" style={[styles.input, styles.flex, { color: colors.foreground, borderColor: colors.border }]} />
              <Pressable accessibilityRole="button" onPress={() => void searchCity()} style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
                <Text style={[styles.chipText, { color: colors.background }]}>Rechercher</Text>
              </Pressable>
            </View>
            {cityMessage && <Text style={[styles.optionText, { color: colors.error }]}>{cityMessage}</Text>}
            {cityResults.length > 0 && (
              <View style={[glass.card, styles.plants]}>
                {cityResults.map((city, position) => (
                  <Pressable key={`${city.id}-${city.latitude}`} accessibilityRole="button" onPress={() => void chooseCity(city)} style={({ pressed }) => [styles.plant, position < cityResults.length - 1 && glass.line, pressed && styles.pressed]}>
                    <View style={styles.flex}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>{city.name}</Text>
                      <Text style={[styles.optionText, { color: colors.muted }]}>{[city.admin1, city.country].filter(Boolean).join(" · ")}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
              <Text style={[styles.ghostText, { color: colors.muted }]}>Plus tard</Text>
            </Pressable>
          </FadeIn>
        )}

        {step === "reminders" && (
          <FadeIn style={styles.step}>
            <Text style={[styles.title, { color: colors.foreground }]}>Je te préviens au bon moment ?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Je te préviens s’il gèle cette nuit ou si tes plantes ont soif.</Text>
            {remindersDenied && <Text style={[styles.optionText, { color: colors.error }]}>{NOTIFICATIONS_DENIED.title} · {NOTIFICATIONS_DENIED.message}</Text>}
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void (remindersDenied ? finish() : turnOnReminders())} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>{saving ? "Un instant…" : remindersDenied ? "Créer mon balcon" : "Activer les rappels"}</Text>
            </Pressable>
            {!remindersDenied && (
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => void finish()} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
                <Text style={[styles.ghostText, { color: colors.muted }]}>Plus tard</Text>
              </Pressable>
            )}
          </FadeIn>
        )}

        {step === "plants" && (
          <FadeIn style={styles.step}>
            <Text style={[styles.title, { color: colors.foreground }]}>Tes premières plantes</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>À semer ou planter maintenant, pour ton balcon. Garde celles qui te plaisent : tu pourras en ajouter d’autres à tout moment.</Text>
            {starters.notice && <Text style={[styles.subtitle, { color: colors.foreground }]}>{starters.notice}</Text>}
            <View style={[glass.card, styles.plants]}>
              {suggestions.map((entry, position) => {
                const active = chosen.includes(entry.id);
                return plantRow(entry, active, () => setPicked(active ? chosen.filter((id) => id !== entry.id) : [...chosen, entry.id]), position === suggestions.length - 1);
              })}
            </View>
            <Pressable accessibilityRole="button" disabled={saving} onPress={next} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>{saving ? "Un instant…" : `${index < steps.length ? "Continuer" : "Créer mon balcon"}${chosen.length > 0 ? ` · ${chosen.length} plante${chosen.length > 1 ? "s" : ""}` : ""}`}</Text>
            </Pressable>
          </FadeIn>
        )}
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 18, flexGrow: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { marginLeft: -8, width: 34, height: 40, alignItems: "center", justifyContent: "center" },
  progress: { flex: 1, flexDirection: "row", gap: 6 },
  progressSegment: { flex: 1, height: 5, borderRadius: 3 },
  welcome: { flex: 1, justifyContent: "center", gap: 16, paddingVertical: 20 },
  logo: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 28 },
  step: { gap: 14 },
  title: { fontSize: 28, lineHeight: 33, fontWeight: "800", letterSpacing: -0.8 },
  bigTitle: { fontSize: 34, lineHeight: 39, letterSpacing: -1 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, backgroundColor: "#FFFFFF" },
  options: { gap: 10, marginTop: 4 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 74 },
  optionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionEmoji: { fontSize: 22 },
  optionTitle: { fontSize: 16, fontWeight: "700" },
  optionText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  plants: { paddingHorizontal: 14 },
  plant: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  plantIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchButton: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: "600" },
  cta: { borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  ghost: { alignItems: "center", paddingVertical: 10 },
  ghostText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
