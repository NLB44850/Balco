/**
 * Ce qui est acquis reste acquis : chaque badge obtenu est noté avec sa date (« rien ne se perd »), sur le téléphone
 * et dans la sauvegarde du compte. Un badge ne se recalcule plus à chaque affichage : une série cassée, une plante
 * retirée ou un vieux geste sorti de l'historique ne le reprennent plus.
 *
 * Clés : `badge:<id>` pour les badges actuels. Les paliers, badges de saison, événements et l'herbier viendront s'y
 * ajouter avec leurs propres clés.
 */
import { computeBadges, computeStats, followedDayChecker, isRealObservation, startOfDay, type ResolvedPlant } from "./garden-logic";
import type { MaintenanceEvent } from "../reminders/reminder-engine";

/** Clé → date d'obtention (ISO). */
export type Awards = Record<string, string>;

export const MAX_AWARDS = 2000;

export function badgeAwardKey(badgeId: string) {
  return `badge:${badgeId}`;
}

/** Réunit deux carnets : rien ne se perd, et la date la plus ancienne gagne. */
export function mergeAwards(a: Awards, b: Awards): Awards {
  const merged: Awards = { ...a };
  for (const [key, at] of Object.entries(b)) {
    if (typeof at !== "string" || !Number.isFinite(new Date(at).getTime())) continue;
    if (!merged[key] || at < merged[key]) merged[key] = at;
  }
  return merged;
}

/** Ce que `earned` apporte de nouveau à `current` (null : rien). */
export function newAwards(current: Awards, earned: Awards): Awards | null {
  const added = Object.fromEntries(Object.entries(earned).filter(([key]) => !current[key]));
  return Object.keys(added).length > 0 ? added : null;
}

/** Les badges que les chiffres d'aujourd'hui débloquent (datés de maintenant). */
export function badgesEarnedNow(plants: ResolvedPlant[], events: MaintenanceEvent[], now: Date, past: ResolvedPlant[] = []): Awards {
  const at = now.toISOString();
  return Object.fromEntries(computeBadges(computeStats(plants, events, now, past)).filter((badge) => badge.unlocked).map((badge) => [badgeAwardKey(badge.id), at]));
}

/** Au-delà, on ne remonte pas plus loin pour retrouver une ancienne série (un peu plus d'un an). */
const BACKFILL_DAYS = 400;
const STREAK_TARGET = 7;

/**
 * Recalcul unique, à l'arrivée de cette version : les badges déjà mérités d'après l'historique disponible, datés
 * du jour où ils l'ont été (une série de 7 jours cassée depuis compte aussi). Les badges que les chiffres
 * d'aujourd'hui donnent déjà sont dans `badgesEarnedNow`.
 */
export function backfillAwards(plants: ResolvedPlant[], past: ResolvedPlant[], events: MaintenanceEvent[], now: Date): Awards {
  const awards: Awards = {};
  const everyone = [...plants, ...past];
  const ids = new Set(everyone.map(({ plant }) => plant.id));
  const own = events.filter((event) => ids.has(event.plantId)).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const set = (badgeId: string, at: string | undefined) => {
    if (at) awards[badgeAwardKey(badgeId)] = at;
  };

  // Le jour où un compteur a atteint son seuil, en rejouant l'historique dans l'ordre.
  const nth = (list: Array<{ at: string }>, target: number) => [...list].sort((a, b) => a.at.localeCompare(b.at))[target - 1]?.at;
  set("first-pot", nth(everyone.map(({ plant }) => ({ at: plant.addedAt })), 1));
  set("plate", nth(own.filter((event) => event.type === "harvest").map((event) => ({ at: event.completedAt })), 1));
  set("water", nth(own.filter((event) => event.source === "reminder").map((event) => ({ at: event.completedAt })), 5));
  set("bio", nth(own.filter(isRealObservation).map((event) => ({ at: event.completedAt })), 5));
  // Trois plantes mellifères sur le balcon en même temps (retirées comprises tant qu'elles y étaient).
  const bees = everyone.filter(({ entry }) => entry.melliferous);
  for (const candidate of [...bees].sort((a, b) => a.plant.addedAt.localeCompare(b.plant.addedAt))) {
    const at = candidate.plant.addedAt;
    const together = bees.filter(({ plant }) => plant.addedAt <= at && (!plant.removedAt || plant.removedAt > at));
    if (together.length >= 3) {
      set("bees", at);
      break;
    }
  }
  // Main Verte : la première fois que 7 jours suivis se sont enchaînés (balcon actuel, un peu plus d'un an au plus).
  const firstDay = own[0] ? startOfDay(new Date(own[0].completedAt)) : null;
  if (firstDay && plants.length > 0) {
    const followed = followedDayChecker(plants, events);
    const cursor = new Date(Math.max(firstDay.getTime(), startOfDay(now).getTime() - BACKFILL_DAYS * 86_400_000));
    let run = 0;
    while (cursor.getTime() <= now.getTime()) {
      run = followed(cursor) === true ? run + 1 : 0;
      if (run >= STREAK_TARGET) {
        const end = new Date(cursor);
        end.setHours(20, 0, 0, 0);
        set("streak", new Date(Math.min(end.getTime(), now.getTime())).toISOString());
        break;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return awards;
}

/** Les badges notés ici et pas encore fêtés sur ce téléphone (un badge gagné hors d'Aujourd'hui, par une notification). */
export function unseenAwards(awards: Awards, seen: string[]): string[] {
  const known = new Set(seen);
  return Object.keys(awards).filter((key) => !known.has(key)).sort((a, b) => awards[a].localeCompare(awards[b]));
}

/** Garde le carnet sous sa taille maximale (les plus récents d'abord retirés : jamais en pratique). */
export function capAwards(awards: Awards): Awards {
  const entries = Object.entries(awards);
  if (entries.length <= MAX_AWARDS) return awards;
  return Object.fromEntries(entries.sort((a, b) => a[1].localeCompare(b[1])).slice(0, MAX_AWARDS));
}
