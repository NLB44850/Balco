import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ContextualReminderCard } from "@/components/contextual-reminder-card";
import { GroupedReminderCard } from "@/components/grouped-reminder-card";
import { FadeIn, PopIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalWeather } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import {
  POINTS_PER_GESTURE,
  buildDailySession,
  careProfileFor,
  computeBadges,
  computeProgress,
  computeStats,
  dailyTip,
  dayKey,
  eventForSessionTask,
  eventsForPlant,
  formatLongDate,
  gardenDay,
  greeting,
  initials,
  plantDisplayName,
  plantStatus,
  relativeDay,
  seasonName,
  type SessionTask,
} from "@/lib/garden/garden-logic";
import { effortLabel, recommendPlants } from "@/lib/plants/catalog";
import { decideReminders, type ReminderDecision } from "@/lib/reminders/reminder-engine";
import {
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  saveLocalReminderSettings,
  scheduleLocalReminder,
  subscribeReminderSettings,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";

const TASK_TYPE_LABELS: Record<string, string> = { watering: "ARROSAGE", observation: "OBSERVATION", pruning: "ENTRETIEN", protection: "PROTECTION", harvest: "RÉCOLTE" };

function reminderKey(decisions: ReminderDecision[]) {
  return decisions.map((decision) => `${decision.plantId}:${decision.taskType}:${decision.validUntil}`).join("|");
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { loaded, resolvedPlants, events, profile, onboarding, addPlant, logEvent, removeEvent, reportLocation } = useGarden();
  const [now, setNow] = useState(() => new Date());
  const [skippedRecommendations, setSkippedRecommendations] = useState<string[]>([]);
  const [dismissedReminderKey, setDismissedReminderKey] = useState<string | null>(null);
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [reminderSettingsLoaded, setReminderSettingsLoaded] = useState(false);
  const [isSchedulingReminder, setIsSchedulingReminder] = useState(false);
  const { weather, weatherSnapshot, isLoading, refresh } = useLocalWeather();

  // Recharge l'heure et les réglages (modifiables depuis le profil) à chaque retour sur l'écran.
  useFocusEffect(useCallback(() => {
    setNow(new Date());
    let active = true;
    loadLocalReminderSettings().then((settings) => {
      if (!active) return;
      setReminderSettings(settings);
      setReminderSettingsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []));

  // Réglages modifiés depuis le profil ou un autre appareil.
  useEffect(() => subscribeReminderSettings((settings) => setReminderSettings(settings)), []);

  // Le serveur a besoin de la vraie position pour les rappels app fermée ; jamais de la ville de repli.
  useEffect(() => {
    if (weather.isFallback) return;
    reportLocation({ city: weather.city, latitude: weather.latitude, longitude: weather.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" });
  }, [reportLocation, weather.city, weather.isFallback, weather.latitude, weather.longitude]);

  const session = useMemo(() => buildDailySession(resolvedPlants, events, now), [events, now, resolvedPlants]);
  const doneCount = session.filter((item) => item.done).length;
  const stats = useMemo(() => computeStats(resolvedPlants, events, now), [events, now, resolvedPlants]);
  const progress = useMemo(() => computeProgress(stats, computeBadges(stats)), [stats]);
  const day = gardenDay(resolvedPlants.map(({ plant }) => plant), now);

  const ownedCatalogIds = useMemo(() => resolvedPlants.map(({ entry }) => entry.id), [resolvedPlants]);
  const recommendationPool = useMemo(() => recommendPlants(onboarding, { exclude: ownedCatalogIds, month: now.getMonth() + 1 }), [now, onboarding, ownedCatalogIds]);
  const recommendations = useMemo(() => {
    const available = recommendationPool.filter((entry) => !skippedRecommendations.includes(entry.id));
    return (available.length >= 3 ? available : recommendationPool).slice(0, 3);
  }, [recommendationPool, skippedRecommendations]);

  const reminderPlants = useMemo(
    () => resolvedPlants.filter(({ plant }) => reminderSettings.enabledPlantIds.length === 0 || reminderSettings.enabledPlantIds.includes(plant.id)),
    [reminderSettings.enabledPlantIds, resolvedPlants],
  );
  const reminderDecisions = useMemo(() => {
    if (!reminderSettingsLoaded || weather.isFallback) return [];
    const settings = { enabled: reminderSettings.enabled, skipWateringWhenRainExpected: reminderSettings.skipWateringWhenRainExpected, maxNormalRemindersPerDay: reminderSettings.maxNormalRemindersPerDay };
    const decisions = decideReminders(reminderPlants.map((resolved) => ({ plant: careProfileFor(resolved), history: events, weather: weatherSnapshot, settings })));
    // Toutes les alertes urgentes, puis au plus N conseils normaux (cf. spec §6).
    const normal = decisions.filter((decision) => decision.priority === "normal").slice(0, reminderSettings.maxNormalRemindersPerDay);
    return [...decisions.filter((decision) => decision.priority !== "normal"), ...normal];
  }, [events, reminderPlants, reminderSettings, reminderSettingsLoaded, weather.isFallback, weatherSnapshot]);
  const visibleReminders = reminderKey(reminderDecisions) !== dismissedReminderKey ? reminderDecisions : [];
  const topDecision = reminderDecisions[0] ?? null;

  useEffect(() => {
    if (!reminderSettingsLoaded || !reminderSettings.enabled || !topDecision) return;
    void scheduleLocalReminder(topDecision, reminderSettings);
  }, [reminderSettings, reminderSettingsLoaded, topDecision]);

  const toggleSessionTask = async (item: SessionTask) => {
    if (item.done) await removeEvent(item.eventId);
    else await logEvent(eventForSessionTask(item, new Date()));
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const completeReminder = async (decision: ReminderDecision) => {
    await logEvent({
      id: `reminder:${decision.plantId}:${decision.taskType}:${dayKey(new Date())}`,
      plantId: decision.plantId,
      // Suivre un « pas besoin d'arroser » compte comme une observation, pas comme un arrosage.
      type: decision.action === "skip" ? "observation" : decision.taskType,
      completedAt: new Date().toISOString(),
      source: "reminder",
      note: decision.title,
    });
    setDismissedReminderKey(reminderKey(reminderDecisions));
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const dismissReminder = () => setDismissedReminderKey(reminderKey(reminderDecisions));

  const activateReminders = async () => {
    if (!topDecision) return;
    setIsSchedulingReminder(true);
    const nextSettings = { ...reminderSettings, enabled: true };
    setReminderSettings(nextSettings);
    await saveLocalReminderSettings(nextSettings);
    await scheduleLocalReminder(topDecision, nextSettings);
    setIsSchedulingReminder(false);
  };

  const replaceRecommendation = (catalogId: string) => {
    setSkippedRecommendations((current) => (current.length + 3 >= recommendationPool.length ? [catalogId] : [...current, catalogId]));
  };

  const addRecommendation = async (catalogId: string) => {
    await addPlant(catalogId);
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const userInitials = initials(profile.firstName);
  const season = seasonName(now).toUpperCase();

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={[styles.overline, { color: colors.muted }]}>{formatLongDate(now)} · {weather.city.toUpperCase()}</Text><Text style={[styles.title, { color: colors.foreground }]}>{greeting(profile.firstName)} <Text style={{ color: colors.terracotta }}>✳</Text></Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mon profil" onPress={() => router.push("/(tabs)/profile")} style={({ pressed }) => [styles.avatar, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={userInitials ? styles.avatarText : styles.avatarEmoji}>{userInitials ?? "🌱"}</Text></Pressable>
        </View>

        <FadeIn delay={80}>
          <LinearGradient colors={[colors.foreground, "#2F644B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}><Text style={styles.heroLabel}>{isLoading ? "MÉTÉO LOCALE · CHARGEMENT" : "TON POTAGER AUJOURD'HUI"}</Text><Pressable onPress={() => void refresh()} style={[styles.weatherPill, { backgroundColor: "rgba(255,255,255,0.14)" }]}><Text style={styles.weatherPillText}>{weather.isDay ? "☀" : "☾"} {Math.round(weather.temperature)}°C</Text></Pressable></View>
            <Text style={styles.heroTitle}>Une petite session.{`\n`}Un balcon qui grandit.</Text>
            <Text style={styles.heroMeta}>{weather.summary} · {session.length > 0 ? `${session.length} geste${session.length > 1 ? "s" : ""} simple${session.length > 1 ? "s" : ""} pour aujourd’hui.` : "ajoute une plante pour recevoir tes gestes du jour."}</Text>
            <View style={styles.heroBottom}><Text style={styles.heroDate}>{day ? `${season} · JOUR ${String(day).padStart(2, "0")}` : season}</Text><Text style={styles.heroArrow}>↗</Text></View>
          </LinearGradient>
        </FadeIn>

        {visibleReminders.length > 0 && <FadeIn delay={120} style={styles.reminderWrapper}>
          {visibleReminders.length > 1 ? <GroupedReminderCard decisions={visibleReminders} onComplete={(decision) => void completeReminder(decision)} onDismiss={dismissReminder} /> : <ContextualReminderCard decision={visibleReminders[0]} onComplete={(decision) => void completeReminder(decision)} onDismiss={dismissReminder} />}
          <View style={styles.reminderSettingsRow}>
            <Text style={[styles.reminderSettingsText, { color: colors.muted }]}>
              {reminderSettings.enabled ? `Rappel local actif à ${String(reminderSettings.preferredHour).padStart(2, "0")} h ${String(reminderSettings.preferredMinute).padStart(2, "0")}` : "Recevoir ce conseil au bon moment"}
            </Text>
            {!reminderSettings.enabled && <Pressable onPress={() => void activateReminders()} disabled={isSchedulingReminder} style={({ pressed }) => [styles.reminderSettingsButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}>
              <Text style={[styles.reminderSettingsButtonText, { color: colors.primary }]}>{isSchedulingReminder ? "Activation…" : "Activer"}</Text>
            </Pressable>}
          </View>
        </FadeIn>}

        <View style={styles.sectionRow}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>SESSION DU JOUR</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Les gestes les plus utiles</Text></View>{session.length > 0 && <View style={[styles.countPill, { backgroundColor: colors.sun }]}><Text style={[styles.countText, { color: colors.foreground }]}>{String(doneCount).padStart(2, "0")} / {String(session.length).padStart(2, "0")}</Text></View>}</View>

        {loaded && session.length === 0 && (
          <PopIn delay={140}>
            <LinearGradient colors={[colors.surface, colors.cream]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.taskCard}>
              <View style={styles.taskHeader}><View style={[styles.taskNumber, { backgroundColor: colors.terracotta }]}><Text style={styles.taskNumberText}>01</Text></View><View style={styles.taskType}><Text style={[styles.taskTypeText, { color: colors.primary }]}>POUR COMMENCER · 1 MIN</Text><Text style={[styles.taskPlant, { color: colors.muted }]}>TON BALCON</Text></View></View>
              <Text style={[styles.taskTitle, { color: colors.foreground }]}>{resolvedPlants.length === 0 ? "Ajoute ta première plante." : "Rien à faire aujourd’hui."}</Text>
              <Text style={[styles.taskText, { color: colors.muted }]}>{resolvedPlants.length === 0 ? "Choisis parmi les idées ci-dessous ou dans le catalogue : Balco te proposera chaque jour le geste utile pour chacune." : "Tes plantes sont au repos ce mois-ci. Profite-en pour regarder le calendrier et préparer la suite."}</Text>
              <Pressable onPress={() => router.push(resolvedPlants.length === 0 ? "/garden/add" : "/(tabs)/calendar")} style={({ pressed }) => [styles.taskButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={styles.taskButtonText}>{resolvedPlants.length === 0 ? "Ouvrir le catalogue" : "Voir le calendrier"}</Text></Pressable>
            </LinearGradient>
          </PopIn>
        )}

        {session.map((item, index) => {
          const { task, done } = item;
          return (
            <PopIn key={item.eventId} delay={140 + index * 50}>
              <LinearGradient colors={done ? [colors.leaf, "#F4F6E8"] : [colors.surface, colors.cream]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.taskCard}>
                <View style={styles.taskHeader}><View style={[styles.taskNumber, { backgroundColor: done ? colors.success : colors.terracotta }]}><Text style={styles.taskNumberText}>{done ? "✓" : String(index + 1).padStart(2, "0")}</Text></View><View style={styles.taskType}><Text style={[styles.taskTypeText, { color: colors.primary }]}>{TASK_TYPE_LABELS[task.type]} · {task.minutes} MIN</Text><Text style={[styles.taskPlant, { color: colors.muted }]}>{item.resolved.entry.emoji} {plantDisplayName(item.resolved).toUpperCase()}</Text></View></View>
                <Text style={[styles.taskTitle, { color: colors.foreground }]}>{done ? task.doneTitle : task.title}</Text>
                <Text style={[styles.taskText, { color: colors.muted }]}>{done ? task.doneText : task.instruction}</Text>
                <Pressable onPress={() => void toggleSessionTask(item)} style={({ pressed }) => [styles.taskButton, { backgroundColor: done ? colors.primary : colors.terracotta }, pressed && styles.pressed]}><Text style={styles.taskButtonText}>{done ? "Geste validé  ✓" : "Marquer comme fait"}</Text></Pressable>
                {done && <PopIn delay={40} style={[styles.impactPill, { backgroundColor: colors.leaf }]}><Text style={[styles.impactPillText, { color: colors.primary }]}>✦ +{POINTS_PER_GESTURE} points</Text></PopIn>}
              </LinearGradient>
            </PopIn>
          );
        })}

        <FadeIn delay={230}>
          <View style={[styles.impactCard, { backgroundColor: colors.foreground }]}><View style={styles.impactTop}><View><Text style={styles.impactLabel}>NIVEAU {progress.level} · {progress.levelTitle.toUpperCase()}</Text><Text style={styles.impactTitle}>Ton balcon respire avec toi.</Text></View><Text style={[styles.impactScore, { color: colors.sun }]}>{progress.pointsInLevel}<Text style={styles.impactOutOf}>/100</Text></Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(progress.pointsInLevel, 2)}%`, backgroundColor: colors.sun }]} /></View><Text style={styles.impactCaption}>{`Plus que ${progress.pointsToNext} points avant le niveau ${progress.level + 1} · +${POINTS_PER_GESTURE} par geste validé`}</Text></View>
        </FadeIn>

        {loaded && resolvedPlants.length > 0 && <FadeIn delay={260}>
          <View style={styles.sectionRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ton balcon</Text><Pressable onPress={() => router.push("/garden")}><Text style={[styles.link, { color: colors.primary }]}>Tout voir ({resolvedPlants.length})  ›</Text></Pressable></View>
          <View style={[styles.plantsRow, { marginTop: 10 }]}>{resolvedPlants.slice(0, 2).map((resolved) => {
            const status = plantStatus(resolved, events, now);
            const tone = status.tone === "watch" ? colors.terracotta : status.tone === "good" ? colors.success : colors.muted;
            return <Pressable key={resolved.plant.id} onPress={() => router.push({ pathname: "/garden/[id]", params: { id: resolved.plant.id } })} style={({ pressed }) => [styles.plantCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={styles.plantTop}><Text style={styles.plantEmoji}>{resolved.entry.emoji}</Text><Text style={[styles.plantStatus, { color: tone }]}>{status.label}</Text></View><Text style={[styles.plantName, { color: colors.foreground }]}>{plantDisplayName(resolved)}</Text><Text style={[styles.plantMeta, { color: colors.muted }]}>{status.meta}</Text><View style={[styles.miniTrack, { backgroundColor: colors.leaf }]}><View style={[styles.miniFill, { width: `${Math.round(status.freshness * 100)}%`, backgroundColor: tone }]} /></View></Pressable>;
          })}</View>
        </FadeIn>}

        {loaded && recommendations.length > 0 && <FadeIn delay={280}>
          <View style={styles.recommendationHeader}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>POUR TON BALCON</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes idées adaptées</Text></View><Pressable onPress={() => router.push("/garden/add")}><Text style={[styles.recommendationCount, { color: colors.primary }]}>CATALOGUE  ›</Text></Pressable></View>
          <Text style={[styles.recommendationIntro, { color: colors.muted }]}>{onboarding && !onboarding.skipped ? "Selon tes réponses d'arrivée et la saison, voici par quoi continuer." : "Des plantes faciles pour faire pousser tes premières habitudes."}</Text>
          <View style={styles.recommendationList}>{recommendations.map((entry) => <View key={entry.id} style={[styles.recommendationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.recommendationEmoji, { backgroundColor: colors.leaf }]}><Text style={styles.recommendationEmojiText}>{entry.emoji}</Text></View><View style={styles.recommendationCopy}><Text style={[styles.recommendationName, { color: colors.foreground }]}>{entry.name}</Text><Text style={[styles.recommendationReason, { color: colors.muted }]}>{entry.pitch}</Text><Text style={[styles.recommendationEffort, { color: colors.primary }]}>{effortLabel(entry)}</Text></View><View style={styles.recommendationActions}><Pressable onPress={() => void addRecommendation(entry.id)} style={({ pressed }) => [styles.changeButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={[styles.changeButtonText, { color: "#FFFFFF" }]}>+ Ajouter</Text></Pressable><Pressable onPress={() => replaceRecommendation(entry.id)} style={({ pressed }) => [styles.changeButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.changeButtonText, { color: colors.primary }]}>↻ Changer</Text></Pressable></View></View>)}</View>
        </FadeIn>}

        {loaded && resolvedPlants.length > 0 && <FadeIn delay={320}>
          <View style={styles.recommendationHeader}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>SUIVI DES GESTES</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historique d’entretien</Text></View><Text style={[styles.recommendationCount, { color: colors.primary }]}>{stats.gestures} GESTE{stats.gestures > 1 ? "S" : ""}</Text></View>
          <Text style={[styles.recommendationIntro, { color: colors.muted }]}>Chaque petite action compte. Retrouve les soins réalisés plante par plante.</Text>
          <View style={styles.historyList}>{resolvedPlants.map((resolved) => { const entries = eventsForPlant(events, resolved.plant.id); const latest = entries[0]; return <View key={`history-${resolved.plant.id}`} style={[styles.historyCard, { backgroundColor: colors.cream }]}><View style={[styles.historyEmoji, { backgroundColor: colors.leaf }]}><Text style={styles.recommendationEmojiText}>{resolved.entry.emoji}</Text></View><View style={styles.recommendationCopy}><Text style={[styles.recommendationName, { color: colors.foreground }]}>{plantDisplayName(resolved)}</Text><Text style={[styles.historyMeta, { color: colors.muted }]}>{entries.length > 0 ? `${entries.length} geste${entries.length > 1 ? "s" : ""} · dernier : ${relativeDay(new Date(latest.completedAt), now)}` : "Aucun geste enregistré pour le moment"}</Text>{latest?.note && <Text numberOfLines={1} style={[styles.historyTask, { color: colors.primary }]}>{latest.note}</Text>}</View><Text style={[styles.historyCheck, { color: entries.length > 0 ? colors.success : colors.muted }]}>{entries.length > 0 ? "✓" : "·"}</Text></View>; })}</View>
        </FadeIn>}

        <View style={[styles.noteCard, { backgroundColor: colors.cream }]}><Text style={[styles.noteMark, { color: colors.terracotta }]}>✦</Text><View style={{ flex: 1 }}><Text style={[styles.noteLabel, { color: colors.primary }]}>ASTUCE DU JOUR</Text><Text style={[styles.noteText, { color: colors.foreground }]}>{dailyTip(now)}</Text></View></View>
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
  avatarEmoji: { fontSize: 18 },
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
  taskCard: { marginTop: -6, borderRadius: 24, padding: 18, shadowColor: "#9A765C", shadowOpacity: 0.08, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
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
  recommendationActions: { gap: 6 },
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
