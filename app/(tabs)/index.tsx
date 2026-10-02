import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FadeIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BALCONY_FLOOR_HEIGHT, BalconySky } from "@/components/today/balcony-sky";
import { CatalogPicture, PlantPicture } from "@/components/plant-picture";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { TODAY_ROW_PICTURE, TodayRow } from "@/components/today/today-row";
import { useCelebration } from "@/components/today/celebration";
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { useLocalWeather } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";
import { useVacation } from "@/hooks/use-vacation";
import { useWeatherSimulation } from "@/hooks/use-weather-simulation";
import { setPendingPhoto } from "@/lib/ai/pending-photo";
import { pickPlantPhoto } from "@/lib/ai/photo";
import { useGarden } from "@/lib/garden/garden-context";
import { trpc } from "@/lib/trpc";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { celebrationFor, formatLiters, litersPerWatering } from "@/lib/garden/progress";
import { awayOn, preparationSteps, vacationRange, vacationState } from "@/lib/garden/vacation";
import {
  POINTS_PER_GESTURE,
  buildDailySession,
  dayKey,
  careProfileFor,
  eventForSessionTask,
  plantDisplayName,
  plantStatus,
  streakDays,
} from "@/lib/garden/garden-logic";
import { potsFor, skyScene } from "@/lib/garden/sky";
import { publishSky } from "@/lib/garden/sky-store";
import { balconyStatus, buildTodayList, doneSubtitle, type TodayItem } from "@/lib/garden/today";
import { notificationsUnavailableReason } from "@/lib/notifications/module";
import { eventForActivity, seasonalToDo } from "@/lib/plants/calendar";
import { PLANT_CATALOG, recommendPlants } from "@/lib/plants/catalog";
import { seasonalSuggestions, type SeasonalSuggestion } from "@/lib/plants/suggestions";
import { climateZoneFor } from "@/lib/plants/climate";
import { addSnooze, eventForReminder, planGroupedNotification, withoutSnoozed, type ReminderSnooze } from "@/lib/reminders/reminder-actions";
import { decideReminders, type MaintenanceEvent } from "@/lib/reminders/reminder-engine";
import { groupReminders, selectGroups, type ReminderGroup } from "@/lib/reminders/reminder-groups";
import {
  cancelBalcoReminderNotifications,
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  loadReminderSnoozes,
  saveLocalReminderSettings,
  saveReminderSnoozes,
  scheduleLocalReminder,
  sendReminderPreview,
  subscribeReminderSettings,
  subscribeReminderSnoozes,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";
import { scenarioLabel } from "@/lib/weather/simulation";

const haptic = () => {
  if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Accueil « Aujourd'hui » : une seule question, que faire maintenant ?
 * L'état du balcon, puis une liste de gestes à cocher en une touche (alertes météo, gestes du jour,
 * gestes de saison), le détail dans une feuille qui monte du bas, et un message avec « Annuler ».
 */
export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { loaded, resolvedPlants, events, onboarding, account, addPlant, removePlant, logEvent, removeEvent, reportLocation } = useGarden();
  const aiStatus = trpc.ai.status.useQuery(undefined, { enabled: account.signedIn, retry: false });
  const { vacation } = useVacation();

  /**
   * Le bouton appareil photo : la photo se prend tout de suite, puis Observer l'affiche prête à
   * analyser. Sans compte, sans analyse restante ou si le service manque, on ouvre simplement
   * Observer, qui explique pourquoi.
   */
  const observe = async () => {
    const status = aiStatus.data;
    const canScan = account.signedIn && status?.available !== false && (status?.scan.remaining ?? 1) > 0;
    if (canScan) {
      try {
        const result = await pickPlantPhoto("camera");
        if (result.status === "canceled") return;
        if (result.status === "ok") setPendingPhoto(result.photo);
      } catch {
        // Photo illisible : Observer s'ouvre quand même, pour en choisir une autre.
      }
    }
    router.push("/(tabs)/scanner");
  };
  const { covers } = usePlantPhotos();
  const [now, setNow] = useState(() => new Date());
  const [snoozes, setSnoozes] = useState<ReminderSnooze[]>([]);
  const [snoozesLoaded, setSnoozesLoaded] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [reminderSettingsLoaded, setReminderSettingsLoaded] = useState(false);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const { celebrate, overlay: celebration } = useCelebration();
  const { weather, weatherSnapshot } = useLocalWeather();
  const simulation = useWeatherSimulation();
  const insets = useSafeAreaInsets();
  const sky = useMemo(() => skyScene(weatherSnapshot, now, weather.isFallback), [now, weather.isFallback, weatherSnapshot]);
  const pots = useMemo(() => potsFor(resolvedPlants.map((resolved) => resolved.entry.category)), [resolvedPlants]);
  const scrollY = useRef(new Animated.Value(0)).current;
  // Les autres onglets reprennent cette lumière pour leur fond.
  useEffect(() => publishSky(sky), [sky]);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "sent" | "denied">("idle");
  useEffect(() => setPreviewStatus("idle"), [simulation.scenario]);

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

  // Rappels mis en sommeil, ici ou depuis les boutons d'une notification.
  useEffect(() => {
    void loadReminderSnoozes().then((stored) => {
      setSnoozes(stored);
      setSnoozesLoaded(true);
    });
    return subscribeReminderSnoozes(setSnoozes);
  }, []);

  // Le serveur a besoin de la vraie position pour les rappels app fermée ; jamais de la ville de repli.
  useEffect(() => {
    if (weather.isFallback) return;
    reportLocation({ city: weather.city, latitude: weather.latitude, longitude: weather.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" });
  }, [reportLocation, weather.city, weather.isFallback, weather.latitude, weather.longitude]);

  const session = useMemo(() => buildDailySession(resolvedPlants, events, now), [events, now, resolvedPlants]);
  const climate = useMemo(() => (weather.isFallback ? null : climateZoneFor(weather.latitude, weather.longitude, weatherSnapshot.elevationM)), [weather.isFallback, weather.latitude, weather.longitude, weatherSnapshot.elevationM]);
  // Gestes de saison du calendrier (semer, planter, rempoter) pas encore notés ce mois-ci.
  const seasonal = useMemo(
    () => seasonalToDo(resolvedPlants.map((resolved) => ({ id: resolved.plant.id, entry: resolved.entry, displayName: plantDisplayName(resolved) })), events, now, { climate }),
    [climate, events, now, resolvedPlants],
  );
  // Idée du mois : une plante à semer ou planter maintenant, adaptée au balcon, qu'on n'a pas encore.
  const monthIdea = useMemo(
    () => (resolvedPlants.length === 0 ? null : seasonalSuggestions(onboarding, { month: now.getMonth() + 1, climate, ownedCatalogIds: resolvedPlants.map((resolved) => resolved.entry.id), limit: 1 })[0] ?? null),
    [climate, now, onboarding, resolvedPlants],
  );

  const reminderPlants = useMemo(
    () => resolvedPlants.filter(({ plant }) => reminderSettings.enabledPlantIds.length === 0 || reminderSettings.enabledPlantIds.includes(plant.id)),
    [reminderSettings.enabledPlantIds, resolvedPlants],
  );
  const reminderDecisions = useMemo(() => {
    if (!reminderSettingsLoaded || weather.isFallback) return [];
    // La liste du jour montre toujours les conseils ; « rappels activés » ne décide que des notifications.
    const settings = { enabled: true, skipWateringWhenRainExpected: reminderSettings.skipWateringWhenRainExpected, maxNormalRemindersPerDay: reminderSettings.maxNormalRemindersPerDay };
    const decisions = decideReminders(reminderPlants.map((resolved) => ({ plant: careProfileFor(resolved), history: events, weather: weatherSnapshot, settings })));
    // Une alerte par cause météo ; toutes les alertes importantes, puis au plus N conseils ordinaires (cf. spec §6).
    return selectGroups(groupReminders(decisions), reminderSettings.maxNormalRemindersPerDay).flatMap((group) => group.decisions);
  }, [events, reminderPlants, reminderSettings, reminderSettingsLoaded, weather.isFallback, weatherSnapshot]);
  const visibleReminders = useMemo(() => groupReminders(withoutSnoozed(reminderDecisions, snoozes, new Date())), [reminderDecisions, snoozes]);

  // Une seule notification programmée : le prochain conseil utile, à l'heure préférée ou au réveil d'un « Dans 3 h ».
  useEffect(() => {
    if (!reminderSettingsLoaded || !snoozesLoaded || !reminderSettings.enabled || weather.isFallback) return;
    const plan = planGroupedNotification(reminderDecisions, snoozes, reminderSettings, new Date());
    // Mode vacances : aucun rappel pendant l'absence (la notification « Bon retour » est à part).
    if (plan && !awayOn(vacation, dayKey(plan.date))) void scheduleLocalReminder(plan.group, reminderSettings, plan.date);
    else void cancelBalcoReminderNotifications();
  }, [reminderDecisions, reminderSettings, reminderSettingsLoaded, snoozes, snoozesLoaded, vacation, weather.isFallback]);

  const trip = vacationState(vacation, now);
  const away = trip.phase === "away";
  const tripPlan = useMemo(() => (vacation ? preparationSteps(resolvedPlants, vacation, now) : []), [now, resolvedPlants, vacation]);

  const wateredToday = useMemo(() => events.filter((event) => event.type === "watering" && dayKey(new Date(event.completedAt)) === dayKey(now)).map((event) => event.plantId), [events, now]);
  const items = useMemo(() => buildTodayList({ groups: visibleReminders, session, seasonal, decisions: reminderDecisions, wateredToday }), [reminderDecisions, seasonal, session, visibleReminders, wateredToday]);
  const status = useMemo(() => balconyStatus(items, events, now), [events, items, now]);
  const streak = useMemo(() => streakDays(events, now), [events, now]);
  const sheetItem = items.find((item) => item.key === sheetKey) ?? null;
  const recommendations = useMemo(() => (resolvedPlants.length === 0 ? recommendPlants(onboarding, { month: now.getMonth() + 1 }).slice(0, 3) : []), [now, onboarding, resolvedPlants.length]);

  // Couleur du point d'état de chaque plante : alerte en cours, soif, en forme.
  const plantDots = useMemo(() => {
    const dots = new Map<string, string>();
    for (const group of visibleReminders) {
      const color = group.cause === "heat" ? colors.terracotta : group.cause === "thirst" ? colors.warning : colors.frost;
      group.decisions.forEach((decision) => dots.set(decision.plantId, color));
    }
    return dots;
  }, [colors.frost, colors.terracotta, colors.warning, visibleReminders]);

  const showToast = (text: string, onUndo?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, onUndo });
  };
  const hideToast = useCallback(() => setToast(null), []);

  /** Un badge, un niveau, une série ou une première récolte débloqués par ce geste : on le fête. */
  const cheer = (logged: MaintenanceEvent[]) => celebrate(celebrationFor(resolvedPlants, events, [...logged, ...events.filter((event) => !logged.some((item) => item.id === event.id))]));

  const logAll = async (toLog: MaintenanceEvent[]) => {
    for (const event of toLog) await logEvent(event);
    return () => {
      void (async () => {
        for (const event of toLog) await removeEvent(event.id);
      })();
    };
  };

  /** « Fait » sur une alerte : le geste est noté pour chaque plante concernée, et l'alerte se tait jusqu'à demain. */
  const completeAlert = async (group: ReminderGroup) => {
    const previous = snoozes;
    const moment = new Date();
    // « N'arrose pas » suivi : l'arrosage évité est noté, pour compter l'eau économisée dans Ma semaine.
    const skip = group.action === "skip";
    const logged = group.decisions.map((decision) => eventForReminder(decision, moment));
    const undoEvents = await logAll(logged);
    await saveReminderSnoozes(group.decisions.reduce((current, decision) => addSnooze(current, decision, "skip", reminderSettings, moment), snoozes));
    haptic();
    const liters = group.decisions.reduce((total, decision) => {
      const resolved = resolvedPlants.find(({ plant }) => plant.id === decision.plantId);
      return total + (resolved ? litersPerWatering(resolved) : 0);
    }, 0);
    const usual = skip ? `Arrosage évité : ≈ ${formatLiters(Math.round(liters * 10) / 10)} d’eau économisés` : `C’est noté · +${POINTS_PER_GESTURE * group.decisions.length} points`;
    cheer(logged);
    showToast(usual, () => {
      undoEvents();
      void saveReminderSnoozes(previous);
    });
  };

  const snoozeAlert = async (group: ReminderGroup, kind: ReminderSnooze["kind"]) => {
    const previous = snoozes;
    const moment = new Date();
    await saveReminderSnoozes(group.decisions.reduce((current, decision) => addSnooze(current, decision, kind, reminderSettings, moment), snoozes));
    showToast(kind === "later" ? "Balco te le rappellera dans 3 h" : "Balco n’en reparlera pas avant demain", () => void saveReminderSnoozes(previous));
  };

  const toggleItem = async (item: TodayItem) => {
    if (item.kind === "alert") return completeAlert(item.group);
    if (item.kind === "season") {
      const logged = [eventForActivity(item.activity, new Date())];
      const undo = await logAll(logged);
      haptic();
      cheer(logged);
      return showToast(`${item.title} : noté pour ce mois-ci`, undo);
    }
    if (item.done) {
      const previous = events.find((event) => event.id === item.task.eventId);
      await removeEvent(item.task.eventId);
      return showToast("Geste retiré de ta journée", previous ? () => void logEvent(previous) : undefined);
    }
    const logged = [eventForSessionTask(item.task, new Date())];
    const undo = await logAll(logged);
    haptic();
    cheer(logged);
    showToast(`${item.title} : noté · +${POINTS_PER_GESTURE} points`, undo);
  };

  const activateReminders = async () => {
    const nextSettings = { ...reminderSettings, enabled: true };
    setReminderSettings(nextSettings);
    await saveLocalReminderSettings(nextSettings);
    const plan = planGroupedNotification(reminderDecisions, snoozes, nextSettings, new Date());
    if (plan && !awayOn(vacation, dayKey(plan.date))) await scheduleLocalReminder(plan.group, nextSettings, plan.date);
    showToast(`Rappels activés : Balco te préviendra vers ${nextSettings.preferredHour} h ${String(nextSettings.preferredMinute).padStart(2, "0")}`);
  };

  const addRecommendation = async (catalogId: string, name: string) => {
    await addPlant(catalogId);
    haptic();
    showToast(`${name} ajouté à ton balcon`);
  };

  const addMonthIdea = async ({ entry }: SeasonalSuggestion) => {
    const created = await addPlant(entry.id);
    haptic();
    showToast(`Ajouté à ton balcon : ${entry.name}`, () => void removePlant(created.id));
  };

  const closeSheet = () => setSheetKey(null);
  const evening = now.getHours() >= 17;
  const metaLine = weather.isFallback
    ? weather.city
    : `${weather.city} · ${Math.round(weatherSnapshot.current.temperatureC)}° maintenant · ${Math.round(weatherSnapshot.today.temperatureMinC)}° au plus bas`;
  const hasPlants = resolvedPlants.length > 0;
  // Un geste de saison pour une plante du balcon : sa photo plutôt que son emoji, quand il y en a une.
  const seasonPicture = (item: TodayItem) => {
    if (item.kind !== "season" || !covers.has(item.activity.subjectId)) return undefined;
    const resolved = resolvedPlants.find(({ plant }) => plant.id === item.activity.subjectId);
    return resolved ? <PlantPicture resolved={resolved} style={TODAY_ROW_PICTURE} /> : undefined;
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      <BalconySky scene={sky} pots={pots} topInset={insets.top} scrollY={scrollY} />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: BALCONY_FLOOR_HEIGHT + 40 }]}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <ScreenHeader
          title="Aujourd’hui"
          subtitle={metaLine}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel="Observer une plante : prendre une photo" hitSlop={6} onPress={() => void observe()} style={({ pressed }) => [glass.card, styles.cameraButton, pressed && styles.pressed]}>
              <IconSymbol name="camera.fill" size={19} color={colors.primary} />
            </Pressable>
          }
          style={{ paddingTop: insets.top + 14, paddingHorizontal: 20 }}
        />

        <View style={styles.body}>

        {simulation.scenario !== "none" && (
          <View style={[styles.simulation, { backgroundColor: colors.surface }]}>
            <Text style={[styles.simulationTitle, { color: colors.foreground }]}>🧪 Simulation : {scenarioLabel(simulation.scenario).toLowerCase()}</Text>
            <Text style={[styles.small, { color: colors.muted }]}>{weather.isFallback ? "La météo réelle n’a pas encore chargé : la simulation s’appliquera dès qu’elle sera là." : reminderDecisions.length === 0 ? "Aucune alerte pour ce scénario : vérifie tes plantes et leurs derniers arrosages." : visibleReminders.length === 0 ? "Alerte simulée déjà traitée aujourd’hui." : "Les alertes ci-dessous sont simulées."}</Text>
            <View style={styles.inlineActions}>
              {notificationsUnavailableReason === null && visibleReminders.length > 0 && (
                <Pressable accessibilityRole="button" onPress={() => void sendReminderPreview(visibleReminders[0]).then((result) => setPreviewStatus(result === "sent" ? "sent" : "denied"))} style={({ pressed }) => [styles.pill, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
                  <Text style={[styles.pillText, { color: colors.background }]}>Me notifier dans 5 s</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={() => void simulation.setScenario("none")} style={({ pressed }) => [styles.pill, { borderColor: colors.border, borderWidth: 1 }, pressed && styles.pressed]}>
                <Text style={[styles.pillText, { color: colors.foreground }]}>Arrêter la simulation</Text>
              </Pressable>
            </View>
            {previewStatus === "sent" && <Text style={[styles.small, { color: colors.muted }]}>Envoyée : verrouille ton téléphone pour la voir arriver.</Text>}
            {previewStatus === "denied" && <Text style={[styles.small, { color: colors.error }]}>Les notifications sont bloquées : autorise-les pour Balco dans les réglages du téléphone.</Text>}
          </View>
        )}

        {loaded && hasPlants && !away && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Ton balcon, ${status.label}`} onPress={() => router.push("/(tabs)/balcony")} style={({ pressed }) => [styles.status, styles.glass, pressed && styles.pressed]}>
            <Text style={[styles.statusText, { color: colors.foreground }]}>Ton balcon <Text style={{ color: colors.muted, fontWeight: "500" }}>· {status.label}</Text></Text>
            <View style={[styles.track, { backgroundColor: colors.border }]}><View style={[styles.fill, { width: `${Math.max(status.progress, 0.04) * 100}%`, backgroundColor: colors.primary }]} /></View>
          </Pressable>
        )}

        {trip.phase !== "none" && vacation && (trip.phase !== "upcoming" || trip.daysLeft <= 14) && (
          <Pressable accessibilityRole="button" onPress={() => router.push("/vacation")} style={({ pressed }) => [styles.status, styles.glass, styles.trip, pressed && styles.pressed]}>
            <Text style={styles.tripIcon}>{trip.phase === "upcoming" ? "✈️" : trip.phase === "away" ? "🌴" : "🌿"}</Text>
            <View style={styles.flex}>
              <Text style={[styles.statusText, { color: colors.foreground }]}>
                {trip.phase === "upcoming" ? (trip.daysLeft === 1 ? "Départ demain" : `Départ dans ${trip.daysLeft} jours`) : trip.phase === "away" ? "Bonnes vacances !" : "Bon retour !"}
              </Text>
              <Text style={[styles.small, { color: colors.muted }]}>
                {trip.phase === "upcoming"
                  ? `${tripPlan.filter((step) => vacation.done.includes(step.id)).length} sur ${tripPlan.length} préparatifs · voir le plan`
                  : trip.phase === "away"
                    ? `Balco se tait ${vacationRange(vacation)}. Les rappels reprendront seuls.`
                    : "Fais le tour de ton balcon : Balco t’a préparé la liste."}
              </Text>
            </View>
            <Text style={[styles.tripArrow, { color: colors.muted }]}>›</Text>
          </Pressable>
        )}

        {loaded && hasPlants && status.allDone && !away && (
          <FadeIn style={styles.allDone}>
            <Text style={styles.allDoneIcon}>{status.doneToday > 0 ? (evening ? "🌙" : "☀️") : "🌿"}</Text>
            <Text style={[styles.allDoneTitle, { color: colors.foreground }]}>{status.doneToday > 0 ? (evening ? "Ton balcon est prêt pour la nuit" : "Tout est fait pour aujourd’hui") : "Rien à faire aujourd’hui"}</Text>
            <Text style={[styles.allDoneText, { color: colors.muted }]}>
              {status.doneToday > 0
                ? `${status.doneToday} geste${status.doneToday > 1 ? "s" : ""} aujourd’hui${streak > 1 ? ` · ${streak} jours de suite` : ""}. Balco te préviendra si la météo change.`
                : "Tes plantes n’ont besoin de rien. Balco te préviendra si la météo change."}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/week")} style={({ pressed }) => [styles.pill, styles.weekButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={[styles.pillText, { color: "#FFFFFF" }]}>Voir ma semaine</Text>
            </Pressable>
          </FadeIn>
        )}

        {items.length > 0 && !away && (
          <View>
            {items.map((item) => (
              <TodayRow
                key={item.key}
                icon={item.icon}
                tone={item.tone}
                title={item.title}
                subtitle={item.done ? doneSubtitle(item, events) : item.subtitle}
                done={item.done}
                checkLabel={item.kind === "alert" && item.group.action === "skip" ? "Compris" : undefined}
                picture={seasonPicture(item)}
                onToggle={() => void toggleItem(item)}
                onOpen={() => setSheetKey(item.key)}
              />
            ))}
          </View>
        )}

        {loaded && hasPlants && !away && !reminderSettings.enabled && notificationsUnavailableReason === null && (
          <View style={styles.remindersRow}>
            <Text style={[styles.small, styles.flex, { color: colors.muted }]}>Sois prévenu au bon moment, sans ouvrir l’app.</Text>
            <Pressable accessibilityRole="button" onPress={() => void activateReminders()} style={({ pressed }) => [styles.pill, { backgroundColor: colors.leaf }, pressed && styles.pressed]}>
              <Text style={[styles.pillText, { color: colors.primary }]}>Activer les rappels</Text>
            </Pressable>
          </View>
        )}

        {loaded && hasPlants && !away && monthIdea && (
          <View style={styles.idea}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Idée du mois</Text>
            <View style={[styles.reco, styles.ideaRow, { borderBottomColor: colors.border }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${monthIdea.title}, voir les idées de saison`} onPress={() => router.push("/(tabs)/calendar")} style={({ pressed }) => [styles.ideaMain, pressed && styles.pressed]}>
                <CatalogPicture entry={monthIdea.entry} style={[styles.plantBubble, styles.recoBubble]} />
                <View style={styles.flex}>
                  <Text style={[styles.recoName, { color: colors.foreground }]} numberOfLines={1}>{monthIdea.title}</Text>
                  <Text style={[styles.small, { color: colors.muted }]} numberOfLines={2}>{monthIdea.reason}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${monthIdea.entry.name} à mon balcon`} hitSlop={8} onPress={() => void addMonthIdea(monthIdea)} style={({ pressed }) => [styles.ideaAdd, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.ideaAddText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}

        {loaded && hasPlants && (
          <View style={styles.shelf}>
            <View style={styles.shelfHead}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tes plantes</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/balcony")} hitSlop={8}><Text style={[styles.link, { color: colors.primary }]}>Tout voir</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
              {resolvedPlants.map((resolved) => {
                const tone = plantStatus(resolved, events, now).tone;
                const dot = plantDots.get(resolved.plant.id) ?? (tone === "good" ? colors.primary : tone === "watch" ? colors.warning : colors.border);
                return (
                  <Pressable key={resolved.plant.id} accessibilityRole="button" accessibilityLabel={plantDisplayName(resolved)} onPress={() => router.push({ pathname: "/garden/[id]", params: { id: resolved.plant.id } })} style={({ pressed }) => [styles.plant, pressed && styles.pressed]}>
                    <View>
                      <PlantPicture resolved={resolved} style={styles.plantBubble} />
                      <View style={[styles.plantDot, { backgroundColor: dot, borderColor: colors.background }]} />
                    </View>
                    <Text style={[styles.plantName, { color: colors.foreground }]} numberOfLines={1}>{plantDisplayName(resolved)}</Text>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" accessibilityLabel="Ajouter une plante" onPress={() => router.push("/garden/add")} style={({ pressed }) => [styles.plant, pressed && styles.pressed]}>
                <View style={[styles.plantBubble, { backgroundColor: colors.surface }]}><Text style={[styles.plantEmoji, { color: colors.muted }]}>＋</Text></View>
                <Text style={[styles.plantName, { color: colors.muted }]}>Ajouter</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {loaded && !hasPlants && (
          <FadeIn style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ajoute ta première plante</Text>
            <Text style={[styles.allDoneText, { color: colors.muted, textAlign: "left" }]}>Balco te dira chaque jour le geste utile pour chacune, selon la météo de ta ville.</Text>
            {recommendations.map((entry) => (
              <View key={entry.id} style={[styles.reco, { borderBottomColor: colors.border }]}>
                <CatalogPicture entry={entry} style={[styles.plantBubble, styles.recoBubble]} />
                <View style={styles.flex}>
                  <Text style={[styles.recoName, { color: colors.foreground }]}>{entry.name}</Text>
                  <Text style={[styles.small, { color: colors.muted }]} numberOfLines={2}>{entry.pitch}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${entry.name}`} onPress={() => void addRecommendation(entry.id, entry.name)} style={({ pressed }) => [styles.pill, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={[styles.pillText, { color: "#FFFFFF" }]}>Ajouter</Text>
                </Pressable>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => router.push("/garden/add")} style={({ pressed }) => [styles.cta, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
              <Text style={[styles.ctaText, { color: colors.background }]}>Voir les {PLANT_CATALOG.length} plantes</Text>
            </Pressable>
          </FadeIn>
        )}
        </View>
      </Animated.ScrollView>

      <BottomSheet visible={sheetItem !== null} onClose={closeSheet}>
        {sheetItem && <SheetContent item={sheetItem} events={events} onClose={closeSheet} onToggle={() => { closeSheet(); void toggleItem(sheetItem); }} onSnooze={(kind) => { closeSheet(); if (sheetItem.kind === "alert") void snoozeAlert(sheetItem.group, kind); }} onOpenPlant={(id) => { closeSheet(); router.push({ pathname: "/garden/[id]", params: { id } }); }} onOpenCalendar={() => { closeSheet(); router.push("/(tabs)/calendar"); }} />}
      </BottomSheet>

      <UndoToast message={toast} onDone={hideToast} />
      {celebration}
    </ScreenContainer>
  );
}

type SheetContentProps = {
  item: TodayItem;
  events: MaintenanceEvent[];
  onClose: () => void;
  onToggle: () => void;
  onSnooze: (kind: ReminderSnooze["kind"]) => void;
  onOpenPlant: (plantId: string) => void;
  onOpenCalendar: () => void;
};

/** Le détail d'un geste : pourquoi, comment, et les choix possibles. */
function SheetContent({ item, events, onToggle, onSnooze, onOpenPlant, onOpenCalendar }: SheetContentProps) {
  const colors = useColors();
  const alertTone = item.tone === "frost" || item.tone === "rain" || item.tone === "storm" || item.tone === "wind" ? colors.frost : item.tone === "heat" ? colors.terracotta : colors.primary;
  const info = item.kind === "alert" && item.group.action === "skip";
  const body = item.kind === "alert" ? item.group.body : item.kind === "task" ? item.task.task.instruction : item.activity.description;

  return (
    <View style={styles.sheet}>
      <Text style={[styles.sheetKind, { color: alertTone }]}>{item.icon}  {item.done ? doneSubtitle(item, events) : item.subtitle}</Text>
      <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{item.title}</Text>
      <Text style={[styles.sheetBody, { color: colors.foreground }]}>{body}</Text>
      {item.kind === "alert" && (
        <>
          {item.group.decisions.length > 1 && (
            <View style={styles.chips}>{item.group.decisions.map((decision) => <Pressable key={decision.plantId} onPress={() => onOpenPlant(decision.plantId)} style={[styles.chip, { backgroundColor: colors.surface }]}><Text style={[styles.chipText, { color: colors.foreground }]}>{decision.plantLabel ?? decision.plantId}</Text></Pressable>)}</View>
          )}
          <Text style={[styles.why, { backgroundColor: colors.surface, color: colors.muted }]}>Pourquoi : {item.group.reason}</Text>
        </>
      )}
      <Pressable accessibilityRole="button" onPress={onToggle} style={({ pressed }) => [styles.cta, { backgroundColor: item.done ? colors.surface : colors.foreground }, pressed && styles.pressed]}>
        <Text style={[styles.ctaText, { color: item.done ? colors.foreground : colors.background }]}>{item.done ? "Annuler ce geste" : info ? "Compris" : "C’est fait"}</Text>
      </Pressable>
      {item.kind === "alert" && !info && (
        <View style={styles.secondary}>
          <Pressable accessibilityRole="button" onPress={() => onSnooze("later")} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: colors.foreground }]}>Dans 3 h</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => onSnooze("skip")} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryText, { color: colors.foreground }]}>Pas aujourd’hui</Text></Pressable>
        </View>
      )}
      {item.kind === "task" && (
        <Pressable accessibilityRole="button" onPress={() => onOpenPlant(item.task.resolved.plant.id)} style={styles.sheetLink}><Text style={[styles.link, { color: colors.primary }]}>Voir la fiche de {plantDisplayName(item.task.resolved)}</Text></Pressable>
      )}
      {item.kind === "season" && (
        <Pressable accessibilityRole="button" onPress={onOpenCalendar} style={styles.sheetLink}><Text style={[styles.link, { color: colors.primary }]}>Voir le calendrier</Text></Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trip: { flexDirection: "row", alignItems: "center", gap: 12 },
  tripIcon: { fontSize: 24 },
  tripArrow: { fontSize: 24, fontWeight: "300" },
  cameraButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { gap: 18 },
  body: { paddingHorizontal: 20, gap: 18 },
  glass: { backgroundColor: "rgba(255,255,255,0.72)" },
  simulation: { borderRadius: 16, padding: 14, gap: 6 },
  simulationTitle: { fontSize: 14, fontWeight: "700" },
  small: { fontSize: 13, lineHeight: 18 },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { fontSize: 13, fontWeight: "700" },
  status: { borderRadius: 16, padding: 14, gap: 10 },
  statusText: { fontSize: 15, fontWeight: "700" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  allDone: { alignItems: "center", gap: 6, paddingVertical: 10 },
  allDoneIcon: { fontSize: 40 },
  allDoneTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  weekButton: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 11 },
  allDoneText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  remindersRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  shelf: { gap: 12 },
  shelfHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  link: { fontSize: 14, fontWeight: "600" },
  shelfRow: { gap: 14, paddingRight: 8 },
  plant: { width: 64, alignItems: "center", gap: 6 },
  plantBubble: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  plantEmoji: { fontSize: 26 },
  plantDot: { position: "absolute", right: 1, bottom: 1, width: 15, height: 15, borderRadius: 8, borderWidth: 2.5 },
  plantName: { fontSize: 12, fontWeight: "600" },
  empty: { gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  reco: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  recoBubble: { width: 46, height: 46, borderRadius: 23 },
  recoName: { fontSize: 16, fontWeight: "600" },
  idea: { gap: 4 },
  ideaRow: { borderBottomWidth: 0 },
  ideaMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  ideaAdd: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  ideaAddText: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginTop: -2 },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontSize: 16, fontWeight: "700" },
  sheet: { gap: 12 },
  sheetKind: { fontSize: 13, fontWeight: "700" },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, lineHeight: 27 },
  sheetBody: { fontSize: 15, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: "600" },
  why: { fontSize: 13, lineHeight: 18, borderRadius: 12, padding: 12, overflow: "hidden" },
  secondary: { flexDirection: "row", gap: 10 },
  secondaryButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  secondaryText: { fontSize: 14, fontWeight: "600" },
  sheetLink: { alignItems: "center", paddingVertical: 4 },
  pressed: { opacity: 0.7 },
});
