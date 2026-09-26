import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { ReminderDecision } from "@/lib/reminders/reminder-engine";

export const REMINDER_SETTINGS_STORAGE_KEY = "balco.reminder.settings.v1";
export const REMINDER_DECISIONS_STORAGE_KEY = "balco.reminder.decisions.v1";
export const BALCO_NOTIFICATION_CHANNEL_ID = "balco-reminders";

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

export async function saveLocalReminderSettings(settings: LocalReminderSettings) {
  await AsyncStorage.setItem(REMINDER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export async function configureLocalNotifications() {
  if (Platform.OS === "web") return;
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
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

function nextPreferredDate(settings: LocalReminderSettings, now = new Date()) {
  const trigger = new Date(now);
  trigger.setHours(settings.preferredHour, settings.preferredMinute, 0, 0);
  if (trigger.getTime() <= now.getTime()) trigger.setDate(trigger.getDate() + 1);
  const triggerHour = trigger.getHours();
  const inQuietHours = settings.quietStartHour > settings.quietEndHour
    ? triggerHour >= settings.quietStartHour || triggerHour < settings.quietEndHour
    : triggerHour >= settings.quietStartHour && triggerHour < settings.quietEndHour;
  if (inQuietHours) trigger.setDate(trigger.getDate() + 1);
  return trigger;
}

function decisionId(decision: ReminderDecision) {
  return `${decision.plantId}:${decision.taskType}:${decision.validUntil}`;
}

export async function cancelBalcoReminderNotifications() {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data && (item.content.data as { source?: string }).source === "balco-reminder")
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function scheduleLocalReminder(decision: ReminderDecision, settings: LocalReminderSettings, now = new Date()) {
  if (Platform.OS === "web" || !settings.enabled) return null;
  const permissionGranted = await requestLocalNotificationPermission();
  if (!permissionGranted) return null;

  await configureLocalNotifications();
  await cancelBalcoReminderNotifications();

  const triggerDate = nextPreferredDate(settings, now);
  const validUntil = new Date(decision.validUntil).getTime();
  if (!Number.isFinite(validUntil) || triggerDate.getTime() >= validUntil) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: decision.title,
      body: decision.body.slice(0, 120),
      data: {
        source: "balco-reminder",
        url: "/",
        plantId: decision.plantId,
        taskType: decision.taskType,
        decisionId: decisionId(decision),
        validUntil: decision.validUntil,
      },
      ...(Platform.OS === "android" ? { channelId: BALCO_NOTIFICATION_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
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
