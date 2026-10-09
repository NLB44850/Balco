/**
 * Les badges de saison : quatre par saison, disponibles seulement pendant la saison (dates fixes : 1er mars, 1er juin,
 * 1er septembre, 1er décembre), qui reviennent chaque année avec leur millésime (« Protégé du gel · 2027 »). Ceux des
 * années passées restent dans la collection. Seulement ce que l'app peut vérifier : gestes notés, alertes suivies,
 * envies du printemps. Logique pure.
 */
import { eventAwardKey, SAINTE_CATHERINE } from "../events/events";
import { alertCauseOf } from "../reminders/alert-cause";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { dayKey, followedDays, isAvoidedWatering, isStartEvent, type ResolvedPlant } from "./garden-logic";

export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASON_LABELS: Record<Season, string> = { spring: "printemps", summer: "été", autumn: "automne", winter: "hiver" };

/** La saison d'une date et son millésime (l'hiver de décembre 2026 à février 2027 porte 2027). */
export function seasonOf(date: Date): { season: Season; year: number } {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return { season: "spring", year: date.getFullYear() };
  if (month >= 6 && month <= 8) return { season: "summer", year: date.getFullYear() };
  if (month >= 9 && month <= 11) return { season: "autumn", year: date.getFullYear() };
  return { season: "winter", year: month === 12 ? date.getFullYear() + 1 : date.getFullYear() };
}

/** Du premier jour de la saison au premier jour de la suivante. */
export function seasonWindow(season: Season, year: number) {
  const startMonth = { spring: 2, summer: 5, autumn: 8, winter: 11 }[season];
  const start = new Date(season === "winter" ? year - 1 : year, startMonth, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 3, 1);
  return { start, end };
}

/** La saison d'avant (pour noter un badge mérité juste avant le changement de saison). */
export function previousSeason(season: Season, year: number): { season: Season; year: number } {
  const { start } = seasonWindow(season, year);
  return seasonOf(new Date(start.getFullYear(), start.getMonth() - 1, 15));
}

type SeasonContext = {
  /** Les gestes de la saison, plantes du balcon et retirées. */
  events: MaintenanceEvent[];
  /** Plantes arrivées pendant la saison. */
  added: ResolvedPlant[];
  /** Plantes du balcon aujourd'hui (série en cours). */
  plants: ResolvedPlant[];
  allEvents: MaintenanceEvent[];
  springWishes: string[];
  now: Date;
  /** Le moment regardé est dans la saison (les compteurs « en ce moment » ne valent que là). */
  current: boolean;
  awards: Record<string, string>;
  year: number;
};

export type SeasonBadgeRule = {
  id: string;
  season: Season;
  title: string;
  emoji: string;
  /** « 3 semis ou plantations » */
  unit: (count: number) => string;
  target: number;
  metric: (context: SeasonContext) => number;
  /** Un badge d'événement (la Sainte-Catherine) compté dans la saison : sa propre clé. */
  awardKey?: (year: number) => string;
};

const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count > 1 ? pluralForm : singular}`;
const harvests = ({ events }: SeasonContext) => events.filter((event) => event.type === "harvest").length;
const alerts = (cause: string) => ({ events }: SeasonContext) => events.filter((event) => alertCauseOf(event) === cause).length;
const streakNow = ({ plants, allEvents, now, current }: SeasonContext) => (current ? followedDays(plants, allEvents, now) : 0);

export const SEASON_BADGES: SeasonBadgeRule[] = [
  { id: "first-sowings", season: "spring", title: "Premiers semis", emoji: "🌱", target: 3, unit: (count) => plural(count, "semis ou plantation", "semis ou plantations"), metric: ({ events }) => events.filter(isStartEvent).length },
  { id: "bloom-balcony", season: "spring", title: "Balcon fleuri", emoji: "🌼", target: 2, unit: (count) => plural(count, "plante mellifère ajoutée", "plantes mellifères ajoutées"), metric: ({ added }) => added.filter(({ entry }) => entry.melliferous).length },
  { id: "spring-harvest", season: "spring", title: "Première récolte du printemps", emoji: "🥗", target: 1, unit: (count) => plural(count, "récolte"), metric: harvests },
  { id: "spring-repot", season: "spring", title: "Pots au large", emoji: "🪴", target: 1, unit: (count) => plural(count, "rempotage ou terre neuve", "rempotages ou terres neuves"), metric: ({ events }) => events.filter((event) => event.type === "repotting").length },

  { id: "rain-saver", season: "summer", title: "Économe en eau", emoji: "💧", target: 3, unit: (count) => plural(count, "jour de pluie sans arroser", "jours de pluie sans arroser"), metric: ({ events }) => new Set(events.filter(isAvoidedWatering).map((event) => dayKey(new Date(event.completedAt)))).size },
  { id: "heat-wave", season: "summer", title: "Canicule maîtrisée", emoji: "☀️", target: 3, unit: (count) => plural(count, "alerte chaleur suivie", "alertes chaleur suivies"), metric: alerts("heat") },
  { id: "summer-harvest", season: "summer", title: "Récoltes d’été", emoji: "🍅", target: 5, unit: (count) => plural(count, "récolte"), metric: harvests },
  { id: "summer-streak", season: "summer", title: "Balcon suivi", emoji: "🔥", target: 14, unit: (count) => plural(count, "jour suivi de suite", "jours suivis de suite"), metric: streakNow },

  { id: "winter-ready", season: "autumn", title: "Paré pour l’hiver", emoji: "🧣", target: 1, unit: (count) => plural(count, "geste de protection", "gestes de protection"), metric: ({ events }) => events.filter((event) => event.type === "protection").length },
  { id: "spring-seeds", season: "autumn", title: "Graines du printemps", emoji: "🌰", target: 2, unit: (count) => plural(count, "envie du printemps gardée", "envies du printemps gardées"), metric: ({ springWishes, current }) => (current ? springWishes.length : 0) },
  { id: SAINTE_CATHERINE.id, season: "autumn", title: "Sainte-Catherine", emoji: SAINTE_CATHERINE.emoji, target: 1, unit: (count) => plural(count, "plante installée pour la Sainte-Catherine", "plantes installées pour la Sainte-Catherine"), metric: ({ awards, year }) => (awards[eventAwardKey(SAINTE_CATHERINE, year)] ? 1 : 0), awardKey: (year) => eventAwardKey(SAINTE_CATHERINE, year) },
  { id: "autumn-harvest", season: "autumn", title: "Récoltes d’automne", emoji: "🍂", target: 3, unit: (count) => plural(count, "récolte"), metric: harvests },

  { id: "frost-guard", season: "winter", title: "Protégé du gel", emoji: "❄️", target: 1, unit: (count) => plural(count, "alerte gel suivie", "alertes gel suivies"), metric: alerts("frost") },
  { id: "warm-sowing", season: "winter", title: "Semis au chaud", emoji: "🏠", target: 1, unit: (count) => plural(count, "semis", "semis"), metric: ({ events }) => events.filter(isStartEvent).length },
  { id: "winter-harvest", season: "winter", title: "Récolte d’hiver", emoji: "🥬", target: 1, unit: (count) => plural(count, "récolte"), metric: harvests },
  // Pas une série en hiver : sans arrosage à faire, chaque jour compte tout seul. Un vrai geste à la place.
  { id: "winter-shelter", season: "winter", title: "Pots protégés", emoji: "🧤", target: 2, unit: (count) => plural(count, "geste de protection", "gestes de protection"), metric: ({ events }) => events.filter((event) => event.type === "protection").length },
];

/** Clé du carnet : `season:frost-guard:2027` (ou celle de l'événement pour la Sainte-Catherine). */
export function seasonAwardKey(rule: SeasonBadgeRule, year: number) {
  return rule.awardKey ? rule.awardKey(year) : `season:${rule.id}:${year}`;
}

export type SeasonBadge = SeasonBadgeRule & { year: number; value: number; obtained: boolean; current: number; key: string };

export type SeasonInput = { plants: ResolvedPlant[]; past: ResolvedPlant[]; events: MaintenanceEvent[]; springWishes?: string[]; now: Date; awards?: Record<string, string> };

/** Les quatre badges d'une saison, avec où l'on en est. */
export function seasonBadges(input: SeasonInput, season = seasonOf(input.now)): SeasonBadge[] {
  const { start, end } = seasonWindow(season.season, season.year);
  const within = (iso: string) => {
    const date = new Date(iso);
    return date >= start && date < end && date <= input.now;
  };
  const everyone = [...input.plants, ...input.past];
  const ids = new Set(everyone.map(({ plant }) => plant.id));
  const context: SeasonContext = {
    events: input.events.filter((event) => ids.has(event.plantId) && within(event.completedAt)),
    added: everyone.filter(({ plant }) => within(plant.addedAt)),
    plants: input.plants,
    allEvents: input.events,
    springWishes: input.springWishes ?? [],
    now: input.now,
    current: input.now >= start && input.now < end,
    awards: input.awards ?? {},
    year: season.year,
  };
  return SEASON_BADGES.filter((rule) => rule.season === season.season).map((rule) => {
    const key = seasonAwardKey(rule, season.year);
    const value = rule.metric(context);
    const obtained = value >= rule.target || Boolean(input.awards?.[key]);
    return { ...rule, year: season.year, value, obtained, current: obtained ? rule.target : Math.min(value, rule.target), key };
  });
}

/** Les badges de saison mérités (saison en cours et saison d'avant), datés de maintenant. */
export function seasonAwards(input: SeasonInput): Record<string, string> {
  const now = seasonOf(input.now);
  const awards: Record<string, string> = {};
  for (const season of [now, previousSeason(now.season, now.year)]) {
    for (const badge of seasonBadges({ ...input, awards: {} }, season)) {
      // La Sainte-Catherine a déjà sa clé, notée par l'événement lui-même.
      if (badge.value >= badge.target && !badge.awardKey) awards[badge.key] = input.now.toISOString();
    }
  }
  return awards;
}

/** « Protégé du gel · 2027 » */
export function seasonBadgeTitle(rule: Pick<SeasonBadgeRule, "title">, year: number) {
  return `${rule.title} · ${year}`;
}

export function seasonRuleById(id: string) {
  return SEASON_BADGES.find((rule) => rule.id === id) ?? null;
}
