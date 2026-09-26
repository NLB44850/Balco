import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ContextualReminderCard } from "@/components/contextual-reminder-card";
import { GroupedReminderCard } from "@/components/grouped-reminder-card";
import { FadeIn, PopIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalWeather } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";
import { decideReminder, type MaintenanceEvent, type ReminderDecision, type PlantCareProfile } from "@/lib/reminders/reminder-engine";
import {
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  saveLocalReminderSettings,
  scheduleLocalReminder,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";

const ONBOARDING_STORAGE_KEY = "balco.onboarding.preferences.v1";
const TASK_HISTORY_STORAGE_KEY = "balco.plant.task-history.v1";

type OnboardingProfile = {
  experience?: string;
  sunlight?: string;
  space?: string;
  goals?: string[];
  skipped?: boolean;
};

type PlantRecommendation = {
  name: string;
  emoji: string;
  reason: string;
  effort: string;
};

type TaskHistoryEntry = {
  date: string;
  task: string;
};

type TaskHistory = Record<string, TaskHistoryEntry[]>;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatHistoryDate(date: string) {
  if (date === todayKey()) return "Aujourd'hui";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (date === yesterdayKey) return "Hier";
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type DailyTask = {
  label: string;
  title: string;
  instruction: string;
  doneTitle: string;
  doneText: string;
};

const dailyTasks: Record<string, DailyTask> = {
  "Tomates cerises": { label: "TOMATES CERISES", title: "Aujourd'hui, vérifie la terre des tomates.", instruction: "Enfonce un doigt sur 2 cm : arrose doucement seulement si la terre est sèche.", doneTitle: "Tomates surveillées, journée gagnée.", doneText: "Ton plant est prêt à continuer sa croissance au soleil." },
  "Basilic & menthe": { label: "BASILIC & MENTHE", title: "Aujourd'hui, arrose le basilic.", instruction: "Un petit verre au pied de la plante. La terre doit être sèche sur 2 cm.", doneTitle: "Aromatiques chouchoutées, journée gagnée.", doneText: "Tu viens de faire un geste utile pour ton micro-climat." },
  "Capucines": { label: "CAPUCINES", title: "Aujourd'hui, observe les fleurs.", instruction: "Retire une fleur fanée pour encourager les nouvelles et laisse les abeilles butiner.", doneTitle: "Capucines observées, journée gagnée.", doneText: "Ton balcon reste accueillant pour les pollinisateurs." },
  "Radis": { label: "RADIS", title: "Aujourd'hui, éclaircis les radis.", instruction: "Garde les pousses les plus vigoureuses, espacées de quelques centimètres.", doneTitle: "Radis éclaircis, journée gagnée.", doneText: "Tes jeunes plants ont maintenant plus de place pour grossir." },
  "Menthe": { label: "MENTHE", title: "Aujourd'hui, pince la menthe.", instruction: "Coupe les extrémités juste au-dessus d'une paire de feuilles pour la faire ramifier.", doneTitle: "Menthe pincée, journée gagnée.", doneText: "Ta plante va produire de nouvelles pousses bien parfumées." },
};

const plantLibrary: Record<string, PlantRecommendation> = {
  tomatoes: { name: "Tomates cerises", emoji: "🍅", reason: "Du soleil et un petit tuteur suffisent pour récolter cet été.", effort: "Soleil · facile" },
  aromatics: { name: "Basilic & menthe", emoji: "🌿", reason: "Deux aromatiques généreuses pour cuisiner directement depuis ton balcon.", effort: "Mi-ombre · facile" },
  bees: { name: "Capucines", emoji: "🌼", reason: "Des fleurs colorées qui attirent les abeilles et se plaisent en pot.", effort: "Soleil · facile" },
  "zero-waste": { name: "Salade à couper", emoji: "🥬", reason: "Elle repousse plusieurs fois : parfaite pour récolter sans gaspiller.", effort: "Mi-ombre · facile" },
  mint: { name: "Menthe", emoji: "🌱", reason: "Robuste et parfumée, elle démarre très bien dans un petit contenant.", effort: "Ombre · facile" },
  radishes: { name: "Radis", emoji: "🌸", reason: "Une récolte rapide qui donne confiance dès les premières semaines.", effort: "Mi-ombre · express" },
};

function buildRecommendationPool(profile: OnboardingProfile | null): PlantRecommendation[] {
  if (!profile || profile.skipped) return [plantLibrary.aromatics, plantLibrary.mint, plantLibrary.radishes, plantLibrary.bees];
  const picks: PlantRecommendation[] = [];
  const add = (key: string) => {
    const plant = plantLibrary[key];
    if (plant && !picks.some((item) => item.name === plant.name)) picks.push(plant);
  };
  (profile.goals ?? []).forEach((goal) => add(goal));
  if (profile.sunlight === "shade") ["mint", "aromatics", "radishes"].forEach(add);
  if (profile.sunlight === "partial") ["radishes", "aromatics", "mint"].forEach(add);
  if (profile.sunlight === "sunny") ["tomatoes", "bees", "aromatics"].forEach(add);
  if (profile.space === "windowsill") ["aromatics", "mint", "radishes"].forEach(add);
  if (profile.space === "planter") ["radishes", "aromatics", "bees"].forEach(add);
  if (profile.space === "balcony" || profile.space === "terrace") ["tomatoes", "bees", "aromatics"].forEach(add);
  ["aromatics", "mint", "radishes", "tomatoes", "bees"].forEach(add);
  return picks;
}

function buildRecommendations(profile: OnboardingProfile | null): PlantRecommendation[] {
  return buildRecommendationPool(profile).slice(0, 3);
}

function careProfileForPlant(plant: PlantRecommendation): PlantCareProfile {
  const isAromatic = plant.name === "Basilic & menthe" || plant.name === "Menthe";
  const isFlower = plant.name === "Capucines";
  return {
    plantId: plant.name.toLowerCase().replaceAll(" ", "-"),
    displayName: plant.name,
    wateringIntervalHours: isAromatic ? 36 : isFlower ? 72 : 48,
    rainSkipMm: 2,
    heatThresholdC: isAromatic ? 28 : 30,
    frostThresholdC: isAromatic ? 5 : 2,
    windThresholdKmh: 40,
    frostSensitive: true,
    allowedTaskTypes: ["watering", "observation", "protection"],
  };
}

function historyAsMaintenanceEvents(history: TaskHistory, plant: PlantRecommendation): MaintenanceEvent[] {
  const plantId = careProfileForPlant(plant).plantId;
  return (history[plant.name] ?? []).map((entry, index) => ({
    id: `${plantId}-${entry.date}-${index}`,
    plantId,
    type: entry.task.toLowerCase().includes("arrose") || entry.task.toLowerCase().includes("terre") ? "watering" : "observation",
    completedAt: `${entry.date}T12:00:00.000Z`,
    source: "daily_task",
    note: entry.task,
  }));
}

export default function HomeScreen() {
  const colors = useColors();
  const [taskDone, setTaskDone] = useState(false);
  const [taskHistory, setTaskHistory] = useState<TaskHistory>({});
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [recommendationOverrides, setRecommendationOverrides] = useState<Record<number, PlantRecommendation>>({});
  const [dismissedReminderKey, setDismissedReminderKey] = useState<string | null>(null);
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [reminderSettingsLoaded, setReminderSettingsLoaded] = useState(false);
  const [isSchedulingReminder, setIsSchedulingReminder] = useState(false);
  const impact = taskDone ? 68 : 52;
  const recommendationPool = useMemo(() => buildRecommendationPool(onboardingProfile), [onboardingProfile]);
  const baseRecommendations = useMemo(() => buildRecommendations(onboardingProfile), [onboardingProfile]);
  const recommendations = useMemo(() => baseRecommendations.map((plant, index) => recommendationOverrides[index] ?? plant), [baseRecommendations, recommendationOverrides]);
  const recommendedPlant = recommendations[0] ?? plantLibrary.aromatics;
  const dailyTask = dailyTasks[recommendedPlant.name] ?? dailyTasks["Basilic & menthe"];
  const reminderPlant = useMemo(() => careProfileForPlant(recommendedPlant), [recommendedPlant]);
  const maintenanceHistory = useMemo(() => historyAsMaintenanceEvents(taskHistory, recommendedPlant), [recommendedPlant, taskHistory]);
  const { weather, weatherSnapshot, reminderDecision, isLoading, refresh } = useLocalWeather({
    plant: reminderPlant,
    history: maintenanceHistory,
    reminderSettings: { enabled: reminderSettings.enabled, skipWateringWhenRainExpected: reminderSettings.skipWateringWhenRainExpected, maxNormalRemindersPerDay: reminderSettings.maxNormalRemindersPerDay },
  });
  const reminderKey = reminderDecision ? `${reminderDecision.plantId}:${reminderDecision.taskType}:${reminderDecision.validUntil}` : null;
  const plantReminderEnabled = reminderSettings.enabledPlantIds.length === 0 || reminderSettings.enabledPlantIds.includes(reminderPlant.plantId);
  const reminderDecisions = useMemo(() => {
    if (!reminderSettings.enabled || !reminderSettingsLoaded || weather.isFallback) return [];
    return recommendations.map((plant) => {
      const profile = careProfileForPlant(plant);
      if (reminderSettings.enabledPlantIds.length > 0 && !reminderSettings.enabledPlantIds.includes(profile.plantId)) return null;
      return decideReminder({
        plant: profile,
        history: historyAsMaintenanceEvents(taskHistory, plant),
        weather: weatherSnapshot,
        settings: { enabled: true, skipWateringWhenRainExpected: reminderSettings.skipWateringWhenRainExpected, maxNormalRemindersPerDay: reminderSettings.maxNormalRemindersPerDay },
      });
    }).filter((decision): decision is ReminderDecision => decision !== null);
  }, [recommendations, reminderSettings, reminderSettingsLoaded, taskHistory, weather.isFallback, weatherSnapshot]);
  const reminderGroupKey = reminderDecisions.map((decision) => `${decision.plantId}:${decision.taskType}:${decision.validUntil}`).join("|");
  const visibleReminders = reminderGroupKey !== dismissedReminderKey ? reminderDecisions : [];

  useEffect(() => {
    let active = true;
    loadLocalReminderSettings().then((settings) => {
      if (!active) return;
      setReminderSettings(settings);
      setReminderSettingsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!reminderSettingsLoaded || !reminderSettings.enabled || !plantReminderEnabled || !reminderDecision) return;
    void scheduleLocalReminder(reminderDecision, reminderSettings);
  }, [plantReminderEnabled, reminderDecision, reminderSettings, reminderSettingsLoaded]);

  const replaceRecommendation = (index: number) => {
    const current = recommendations[index];
    const visibleNames = recommendations.map((plant, plantIndex) => plantIndex === index ? "" : plant.name);
    const alternative = recommendationPool.find((plant) => plant.name !== current.name && !visibleNames.includes(plant.name));
    if (alternative) setRecommendationOverrides((currentOverrides) => ({ ...currentOverrides, [index]: alternative }));
  };

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          try {
            setOnboardingProfile(JSON.parse(stored) as OnboardingProfile);
          } catch {
            setOnboardingProfile(null);
          }
        }
        setProfileLoaded(true);
      })
      .catch(() => {
        if (active) setProfileLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(TASK_HISTORY_STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          try {
            setTaskHistory(JSON.parse(stored) as TaskHistory);
          } catch {
            setTaskHistory({});
          }
        }
        setHistoryLoaded(true);
      })
      .catch(() => {
        if (active) setHistoryLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setTaskDone(Boolean(taskHistory[recommendedPlant.name]?.some((entry) => entry.date === todayKey())));
  }, [recommendedPlant.name, taskHistory]);

  const completeTask = async () => {
    const date = todayKey();
    const plantHistory = taskHistory[recommendedPlant.name] ?? [];
    const nextHistory = taskDone
      ? { ...taskHistory, [recommendedPlant.name]: plantHistory.filter((entry) => entry.date !== date) }
      : { ...taskHistory, [recommendedPlant.name]: [{ date, task: dailyTask.title }, ...plantHistory.filter((entry) => entry.date !== date)].slice(0, 30) };
    setTaskHistory(nextHistory);
    setTaskDone(!taskDone);
    await AsyncStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const completeReminder = async (decision: ReminderDecision) => {
    const date = todayKey();
    const plantHistory = taskHistory[recommendedPlant.name] ?? [];
    const nextHistory = {
      ...taskHistory,
      [recommendedPlant.name]: [{ date, task: decision.title }, ...plantHistory.filter((entry) => entry.date !== date)].slice(0, 30),
    };
    setTaskHistory(nextHistory);
    setDismissedReminderKey(reminderGroupKey);
    await AsyncStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const dismissReminder = (decision: ReminderDecision) => {
    setDismissedReminderKey(`${decision.plantId}:${decision.taskType}:${decision.validUntil}`);
  };

  const dismissReminderGroup = (decisions: ReminderDecision[]) => {
    setDismissedReminderKey(decisions.map((decision) => `${decision.plantId}:${decision.taskType}:${decision.validUntil}`).join("|"));
  };

  const activateReminders = async () => {
    if (!reminderDecision) return;
    setIsSchedulingReminder(true);
    const nextSettings = { ...reminderSettings, enabled: true, enabledPlantIds: [reminderPlant.plantId] };
    setReminderSettings(nextSettings);
    await saveLocalReminderSettings(nextSettings);
    await scheduleLocalReminder(reminderDecision, nextSettings);
    setReminderSettingsLoaded(true);
    setIsSchedulingReminder(false);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={[styles.overline, { color: colors.muted }]}>LUNDI 22 SEPTEMBRE · {weather.city.toUpperCase()}</Text><Text style={[styles.title, { color: colors.foreground }]}>Bonjour, Camille <Text style={{ color: colors.terracotta }}>✳</Text></Text></View>
          <View style={[styles.avatar, { backgroundColor: colors.terracotta }]}><Text style={styles.avatarText}>CM</Text></View>
        </View>

        <FadeIn delay={80}>
          <LinearGradient colors={[colors.foreground, "#2F644B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}><Text style={styles.heroLabel}>{isLoading ? "MÉTÉO LOCALE · CHARGEMENT" : "TON POTAGER AUJOURD'HUI"}</Text><Pressable onPress={() => void refresh()} style={[styles.weatherPill, { backgroundColor: "rgba(255,255,255,0.14)" }]}><Text style={styles.weatherPillText}>{weather.isDay ? "☀" : "☾"} {Math.round(weather.temperature)}°C</Text></Pressable></View>
            <Text style={styles.heroTitle}>Une petite session.{`\n`}Un balcon qui grandit.</Text>
            <Text style={styles.heroMeta}>{weather.summary} · 3 actions simples pour prendre soin du vivant.</Text>
            <View style={styles.heroBottom}><Text style={styles.heroDate}>SAISON 01 · JOUR 04</Text><Text style={styles.heroArrow}>↗</Text></View>
          </LinearGradient>
        </FadeIn>

        {visibleReminders.length > 0 && <FadeIn delay={120} style={styles.reminderWrapper}>
          {visibleReminders.length > 1 ? <GroupedReminderCard decisions={visibleReminders} onComplete={(decision) => void completeReminder(decision)} onDismiss={dismissReminderGroup} /> : <ContextualReminderCard decision={visibleReminders[0]} onComplete={(decision) => void completeReminder(decision)} onDismiss={dismissReminder} />}
          <View style={styles.reminderSettingsRow}>
            <Text style={[styles.reminderSettingsText, { color: colors.muted }]}>
              {reminderSettings.enabled ? `Rappel local actif à ${String(reminderSettings.preferredHour).padStart(2, "0")} h ${String(reminderSettings.preferredMinute).padStart(2, "0")}` : "Recevoir ce conseil au bon moment"}
            </Text>
            {!reminderSettings.enabled && <Pressable onPress={() => void activateReminders()} disabled={isSchedulingReminder} style={({ pressed }) => [styles.reminderSettingsButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}>
              <Text style={[styles.reminderSettingsButtonText, { color: colors.primary }]}>{isSchedulingReminder ? "Activation…" : "Activer"}</Text>
            </Pressable>}
          </View>
        </FadeIn>}

        <View style={styles.sectionRow}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>SESSION DU JOUR</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Le geste le plus utile</Text></View><View style={[styles.countPill, { backgroundColor: colors.sun }]}><Text style={[styles.countText, { color: colors.foreground }]}>01 / 03</Text></View></View>

        <PopIn delay={140}>
          <LinearGradient colors={taskDone ? [colors.leaf, "#F4F6E8"] : [colors.surface, colors.cream]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.taskCard}>
            <View style={styles.taskHeader}><View style={[styles.taskNumber, { backgroundColor: taskDone ? colors.success : colors.terracotta }]}><Text style={styles.taskNumberText}>{taskDone ? "✓" : "01"}</Text></View><View style={styles.taskType}><Text style={[styles.taskTypeText, { color: colors.primary }]}>ENTRETIEN · 3 MIN</Text><Text style={[styles.taskPlant, { color: colors.muted }]}>{dailyTask.label}</Text></View></View>
            <Text style={[styles.taskTitle, { color: colors.foreground }]}>{taskDone ? dailyTask.doneTitle : dailyTask.title}</Text>
            <Text style={[styles.taskText, { color: colors.muted }]}>{taskDone ? dailyTask.doneText : dailyTask.instruction}</Text>
            <Pressable onPress={completeTask} style={({ pressed }) => [styles.taskButton, { backgroundColor: taskDone ? colors.primary : colors.terracotta }, pressed && styles.pressed]}><Text style={styles.taskButtonText}>{taskDone ? "Geste validé  ✓" : "Marquer comme fait"}</Text></Pressable>
            {taskDone && <PopIn delay={40} style={[styles.impactPill, { backgroundColor: colors.leaf }]}><Text style={[styles.impactPillText, { color: colors.primary }]}>✦ +4 impact éco</Text></PopIn>}
          </LinearGradient>
        </PopIn>

        <FadeIn delay={230}>
          <View style={[styles.impactCard, { backgroundColor: colors.foreground }]}><View style={styles.impactTop}><View><Text style={styles.impactLabel}>IMPACT ÉCO</Text><Text style={styles.impactTitle}>Ton balcon respire avec toi.</Text></View><Text style={[styles.impactScore, { color: colors.sun }]}>{impact}<Text style={styles.impactOutOf}>/100</Text></Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${impact}%`, backgroundColor: colors.sun }]} /></View><Text style={styles.impactCaption}>{taskDone ? "Niveau suivant : plus que 32 points" : "Valide un geste pour gagner 4 points"}</Text></View>
        </FadeIn>

        {profileLoaded && <FadeIn delay={280}>
          <View style={styles.recommendationHeader}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>POUR TON BALCON</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes idées adaptées</Text></View><Text style={[styles.recommendationCount, { color: colors.primary }]}>3 PLANTES</Text></View>
          <Text style={[styles.recommendationIntro, { color: colors.muted }]}>{onboardingProfile && !onboardingProfile.skipped ? "Selon tes réponses d'arrivée, voici par quoi commencer." : "Des plantes faciles pour faire pousser tes premières habitudes."}</Text>
          <View style={styles.recommendationList}>{recommendations.map((plant, index) => <View key={`${plant.name}-${index}`} style={[styles.recommendationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.recommendationEmoji, { backgroundColor: colors.leaf }]}><Text style={styles.recommendationEmojiText}>{plant.emoji}</Text></View><View style={styles.recommendationCopy}><Text style={[styles.recommendationName, { color: colors.foreground }]}>{plant.name}</Text><Text style={[styles.recommendationReason, { color: colors.muted }]}>{plant.reason}</Text><Text style={[styles.recommendationEffort, { color: colors.primary }]}>{plant.effort}</Text></View><Pressable onPress={() => replaceRecommendation(index)} style={({ pressed }) => [styles.changeButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.changeButtonText, { color: colors.primary }]}>↻ Changer</Text></Pressable></View>)}</View>
        </FadeIn>}

        {historyLoaded && <FadeIn delay={320}>
          <View style={styles.recommendationHeader}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>SUIVI DES GESTES</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historique d’entretien</Text></View><Text style={[styles.recommendationCount, { color: colors.primary }]}>{Object.values(taskHistory).reduce((total, entries) => total + entries.length, 0)} GESTES</Text></View>
          <Text style={[styles.recommendationIntro, { color: colors.muted }]}>Chaque petite action compte. Retrouve les soins réalisés plante par plante.</Text>
          <View style={styles.historyList}>{recommendations.map((plant) => { const entries = taskHistory[plant.name] ?? []; const latest = entries[0]; return <View key={`history-${plant.name}`} style={[styles.historyCard, { backgroundColor: colors.cream }]}><View style={[styles.historyEmoji, { backgroundColor: colors.leaf }]}><Text style={styles.recommendationEmojiText}>{plant.emoji}</Text></View><View style={styles.recommendationCopy}><Text style={[styles.recommendationName, { color: colors.foreground }]}>{plant.name}</Text><Text style={[styles.historyMeta, { color: colors.muted }]}>{entries.length > 0 ? `${entries.length} geste${entries.length > 1 ? "s" : ""} · dernier : ${formatHistoryDate(latest.date)}` : "Aucun geste enregistré pour le moment"}</Text>{latest && <Text numberOfLines={1} style={[styles.historyTask, { color: colors.primary }]}>{latest.task}</Text>}</View><Text style={[styles.historyCheck, { color: entries.length > 0 ? colors.success : colors.muted }]}>{entries.length > 0 ? "✓" : "·"}</Text></View>; })}</View>
        </FadeIn>}

        <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ton balcon</Text><Text style={[styles.link, { color: colors.primary }]}>Tout voir  ›</Text></View>
        <View style={styles.plantsRow}><View style={[styles.plantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.plantTop}><Text style={styles.plantEmoji}>🍅</Text><Text style={[styles.plantStatus, { color: colors.success }]}>EN FORME</Text></View><Text style={[styles.plantName, { color: colors.foreground }]}>Tomates cerises</Text><Text style={[styles.plantMeta, { color: colors.muted }]}>Floraison · 68%</Text><View style={[styles.miniTrack, { backgroundColor: colors.leaf }]}><View style={[styles.miniFill, { width: "68%", backgroundColor: colors.success }]} /></View></View><View style={[styles.plantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.plantTop}><Text style={styles.plantEmoji}>🌿</Text><Text style={[styles.plantStatus, { color: colors.terracotta }]}>À SURVEILLER</Text></View><Text style={[styles.plantName, { color: colors.foreground }]}>Menthe</Text><Text style={[styles.plantMeta, { color: colors.muted }]}>Dernier soin · hier</Text><View style={[styles.miniTrack, { backgroundColor: colors.leaf }]}><View style={[styles.miniFill, { width: "84%", backgroundColor: colors.terracotta }]} /></View></View></View>

        <View style={[styles.noteCard, { backgroundColor: colors.cream }]}><Text style={[styles.noteMark, { color: colors.terracotta }]}>✦</Text><View style={{ flex: 1 }}><Text style={[styles.noteLabel, { color: colors.primary }]}>NOTE DE NORA</Text><Text style={[styles.noteText, { color: colors.foreground }]}>L’eau de cuisson refroidie est un bon coup de pouce pour tes plantes.</Text></View><Text style={[styles.noteArrow, { color: colors.terracotta }]}>›</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 28, gap: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  overline: { fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  title: { fontSize: 25, fontWeight: "800", letterSpacing: -0.8, marginTop: 5 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  hero: { borderRadius: 26, padding: 19, minHeight: 184, overflow: "hidden" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLabel: { color: "rgba(255,255,255,0.65)", fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  weatherPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 },
  weatherPillText: { color: "#D5E96B", fontSize: 10, fontWeight: "800" },
  heroTitle: { color: "#FFF", fontSize: 27, lineHeight: 29, fontWeight: "800", letterSpacing: -0.7, marginTop: 23 },
  heroMeta: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 9 },
  heroBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 19 },
  heroDate: { color: "rgba(255,255,255,0.45)", fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  heroArrow: { color: "#D5E96B", fontSize: 25 },
  reminderWrapper: { marginTop: -2 },
  reminderSettingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 4, marginTop: 8 },
  reminderSettingsText: { flex: 1, fontSize: 11, lineHeight: 16 },
  reminderSettingsButton: { borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 },
  reminderSettingsButtonText: { fontSize: 11, fontWeight: "800" },
  sectionRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionOverline: { fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, marginTop: 3 },
  countPill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  countText: { fontSize: 10, fontWeight: "800" },
  taskCard: { borderRadius: 24, padding: 18, shadowColor: "#9A765C", shadowOpacity: 0.08, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  taskNumber: { width: 41, height: 41, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  taskNumberText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  taskType: { gap: 3 },
  taskTypeText: { fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  taskPlant: { fontSize: 10, letterSpacing: 0.4, fontWeight: "700" },
  taskTitle: { fontSize: 22, lineHeight: 27, fontWeight: "800", marginTop: 18, letterSpacing: -0.5 },
  taskText: { fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 310 },
  taskButton: { alignSelf: "flex-start", borderRadius: 13, paddingHorizontal: 15, paddingVertical: 11, marginTop: 16 },
  taskButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  impactPill: { alignSelf: "flex-start", borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, marginTop: 10 },
  impactPillText: { fontSize: 10, fontWeight: "800" },
  impactCard: { borderRadius: 22, padding: 18 },
  impactTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  impactLabel: { color: "rgba(255,255,255,0.55)", fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  impactTitle: { color: "#FFF", fontSize: 14, fontWeight: "700", marginTop: 4 },
  impactScore: { fontSize: 29, fontWeight: "800" },
  impactOutOf: { color: "rgba(255,255,255,0.55)", fontSize: 10 },
  progressTrack: { height: 8, borderRadius: 5, marginTop: 16, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 5 },
  impactCaption: { color: "rgba(255,255,255,0.62)", fontSize: 10, marginTop: 9 },
  recommendationHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  recommendationCount: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginBottom: 2 },
  recommendationIntro: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  recommendationList: { gap: 8, marginTop: 10 },
  recommendationCard: { borderRadius: 18, borderWidth: 1, padding: 11, flexDirection: "row", alignItems: "center", gap: 11 },
  recommendationEmoji: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  recommendationEmojiText: { fontSize: 22 },
  recommendationCopy: { flex: 1 },
  recommendationName: { fontSize: 13, fontWeight: "800" },
  recommendationReason: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  recommendationEffort: { fontSize: 9, fontWeight: "800", marginTop: 4, letterSpacing: 0.4 },
  changeButton: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  changeButtonText: { fontSize: 9, fontWeight: "800" },
  recommendationArrow: { fontSize: 25, fontWeight: "300" },
  historyList: { gap: 8, marginTop: 10 },
  historyCard: { borderRadius: 18, padding: 11, flexDirection: "row", alignItems: "center", gap: 11 },
  historyEmoji: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  historyMeta: { fontSize: 10, marginTop: 4 },
  historyTask: { fontSize: 9, fontWeight: "800", marginTop: 4 },
  historyCheck: { fontSize: 20, fontWeight: "900", width: 20, textAlign: "center" },
  link: { fontSize: 11, fontWeight: "800", marginBottom: 2 },
  plantsRow: { flexDirection: "row", gap: 11 },
  plantCard: { flex: 1, borderRadius: 19, borderWidth: 1, padding: 14 },
  plantTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  plantEmoji: { fontSize: 30 },
  plantStatus: { fontSize: 8, fontWeight: "800", letterSpacing: 0.6 },
  plantName: { fontSize: 13, fontWeight: "800", marginTop: 13 },
  plantMeta: { fontSize: 10, marginTop: 4 },
  miniTrack: { height: 5, borderRadius: 3, marginTop: 13, overflow: "hidden" },
  miniFill: { height: 5, borderRadius: 3 },
  noteCard: { borderRadius: 19, padding: 15, flexDirection: "row", alignItems: "center", gap: 11 },
  noteMark: { fontSize: 23 },
  noteLabel: { fontSize: 9, letterSpacing: 0.9, fontWeight: "800" },
  noteText: { fontSize: 12, lineHeight: 17, fontWeight: "600", marginTop: 4 },
  noteArrow: { fontSize: 27, fontWeight: "300" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
