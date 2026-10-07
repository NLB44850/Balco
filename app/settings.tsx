/**
 * Réglages, à part de Moi : une liste simple où chaque ligne montre sa valeur ; la toucher ouvre une feuille du
 * bas avec les mêmes choix que l'accueil (lignes : components/settings, valeurs : lib/garden/settings-summary.ts).
 * Ton balcon, tes rappels, toi, ta sauvegarde et ton compte. Chaque changement s'enregistre tout de suite, sans bouton « Valider ».
 * S'ouvre depuis la roue crantée de Moi.
 */
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CityPicker } from "@/components/city-picker";
import { ChoiceList } from "@/components/settings/choice-list";
import { SettingRow, SettingsGroup, SheetHeading } from "@/components/settings/rows";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { LightScreen } from "@/components/light-screen";
import { CatalogPicture, PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text, TextInput } from "@/components/ui/typography";
import { freeBenefits, plusBenefits } from "@/lib/plans";
import { useColors } from "@/hooks/use-colors";
import { useLocalWeather } from "@/hooks/use-local-weather";
import { useWeatherSimulation } from "@/hooks/use-weather-simulation";
import { useGarden } from "@/lib/garden/garden-context";
import { dayKey, plantDisplayName, relativeDay } from "@/lib/garden/garden-logic";
import { harvestEndStates, potIsFree } from "@/lib/garden/harvest-end";
import { GOAL_OPTIONS, SPACE_OPTIONS, SUNLIGHT_UNKNOWN } from "@/lib/garden/onboarding";
import { NORA_LEVELS } from "@/lib/ai/memory";
import { cityValue, goalsValue, NOT_YET, spaceValue, springWishEntries, springWishesValue, SUNLIGHT_CHOICES, sunlightChoice, sunlightPatch, SUNLIGHT_TIP, sunlightValue } from "@/lib/garden/settings-summary";
import { nextSpringReminder, SPRING_REMINDER_SOURCE, springReminderContent } from "@/lib/garden/spring";
import { notificationsUnavailableReason } from "@/lib/notifications/module";
import { activateReminders, NOTIFICATIONS_DENIED } from "@/lib/reminders/activate";
import {
  clearAndDisableLocalReminders,
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  loadReminderSnoozes,
  notificationPermission,
  requestLocalNotificationPermission,
  saveLocalReminderSettings,
  scheduleDatedReminder,
  sendTestNotification,
  subscribeReminderSettings,
  subscribeReminderSnoozes,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";
import type { ReminderSnooze } from "@/lib/reminders/reminder-actions";
import { coversReminder, followedText, hourText, isFollowed, QUIET_END_HOURS, QUIET_START_HOURS, quietText, REMINDER_HOURS, reminderHourChoice, toggleFollowed, vacationText, withReminderHour } from "@/lib/reminders/settings-text";
import { WEATHER_SCENARIOS } from "@/lib/weather/simulation";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { resolvedPlants, profile, onboarding, account, updateProfile, updateOnboarding, signIn, signOut, syncNow, claimThisDevice, deleteAccount } = useGarden();
  const answers = onboarding?.skipped ? {} : onboarding ?? {};
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
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

  const location = useLocalWeather();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [sheet, setSheet] = useState<"sun" | "space" | "goals" | "spring" | "name" | "level" | "hour" | "quiet" | "plants" | "check" | null>(null);
  const closeSheet = () => setSheet(null);
  // « Envies » : plusieurs choix, enregistrés d'un coup par « Enregistrer ».
  const [goalsDraft, setGoalsDraft] = useState<string[]>([]);
  const openGoals = () => {
    setGoalsDraft(answers.goals ?? []);
    setSheet("goals");
  };
  const springWishes = springWishEntries(onboarding?.springWishes);
  /** « Retirer » : la plante quitte les envies ; la notification du 1er mars suit (plus rien s'il n'en reste pas). */
  const removeSpringWish = async (catalogId: string) => {
    const wishes = (onboarding?.springWishes ?? []).filter((id) => id !== catalogId);
    await updateOnboarding({ springWishes: wishes });
    const entries = springWishEntries(wishes);
    void scheduleDatedReminder(SPRING_REMINDER_SOURCE, springReminderContent(entries), entries.length > 0 ? nextSpringReminder(new Date()) : null).catch(() => undefined);
  };

  const toggleReminders = async () => {
    if (reminderSettings.enabled) {
      await clearAndDisableLocalReminders();
      setReminderSettings((current) => ({ ...current, enabled: false }));
      return;
    }
    const result = await activateReminders(reminderSettings, { requestPermission: requestLocalNotificationPermission, save: (next) => updateReminderSettings(next) });
    refreshPermission();
    if (result.status === "denied") Alert.alert(NOTIFICATIONS_DENIED.title, NOTIFICATIONS_DENIED.message);
  };

  // Les plantes qui peuvent avoir un rappel : ni « à planter » ni pot libre (lib/garden/harvest-end.ts).
  const [snoozes, setSnoozes] = useState<ReminderSnooze[]>([]);
  useEffect(() => {
    void loadReminderSnoozes().then(setSnoozes);
    return subscribeReminderSnoozes(setSnoozes);
  }, []);
  const harvestEnds = harvestEndStates(snoozes, new Date());
  const eligiblePlants = resolvedPlants.filter((resolved) => !resolved.plant.toPlant && !potIsFree(resolved, harvestEnds.get(resolved.plant.id)));

  // L'autorisation du téléphone, relue au retour dans l'app (après un passage par ses réglages).
  const [permission, setPermission] = useState<Awaited<ReturnType<typeof notificationPermission>>>("unavailable");
  const refreshPermission = useCallback(() => void notificationPermission().then(setPermission).catch(() => undefined), []);
  useEffect(() => {
    refreshPermission();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);
  const blocked = notificationsSupported && reminderSettings.enabled && (permission === "denied" || permission === "blocked");
  const remindersOn = notificationsSupported && reminderSettings.enabled;
  const unsupportedShort = notificationsUnavailableReason === "expo-go-android" ? "Pas dans Expo Go : installe la version de test." : "Dans l’app Android seulement.";
  const unsupportedLong = notificationsUnavailableReason === "expo-go-android" ? "Expo Go ne permet plus les notifications sur Android : pour tester les rappels, installe la version de test de Balco." : "Les rappels arrivent en notification sur ton téléphone : active-les depuis l’app Balco pour Android. La version web ne peut pas envoyer de notifications.";

  const [hourNotice, setHourNotice] = useState<string | null>(null);
  const openHour = () => {
    setHourNotice(null);
    setSheet("hour");
  };
  /** L'heure du conseil ne tombe jamais dans la plage calme : sinon la plage s'ajuste, et la feuille le dit. */
  const pickHour = async (hour: number) => {
    const { patch, notice } = withReminderHour(reminderSettings, hour);
    await updateReminderSettings(patch);
    if (notice) setHourNotice(notice);
    else closeSheet();
  };
  const quietChip = (key: string, label: string, active: boolean, covers: boolean, onPress: () => void, accessibilityLabel: string) => (
    <Pressable key={key} accessibilityRole="radio" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: active, disabled: covers }} aria-checked={active} disabled={covers} onPress={onPress} style={({ pressed }) => [styles.hourChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : "transparent", opacity: covers ? 0.35 : 1 }, pressed && styles.pressed]}>
      <Text style={[styles.hourChipText, { color: active ? "#FFFFFF" : colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  const openCheck = () => {
    setTestStatus("idle");
    refreshPermission();
    setSheet("check");
  };
  const allowNotifications = async () => {
    if (permission === "blocked") return Linking.openSettings();
    await requestLocalNotificationPermission();
    refreshPermission();
  };
  const openBatterySettings = async () => {
    try {
      await Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
    } catch {
      await Linking.openSettings();
    }
  };

  const openName = () => {
    setNameDraft(profile.firstName ?? "");
    setSheet("name");
  };
  const saveName = async () => {
    await updateProfile({ firstName: nameDraft.trim() || undefined });
    closeSheet();
  };

  const syncLabel = !account.signedIn
    ? null
    : account.status === "syncing"
      ? "Synchronisation…"
      : account.status === "offline"
        ? "Hors ligne : tes changements partiront dès que possible."
        : account.status === "other-device"
          ? "Ton jardin est sauvegardé depuis un autre téléphone : les changements faits ici restent sur ce téléphone."
        : account.lastSyncedAt
          ? `Sauvegardé ${relativeDay(new Date(account.lastSyncedAt))} à ${new Date(account.lastSyncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
          : "Première sauvegarde en cours…";

  return (
    <LightScreen bottom>
      <CityPicker visible={cityPickerOpen} onClose={() => setCityPickerOpen(false)} searchCities={location.searchCities} selectCity={location.selectCity} requestDeviceLocation={location.requestDeviceLocation} />
      <BottomSheet visible={sheet === "hour"} onClose={closeSheet}>
        <SheetHeading title="À quelle heure ?" intro="Ton conseil du jour arrive à cette heure-là. Les alertes gel et orage arrivent quand il le faut, hors de ta plage calme." />
        <ChoiceList choices={REMINDER_HOURS.map((hour) => ({ id: String(hour), title: reminderHourChoice(hour, reminderSettings.preferredMinute) }))} selected={(id) => reminderSettings.preferredHour === Number(id)} onPick={(id) => void pickHour(Number(id))} />
        {hourNotice && <Text style={[styles.sheetNote, { color: colors.foreground }]}>{hourNotice}</Text>}
      </BottomSheet>
      <BottomSheet visible={sheet === "quiet"} onClose={closeSheet}>
        <SheetHeading title="Ta plage calme" intro="Balco ne t’envoie rien pendant ces heures." />
        <Text style={[styles.sheetLabel, { color: colors.foreground }]}>Début</Text>
        <View style={styles.hourChips}>
          {QUIET_START_HOURS.map((hour) => quietChip(`start-${hour}`, hourText(hour), reminderSettings.quietStartHour === hour, coversReminder(reminderSettings, { quietStartHour: hour }), () => void updateReminderSettings({ quietStartHour: hour }), `Début ${hourText(hour)}`))}
        </View>
        <Text style={[styles.sheetLabel, { color: colors.foreground }]}>Fin</Text>
        <View style={styles.hourChips}>
          {QUIET_END_HOURS.map((hour) => quietChip(`end-${hour}`, hourText(hour), reminderSettings.quietEndHour === hour, coversReminder(reminderSettings, { quietEndHour: hour }), () => void updateReminderSettings({ quietEndHour: hour }), `Fin ${hourText(hour)}`))}
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet === "plants"} onClose={closeSheet}>
        <SheetHeading title="Plantes suivies" intro="Décoche une plante pour ne plus recevoir ses rappels. Ses gestes restent sur Aujourd’hui." />
        {eligiblePlants.map((resolved) => {
          const followed = isFollowed(reminderSettings.enabledPlantIds, resolved.plant.id);
          const name = plantDisplayName(resolved);
          return (
            <Pressable key={resolved.plant.id} accessibilityRole="checkbox" accessibilityLabel={name} accessibilityState={{ checked: followed }} aria-checked={followed} onPress={() => void updateReminderSettings({ enabledPlantIds: toggleFollowed(eligiblePlants.map(({ plant }) => plant.id), reminderSettings.enabledPlantIds, resolved.plant.id) })} style={({ pressed }) => [styles.wishRow, { borderColor: colors.border }, pressed && styles.pressed]}>
              <PlantPicture resolved={resolved} style={styles.wishPicture} />
              <Text style={[styles.wishName, { color: colors.foreground }]}>{name}</Text>
              <View style={[styles.box, { borderColor: followed ? colors.primary : colors.border, backgroundColor: followed ? colors.primary : "transparent" }]}>{followed && <Text style={styles.boxMark}>✓</Text>}</View>
            </Pressable>
          );
        })}
        <Text style={[styles.sheetHint, { color: colors.muted }]}>Les plantes à planter et les pots libres n’ont pas de rappel.</Text>
      </BottomSheet>
      <BottomSheet visible={sheet === "check"} onClose={closeSheet}>
        <SheetHeading title="On vérifie ensemble" />
        {!notificationsSupported ? (
          <Text style={[styles.sheetNote, { color: colors.foreground }]}>{unsupportedLong}</Text>
        ) : (
          <>
            <View style={[styles.checkRow, { borderColor: colors.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.checkTitle, { color: colors.foreground }]}>Autorisation du téléphone</Text>
              </View>
              {permission === "granted" ? <Text style={[styles.checkOk, { color: colors.primary }]}>✓</Text> : (
                <Pressable accessibilityRole="button" onPress={() => void allowNotifications()} style={({ pressed }) => [styles.checkButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={styles.checkButtonText}>Autoriser</Text>
                </Pressable>
              )}
            </View>
            {Platform.OS === "android" && (
              <View style={[styles.checkRow, { borderColor: colors.border }]}>
                <View style={styles.flex}>
                  <Text style={[styles.checkTitle, { color: colors.foreground }]}>Économie de batterie</Text>
                  <Text style={[styles.checkText, { color: colors.muted }]}>Sur certains téléphones, elle bloque les rappels.</Text>
                  <Text style={[styles.checkWatch, { color: "#D2642A" }]}>À vérifier</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void openBatterySettings()} style={({ pressed }) => [styles.checkButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={styles.checkButtonText}>Ouvrir les réglages</Text>
                </Pressable>
              </View>
            )}
            <View style={[styles.checkRow, { borderColor: colors.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.checkTitle, { color: colors.foreground }]}>Rappel test</Text>
                {testStatus === "sent" && <Text style={[styles.checkText, { color: colors.muted }]}>Il arrive dans 5 secondes. Verrouille ton téléphone pour le voir comme un vrai rappel.</Text>}
                {testStatus === "denied" && <Text style={[styles.checkText, { color: colors.error }]}>Les notifications sont bloquées : autorise-les d’abord.</Text>}
              </View>
              {testStatus === "sent" ? <Text style={[styles.checkOk, { color: colors.primary }]}>✓</Text> : (
                <Pressable accessibilityRole="button" disabled={testStatus === "sending"} onPress={() => void sendTest()} style={({ pressed }) => [styles.checkButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={styles.checkButtonText}>{testStatus === "sending" ? "Envoi…" : "M’envoyer un rappel test"}</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </BottomSheet>
      <BottomSheet visible={sheet === "name"} onClose={closeSheet}>
        <SheetHeading title="Ton prénom" intro="Pour que Balco et Nora te disent bonjour." />
        <TextInput value={nameDraft} onChangeText={setNameDraft} onSubmitEditing={() => void saveName()} accessibilityLabel="Ton prénom" placeholder="Ton prénom" placeholderTextColor={colors.muted} maxLength={30} returnKeyType="done" autoFocus style={[styles.sheetInput, { borderColor: colors.border, color: colors.foreground }]} />
        <Pressable accessibilityRole="button" onPress={() => void saveName()} style={({ pressed }) => [styles.sheetButton, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
          <Text style={[styles.sheetButtonText, { color: colors.background }]}>Enregistrer</Text>
        </Pressable>
      </BottomSheet>
      <BottomSheet visible={sheet === "level"} onClose={closeSheet}>
        <SheetHeading title="Comment Nora te parle ?" intro="Tu peux aussi le changer depuis Nora." />
        <ChoiceList choices={NORA_LEVELS} selected={(id) => answers.experience === id} onPick={(id) => { void updateOnboarding({ experience: id }); closeSheet(); }} />
      </BottomSheet>
      <BottomSheet visible={sheet === "sun"} onClose={closeSheet}>
        <SheetHeading title="Combien de soleil reçoit ton balcon ?" intro="Une estimation suffit : les plantes proposées seront plus justes." />
        <ChoiceList choices={SUNLIGHT_CHOICES} selected={(id) => sunlightChoice(answers) === id} onPick={(id) => { void updateOnboarding(sunlightPatch(id)); closeSheet(); }} hints={{ [SUNLIGHT_UNKNOWN.id]: SUNLIGHT_TIP }} />
      </BottomSheet>
      <BottomSheet visible={sheet === "space"} onClose={closeSheet}>
        <SheetHeading title="Quelle place as-tu ?" intro="Balco évite les plantes trop grandes pour ton espace." />
        <ChoiceList choices={SPACE_OPTIONS} selected={(id) => answers.space === id} onPick={(id) => { void updateOnboarding({ space: id }); closeSheet(); }} />
      </BottomSheet>
      <BottomSheet visible={sheet === "goals"} onClose={closeSheet}>
        <SheetHeading title="Qu’aimerais-tu cultiver ?" intro="Choisis tout ce qui te donne envie." />
        <ChoiceList multiple choices={GOAL_OPTIONS} selected={(id) => goalsDraft.includes(id)} onPick={(id) => setGoalsDraft((current) => (current.includes(id) ? current.filter((goal) => goal !== id) : [...current, id]))} />
        <Pressable accessibilityRole="button" onPress={() => { void updateOnboarding({ goals: GOAL_OPTIONS.map((option) => option.id).filter((id) => goalsDraft.includes(id)) }); closeSheet(); }} style={({ pressed }) => [styles.sheetButton, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
          <Text style={[styles.sheetButtonText, { color: colors.background }]}>Enregistrer</Text>
        </Pressable>
      </BottomSheet>
      <BottomSheet visible={sheet === "spring"} onClose={closeSheet}>
        <SheetHeading title="Tes envies du printemps" intro="Balco te les reproposera en mars." />
        {springWishes.length === 0 && <Text style={[styles.sheetNote, { color: colors.muted }]}>Quand tu laisses un pot au repos, tu peux garder la plante ici pour le printemps.</Text>}
        {springWishes.map((entry) => (
          <View key={entry.id} style={[styles.wishRow, { borderColor: colors.border }]}>
            <CatalogPicture entry={entry} style={styles.wishPicture} />
            <Text style={[styles.wishName, { color: colors.foreground }]}>{entry.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${entry.name}`} onPress={() => void removeSpringWish(entry.id)} hitSlop={6} style={({ pressed }) => [styles.wishRemove, { borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.wishRemoveText, { color: colors.foreground }]}>Retirer</Text>
            </Pressable>
          </View>
        ))}
      </BottomSheet>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Réglages" subtitle="Tout s’enregistre tout de suite" style={styles.header} />

        <SettingsGroup title="Mon balcon">
          <SettingRow label="Ville" value={cityValue(location.weather)} onPress={() => setCityPickerOpen(true)} />
          <SettingRow label="Soleil" value={sunlightValue(answers)} onPress={() => setSheet("sun")} />
          <SettingRow label="Espace" value={spaceValue(answers.space)} onPress={() => setSheet("space")} />
          <SettingRow label="Envies" value={goalsValue(answers.goals)} onPress={openGoals} />
          <SettingRow label="Envies du printemps" value={springWishesValue(onboarding?.springWishes)} onPress={() => setSheet("spring")} />
        </SettingsGroup>

        <SettingsGroup title="Rappels">
          <SettingRow label="Mode vacances" value={vacationText(reminderSettings.vacation, dayKey(new Date()))} onPress={() => router.push("/vacation")} />
          <SettingRow
            label="Rappels"
            subtitle={!notificationsSupported ? unsupportedShort : blocked ? "Bloqués par ton téléphone" : "Un conseil par jour au plus, et les alertes météo."}
            accessory={
              <Pressable accessibilityRole="switch" accessibilityLabel="Rappels" accessibilityState={{ checked: reminderSettings.enabled, disabled: !notificationsSupported }} aria-checked={reminderSettings.enabled} disabled={!settingsLoaded || !notificationsSupported} onPress={() => void toggleReminders()} style={({ pressed }) => [styles.toggle, { backgroundColor: reminderSettings.enabled ? colors.primary : colors.border, opacity: notificationsSupported ? 1 : 0.5 }, pressed && styles.pressed]}>
                <View style={[styles.toggleKnob, reminderSettings.enabled && styles.toggleKnobOn]} />
              </Pressable>
            }
          />
          {blocked && (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={({ pressed }) => [styles.inlineButton, { borderColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={[styles.inlineButtonText, { color: colors.primary }]}>Ouvrir les réglages du téléphone</Text>
            </Pressable>
          )}
          <SettingRow label="Heure" value={hourText(reminderSettings.preferredHour, reminderSettings.preferredMinute)} disabled={!remindersOn} onPress={openHour} />
          <SettingRow label="Plage calme" value={quietText(reminderSettings)} disabled={!remindersOn} onPress={() => setSheet("quiet")} />
          <SettingRow label="Plantes suivies" value={followedText(eligiblePlants.map(({ plant }) => plant.id), reminderSettings.enabledPlantIds)} disabled={!remindersOn} onPress={() => setSheet("plants")} />
          <SettingRow label="Je ne reçois pas les rappels" onPress={openCheck} />
        </SettingsGroup>

        <SettingsGroup title="Toi">
          <SettingRow label="Prénom" value={profile.firstName || NOT_YET} onPress={openName} />
          <SettingRow label="Comment Nora te parle" value={NORA_LEVELS.find((level) => level.id === answers.experience)?.short ?? NOT_YET} onPress={() => setSheet("level")} />
        </SettingsGroup>

        <Text style={[styles.section, { color: colors.foreground }]}>Sauvegarde et compte</Text>
        <View style={[glass.card, styles.accountCard]}>
          <Text style={[styles.sectionEyebrow, { color: colors.muted }]}>Sauvegarde</Text>
          <Text style={[styles.reminderCardTitle, { color: colors.foreground }]}>{!account.signedIn ? "Ne perds jamais ton balcon" : account.status === "other-device" ? "Sauvegardé depuis un autre téléphone" : "Ton balcon est sauvegardé"}</Text>
          <Text style={[styles.reminderCardText, { color: colors.muted }]}>
            {account.signedIn ? `${account.email ? `Connecté avec ${account.email}. ` : ""}${syncLabel}` : "Crée ton compte gratuit en une minute :"}
          </Text>
          {/* L'offre dite en bénéfices (lib/plans.ts) : ce que tu as, puis ce que Balco+ ajoute. */}
          {account.signedIn && account.plan === "plus" ? (
            <View style={styles.benefits}>
              <Text style={[styles.benefitsTitle, { color: colors.foreground }]}>Avec Balco+, tu profites de :</Text>
              {plusBenefits().map((benefit) => <Text key={benefit} style={[styles.reminderCardText, { color: colors.foreground }]}>✓  {benefit}</Text>)}
              {account.founder && <Text style={[styles.reminderCardText, { color: colors.primary }]}>Tu as le prix fondateur : merci d’être là depuis le début.</Text>}
            </View>
          ) : (
            <View style={styles.benefits}>
              {freeBenefits().map((benefit) => <Text key={benefit} style={[styles.reminderCardText, { color: colors.foreground }]}>✓  {benefit}</Text>)}
              {account.signedIn && (
                <>
                  <Text style={[styles.benefitsTitle, { color: colors.foreground }]}>Bientôt, avec Balco+ :</Text>
                  {plusBenefits().map((benefit) => <Text key={benefit} style={[styles.reminderCardText, { color: colors.muted }]}>＋  {benefit}</Text>)}
                  {account.founder && <Text style={[styles.reminderCardText, { color: colors.primary }]}>Ton prix fondateur reste à toi si tu reprends Balco+.</Text>}
                </>
              )}
            </View>
          )}
          <View style={styles.accountActions}>
            {account.signedIn ? (
              <>
                <Pressable accessibilityRole="button" disabled={account.status === "syncing"} onPress={() => void (account.status === "other-device" ? claimThisDevice() : syncNow())} style={({ pressed }) => [styles.accountButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.accountButtonText}>{account.status === "other-device" ? "Sauvegarder depuis ce téléphone" : "Synchroniser"}</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => void signOut()} style={({ pressed }) => [styles.accountButtonGhost, pressed && styles.pressed]}><Text style={[styles.accountGhostText, { color: colors.primary }]}>Se déconnecter</Text></Pressable>
              </>
            ) : account.loginAvailable ? (
              <Pressable disabled={account.checking} onPress={() => void signIn()} style={({ pressed }) => [styles.accountButton, { backgroundColor: colors.foreground }, pressed && styles.pressed]}><Text style={styles.accountButtonText}>{account.checking ? "Vérification…" : "Créer mon compte ou me connecter"}</Text></Pressable>
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
        <SettingsGroup title="À propos">
          <SettingRow label="Crédits photos" onPress={() => router.push("/credits")} />
        </SettingsGroup>
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
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/welcome", params: { again: "1" } })} style={({ pressed }) => [styles.testButton, { borderColor: colors.primary, marginTop: 12 }, pressed && styles.pressed]}>
              <Text style={[styles.testButtonText, { color: colors.primary }]}>Refaire l’accueil</Text>
            </Pressable>
            <Text style={[styles.testHint, { color: colors.muted }]}>Repasse les questions du début, sans toucher à tes plantes.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/illustrations")} style={({ pressed }) => [styles.testButton, { borderColor: colors.primary, marginTop: 12 }, pressed && styles.pressed]}>
              <Text style={[styles.testButtonText, { color: colors.primary }]}>Illustrations du pas-à-pas</Text>
            </Pressable>
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
  vacationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
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
  benefits: { gap: 2, marginTop: 6 },
  benefitsTitle: { fontSize: 14, fontWeight: "700", marginTop: 8 },
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
  sheetButton: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 14 },
  sheetButtonText: { fontSize: 16, fontWeight: "700" },
  sheetInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginTop: 8 },
  sheetLabel: { fontSize: 15, fontWeight: "700", marginTop: 12 },
  sheetHint: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  hourChips: { flexDirection: "row", gap: 8, marginTop: 8 },
  hourChip: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  hourChipText: { fontSize: 15, fontWeight: "700" },
  inlineButton: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  inlineButtonText: { fontSize: 14, fontWeight: "700" },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  boxMark: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginTop: -1 },
  flex: { flex: 1 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14 },
  checkTitle: { fontSize: 15, fontWeight: "700" },
  checkText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  checkWatch: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  checkOk: { fontSize: 20, fontWeight: "800" },
  checkButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, maxWidth: 170 },
  checkButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", textAlign: "center" },
  sheetNote: { fontSize: 15, lineHeight: 21, marginTop: 6 },
  wishRow: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  wishPicture: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  wishName: { flex: 1, fontSize: 15, fontWeight: "600" },
  wishRemove: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  wishRemoveText: { fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
