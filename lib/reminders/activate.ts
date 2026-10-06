/**
 * Activer les rappels, depuis Aujourd'hui comme depuis Réglages : on demande toujours l'autorisation du
 * téléphone d'abord, et les rappels ne sont enregistrés comme actifs qu'après un « Autoriser ». Logique
 * pure : l'autorisation, l'enregistrement et la programmation sont passés en paramètres (testable sans
 * téléphone).
 */
import type { LocalReminderSettings } from "./local-notifications";

/** Le message affiché quand le téléphone refuse les notifications (le même partout). */
export const NOTIFICATIONS_DENIED = {
  title: "Notifications désactivées",
  message: "Autorise les notifications dans les réglages de ton téléphone pour recevoir les conseils Balco.",
} as const;

export type ActivateRemindersDeps = {
  requestPermission: () => Promise<boolean>;
  save: (settings: LocalReminderSettings) => Promise<void>;
  /** Programme le prochain conseil s'il y en a un ; ne fait rien sinon. */
  scheduleNext?: (settings: LocalReminderSettings) => Promise<void>;
};

export type ActivateRemindersResult = { status: "enabled"; settings: LocalReminderSettings } | { status: "denied" };

export async function activateReminders(current: LocalReminderSettings, deps: ActivateRemindersDeps): Promise<ActivateRemindersResult> {
  const granted = await deps.requestPermission().catch(() => false);
  if (!granted) return { status: "denied" };
  // Liste vide = toutes les plantes, y compris celles ajoutées plus tard.
  const settings: LocalReminderSettings = { ...current, enabled: true, enabledPlantIds: [] };
  await deps.save(settings);
  if (deps.scheduleNext) await deps.scheduleNext(settings);
  return { status: "enabled", settings };
}

/** « Rappels activés : Balco te préviendra vers 18 h 30 ». */
export function remindersEnabledText(settings: Pick<LocalReminderSettings, "preferredHour" | "preferredMinute">) {
  return `Rappels activés : Balco te préviendra vers ${settings.preferredHour} h ${String(settings.preferredMinute).padStart(2, "0")}`;
}
