import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { PopIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ONBOARDING_STORAGE_KEY, useGarden } from "@/lib/garden/garden-context";
import { computeBadges, computeProgress, computeStats, initials, plantDisplayName, relativeDay } from "@/lib/garden/garden-logic";
import { SPACE_LABELS, SUNLIGHT_LABELS, type SpaceSize, type Sunlight } from "@/lib/plants/catalog";
import {
  clearAndDisableLocalReminders,
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  requestLocalNotificationPermission,
  saveLocalReminderSettings,
  subscribeReminderSettings,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ProfileScreen() {
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

  // Les notifications locales n'existent que dans l'app mobile (expo-notifications).
  const notificationsSupported = Platform.OS !== "web";

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
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.terracotta }]}><Text style={userInitials ? styles.avatarText : styles.avatarEmoji}>{userInitials ?? "🌱"}</Text></View>
        <View style={styles.profileCopy}><Text style={[styles.profileName, { color: colors.foreground }]}>{profile.firstName?.trim() || "Mon balcon"}</Text><Text style={[styles.profileMeta, { color: colors.muted }]}>{balconyMeta}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Réglages du profil" onPress={startEditing} style={({ pressed }) => [styles.settingsButton, { borderColor: editing ? colors.primary : colors.border }, pressed && styles.pressed]}><Text style={[styles.settingsText, { color: colors.foreground }]}>⚙</Text></Pressable>
      </View>
      {editing && (
        <View style={[styles.editCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Ton prénom</Text>
          <View style={styles.editRow}>
            <TextInput value={nameDraft} onChangeText={setNameDraft} onSubmitEditing={() => void saveName()} placeholder="Pour que Balco te dise bonjour" placeholderTextColor={colors.muted} maxLength={30} autoFocus returnKeyType="done" style={[styles.nameInput, { borderColor: colors.border, color: colors.foreground }]} />
            <Pressable onPress={() => void saveName()} style={({ pressed }) => [styles.editButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.editButtonText}>OK</Text></Pressable>
          </View>
          <Pressable onPress={() => void redoOnboarding()} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.editLink, { color: colors.primary }]}>↻ Mettre à jour l’exposition et l’espace de mon balcon</Text></Pressable>
          <Pressable onPress={() => router.push("/garden")} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.editLink, { color: colors.primary }]}>🪴 Gérer mes plantes</Text></Pressable>
        </View>
      )}
      <LinearGradient colors={[colors.primary, "#5B9670"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.impactHero}>
        <View style={styles.impactHeroTop}><View><Text style={styles.impactHeroEyebrow}>MON IMPACT ÉCO</Text><Text style={styles.impactHeroTitle}>{progress.levelTitle}</Text></View><Text style={styles.impactHeroScore}>{progress.points}</Text></View>
        <View style={styles.heroProgressTrack}><View style={[styles.heroProgressFill, { width: `${Math.max(progress.pointsInLevel, 2)}%` }]} /></View>
        <View style={styles.impactHeroBottom}><Text style={styles.impactHeroCaption}>{progress.pointsToNext} points avant le niveau suivant</Text><Text style={styles.impactHeroLevel}>NIVEAU {progress.level}</Text></View>
      </LinearGradient>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.gestures}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>geste{stats.gestures > 1 ? "s" : ""} fait{stats.gestures > 1 ? "s" : ""}</Text></View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.streakDays}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>jour{stats.streakDays > 1 ? "s" : ""} de suite</Text></View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>{unlockedCount}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>badge{unlockedCount > 1 ? "s" : ""}</Text></View>
      </View>
      <View style={[styles.accountCard, { backgroundColor: account.signedIn ? colors.leaf : colors.cream }]}>
        <Text style={[styles.sectionEyebrow, { color: colors.terracotta }]}>SAUVEGARDE</Text>
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
            <Pressable disabled={account.checking} onPress={() => void signIn()} style={({ pressed }) => [styles.accountButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={styles.accountButtonText}>{account.checking ? "Vérification…" : "Se connecter"}</Text></Pressable>
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
      <View style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.reminderCardHeader}>
          <View style={styles.reminderCardCopy}><Text style={[styles.sectionEyebrow, { color: colors.terracotta }]}>RAPPELS CONTEXTUELS</Text><Text style={[styles.reminderCardTitle, { color: colors.foreground }]}>Seulement quand c’est utile</Text><Text style={[styles.reminderCardText, { color: colors.muted }]}>Balco croise la météo et ton dernier geste.</Text></View>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: reminderSettings.enabled, disabled: !notificationsSupported }} disabled={!settingsLoaded || !notificationsSupported} onPress={() => void toggleReminders()} style={({ pressed }) => [styles.toggle, { backgroundColor: reminderSettings.enabled ? colors.primary : colors.border, opacity: notificationsSupported ? 1 : 0.5 }, pressed && styles.pressed]}><View style={[styles.toggleKnob, reminderSettings.enabled && styles.toggleKnobOn]} /></Pressable>
        </View>
        {!notificationsSupported && <Text style={[styles.reminderWebNote, { backgroundColor: colors.cream, color: colors.foreground }]}>Les rappels arrivent en notification sur ton téléphone : active-les depuis l’app Balco pour iPhone ou Android. La version web ne peut pas envoyer de notifications.</Text>}
        <View style={styles.reminderOptionRow}><Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Rappel préféré</Text><View style={styles.timeChoices}>{[17, 18, 19].map((hour) => <Pressable key={hour} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ preferredHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.preferredHour === hour ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour}h30</Text></Pressable>)}</View></View>
        <View style={styles.quietBlock}><View><Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Plage calme</Text><Text style={[styles.reminderOptionHint, { color: colors.muted }]}>Aucune notification pendant ces heures</Text></View><Text style={[styles.reminderQuietValue, { color: colors.primary }]}>{reminderSettings.quietStartHour} → {reminderSettings.quietEndHour} h</Text></View>
        <View style={styles.quietChoices}><View style={styles.quietChoiceGroup}><Text style={[styles.quietChoiceLabel, { color: colors.muted }]}>Début</Text><View style={styles.timeChoices}>{[20, 21, 22].map((hour) => <Pressable key={`start-${hour}`} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ quietStartHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.quietStartHour === hour ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour} h</Text></Pressable>)}</View></View><View style={styles.quietChoiceGroup}><Text style={[styles.quietChoiceLabel, { color: colors.muted }]}>Fin</Text><View style={styles.timeChoices}>{[7, 8, 9].map((hour) => <Pressable key={`end-${hour}`} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ quietEndHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.quietEndHour === hour ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour} h</Text></Pressable>)}</View></View></View>
        <Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Plantes concernées</Text>
        {resolvedPlants.length === 0 && <Text style={[styles.reminderOptionHint, { color: colors.muted, marginTop: -8 }]}>Ajoute des plantes à ton balcon pour choisir lesquelles suivre.</Text>}
        <View style={styles.plantToggles}>{resolvedPlants.map((resolved) => { const enabled = isPlantEnabled(resolved.plant.id); return <Pressable key={resolved.plant.id} disabled={!reminderSettings.enabled} onPress={() => void togglePlant(resolved.plant.id)} style={[styles.plantToggle, { backgroundColor: enabled ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={styles.plantToggleIcon}>{resolved.entry.emoji}</Text><Text style={[styles.plantToggleText, { color: colors.foreground }]}>{plantDisplayName(resolved)}</Text><Text style={[styles.plantToggleCheck, { color: enabled ? colors.primary : colors.muted }]}>{enabled ? "✓" : "·"}</Text></Pressable>; })}</View>
      </View>
      <View style={styles.badgeHeading}><View><Text style={[styles.sectionEyebrow, { color: colors.terracotta }]}>PETITES VICTOIRES</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes badges éco</Text></View><Text style={[styles.badgeCount, { color: colors.primary }]}>{unlockedCount}/{badges.length}</Text></View>
    </>
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.badgeRow}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => Alert.alert(item.title, item.unlocked ? `Débloqué : ${item.detail.toLowerCase()}.` : `${item.detail} — encore ${item.target - item.current} pour le débloquer.`)} style={({ pressed }) => [styles.badgeCard, { backgroundColor: item.unlocked ? colors.surface : "#F0EEE8", borderColor: item.unlocked ? colors.border : "#E3E0D8" }, pressed && styles.pressed]}>
            <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? item.tone : "#E4E1D9" }]}><Text style={[styles.badgeIconText, { color: item.unlocked ? colors.foreground : "#A8AAA4" }]}>{item.unlocked ? item.icon : "·"}</Text></View>
            <Text style={[styles.badgeTitle, { color: item.unlocked ? colors.foreground : colors.muted }]}>{item.title}</Text>
            <Text style={[styles.badgeDetail, { color: item.unlocked ? colors.muted : "#A8AAA4" }]}>{item.detail}</Text>
            {!item.unlocked && <Text style={[styles.badgeProgress, { color: colors.muted }]}>{item.current} / {item.target}</Text>}
            {item.unlocked && <PopIn delay={180} style={[styles.unlockedMark, { backgroundColor: colors.leaf }]}><Text style={[styles.unlockedMarkText, { color: colors.primary }]}>✓</Text></PopIn>}
          </Pressable>
        )}
        ListFooterComponent={<View style={[styles.footerCard, { backgroundColor: colors.cream }]}><Text style={styles.footerIcon}>♧</Text><View style={styles.footerCopy}><Text style={[styles.footerTitle, { color: colors.foreground }]}>Chaque geste compte.</Text><Text style={[styles.footerText, { color: colors.muted }]}>Invite un proche à faire pousser quelque chose.</Text></View><Text style={[styles.footerArrow, { color: colors.terracotta }]}>›</Text></View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 30 },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: { width: 53, height: 53, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  avatarEmoji: { fontSize: 24 },
  editCard: { borderRadius: 19, borderWidth: 1, padding: 14, gap: 10, marginTop: -8, marginBottom: 16 },
  editRow: { flexDirection: "row", gap: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14 },
  editButton: { borderRadius: 12, paddingHorizontal: 15, justifyContent: "center" },
  editButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  editLink: { fontSize: 12, fontWeight: "800" },
  profileCopy: { flex: 1, marginLeft: 13 },
  profileName: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  profileMeta: { fontSize: 12, marginTop: 4 },
  settingsButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  settingsText: { fontSize: 17 },
  impactHero: { borderRadius: 25, padding: 19, shadowColor: "#2E6B4D", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  impactHeroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  impactHeroEyebrow: { color: "rgba(255,255,255,0.64)", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  impactHeroTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", marginTop: 5 },
  impactHeroScore: { color: "#FFFFFF", fontSize: 40, lineHeight: 41, fontWeight: "300", letterSpacing: -1 },
  heroProgressTrack: { height: 8, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", marginTop: 20 },
  heroProgressFill: { height: 8, borderRadius: 5, backgroundColor: "#F5D27C" },
  impactHeroBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  impactHeroCaption: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  impactHeroLevel: { color: "#F5D27C", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 14, marginBottom: 27 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 17, paddingVertical: 13, alignItems: "center" },
  statValue: { fontSize: 21, fontWeight: "800" },
  statLabel: { fontSize: 10, marginTop: 3 },
  accountCard: { borderRadius: 21, padding: 15, marginBottom: 16, gap: 2 },
  accountActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  accountButton: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  accountButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  accountButtonGhost: { paddingHorizontal: 6, paddingVertical: 9 },
  accountGhostText: { fontSize: 12, fontWeight: "800" },
  deleteBlock: { marginTop: 12, gap: 4 },
  deleteLink: { fontSize: 11, fontWeight: "700" },
  reminderCard: { borderRadius: 21, borderWidth: 1, padding: 15, marginBottom: 25, gap: 14 },
  reminderCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  reminderCardCopy: { flex: 1 },
  reminderWebNote: { fontSize: 12, lineHeight: 18, borderRadius: 14, padding: 12, marginTop: 12 },
  reminderCardTitle: { fontSize: 17, fontWeight: "800", marginTop: 4 },
  reminderCardText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  toggle: { width: 47, height: 28, borderRadius: 15, padding: 3, justifyContent: "center" },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" },
  toggleKnobOn: { alignSelf: "flex-end" },
  reminderOptionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  reminderOptionLabel: { fontSize: 12, fontWeight: "800" },
  reminderOptionHint: { fontSize: 10, marginTop: 3 },
  reminderQuietValue: { fontSize: 12, fontWeight: "800" },
  quietBlock: { gap: 9 },
  quietChoices: { flexDirection: "row", gap: 12 },
  quietChoiceGroup: { flex: 1, gap: 5 },
  quietChoiceLabel: { fontSize: 10, fontWeight: "700" },
  timeChoices: { flexDirection: "row", gap: 6 },
  timeChoice: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  timeChoiceText: { fontSize: 10, fontWeight: "800" },
  plantToggles: { gap: 7, marginTop: -6 },
  plantToggle: { borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  plantToggleIcon: { fontSize: 16 },
  plantToggleText: { flex: 1, fontSize: 11, fontWeight: "700" },
  plantToggleCheck: { fontSize: 16, fontWeight: "900" },
  badgeHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 13 },
  sectionEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  sectionTitle: { fontSize: 21, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  badgeCount: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  badgeRow: { gap: 12, marginBottom: 12 },
  badgeCard: { flex: 1, minHeight: 164, borderRadius: 21, borderWidth: 1, padding: 14, position: "relative", shadowColor: "#9B7D67", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  badgeIcon: { width: 47, height: 47, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badgeIconText: { fontSize: 25, fontWeight: "700" },
  badgeTitle: { fontSize: 13, lineHeight: 16, fontWeight: "800", marginTop: 13 },
  badgeDetail: { fontSize: 10, lineHeight: 14, marginTop: 5 },
  badgeProgress: { fontSize: 10, fontWeight: "800", marginTop: 6 },
  unlockedMark: { width: 19, height: 19, borderRadius: 10, position: "absolute", right: 11, top: 11, alignItems: "center", justifyContent: "center" },
  unlockedMarkText: { fontSize: 12, fontWeight: "800" },
  footerCard: { borderRadius: 20, padding: 15, flexDirection: "row", alignItems: "center", marginTop: 8 },
  footerIcon: { color: "#C56D52", fontSize: 28 },
  footerCopy: { flex: 1, marginLeft: 12 },
  footerTitle: { fontSize: 13, fontWeight: "800" },
  footerText: { fontSize: 11, marginTop: 4 },
  footerArrow: { fontSize: 28, fontWeight: "300" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
