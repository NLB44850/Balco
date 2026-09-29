/**
 * Réglages, à part de Moi : ton prénom, ton balcon (expérience, soleil, espace, envies), tes rappels,
 * ta sauvegarde et ton compte. Chaque changement s'enregistre tout de suite, sans bouton « Valider ».
 * S'ouvre depuis la roue crantée de Moi.
 */
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text, TextInput } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useWeatherSimulation } from "@/hooks/use-weather-simulation";
import { useGarden } from "@/lib/garden/garden-context";
import { plantDisplayName, relativeDay } from "@/lib/garden/garden-logic";
import { EXPERIENCE_OPTIONS, GOAL_OPTIONS, SPACE_OPTIONS, SUNLIGHT_OPTIONS, type OnboardingOption } from "@/lib/garden/onboarding";
import { notificationsUnavailableReason } from "@/lib/notifications/module";
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
import { WEATHER_SCENARIOS } from "@/lib/weather/simulation";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { resolvedPlants, profile, onboarding, account, updateProfile, updateOnboarding, signIn, signOut, syncNow, deleteAccount } = useGarden();
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.firstName ?? "");
  const [nameSaved, setNameSaved] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  // Le profil peut finir de charger après l'ouverture de l'écran : on reprend le prénom tant qu'il n'est pas modifié.
  useEffect(() => {
    if (!nameTouched) setNameDraft(profile.firstName ?? "");
  }, [nameTouched, profile.firstName]);
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

  const saveName = async () => {
    await updateProfile({ firstName: nameDraft.trim() || undefined });
    setNameSaved(true);
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

  const answers = onboarding?.skipped ? {} : onboarding ?? {};
  /** Une question de l'accueil, en pastilles : un toucher change la réponse. */
  const choices = (label: string, options: OnboardingOption[], selected: (id: string) => boolean, onPick: (id: string) => void) => (
    <View style={styles.choiceGroup}>
      <Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const active = selected(option.id);
          return (
            <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onPick(option.id)} style={({ pressed }) => [styles.choice, { backgroundColor: active ? colors.primary : "rgba(255,255,255,0.8)", borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.choiceText, { color: active ? "#FFFFFF" : colors.foreground }]}>{option.icon} {option.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
  const goals = answers.goals ?? [];

  return (
    <LightScreen bottom>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Réglages" subtitle="Tout s’enregistre tout de suite" style={styles.header} />

        <Text style={[styles.section, { color: colors.foreground }]}>Toi</Text>
        <View style={[glass.card, styles.card]}>
          <Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Ton prénom</Text>
          <View style={styles.editRow}>
            <TextInput value={nameDraft} onChangeText={(value) => { setNameDraft(value); setNameTouched(true); setNameSaved(false); }} onSubmitEditing={() => void saveName()} onBlur={() => void saveName()} placeholder="Pour que Balco te dise bonjour" placeholderTextColor={colors.muted} maxLength={30} returnKeyType="done" style={[styles.nameInput, { borderColor: colors.border, color: colors.foreground }]} />
            <Pressable accessibilityRole="button" onPress={() => void saveName()} style={({ pressed }) => [styles.editButton, { backgroundColor: nameSaved ? colors.leaf : colors.primary }, pressed && styles.pressed]}><Text style={[styles.editButtonText, nameSaved && { color: colors.primary }]}>{nameSaved ? "✓" : "OK"}</Text></Pressable>
          </View>
          {choices("Ton expérience", EXPERIENCE_OPTIONS, (id) => answers.experience === id, (id) => void updateOnboarding({ experience: id }))}
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>Mon balcon</Text>
        <View style={[glass.card, styles.card]}>
          <Text style={[styles.reminderCardText, { color: colors.muted, marginTop: 0 }]}>Balco s’en sert pour te proposer des plantes et des dates qui marchent chez toi.</Text>
          {choices("Soleil", SUNLIGHT_OPTIONS, (id) => answers.sunlight === id, (id) => void updateOnboarding({ sunlight: id }))}
          {choices("Espace", SPACE_OPTIONS, (id) => answers.space === id, (id) => void updateOnboarding({ space: id }))}
          {choices("Tes envies (plusieurs choix)", GOAL_OPTIONS, (id) => goals.includes(id), (id) => void updateOnboarding({ goals: goals.includes(id) ? goals.filter((goal) => goal !== id) : [...goals, id] }))}
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/balcony")} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
            <Text style={[styles.linkText, { color: colors.primary }]}>🪴  Gérer mes plantes</Text>
            <Text style={[styles.linkArrow, { color: colors.muted }]}>›</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>Rappels</Text>
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


        <Text style={[styles.section, { color: colors.foreground }]}>Sauvegarde et compte</Text>
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
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginBottom: 8 },
  section: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, marginTop: 18, marginBottom: 10 },
  card: { padding: 15, gap: 14 },
  choiceGroup: { gap: 8 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  choiceText: { fontSize: 13, fontWeight: "600" },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  linkText: { fontSize: 15, fontWeight: "700" },
  linkArrow: { fontSize: 24, fontWeight: "300" },
  editRow: { flexDirection: "row", gap: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14 },
  editButton: { borderRadius: 12, paddingHorizontal: 15, justifyContent: "center" },
  editButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
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
  sectionEyebrow: { fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
