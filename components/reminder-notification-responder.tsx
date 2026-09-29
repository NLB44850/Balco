import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { useGarden } from "@/lib/garden/garden-context";
import { Notifications } from "@/lib/notifications/module";
import { addSnooze, eventForReminder } from "@/lib/reminders/reminder-actions";
import {
  REMINDER_ACTIONS,
  configureLocalNotifications,
  loadLocalReminderSettings,
  loadReminderSnoozes,
  saveReminderSnoozes,
  type ReminderNotificationData,
} from "@/lib/reminders/local-notifications";

type NotificationResponse = import("expo-notifications").NotificationResponse;

const LAST_HANDLED_STORAGE_KEY = "balco.reminder.last-handled-response.v1";

/**
 * Traite l'appui sur une notification ou sur l'un de ses boutons (« Fait », « Dans 3 h », « Pas aujourd'hui »).
 * Rendu sous GardenProvider : il attend que le jardin soit chargé avant d'enregistrer un geste,
 * pour ne jamais écraser l'historique au démarrage de l'app.
 */
export function ReminderNotificationResponder() {
  const router = useRouter();
  const { loaded, logEvent } = useGarden();
  const handling = useRef(new Set<string>());

  useEffect(() => {
    if (!Notifications) return;
    void configureLocalNotifications();
  }, []);

  useEffect(() => {
    const notifications = Notifications;
    if (!notifications || !loaded) return;

    const handle = async (response: NotificationResponse) => {
      const responseId = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handling.current.has(responseId)) return;
      handling.current.add(responseId);
      // La dernière réponse est redonnée à chaque lancement : on ne la traite qu'une fois.
      if ((await AsyncStorage.getItem(LAST_HANDLED_STORAGE_KEY)) === responseId) return;
      await AsyncStorage.setItem(LAST_HANDLED_STORAGE_KEY, responseId);

      const data = (response.notification.request.content.data ?? {}) as Partial<ReminderNotificationData>;
      const action = response.actionIdentifier;
      const now = new Date();
      const isReminder = data.source === "balco-reminder" && data.plantId && data.taskType;

      if (isReminder && (action === REMINDER_ACTIONS.done || action === REMINDER_ACTIONS.later || action === REMINDER_ACTIONS.skip)) {
        // Une alerte groupée (gel, pluie…) concerne plusieurs plantes : la réponse vaut pour chacune.
        const plantIds = data.plantIds?.length ? data.plantIds : [data.plantId!];
        const decisions = plantIds.map((plantId) => ({ plantId, taskType: data.taskType!, action: data.action ?? "observe", title: data.title ?? "" }));
        if (action === REMINDER_ACTIONS.done) for (const decision of decisions) await logEvent(eventForReminder(decision, now));
        const settings = await loadLocalReminderSettings();
        const kind = action === REMINDER_ACTIONS.later ? "later" : "skip";
        const snoozes = decisions.reduce((current, decision) => addSnooze(current, decision, kind, settings, now), await loadReminderSnoozes());
        await saveReminderSnoozes(snoozes);
      }

      await notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
      router.replace("/(tabs)");
    };

    const subscription = notifications.addNotificationResponseReceivedListener((response) => void handle(response));
    // App lancée par l'appui sur la notification : la réponse est arrivée avant l'abonnement.
    void notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void handle(response);
    });
    return () => subscription.remove();
  }, [loaded, logEvent, router]);

  return null;
}
