/**
 * L'accueil de la première ouverture, sur la lumière du balcon. On commence par faire
 * connaissance (prénom facultatif), puis une question par écran : un toucher suffit, l'écran
 * suivant arrive tout seul. À la fin, Balco propose tes premières plantes, déjà cochées :
 * « Créer mon balcon » et tu arrives sur Aujourd'hui avec tes gestes du jour.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { FadeIn } from "@/components/motion";
import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Text, TextInput } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { ONBOARDING_STORAGE_KEY, useGarden } from "@/lib/garden/garden-context";
import { EXPERIENCE_OPTIONS, GOAL_OPTIONS, SPACE_OPTIONS, SUNLIGHT_OPTIONS, type OnboardingOption } from "@/lib/garden/onboarding";
import { recommendPlants, type OnboardingAnswers } from "@/lib/plants/catalog";

type Question = { title: string; subtitle: string; options: OnboardingOption[]; multiple?: boolean };

/** Les quatre questions ; l'écran 0 (bienvenue) et le dernier (tes plantes) les encadrent. */
const QUESTIONS: Question[] = [
  { title: "Tu jardines déjà ?", subtitle: "Pas de jargon ici. Balco s'adapte à ton expérience, sans pression.", options: EXPERIENCE_OPTIONS },
  { title: "Combien de soleil reçoit ton balcon ?", subtitle: "Une estimation suffit : tes conseils seront plus justes.", options: SUNLIGHT_OPTIONS },
  { title: "Quel espace veux-tu faire pousser ?", subtitle: "Même un rebord de fenêtre peut devenir un petit potager.", options: SPACE_OPTIONS },
  { title: "Qu'aimerais-tu cultiver ?", subtitle: "Choisis tout ce qui te donne envie.", options: GOAL_OPTIONS, multiple: true },
];
const PLANTS_STEP = QUESTIONS.length + 1;
/** Le temps de voir son choix coché avant de passer à la question suivante. */
const ADVANCE_MS = 280;

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const garden = useGarden();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [answers, setAnswers] = useState<{ experience?: string; sunlight?: string; space?: string; goals: string[] }>({ goals: [] });
  const [picked, setPicked] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onboardingAnswers: OnboardingAnswers = useMemo(() => ({ experience: answers.experience, sunlight: answers.sunlight, space: answers.space, goals: answers.goals }), [answers]);
  const suggestions = useMemo(() => recommendPlants(onboardingAnswers, { month: new Date().getMonth() + 1 }).slice(0, 6), [onboardingAnswers]);
  // Les trois premières idées sont cochées d'office : moins de touchers pour démarrer.
  const chosen = (picked ?? suggestions.slice(0, 3).map((entry) => entry.id)).filter((id) => suggestions.some((entry) => entry.id === id));

  const question = step >= 1 && step <= QUESTIONS.length ? QUESTIONS[step - 1] : null;
  const keys = ["experience", "sunlight", "space"] as const;
  const isSelected = (id: string) => (step === 4 ? answers.goals.includes(id) : answers[keys[step - 1]] === id);

  const choose = (id: string) => {
    if (step === 4) {
      setAnswers((current) => ({ ...current, goals: current.goals.includes(id) ? current.goals.filter((goal) => goal !== id) : [...current.goals, id] }));
      return;
    }
    setAnswers((current) => ({ ...current, [keys[step - 1]]: id }));
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setStep((current) => current + 1), ADVANCE_MS);
  };

  const back = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setStep((current) => Math.max(0, current - 1));
  };

  const saveName = async () => {
    const name = firstName.trim();
    if (name) await garden.updateProfile({ firstName: name });
  };

  const finish = async (withPlants: boolean) => {
    setSaving(true);
    await saveName();
    if (withPlants) for (const id of chosen) await garden.addPlant(id);
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ ...onboardingAnswers, completedAt: new Date().toISOString() }));
    await garden.reloadOnboarding();
    router.replace("/(tabs)");
  };

  const skip = async () => {
    await saveName();
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ skipped: true, completedAt: new Date().toISOString() }));
    await garden.reloadOnboarding();
    router.replace("/(tabs)");
  };

  // Onboarding déjà fait : on ne repose pas les questions à chaque lancement.
  if (!garden.loaded) return null;
  if (garden.onboarding) return <Redirect href="/(tabs)" />;

  return (
    <LightScreen bottom>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
        {step > 0 && (
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Revenir à l'étape précédente" hitSlop={10} onPress={back} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <IconSymbol name="chevron.left" size={26} color={colors.foreground} />
            </Pressable>
            <View style={styles.progress} accessibilityLabel={`Étape ${step} sur ${PLANTS_STEP}`}>
              {Array.from({ length: PLANTS_STEP }, (_, index) => (
                <View key={index} style={[styles.progressSegment, { backgroundColor: index < step ? colors.primary : "rgba(18,22,20,0.1)" }]} />
              ))}
            </View>
          </View>
        )}

        {step === 0 && (
          <FadeIn style={styles.welcome}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}><Text style={styles.logoText}>🌱</Text></View>
            <Text style={[styles.title, styles.bigTitle, { color: colors.foreground }]}>On commence par faire connaissance.</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Balco te dit quoi faire, au bon moment, pour tes propres plantes. Quatre petites questions, et ton balcon est prêt.</Text>
            <View style={[glass.card, styles.nameCard]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Ton prénom <Text style={{ color: colors.muted, fontWeight: "500" }}>(facultatif)</Text></Text>
              <TextInput value={firstName} onChangeText={setFirstName} onSubmitEditing={() => setStep(1)} placeholder="Pour que Balco te dise bonjour" placeholderTextColor={colors.muted} maxLength={30} returnKeyType="next" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
            </View>
            <Pressable accessibilityRole="button" onPress={() => setStep(1)} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>C’est parti</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void skip()} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
              <Text style={[styles.ghostText, { color: colors.muted }]}>Je regarderai plus tard</Text>
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
              <Pressable accessibilityRole="button" onPress={() => setStep(PLANTS_STEP)} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.ctaText}>{answers.goals.length > 0 ? "Continuer" : "Passer cette question"}</Text>
              </Pressable>
            )}
          </FadeIn>
        )}

        {step === PLANTS_STEP && (
          <FadeIn style={styles.step}>
            <Text style={[styles.title, { color: colors.foreground }]}>Tes premières plantes</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Choisies pour ton balcon et la saison. Garde celles qui te plaisent : tu pourras en ajouter d’autres à tout moment.</Text>
            <View style={[glass.card, styles.plants]}>
              {suggestions.map((entry, index) => {
                const active = chosen.includes(entry.id);
                return (
                  <Pressable key={entry.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => setPicked(active ? chosen.filter((id) => id !== entry.id) : [...chosen, entry.id])} style={({ pressed }) => [styles.plant, index < suggestions.length - 1 && glass.line, pressed && styles.pressed]}>
                    <View style={[styles.plantIcon, { backgroundColor: colors.leaf }]}><Text style={styles.plantEmoji}>{entry.emoji}</Text></View>
                    <View style={styles.flex}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>{entry.name}</Text>
                      <Text style={[styles.optionText, { color: colors.muted }]} numberOfLines={2}>{entry.pitch}</Text>
                    </View>
                    <View style={[styles.check, { borderColor: active ? colors.primary : "rgba(18,22,20,0.22)", backgroundColor: active ? colors.primary : "transparent" }]}>{active && <Text style={styles.checkMark}>✓</Text>}</View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void finish(true)} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.ctaText}>{saving ? "Un instant…" : chosen.length > 0 ? `Créer mon balcon · ${chosen.length} plante${chosen.length > 1 ? "s" : ""}` : "Créer mon balcon"}</Text>
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
  nameCard: { padding: 16, gap: 10 },
  label: { fontSize: 14, fontWeight: "700" },
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
  plantEmoji: { fontSize: 23 },
  cta: { borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  ghost: { alignItems: "center", paddingVertical: 10 },
  ghostText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
