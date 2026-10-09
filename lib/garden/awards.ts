/**
 * Ce qui est acquis reste acquis : chaque badge obtenu est noté avec sa date (« rien ne se perd »), sur le téléphone
 * et dans la sauvegarde du compte. Un badge ne se recalcule plus à chaque affichage : une série cassée, une plante
 * retirée ou un vieux geste sorti de l'historique ne le reprennent plus.
 *
 * Clés : `badge:<id>` pour les badges actuels. Les paliers, badges de saison, événements et l'herbier viendront s'y
 * ajouter avec leurs propres clés.
 */
import { badgeTierKey, computeBadges, computeStats, followedDayChecker, isAvoidedWatering, isRealObservation, isStartEvent, startOfDay, type ResolvedPlant } from "./garden-logic";
import { alertCauseOf } from "../reminders/alert-cause";
import type { MaintenanceEvent } from "../reminders/reminder-engine";

/** Clé → date d'obtention (ISO). */
export type Awards = Record<string, string>;

export const MAX_AWARDS = 2000;

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

/** Les paliers que les chiffres d'aujourd'hui débloquent (datés de maintenant). */
export function badgesEarnedNow(plants: ResolvedPlant[], events: MaintenanceEvent[], now: Date, past: ResolvedPlant[] = []): Awards {
  const at = now.toISOString();
  const awards: Awards = {};
  for (const badge of computeBadges(computeStats(plants, events, now, past))) {
    for (const tier of [1, 2, 3] as const) if (badge.value >= badge.thresholds[tier - 1]) awards[badgeTierKey(badge.id, tier)] = at;
  }
  return awards;
}

/** Au-delà, on ne remonte pas plus loin pour retrouver une ancienne série (un peu plus d'un an). */
const BACKFILL_DAYS = 400;
/** Version du recalcul unique : 2 avec les paliers (un recalcul déjà fait en version 1 est refait une fois). */
export const BACKFILL_VERSION = 2;

/**
 * Recalcul unique, à l'arrivée de cette version : les paliers déjà mérités d'après l'historique disponible, datés
 * du jour où ils l'ont été (une série cassée depuis compte aussi). Ceux que les chiffres d'aujourd'hui donnent
 * déjà sont dans `badgesEarnedNow`.
 */
export function backfillAwards(plants: ResolvedPlant[], past: ResolvedPlant[], events: MaintenanceEvent[], now: Date): Awards {
  const awards: Awards = {};
  const everyone = [...plants, ...past];
  const ids = new Set(everyone.map(({ plant }) => plant.id));
  const own = events.filter((event) => ids.has(event.plantId)).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const thresholds = new Map(computeBadges(computeStats([], [])).map((badge) => [badge.id, badge.thresholds]));
  // Le jour où un compteur a atteint chaque palier, en rejouant l'historique dans l'ordre.
  const replay = (badgeId: string, dates: string[]) => {
    const sorted = [...dates].sort();
    thresholds.get(badgeId)?.forEach((threshold, index) => {
      const at = sorted[threshold - 1];
      if (at) awards[badgeTierKey(badgeId, (index + 1) as 1 | 2 | 3)] = at;
    });
  };
  const datesOf = (filter: (event: MaintenanceEvent) => boolean) => own.filter(filter).map((event) => event.completedAt);

  replay("first-pot", everyone.map(({ plant }) => plant.addedAt));
  // Une seule fois par plante mellifère différente : sa première arrivée.
  const firstOfKind = new Map<string, string>();
  for (const { entry, plant } of everyone) {
    if (entry.melliferous && (!firstOfKind.has(entry.id) || plant.addedAt < firstOfKind.get(entry.id)!)) firstOfKind.set(entry.id, plant.addedAt);
  }
  replay("bees", [...firstOfKind.values()]);
  replay("plate", datesOf((event) => event.type === "harvest"));
  replay("alerts", datesOf((event) => alertCauseOf(event) !== null));
  replay("water", datesOf(isAvoidedWatering));
  replay("bio", datesOf(isRealObservation));
  replay("sower", datesOf(isStartEvent));

  // Main verte : la première fois que 7, 30 puis 100 jours suivis se sont enchaînés (balcon actuel, un an au plus).
  const firstDay = own[0] ? startOfDay(new Date(own[0].completedAt)) : null;
  const streakTargets = thresholds.get("streak") ?? [7, 30, 100];
  if (firstDay && plants.length > 0) {
    const followed = followedDayChecker(plants, events);
    const cursor = new Date(Math.max(firstDay.getTime(), startOfDay(now).getTime() - BACKFILL_DAYS * 86_400_000));
    let run = 0;
    while (cursor.getTime() <= now.getTime()) {
      run = followed(cursor) === true ? run + 1 : 0;
      streakTargets.forEach((target, index) => {
        const key = badgeTierKey("streak", (index + 1) as 1 | 2 | 3);
        if (run >= target && !awards[key]) {
          const end = new Date(cursor);
          end.setHours(20, 0, 0, 0);
          awards[key] = new Date(Math.min(end.getTime(), now.getTime())).toISOString();
        }
      });
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
