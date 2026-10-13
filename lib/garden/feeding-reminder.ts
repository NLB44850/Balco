/**
 * La notification d'engrais (chantier « Pots et balcon », étape 4) : le prochain jour où une plante suivie est à
 * nourrir, à l'heure des rappels, hors plage calme et hors vacances ; une seule notification pour toutes les plantes
 * de ce jour-là (« Nourris 3 plantes »). Logique pure : la programmation est dans l'écran Aujourd'hui.
 */
import { tasksForMonth } from "../plants/catalog";
import { feedingFor } from "../plants/fertilizing";
import { capitalize, possessive } from "../plants/grammar";
import { nextPreferredDate, type ReminderTiming } from "../reminders/reminder-actions";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { isFollowed } from "../reminders/settings-text";
import { dayKey, sessionEventId, spacedTaskDue, startOfDay, type ResolvedPlant } from "./garden-logic";
import { awayOn, type Vacation } from "./vacation";

export const FEEDING_REMINDER_SOURCE = "balco-feeding";
/** Au-delà, rien à programmer : l'app recalcule à chaque ouverture. */
const HORIZON_DAYS = 60;

type FeedingSettings = ReminderTiming & { enabledPlantIds: string[]; vacation: Vacation | null };

/** Les plantes à nourrir ce jour-là (engrais dû, pas encore fait). */
export function plantsToFeedOn(plants: ResolvedPlant[], events: MaintenanceEvent[], day: Date) {
  const done = new Set(events.map((event) => event.id));
  return plants.filter((resolved) => {
    if (resolved.plant.toPlant) return false;
    const task = tasksForMonth(resolved.entry, day.getMonth() + 1).find((candidate) => candidate.type === "fertilizing");
    return task !== undefined && !done.has(sessionEventId(resolved.plant.id, task.id, day)) && spacedTaskDue(resolved, task, events, day);
  });
}

/** La prochaine notification d'engrais après `now`, ou null. */
export function nextFeedingReminder(plants: ResolvedPlant[], events: MaintenanceEvent[], settings: FeedingSettings, now: Date) {
  const followed = plants.filter((resolved) => isFollowed(settings.enabledPlantIds, resolved.plant.id));
  for (let offset = 0; offset < HORIZON_DAYS; offset += 1) {
    const day = startOfDay(now);
    day.setDate(day.getDate() + offset);
    if (awayOn(settings.vacation, dayKey(day))) continue;
    const date = nextPreferredDate(settings, day);
    // Heure déjà passée (la ligne est sur Aujourd'hui) ou repoussée au lendemain par la plage calme : jour suivant.
    if (date.getTime() <= now.getTime() || dayKey(date) !== dayKey(day)) continue;
    const due = plantsToFeedOn(followed, events, day);
    if (due.length === 0) continue;
    return { date, plantIds: due.map((resolved) => resolved.plant.id), ...feedingReminderContent(due) };
  }
  return null;
}

/** « Nourris tes tomates cerises » ou « Nourris 3 plantes », et l'engrais à donner. */
export function feedingReminderContent(due: ResolvedPlant[]) {
  if (due.length === 1) {
    const kind = feedingFor(due[0].entry.id)?.kind ?? "engrais organique";
    return { title: `Nourris ${possessive(due[0].entry)} 🌿`, body: `${capitalize(kind)}, sur une terre humide.` };
  }
  return { title: `Nourris ${due.length} plantes 🌿`, body: "Un peu d’engrais, sur une terre humide. Balco te dit lequel pour chacune." };
}
