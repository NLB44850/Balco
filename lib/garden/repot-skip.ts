/**
 * « Pas besoin cette année » : on a vérifié le pot, la plante ne manque pas de place. Le rempotage ne revient
 * pas avant l'an prochain ; entre-temps, la terre du dessus est proposée à la place quand la plante l'accepte.
 * Gardé avec les autres mises en sommeil du téléphone (`ReminderSnooze`). Logique pure.
 */
import type { ReminderSnooze } from "../reminders/reminder-actions";
import { activeSnoozes } from "../reminders/reminder-actions";

export const repotSnoozeKey = (plantId: string) => `repot:${plantId}`;

/** Jusqu'au 1ᵉʳ janvier suivant : la saison de rempotage de l'an prochain le reproposera. */
export function skipRepotThisYear(snoozes: ReminderSnooze[], plantId: string, now: Date): ReminderSnooze[] {
  const key = repotSnoozeKey(plantId);
  return [...activeSnoozes(snoozes, now).filter((snooze) => snooze.key !== key), { key, kind: "skip", until: new Date(now.getFullYear() + 1, 0, 1).toISOString() }];
}

/** Rendre le rempotage (décocher « Pas besoin cette année »). */
export function unskipRepot(snoozes: ReminderSnooze[], plantId: string): ReminderSnooze[] {
  return snoozes.filter((snooze) => snooze.key !== repotSnoozeKey(plantId));
}

/** Plante → date jusqu'à laquelle son rempotage est écarté. */
export function skippedRepots(snoozes: ReminderSnooze[], now: Date) {
  return new Map(activeSnoozes(snoozes, now).filter((snooze) => snooze.key.startsWith("repot:")).map((snooze) => [snooze.key.slice("repot:".length), snooze.until] as const));
}
