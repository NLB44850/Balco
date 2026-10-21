/**
 * Les dates restées dans le futur (retour du 20/10 : citronnier « Arrivée sur ton balcon le 18 novembre », « sur ton
 * balcon depuis aujourd'hui », alors qu'il est à l'intérieur depuis le 17 octobre). Pendant la date simulée de la
 * version de test, tout ce qu'on note prend le jour simulé : une plante ajoutée « le 18 novembre », des arrosages
 * « le 18 novembre ». Revenu au vrai jour, ces dates sont devant nous et la fiche se contredit. On les ramène au
 * présent, au vrai jour seulement (jamais pendant une simulation) : une arrivée prend la plus ancienne date connue de
 * la plante (un geste, la rentrée à l'intérieur), sinon maintenant ; un geste, un choix ou un badge prend maintenant.
 * Vaut aussi pour un téléphone dont l'horloge a été avancée puis remise à l'heure. Logique pure.
 */
import type { ReminderSnooze } from "../reminders/reminder-actions";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import type { Awards } from "./awards";
import { dayKey, type GardenPlant } from "./garden-logic";

/** Un écart d'horloge entre deux téléphones n'est pas une date du futur. */
const TOLERANCE_MS = 5 * 60_000;

const time = (value: string | undefined) => (value ? Date.parse(value) : Number.NaN);
const isFuture = (value: string | undefined, real: Date) => Number.isFinite(time(value)) && time(value) > real.getTime() + TOLERANCE_MS;

/** Le geste ramené à maintenant, ou null s'il est déjà dans le passé. */
export function repairEventDate(event: MaintenanceEvent, real: Date): MaintenanceEvent | null {
  return isFuture(event.completedAt, real) ? { ...event, completedAt: real.toISOString() } : null;
}

/** La plante aux dates ramenées dans le passé, ou null s'il n'y a rien à corriger. */
export function repairPlantDates(plant: GardenPlant, events: MaintenanceEvent[], real: Date): GardenPlant | null {
  const winter = plant.winter;
  const needs = isFuture(plant.addedAt, real) || isFuture(plant.removedAt, real) || isFuture(winter?.decidedAt, real) || isFuture(winter?.indoorsAt, real);
  if (!needs) return null;
  const now = real.toISOString();
  const indoorsAt = winter?.indoorsAt && isFuture(winter.indoorsAt, real) ? now : winter?.indoorsAt;
  // Un choix fait « après » la rentrée n'a pas de sens : il prend le jour de la rentrée.
  const decidedAt = winter && isFuture(winter.decidedAt, real) ? (indoorsAt ?? now) : winter?.decidedAt;
  let addedAt = plant.addedAt;
  if (isFuture(plant.addedAt, real)) {
    // La plante était là au plus tard à son premier geste vrai ou à sa rentrée : l'arrivée ne vient pas après.
    const known = [...events.filter((event) => event.plantId === plant.id).map((event) => event.completedAt), decidedAt, indoorsAt]
      .map(time)
      .filter((stamp) => Number.isFinite(stamp) && stamp <= real.getTime() + TOLERANCE_MS);
    addedAt = known.length > 0 ? new Date(Math.min(...known)).toISOString() : now;
  }
  return {
    ...plant,
    addedAt,
    ...(plant.removedAt ? { removedAt: isFuture(plant.removedAt, real) ? now : plant.removedAt } : {}),
    ...(winter ? { winter: { ...winter, decidedAt: decidedAt ?? now, ...(indoorsAt ? { indoorsAt } : {}) } } : {}),
  };
}

/** Les badges datés du futur, ramenés à maintenant ; null s'il n'y en a pas. */
export function repairAwardDates(awards: Awards, real: Date): Awards | null {
  const late = Object.entries(awards).filter(([, at]) => isFuture(at, real));
  if (late.length === 0) return null;
  return { ...awards, ...Object.fromEntries(late.map(([key]) => [key, real.toISOString()])) };
}

const DAY_SUFFIX = /:(\d{4}-\d{2}-\d{2})$/;
/** « Pas aujourd'hui », « Dans 3 h », « Rappelle-moi samedi » : une semaine au plus. */
const SHORT_SNOOZE_MS = 8 * 86_400_000;

/**
 * Les mises en sommeil du téléphone notées pendant une date simulée : une question « posée le 18 novembre » prend le
 * jour d'aujourd'hui ; « Pas besoin cette année » finit au 1ᵉʳ janvier qui vient ; un « Pas aujourd'hui » du futur
 * (qui cacherait le geste pendant des semaines) est oublié. null s'il n'y a rien à corriger.
 */
export function repairSnoozeDates(snoozes: ReminderSnooze[], real: Date): ReminderSnooze[] | null {
  const today = dayKey(real);
  const nextJanuary = new Date(real.getFullYear() + 1, 0, 1);
  let changed = false;
  const seen = new Set<string>();
  const repaired: ReminderSnooze[] = [];
  for (const snooze of snoozes) {
    let next = snooze;
    const day = DAY_SUFFIX.exec(snooze.key)?.[1];
    if (day) {
      if (day > today) next = { ...snooze, key: `${snooze.key.slice(0, -day.length)}${today}` };
    } else if (snooze.key.startsWith("repot:")) {
      if (Date.parse(snooze.until) > nextJanuary.getTime()) next = { ...snooze, until: nextJanuary.toISOString() };
    } else if (Date.parse(snooze.until) > real.getTime() + SHORT_SNOOZE_MS) {
      changed = true;
      continue;
    }
    if (next !== snooze) changed = true;
    if (seen.has(next.key)) {
      changed = true;
      continue;
    }
    seen.add(next.key);
    repaired.push(next);
  }
  return changed ? repaired : null;
}
