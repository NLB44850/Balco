import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PopIn } from "@/components/motion";
import { LightScreen } from "@/components/light-screen";
import { PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { useWeatherSimulation } from "@/hooks/use-weather-simulation";
import { notificationsUnavailableReason } from "@/lib/notifications/module";
import { WEATHER_SCENARIOS } from "@/lib/weather/simulation";
import { useColors } from "@/hooks/use-colors";
import { ONBOARDING_STORAGE_KEY, useGarden } from "@/lib/garden/garden-context";
import { computeBadges, computeProgress, computeStats, initials, plantDisplayName, relativeDay } from "@/lib/garden/garden-logic";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { weekSummary } from "@/lib/garden/week";
import { SPACE_LABELS, SUNLIGHT_LABELS, type SpaceSize, type Sunlight } from "@/lib/plants/catalog";
import {
  clearAndDisableLocalReminders,
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  requestLocalNotificationPermission,
  saveLocalReminderSettings,
  sendTestNotification,
  subscribeReminderSettings,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { resolvedPlants, events, profile, onboarding, account, updateProfile, reloadOnboarding, signIn, signOut, syncNow, deleteAccount } = useGarden();
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const { photos } = usePlantPhotos();
  const week = useMemo(() => weekSummary(resolvedPlants, events, photos, new Date()), [events, photos, resolvedPlants]);

  const removeAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch {
      setDeleteError("La suppression n’a pas abouti. Vérifie ta connexion et réessaie.");
      setDeleting(false);
    }
  };

  const stats = useMemo(() => computeStats(resolvedPlants, events, new Date()), [events, resolvedPlants]);
  const badges = useMemo(() => computeBadges(stats), [stats]);
  const progress = useMemo(() => computeProgress(stats, badges), [badges, stats]);
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const userInitials = initials(profile.firstName);
  const balconyMeta = [
    onboarding?.space && !onboarding.skipped ? capitalize(SPACE_LABELS[onboarding.space as SpaceSize]) : null,
    onboarding?.sunlight && !onboarding.skipped ? SUNLIGHT_LABELS[onboarding.sunlight as Sunlight].toLowerCase() : null,
    `${stats.plants} plante${stats.plants > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" · ");

  useEffect(() => {
    loadLocalReminderSettings().then((settings) => {
      setReminderSettings(settings);
      setSettingsLoaded(true);
    });
    // Un réglage changé sur un autre appareil arrive par la synchro.
    return subscribeReminderSettings((settings) => setReminderSettings(settings));
  }, []);

  // Les notifications n'existent que dans l'app mobile, et pas dans Expo Go sur Android.
  const notificationsSupported = notificationsUnavailableReason === null;
  const simulation = useWeatherSimulation();
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "denied">("idle");

  const sendTest = async () => {
    setTestStatus("sending");
    const result = await sendTestNotification();
    setTestStatus(result === "sent" ? "sent" : "denied");
  };

  const updateReminderSettings = async (patch: Partial<LocalReminderSettings>) => {
    const next = { ...reminderSettings, ...patch };
    setReminderSettings(next);
    await saveLocalReminderSettings(next);
  };

  const toggleReminders = async () => {
    if (reminderSettings.enabled) {
      await clearAndDisableLocalReminders();
      setReminderSettings((current) => ({ ...current, enabled: false }));
      return;
    }
    const granted = await requestLocalNotificationPermission();
    if (!granted) {
      Alert.alert("Notifications désactivées", "Autorise les notifications dans les réglages de ton téléphone pour recevoir les conseils Balco.");
      return;
    }
    // Liste vide = toutes les plantes, y compris celles ajoutées plus tard.
    await updateReminderSettings({ enabled: true, enabledPlantIds: [] });
  };

  const isPlantEnabled = (plantId: string) => reminderSettings.enabledPlantIds.length === 0 || reminderSettings.enabledPlantIds.includes(plantId);

  const togglePlant = async (plantId: string) => {
    const current = reminderSettings.enabledPlantIds.length === 0 ? resolvedPlants.map(({ plant }) => plant.id) : reminderSettings.enabledPlantIds;
    const next = current.includes(plantId) ? current.filter((id) => id !== plantId) : [...current, plantId];
    const allEnabled = resolvedPlants.every(({ plant }) => next.includes(plant.id));
    await updateReminderSettings({ enabledPlantIds: allEnabled ? [] : next });
  };

  const startEditing = () => {
    setNameDraft(profile.firstName ?? "");
    setEditing((value) => !value);
  };

  const saveName = async () => {
    await updateProfile({ firstName: nameDraft.trim() || undefined });
    setEditing(false);
  };

  const redoOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    await reloadOnboarding();
    router.replace("/welcome");
  };

  const syncLabel = !account.signedIn
    ? null
    : account.status === "syncing"
      ? "Synchronisation…"
      : account.status === "offline"
        ? "Hors ligne : tes changements partiront dès que possible."
        : account.lastSyncedAt
          ? `Sauvegardé ${relativeDay(new Date(account.lastSyncedAt))} à ${new Date(account.lastSyncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
          : "Première sauvegarde en cours…";

  const header = (
    <>
      <ScreenHeader
        back
        title={profile.firstName?.trim() || "Moi"}
        subtitle={balconyMeta}
        right={
          <View style={styles.headerRight}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={userInitials ? styles.avatarText : styles.avatarEmoji}>{userInitials ?? "🌱"}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Réglages du profil" onPress={startEditing} style={({ pressed }) => [glass.soft, styles.settingsButton, editing && { borderColor: colors.primary, borderWidth: 1 }, pressed && styles.pressed]}><Text style={[styles.settingsText, { color: colors.foreground }]}>⚙</Text></Pressable>
          </View>
        }
        style={styles.header}
      />
      {editing && (
        <View style={[glass.card, styles.editCard]}>
          <Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Ton prénom</Text>
          <View style={styles.editRow}>
            <TextInput value={nameDraft} onChangeText={setNameDraft} onSubmitEditing={() => void saveName()} placeholder="Pour que Balco te dise bonjour" placeholderTextColor={colors.muted} maxLength={30} autoFocus returnKeyType="done" style={[styles.nameInput, { borderColor: colors.border, color: colors.foreground }]} />
            <Pressable onPress={() => void saveName()} style={({ pressed }) => [styles.editButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.editButtonText}>OK</Text></Pressable>
          </View>
          <Pressable onPress={() => void redoOnboarding()} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.editLink, { color: colors.primary }]}>↻ Mettre à jour l’exposition et l’espace de mon balcon</Text></Pressable>
          <Pressable onPress={() => router.push("/(tabs)/balcony")} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.editLink, { color: colors.primary }]}>🪴 Gérer mes plantes</Text></Pressable>
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={`Ma semaine : ${week.title}`} onPress={() => router.push("/week")} style={({ pressed }) => [glass.card, styles.weekCard, pressed && styles.pressed]}>
        <View style={styles.weekTop}>
          <View style={styles.flex}>
            <Text style={[styles.impactHeroEyebrow, { color: colors.muted }]}>Ma semaine</Text>
            <Text style={[styles.weekTitle, { color: colors.foreground }]}>{week.title}</Text>
          </View>
          <Text style={[styles.weekLink, { color: colors.primary }]}>Voir ›</Text>
        </View>
        <View style={styles.weekDays}>
          {week.days.map((day) => (
            <View key={day.key} style={styles.weekDay}>
              <View style={[styles.weekDot, { backgroundColor: day.gestures > 0 ? colors.primary : "rgba(18,22,20,0.07)", borderColor: day.today ? colors.primary : "transparent", opacity: day.future ? 0.45 : 1 }]} />
              <Text style={[styles.weekLetter, { color: day.today ? colors.primary : colors.muted }]}>{day.letter}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <View style={[glass.card, styles.impactHero]}>
        <View style={styles.impactHeroTop}><View style={styles.flex}><Text style={[styles.impactHeroEyebrow, { color: colors.muted }]}>Niveau {progress.level}</Text><Text style={[styles.impactHeroTitle, { color: colors.foreground }]}>{progress.levelTitle}</Text></View><Text style={[styles.impactHeroScore, { color: colors.primary }]}>{progress.points}<Text style={[styles.impactHeroUnit, { color: colors.muted }]}> pts</Text></Text></View>
        <View style={[styles.heroProgressTrack, { backgroundColor: "rgba(18,22,20,0.08)" }]}><View style={[styles.heroProgressFill, { width: `${Math.max(progress.pointsInLevel, 2)}%`, backgroundColor: colors.primary }]} /></View>
        <Text style={[styles.impactHeroCaption, { color: colors.muted }]}>{progress.pointsToNext} points avant le niveau suivant</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={[glass.card, styles.statCard]}><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.gestures}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>geste{stats.gestures > 1 ? "s" : ""} fait{stats.gestures > 1 ? "s" : ""}</Text></View>
        <View style={[glass.card, styles.statCard]}><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.streakDays}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>jour{stats.streakDays > 1 ? "s" : ""} de suite</Text></View>
        <View style={[glass.card, styles.statCard]}><Text style={[styles.statValue, { color: colors.foreground }]}>{unlockedCount}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>badge{unlockedCount > 1 ? "s" : ""}</Text></View>
      </View>
      <View style={styles.badgeHeading}><View><Text style={[styles.sectionEyebrow, { color: colors.muted }]}>Petites victoires</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes badges éco</Text></View><Text style={[styles.badgeCount, { color: colors.primary }]}>{unlockedCount}/{badges.length}</Text></View>
    </>
  );

  return (
    <LightScreen>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.badgeRow}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => setOpenBadge(openBadge === item.id ? null : item.id)} style={({ pressed }) => [glass.card, styles.badgeCard, !item.unlocked && styles.badgeLocked, pressed && styles.pressed]}>
            <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? item.tone : "#E4E1D9" }]}><Text style={[styles.badgeIconText, { color: item.unlocked ? colors.foreground : "#A8AAA4" }]}>{item.unlocked ? item.icon : "·"}</Text></View>
            <Text style={[styles.badgeTitle, { color: item.unlocked ? colors.foreground : colors.muted }]}>{item.title}</Text>
            <Text style={[styles.badgeDetail, { color: item.unlocked ? colors.muted : "#A8AAA4" }]}>{item.detail}</Text>
            {!item.unlocked && <Text style={[styles.badgeProgress, { color: colors.muted }]}>{item.current} / {item.target}</Text>}
            {openBadge === item.id && <Text style={[styles.badgeDetail, { color: colors.primary }]}>{item.unlocked ? "Débloqué, bravo !" : `Encore ${item.target - item.current} pour le débloquer.`}</Text>}
            {item.unlocked && <PopIn delay={180} style={[styles.unlockedMark, { backgroundColor: colors.leaf }]}><Text style={[styles.unlockedMarkText, { color: colors.primary }]}>✓</Text></PopIn>}
          </Pressable>
        )}
        ListFooterComponent={
          <>
            <Text style={[styles.sectionTitle, styles.settingsTitle, { color: colors.foreground }]}>Réglages</Text>
            <View style={[glass.card, styles.accountCard]}>
              <Text style={[styles.sectionEyebrow, { color: colors.muted }]}>Sauvegarde</Text>
              <Text style={[styles.reminderCardTitle, { color: colors.foreground }]}>{account.signedIn ? "Ton balcon est sauvegardé" : "Ne perds jamais ton balcon"}</Text>
              <Text style={[styles.reminderCardText, { color: colors.muted }]}>
                {account.signedIn
                  ? `${account.email ? `Connecté avec ${account.email}. ` : ""}${syncLabel}${account.serverPush ? " · Rappels envoyés même application fermée." : ""}`
                  : "Connecte-toi pour retrouver tes plantes et ton historique sur un autre téléphone, et recevoir les rappels météo même application fermée."}
              </Text>
              <View style={styles.accountActions}>
                {account.signedIn ? (
                  <>
                    <Pressable disabled={account.status === "syncing"} onPress={() => void syncNow()} style={({ pressed }) => [styles.accountButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.accountButtonText}>Synchroniser</Text></Pressable>
                    <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.accountButtonGhost, pressed && styles.pressed]}><Text style={[styles.accountGhostText, { color: colors.primary }]}>Se déconnecter</Text></Pressable>
                  </>
                ) : account.loginAvailable ? (
                  <Pressable disabled={account.checking} onPress={() => void signIn()} style={({ pressed }) => [styles.accountButton, { backgroundColor: colors.foreground }, pressed && styles.pressed]}><Text style={styles.accountButtonText}>{account.checking ? "Vérification…" : "Se connecter"}</Text></Pressable>
                ) : (
                  <Text style={[styles.reminderOptionHint, { color: colors.muted }]}>Connexion non configurée sur cette version de l’app.</Text>
                )}
              </View>
              {account.signedIn && (
                <View style={styles.deleteBlock}>
                  {confirmDelete ? (
                    <>
                      <Text style={[styles.reminderOptionHint, { color: colors.foreground }]}>Ton compte, tes plantes et tout ton historique seront effacés définitivement, sur ce téléphone et sur nos serveurs.</Text>
                      <View style={styles.accountActions}>
                        <Pressable disabled={deleting} onPress={() => void removeAccount()} style={({ pressed }) => [styles.accountButton, { backgroundColor: colors.error }, pressed && styles.pressed]}><Text style={styles.accountButtonText}>{deleting ? "Suppression…" : "Oui, tout supprimer"}</Text></Pressable>
                        <Pressable disabled={deleting} onPress={() => setConfirmDelete(false)} style={({ pressed }) => [styles.accountButtonGhost, pressed && styles.pressed]}><Text style={[styles.accountGhostText, { color: colors.primary }]}>Annuler</Text></Pressable>
                      </View>
                      {deleteError && <Text style={[styles.reminderOptionHint, { color: colors.error }]}>{deleteError}</Text>}
                    </>
                  ) : (
                    <Pressable onPress={() => setConfirmDelete(true)}><Text style={[styles.deleteLink, { color: colors.error }]}>Supprimer mon compte</Text></Pressable>
                  )}
                </View>
              )}
            </View>
            {simulation.available && (
              <View style={[glass.card, styles.reminderCard]}>
                <Text style={[styles.sectionEyebrow, { color: colors.muted }]}>Version de test</Text>
                <Text style={[styles.reminderCardTitle, { color: colors.foreground }]}>Simulation météo</Text>
                <Text style={[styles.reminderCardText, { color: colors.muted }]}>Fais comme si cette météo arrivait, pour voir les alertes sur l’accueil. N’existe pas dans l’app publiée.</Text>
                <View style={styles.simulationChips}>
                  {WEATHER_SCENARIOS.map((item) => {
                    const active = simulation.scenario === item.id;
                    return (
                      <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => void simulation.setScenario(item.id)} style={({ pressed }) => [styles.simulationChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}>
                        <Text style={[styles.simulationChipText, { color: active ? "#FFFFFF" : colors.foreground }]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.testHint, { color: colors.muted }]}>{WEATHER_SCENARIOS.find((item) => item.id === simulation.scenario)?.hint}</Text>
              </View>
            )}
            <View style={[glass.card, styles.reminderCard]}>
              <View style={styles.reminderCardHeader}>
                <View style={styles.reminderCardCopy}><Text style={[styles.sectionEyebrow, { color: colors.muted }]}>Rappels contextuels</Text><Text style={[styles.reminderCardTitle, { color: colors.foreground }]}>Seulement quand c’est utile</Text><Text style={[styles.reminderCardText, { color: colors.muted }]}>Balco croise la météo et ton dernier geste.</Text></View>
                <Pressable accessibilityRole="switch" accessibilityState={{ checked: reminderSettings.enabled, disabled: !notificationsSupported }} disabled={!settingsLoaded || !notificationsSupported} onPress={() => void toggleReminders()} style={({ pressed }) => [styles.toggle, { backgroundColor: reminderSettings.enabled ? colors.primary : colors.border, opacity: notificationsSupported ? 1 : 0.5 }, pressed && styles.pressed]}><View style={[styles.toggleKnob, reminderSettings.enabled && styles.toggleKnobOn]} /></Pressable>
              </View>
              {notificationsSupported && (
                <View style={styles.testRow}>
                  <Pressable accessibilityRole="button" disabled={testStatus === "sending"} onPress={() => void sendTest()} style={({ pressed }) => [styles.testButton, { borderColor: colors.primary }, pressed && styles.pressed]}>
                    <Text style={[styles.testButtonText, { color: colors.primary }]}>{testStatus === "sending" ? "Envoi…" : "Envoyer une notification de test"}</Text>
                  </Pressable>
                  {testStatus === "sent" && <Text style={[styles.testHint, { color: colors.muted }]}>Elle arrive dans 5 secondes. Verrouille ton téléphone pour la voir comme un vrai rappel, puis essaie ses boutons.</Text>}
                  {testStatus === "denied" && <Text style={[styles.testHint, { color: colors.error }]}>Les notifications sont bloquées : autorise-les pour Balco dans les réglages du téléphone.</Text>}
                </View>
              )}
              {!notificationsSupported && <Text style={[styles.reminderWebNote, { backgroundColor: "rgba(255,255,255,0.7)", color: colors.foreground }]}>{notificationsUnavailableReason === "expo-go-android" ? "Expo Go ne permet plus les notifications sur Android : pour tester les rappels, installe la version de test de Balco." : "Les rappels arrivent en notification sur ton téléphone : active-les depuis l’app Balco pour iPhone ou Android. La version web ne peut pas envoyer de notifications."}</Text>}
              <View style={styles.reminderOptionRow}><Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Rappel préféré</Text><View style={styles.timeChoices}>{[17, 18, 19].map((hour) => <Pressable key={hour} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ preferredHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.preferredHour === hour ? colors.leaf : "rgba(255,255,255,0.7)", opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour}h30</Text></Pressable>)}</View></View>
              <View style={styles.quietBlock}><View><Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Plage calme</Text><Text style={[styles.reminderOptionHint, { color: colors.muted }]}>Aucune notification pendant ces heures</Text></View><Text style={[styles.reminderQuietValue, { color: colors.primary }]}>{reminderSettings.quietStartHour} → {reminderSettings.quietEndHour} h</Text></View>
              <View style={styles.quietChoices}><View style={styles.quietChoiceGroup}><Text style={[styles.quietChoiceLabel, { color: colors.muted }]}>Début</Text><View style={styles.timeChoices}>{[20, 21, 22].map((hour) => <Pressable key={`start-${hour}`} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ quietStartHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.quietStartHour === hour ? colors.leaf : "rgba(255,255,255,0.7)", opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour} h</Text></Pressable>)}</View></View><View style={styles.quietChoiceGroup}><Text style={[styles.quietChoiceLabel, { color: colors.muted }]}>Fin</Text><View style={styles.timeChoices}>{[7, 8, 9].map((hour) => <Pressable key={`end-${hour}`} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ quietEndHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.quietEndHour === hour ? colors.leaf : "rgba(255,255,255,0.7)", opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour} h</Text></Pressable>)}</View></View></View>
              <Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Plantes concernées</Text>
              {resolvedPlants.length === 0 && <Text style={[styles.reminderOptionHint, { color: colors.muted, marginTop: -8 }]}>Ajoute des plantes à ton balcon pour choisir lesquelles suivre.</Text>}
              <View style={styles.plantToggles}>{resolvedPlants.map((resolved) => { const enabled = isPlantEnabled(resolved.plant.id); return <Pressable key={resolved.plant.id} disabled={!reminderSettings.enabled} onPress={() => void togglePlant(resolved.plant.id)} style={[styles.plantToggle, { backgroundColor: enabled ? colors.leaf : "rgba(255,255,255,0.7)", opacity: reminderSettings.enabled ? 1 : 0.5 }]}><PlantPicture resolved={resolved} style={styles.plantTogglePicture} /><Text style={[styles.plantToggleText, { color: colors.foreground }]}>{plantDisplayName(resolved)}</Text><Text style={[styles.plantToggleCheck, { color: enabled ? colors.primary : colors.muted }]}>{enabled ? "✓" : "·"}</Text></Pressable>; })}</View>
            </View>
            <View style={[glass.soft, styles.footerCard]}><Text style={[styles.footerIcon, { color: colors.primary }]}>♧</Text><View style={styles.footerCopy}><Text style={[styles.footerTitle, { color: colors.foreground }]}>Chaque geste compte.</Text><Text style={[styles.footerText, { color: colors.muted }]}>Invite un proche à faire pousser quelque chose.</Text></View><Text style={[styles.footerArrow, { color: colors.muted }]}>›</Text></View>
          </>
        }
      />
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  flex: { flex: 1 },
  header: { marginBottom: 18 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  avatarEmoji: { fontSize: 24 },
  editCard: { padding: 14, gap: 10, marginTop: -6, marginBottom: 16 },
  editRow: { flexDirection: "row", gap: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14 },
  editButton: { borderRadius: 12, paddingHorizontal: 15, justifyContent: "center" },
  editButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  editLink: { fontSize: 14, fontWeight: "600" },
  settingsButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  settingsText: { fontSize: 17 },
  weekCard: { padding: 16, gap: 12, marginBottom: 14 },
  weekTop: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  weekTitle: { fontSize: 18, fontWeight: "800", marginTop: 2, letterSpacing: -0.3 },
  weekLink: { fontSize: 14, fontWeight: "700" },
  weekDays: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 5 },
  weekDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  weekLetter: { fontSize: 11, fontWeight: "600" },
  settingsTitle: { marginTop: 18, marginBottom: 12 },
  impactHero: { padding: 16, gap: 10 },
  impactHeroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  impactHeroEyebrow: { fontSize: 13, fontWeight: "600" },
  impactHeroTitle: { fontSize: 20, fontWeight: "800", marginTop: 2, letterSpacing: -0.3 },
  impactHeroScore: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  impactHeroUnit: { fontSize: 14, fontWeight: "600", letterSpacing: 0 },
  heroProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  heroProgressFill: { height: 6, borderRadius: 3 },
  impactHeroCaption: { fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 14, marginBottom: 27 },
  statCard: { flex: 1, paddingVertical: 13, alignItems: "center" },
  statValue: { fontSize: 21, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 3 },
  accountCard: { padding: 15, marginBottom: 16, gap: 2 },
  accountActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  accountButton: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  accountButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  accountButtonGhost: { paddingHorizontal: 6, paddingVertical: 9 },
  accountGhostText: { fontSize: 14, fontWeight: "600" },
  deleteBlock: { marginTop: 12, gap: 4 },
  deleteLink: { fontSize: 13, fontWeight: "600" },
  reminderCard: { padding: 15, marginBottom: 20, gap: 14 },
  reminderCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  reminderCardCopy: { flex: 1 },
  simulationChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  simulationChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  simulationChipText: { fontSize: 13, fontWeight: "600" },
  testRow: { marginTop: 12, gap: 6 },
  testButton: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  testButtonText: { fontSize: 13, fontWeight: "700" },
  testHint: { fontSize: 12, lineHeight: 17 },
  reminderWebNote: { fontSize: 12, lineHeight: 18, borderRadius: 14, padding: 12, marginTop: 12 },
  reminderCardTitle: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  reminderCardText: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  toggle: { width: 47, height: 28, borderRadius: 15, padding: 3, justifyContent: "center" },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" },
  toggleKnobOn: { alignSelf: "flex-end" },
  reminderOptionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  reminderOptionLabel: { fontSize: 14, fontWeight: "700" },
  reminderOptionHint: { fontSize: 12, marginTop: 3 },
  reminderQuietValue: { fontSize: 14, fontWeight: "700" },
  quietBlock: { gap: 9 },
  quietChoices: { flexDirection: "row", gap: 12 },
  quietChoiceGroup: { flex: 1, gap: 5 },
  quietChoiceLabel: { fontSize: 12, fontWeight: "600" },
  timeChoices: { flexDirection: "row", gap: 6 },
  timeChoice: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  timeChoiceText: { fontSize: 12, fontWeight: "700" },
  plantToggles: { gap: 7, marginTop: -6 },
  plantToggle: { borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  plantTogglePicture: { width: 26, height: 26, borderRadius: 13 },
  plantToggleText: { flex: 1, fontSize: 13, fontWeight: "600" },
  plantToggleCheck: { fontSize: 16, fontWeight: "900" },
  badgeHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 13 },
  sectionEyebrow: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 21, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  badgeCount: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  badgeRow: { gap: 12, marginBottom: 12 },
  badgeCard: { flex: 1, minHeight: 164, padding: 14, position: "relative" },
  badgeLocked: { backgroundColor: "rgba(255,255,255,0.45)" },
  badgeIcon: { width: 47, height: 47, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badgeIconText: { fontSize: 25, fontWeight: "700" },
  badgeTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", marginTop: 12 },
  badgeDetail: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  badgeProgress: { fontSize: 12, fontWeight: "700", marginTop: 6 },
  unlockedMark: { width: 19, height: 19, borderRadius: 10, position: "absolute", right: 11, top: 11, alignItems: "center", justifyContent: "center" },
  unlockedMarkText: { fontSize: 12, fontWeight: "800" },
  footerCard: { borderRadius: 20, padding: 15, flexDirection: "row", alignItems: "center", marginTop: 8 },
  footerIcon: { fontSize: 28 },
  footerCopy: { flex: 1, marginLeft: 12 },
  footerTitle: { fontSize: 14, fontWeight: "700" },
  footerText: { fontSize: 13, marginTop: 3 },
  footerArrow: { fontSize: 28, fontWeight: "300" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
