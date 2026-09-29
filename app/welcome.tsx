import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";

import { BalcoIllustration } from "@/components/balco-illustration";
import { FadeIn, PopIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";

const ONBOARDING_STORAGE_KEY = "balco.onboarding.preferences.v1";
const experiences = [
  { id: "beginner", icon: "🌱", title: "Je débute", text: "J'ai besoin d'être guidé pas à pas." },
  { id: "curious", icon: "🪴", title: "Je me lance", text: "J'ai déjà quelques plantes à la maison." },
  { id: "experienced", icon: "🌿", title: "J'ai déjà un potager", text: "Je veux mieux organiser mes cultures." },
] as const;
const sunlight = [
  { id: "shade", icon: "☁", title: "Plutôt ombragé", text: "Moins de 3 h de soleil direct." },
  { id: "partial", icon: "◐", title: "Mi-ombre", text: "Entre 3 et 6 h de soleil direct." },
  { id: "sunny", icon: "☀", title: "Très ensoleillé", text: "Plus de 6 h de soleil direct." },
] as const;
const spaces = [
  { id: "windowsill", icon: "▱", title: "Un rebord de fenêtre", text: "Quelques pots compacts, près de la lumière." },
  { id: "planter", icon: "▰", title: "Une ou deux jardinières", text: "Un espace étroit mais plein de potentiel." },
  { id: "balcony", icon: "⌂", title: "Un petit balcon", text: "De quoi créer un vrai micro-potager." },
  { id: "terrace", icon: "▦", title: "Une terrasse", text: "Plus de place pour varier les cultures." },
] as const;
const goals = [
  { id: "tomatoes", icon: "🍅", title: "Tomates cerises", text: "Du soleil et du goût à récolter." },
  { id: "aromatics", icon: "🌿", title: "Basilic & menthe", text: "Des aromatiques pour la cuisine." },
  { id: "bees", icon: "🐝", title: "Fleurs pour les abeilles", text: "Accueillir les pollinisateurs en ville." },
  { id: "zero-waste", icon: "♻", title: "Moins de gaspillage", text: "Composter, récupérer et arroser mieux." },
] as const;

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const garden = useGarden();
  const press = useRef(new Animated.Value(1)).current;
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<string | null>(null);
  const [sunlightChoice, setSunlightChoice] = useState<string | null>(null);
  const [spaceChoice, setSpaceChoice] = useState<string | null>(null);
  const [goalChoices, setGoalChoices] = useState<string[]>([]);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ experience, sunlight: sunlightChoice, space: spaceChoice, goals: goalChoices, completedAt: new Date().toISOString() }));
    await garden.reloadOnboarding();
    router.replace("/(tabs)");
  };

  const next = () => {
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }
    Animated.sequence([
      Animated.timing(press, { toValue: 0.97, duration: 90, useNativeDriver: true }),
      Animated.timing(press, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start(() => void finish());
  };

  const skip = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ skipped: true, completedAt: new Date().toISOString() }));
    await garden.reloadOnboarding();
    router.replace("/(tabs)");
  };

  const selected = step === 0 ? experience : step === 1 ? sunlightChoice : spaceChoice;
  const options = step === 0 ? experiences : step === 1 ? sunlight : step === 2 ? spaces : goals;
  const isSelected = (id: string) => step === 3 ? goalChoices.includes(id) : selected === id;
  const chooseOption = (id: string) => {
    if (step === 0) setExperience(id);
    else if (step === 1) setSunlightChoice(id);
    else if (step === 2) setSpaceChoice(id);
    else setGoalChoices((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const canContinue = step === 3 ? goalChoices.length > 0 : Boolean(selected);
  const progress = `${((step + 1) / 4) * 100}%` as `${number}%`;
  const titles = ["On commence par\nfaire connaissance.", "Combien de soleil\nreçoit ton balcon ?", "Quel espace veux-tu\nfaire pousser ?", "Qu'aimerais-tu\ncultiver ou protéger ?"];
  const subtitles = ["Pas de jargon ici. Balco s'adapte à ton expérience, sans pression.", "Une estimation suffit : tes conseils de culture seront plus justes.", "Même un rebord de fenêtre peut devenir un petit écosystème.", "Choisis tout ce qui te donne envie. Balco construira ton premier plan de culture."];
  const captions = ["Un potager à ton rythme.", "Chaque balcon a son propre climat.", "Un coin de nature, juste là.", "Des choix qui ont du goût."];

  // Onboarding déjà fait : on ne repose pas les questions à chaque lancement.
  if (!garden.loaded) return null;
  if (garden.onboarding) return <Redirect href="/(tabs)" />;

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <FadeIn delay={80} style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}><Text style={styles.logoText}>b</Text></View>
          <View><Text style={[styles.logoName, { color: colors.foreground }]}>balco</Text><Text style={[styles.logoTag, { color: colors.muted }]}>MON POTAGER POUR LES PETITS ESPACES</Text></View>
        </FadeIn>

        <View style={styles.progressRow}><Text style={[styles.progressLabel, { color: colors.terracotta }]}>POUR PERSONNALISER TON BALCON</Text><Text style={[styles.progressCount, { color: colors.muted }]}>{step + 1} / 4</Text></View>
        <View style={[styles.progressTrack, { backgroundColor: colors.leaf }]}><View style={[styles.progressFill, { width: progress, backgroundColor: colors.terracotta }]} /></View>

        <FadeIn key={step} delay={100} style={styles.heroCopy}><Text style={[styles.title, { color: colors.foreground }]}>{titles[step]}</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{subtitles[step]}</Text></FadeIn>

        <PopIn key={`illustration-${step}`} delay={180} style={styles.illustrationCard}><LinearGradient colors={[colors.leaf, colors.cream]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.illustrationGradient}><View style={[styles.sparkle, { backgroundColor: colors.surface }]}><Text style={{ color: colors.terracotta }}>✦</Text></View><BalcoIllustration /><View style={[styles.illustrationCaption, { backgroundColor: "rgba(255,255,255,0.66)" }]}><Text style={[styles.captionText, { color: colors.foreground }]}>{captions[step]}</Text></View></LinearGradient></PopIn>

        <View style={styles.optionsList}>{options.map((option) => { const active = isSelected(option.id); return <Pressable key={option.id} onPress={() => chooseOption(option.id)} style={({ pressed }) => [styles.optionCard, { backgroundColor: active ? colors.foreground : colors.surface, borderColor: active ? colors.foreground : colors.border }, pressed && styles.pressed]}><View style={[styles.optionIcon, { backgroundColor: active ? "rgba(213,233,107,0.18)" : colors.leaf }]}><Text style={styles.optionIconText}>{option.icon}</Text></View><View style={styles.optionCopy}><Text style={[styles.optionTitle, { color: active ? "#FFF" : colors.foreground }]}>{option.title}</Text><Text style={[styles.optionText, { color: active ? "rgba(255,255,255,0.66)" : colors.muted }]}>{option.text}</Text></View><View style={[styles.radio, { borderColor: active ? colors.sun : colors.border, backgroundColor: active ? colors.sun : "transparent" }]}>{active && <Text style={[styles.radioCheck, { color: colors.foreground }]}>✓</Text>}</View></Pressable>; })}</View>
        {step === 3 && <Text style={[styles.multiHint, { color: colors.muted }]}>{goalChoices.length > 0 ? `${goalChoices.length} préférence${goalChoices.length > 1 ? "s" : ""} sélectionnée${goalChoices.length > 1 ? "s" : ""}` : "Tu peux choisir plusieurs réponses"}</Text>}

        <Animated.View style={{ transform: [{ scale: press }], marginTop: 7 }}><Pressable disabled={!canContinue} onPress={next} style={({ pressed }) => [styles.startButton, { backgroundColor: canContinue ? colors.terracotta : colors.border }, pressed && styles.pressed]}><Text style={styles.startButtonText}>{step === 3 ? "Créer mon balcon  →" : "Continuer  →"}</Text></Pressable></Animated.View>
        <Pressable onPress={() => step === 0 ? void skip() : setStep((current) => current - 1)} style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}><Text style={[styles.skipText, { color: colors.muted }]}>{step === 0 ? "Je regarderai plus tard" : "← Revenir à l'étape précédente"}</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 18, paddingBottom: 14 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] },
  logoText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", fontStyle: "italic" },
  logoName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  logoTag: { fontSize: 8, letterSpacing: 0.8, marginTop: 1 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 34 },
  progressLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  progressCount: { fontSize: 10, fontWeight: "800" },
  progressTrack: { height: 5, borderRadius: 3, marginTop: 9, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  heroCopy: { marginTop: 23 },
  title: { fontSize: 31, lineHeight: 34, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 13, lineHeight: 19, maxWidth: 320, marginTop: 11 },
  illustrationCard: { marginTop: 18, borderRadius: 25, overflow: "hidden", shadowColor: "#C56D52", shadowOpacity: 0.13, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  illustrationGradient: { height: 145, alignItems: "center", justifyContent: "center", position: "relative" },
  sparkle: { position: "absolute", top: 13, right: 16, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  illustrationCaption: { position: "absolute", bottom: 10, left: 14, right: 14, borderRadius: 11, paddingVertical: 7, alignItems: "center" },
  captionText: { fontSize: 10, fontWeight: "800" },
  optionsList: { gap: 9, marginTop: 17 },
  optionCard: { minHeight: 67, borderRadius: 17, borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 11 },
  optionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionIconText: { fontSize: 20 },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 13, fontWeight: "800" },
  optionText: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  radio: { width: 21, height: 21, borderWidth: 1.5, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  radioCheck: { fontSize: 13, fontWeight: "900" },
  multiHint: { fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 10 },
  startButton: { borderRadius: 17, paddingVertical: 15, alignItems: "center", shadowColor: "#CF765B", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  startButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  skipButton: { alignItems: "center", paddingVertical: 11 },
  skipText: { fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
