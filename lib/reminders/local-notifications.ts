import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { Notifications } from "@/lib/notifications/module";
import type { ReminderSnooze } from "@/lib/reminders/reminder-actions";
import type { ReminderDecision } from "@/lib/reminders/reminder-engine";

export const REMINDER_SETTINGS_STORAGE_KEY = "balco.reminder.settings.v1";
export const REMINDER_DECISIONS_STORAGE_KEY = "balco.reminder.decisions.v1";
export const BALCO_NOTIFICATION_CHANNEL_ID = "balco-reminders";
export const REMINDER_SNOOZES_STORAGE_KEY = "balco.reminder.snoozes.v1";
/** Boutons sous la notification : « Fait », « Dans 3 h », « Pas aujourd'hui ». */
export const BALCO_REMINDER_CATEGORY = "balco-reminder";
/** Conseil sans geste à faire (« n'arrose pas ») : seulement « Compris ». */
export const BALCO_REMINDER_INFO_CATEGORY = "balco-reminder-info";
export const REMINDER_ACTIONS = { done: "done", later: "later", skip: "skip" } as const;

/** Ce que transporte une notification de rappel, pour pouvoir y répondre sans ouvrir l'écran. */
export type ReminderNotificationData = {
  source: "balco-reminder" | "balco-test";
  plantId?: string;
  taskType?: ReminderDecision["taskType"];
  action?: ReminderDecision["action"];
  title?: string;
  validUntil?: string;
};

export type LocalReminderSettings = {
  enabled: boolean;
  preferredHour: number;
  preferredMinute: number;
  quietStartHour: number;
  quietEndHour: number;
  maxNormalRemindersPerDay: number;
  skipWateringWhenRainExpected: boolean;
  enabledPlantIds: string[];
};

export const defaultLocalReminderSettings: LocalReminderSettings = {
  enabled: false,
  preferredHour: 18,
  preferredMinute: 30,
  quietStartHour: 21,
  quietEndHour: 9,
  maxNormalRemindersPerDay: 1,
  skipWateringWhenRainExpected: true,
  enabledPlantIds: [],
};

export async function loadLocalReminderSettings(): Promise<LocalReminderSettings> {
  try {
    const stored = await AsyncStorage.getItem(REMINDER_SETTINGS_STORAGE_KEY);
    if (!stored) return defaultLocalReminderSettings;
    return { ...defaultLocalReminderSettings, ...(JSON.parse(stored) as Partial<LocalReminderSettings>) };
  } catch {
    return defaultLocalReminderSettings;
  }
}

export type ReminderSettingsChangeSource = "user" | "sync";
type ReminderSettingsListener = (settings: LocalReminderSettings, source: ReminderSettingsChangeSource) => void;
const settingsListeners = new Set<ReminderSettingsListener>();

/** Prévient les écrans ouverts et la synchro qu'un réglage a changé (par l'utilisateur ou depuis un autre appareil). */
export function subscribeReminderSettings(listener: ReminderSettingsListener) {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

export async function saveLocalReminderSettings(settings: LocalReminderSettings, source: ReminderSettingsChangeSource = "user") {
  await AsyncStorage.setItem(REMINDER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  settingsListeners.forEach((listener) => listener(settings, source));
}

/**
 * Quand l'appareil est inscrit aux notifications push du serveur, c'est le serveur qui prévient
 * (il voit la météo évoluer même application fermée) : les notifications locales s'effacent
 * pour ne pas recevoir le même conseil deux fois.
 */
export const SERVER_PUSH_STORAGE_KEY = "balco.push.registration.v1";

export async function isServerPushActive() {
  try {
    return Boolean(await AsyncStorage.getItem(SERVER_PUSH_STORAGE_KEY));
  } catch {
    return false;
  }
}

export async function loadReminderSnoozes(): Promise<ReminderSnooze[]> {
  try {
    const stored = await AsyncStorage.getItem(REMINDER_SNOOZES_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ReminderSnooze[]) : [];
  } catch {
    return [];
  }
}

const snoozeListeners = new Set<(snoozes: ReminderSnooze[]) => void>();

export function subscribeReminderSnoozes(listener: (snoozes: ReminderSnooze[]) => void) {
  snoozeListeners.add(listener);
  return () => {
    snoozeListeners.delete(listener);
  };
}

export async function saveReminderSnoozes(snoozes: ReminderSnooze[]) {
  await AsyncStorage.setItem(REMINDER_SNOOZES_STORAGE_KEY, JSON.stringify(snoozes));
  snoozeListeners.forEach((listener) => listener(snoozes));
}

export async function configureLocalNotifications() {
  if (!Notifications) return;
  // Les boutons ouvrent l'app : c'est elle qui enregistre le geste ou met le rappel en sommeil.
  await Notifications.setNotificationCategoryAsync(BALCO_REMINDER_CATEGORY, [
    { identifier: REMINDER_ACTIONS.done, buttonTitle: "Fait ✓", options: { opensAppToForeground: true } },
    { identifier: REMINDER_ACTIONS.later, buttonTitle: "Dans 3 h", options: { opensAppToForeground: true } },
    { identifier: REMINDER_ACTIONS.skip, buttonTitle: "Pas aujourd’hui", options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(BALCO_REMINDER_INFO_CATEGORY, [
    { identifier: REMINDER_ACTIONS.skip, buttonTitle: "Compris", options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(BALCO_NOTIFICATION_CHANNEL_ID, {
      name: "Rappels Balco",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: "#2F644B",
    });
  }
}

export async function requestLocalNotificationPermission() {
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

function decisionId(decision: ReminderDecision) {
  return `${decision.plantId}:${decision.taskType}:${decision.validUntil}`;
}

export async function cancelBalcoReminderNotifications() {
  const notifications = Notifications;
  if (!notifications) return;
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data && (item.content.data as { source?: string }).source === "balco-reminder")
      .map((item) => notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

/** Programme LA notification de rappel (une seule à la fois), à la date choisie par planNotification. */
export async function scheduleLocalReminder(decision: ReminderDecision, settings: LocalReminderSettings, triggerDate: Date) {
  if (!Notifications || !settings.enabled) return null;
  if (await isServerPushActive()) {
    await cancelBalcoReminderNotifications();
    return null;
  }
  const permissionGranted = await requestLocalNotificationPermission();
  if (!permissionGranted) return null;

  await configureLocalNotifications();
  await cancelBalcoReminderNotifications();

  if (triggerDate.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: decision.title,
      body: decision.body.slice(0, 120),
      data: {
        source: "balco-reminder",
        url: "/",
        plantId: decision.plantId,
        taskType: decision.taskType,
        action: decision.action,
        title: decision.title,
        decisionId: decisionId(decision),
        validUntil: decision.validUntil,
      },
      categoryIdentifier: decision.action === "skip" ? BALCO_REMINDER_INFO_CATEGORY : BALCO_REMINDER_CATEGORY,
    },
    // Sur Android, le canal se précise dans le déclencheur (réglable à part dans les paramètres du téléphone).
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: BALCO_NOTIFICATION_CHANNEL_ID,
    },
  });

  await AsyncStorage.setItem(REMINDER_DECISIONS_STORAGE_KEY, JSON.stringify({ id, decision, scheduledFor: triggerDate.toISOString() }));
  return id;
}

export async function clearAndDisableLocalReminders() {
  await cancelBalcoReminderNotifications();
  const settings = await loadLocalReminderSettings();
  await saveLocalReminderSettings({ ...settings, enabled: false });
  await AsyncStorage.removeItem(REMINDER_DECISIONS_STORAGE_KEY);
}

/** Notification d'essai, 5 secondes plus tard : vérifie permission, affichage et boutons. */
export async function sendTestNotification(): Promise<"sent" | "denied" | "unavailable"> {
  if (!Notifications) return "unavailable";
  const granted = await requestLocalNotificationPermission();
  if (!granted) return "denied";
  await configureLocalNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Balco : les rappels fonctionnent 🌱",
      body: "C’est à ça que ressemblera un conseil. Essaie les boutons Fait, Dans 3 h ou Pas aujourd’hui.",
      data: { source: "balco-test" },
      categoryIdentifier: BALCO_REMINDER_CATEGORY,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: BALCO_NOTIFICATION_CHANNEL_ID },
  });
  return "sent";
}
