/**
 * « Pas encore acheté ? Rappelle-moi samedi » : le premier geste d'une plante à planter disparaît
 * d'Aujourd'hui jusqu'au samedi suivant (samedi prochain si on est samedi), 9 h. Gardé avec les autres
 * mises en sommeil du téléphone (`ReminderSnooze`). Logique pure.
 */
import type { ReminderSnooze } from "../reminders/reminder-actions";
import { activeSnoozes } from "../reminders/reminder-actions";
import type { CalendarActivity } from "../plants/calendar";

const SATURDAY = 6;
export const SATURDAY_HOUR = 9;

export const startSnoozeKey = (plantId: string) => `start:${plantId}`;
export const saturdaySource = (plantId: string) => `balco-saturday-${plantId}`;

/** Le prochain samedi à 9 h, jamais aujourd'hui : un samedi, c'est celui de la semaine suivante. */
export function nextSaturdayMorning(now: Date) {
  const days = (SATURDAY - now.getDay() + 7) % 7 || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, SATURDAY_HOUR, 0);
}

export function postponeStart(snoozes: ReminderSnooze[], plantId: string, now: Date): ReminderSnooze[] {
  const key = startSnoozeKey(plantId);
  return [...activeSnoozes(snoozes, now).filter((snooze) => snooze.key !== key), { key, kind: "later", until: nextSaturdayMorning(now).toISOString() }];
}

/** Les plantes dont le premier geste attend samedi. */
export function postponedStarts(snoozes: ReminderSnooze[], now: Date) {
  return new Set(activeSnoozes(snoozes, now).filter((snooze) => snooze.key.startsWith("start:")).map((snooze) => snooze.key.slice("start:".length)));
}

/** La notification du samedi : « C'est samedi 🌱 · Pense au plant : plante la lavande ce week-end. » */
export function saturdayReminder(activity: Pick<CalendarActivity, "kind" | "title">) {
  const what = activity.kind === "plant" ? "Pense au plant" : "Pense aux graines";
  return { title: "C’est samedi 🌱", body: `${what} : ${activity.title.charAt(0).toLowerCase()}${activity.title.slice(1)} ce week-end.` };
}
