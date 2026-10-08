/**
 * Les temps forts de l'année au balcon (un par saison), décrits par des données : dates, carte compacte d'Aujourd'hui,
 * page de l'événement, plantes proposées, geste de protection, badge, question pour Nora, bilan et notification de
 * lancement. Un nouvel événement s'ajoute dans `SEASONAL_EVENTS`, sans nouveau code. Logique pure.
 *
 * Contenus vérifiés sur deux sources au moins : docs/sources-evenements.md.
 */
import { dayKey, type ResolvedPlant } from "../garden/garden-logic";
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { fitsSpace, fitsSunlight, PLANT_CATALOG, type CatalogPlant, type Month, type OnboardingAnswers, type SpaceSize, type Sunlight } from "../plants/catalog";
import type { MaintenanceEvent } from "../reminders/reminder-engine";

export type MonthDay = { month: Month; day: number };

export type SeasonalEvent = {
  id: string;
  /** Première et dernière journée de la carte (incluses), chaque année. */
  start: MonthDay;
  end: MonthDay;
  emoji: string;
  title: string;
  /** La carte compacte d'Aujourd'hui, sous le bandeau météo. */
  cardText: string;
  quote?: string;
  explanation: string;
  /** Les plantes proposées : celles du catalogue qu'on peut planter ce mois-là, adaptées au balcon. */
  plantings?: {
    month: Month;
    listTitle: string;
    /** L'ordre de préférence (les autres plantes du mois suivent) ; au plus `max`. */
    preferred: string[];
    max: number;
  };
  /** Un geste valable pour tous, avec « C'est fait » (noté pour chaque pot du balcon). */
  protection?: { id: string; title: string; text: string };
  /** Climat froid ou gel annoncé : la protection passe avant la plantation. */
  coldNote?: string;
  noraQuestion: string;
  /** Le badge de l'événement, avec son millésime : `event:<id>:<année>`. Obtenu en plantant une plante proposée pendant l'événement. */
  badge: { title: string; detail: string };
  /** Le bilan, le lendemain de la fin, si l'on a participé. */
  summary: (planted: number) => string;
  notification: { title: string; body: string };
};

export const SAINTE_CATHERINE: SeasonalEvent = {
  id: "sainte-catherine",
  start: { month: 11, day: 18 },
  end: { month: 11, day: 30 },
  emoji: "🌳",
  title: "La Sainte-Catherine",
  cardText: "Ce que tu plantes maintenant s’enracine tout l’hiver",
  quote: "« À la Sainte-Catherine, tout bois prend racine. »",
  explanation: "Les arbustes entrent au repos : ils supportent mieux d’être plantés. Leurs racines s’installent pendant l’hiver, tant que la terre ne gèle pas, et la plante démarre plus fort au printemps.",
  plantings: {
    month: 11,
    listTitle: "Ce qui se plante maintenant",
    preferred: ["dwarf-raspberry", "redcurrant", "blackcurrant", "blueberry", "thornless-blackberry", "kiwiberry", "garlic", "viola", "wild-garlic"],
    max: 4,
  },
  protection: {
    id: "mulch",
    title: "Paille tes pots avant l’hiver",
    text: "Pose 5 cm de feuilles mortes, de paille ou de copeaux sur la terre de chaque pot : les racines craignent le gel plus que les feuilles.",
  },
  coldNote: "Chez toi, le froid arrive tôt : protège d’abord tes pots. Plante seulement un jour doux, quand la terre n’est pas gelée.",
  noraQuestion: "Que planter pour la Sainte-Catherine sur mon balcon ?",
  badge: { title: "Sainte-Catherine", detail: "Une plante installée pour la Sainte-Catherine" },
  summary: (planted) => `Tu as planté ${planted} plante${planted > 1 ? "s" : ""} pour la Sainte-Catherine. Rendez-vous au printemps pour les voir repartir.`,
  notification: { title: "La Sainte-Catherine approche 🌳", body: "C’est le moment de planter." },
};

export const SEASONAL_EVENTS: SeasonalEvent[] = [SAINTE_CATHERINE];

/** Le bilan reste proposé quelques jours après la fin (jusqu'à ce qu'on le ferme). */
const SUMMARY_DAYS = 3;

export function eventById(id: string) {
  return SEASONAL_EVENTS.find((event) => event.id === id) ?? null;
}

const at = (year: number, { month, day }: MonthDay, hour = 0) => new Date(year, month - 1, day, hour);

/** Les bornes de l'édition `year` : du premier jour 0 h au lendemain du dernier jour 0 h. */
export function eventWindow(event: SeasonalEvent, year: number) {
  const start = at(year, event.start);
  const end = at(year, event.end);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export type EventMoment = { event: SeasonalEvent; year: number; phase: "running" | "summary" };

/** L'événement en cours, ou son bilan dans les jours qui suivent ; null sinon. */
export function eventMoment(now: Date, events = SEASONAL_EVENTS): EventMoment | null {
  for (const event of events) {
    const { start, end } = eventWindow(event, now.getFullYear());
    if (now >= start && now < end) return { event, year: now.getFullYear(), phase: "running" };
    const summaryEnd = new Date(end);
    summaryEnd.setDate(summaryEnd.getDate() + SUMMARY_DAYS);
    if (now >= end && now < summaryEnd) return { event, year: now.getFullYear(), phase: "summary" };
  }
  return null;
}

/** Clé du badge de l'édition : `event:sainte-catherine:2026`. */
export function eventAwardKey(event: Pick<SeasonalEvent, "id">, year: number) {
  return `event:${event.id}:${year}`;
}

/** Clé gardée quand on ferme la carte (ou le bilan) d'une édition. */
export function eventDismissKey(event: Pick<SeasonalEvent, "id">, year: number, phase: EventMoment["phase"]) {
  return `${event.id}:${year}:${phase}`;
}

/** Une plante proposée qu'on peut planter ce mois-là : arbuste, ail, fleur… */
function plantableIn(entry: CatalogPlant, month: Month, climate?: ClimateInfo | null) {
  return adaptToClimate(entry, climate).plantMonths.includes(month);
}

/**
 * Les plantes proposées par l'événement : plantables ce mois-là dans ce climat, adaptées au soleil et à la place du
 * balcon, pas déjà installées ; les préférées d'abord. `owned` : ids catalogue des plantes en terre sur le balcon.
 */
export function eventPlantings(event: SeasonalEvent, answers: OnboardingAnswers | null, options: { climate?: ClimateInfo | null; owned?: string[] } = {}): CatalogPlant[] {
  const plantings = event.plantings;
  if (!plantings) return [];
  const owned = new Set(options.owned ?? []);
  const sunlight = (answers?.skipped ? undefined : answers?.sunlight) as Sunlight | undefined;
  const space = (answers?.skipped ? undefined : answers?.space) as SpaceSize | undefined;
  const rank = (entry: CatalogPlant) => {
    const index = plantings.preferred.indexOf(entry.id);
    return index === -1 ? plantings.preferred.length : index;
  };
  return PLANT_CATALOG.filter((entry) => plantableIn(entry, plantings.month, options.climate) && fitsSunlight(entry, sunlight) && fitsSpace(entry, space) && !owned.has(entry.id))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "fr"))
    .slice(0, plantings.max);
}

/** Climat froid (montagne) ou gel annoncé : la page met la protection en avant. */
export function coldMode(climate: ClimateInfo | null | undefined, frostAnnounced: boolean) {
  return frostAnnounced || climate?.zone === "mountain";
}

/**
 * Les plantations faites pendant l'édition : le premier geste (« Plante l'ail ») d'une plante qu'on peut planter le
 * mois de l'événement, coché entre le premier et le dernier jour. C'est ce qui donne le badge et le bilan.
 */
export function eventPlanted(event: SeasonalEvent, year: number, plants: ResolvedPlant[], events: MaintenanceEvent[]): MaintenanceEvent[] {
  const plantings = event.plantings;
  if (!plantings) return [];
  const { start, end } = eventWindow(event, year);
  const eligible = new Set(plants.filter(({ entry }) => entry.plantMonths.includes(plantings.month)).map(({ plant }) => plant.id));
  return events
    .filter((item) => eligible.has(item.plantId) && item.id === `${item.plantId}:start`)
    .filter((item) => {
      const date = new Date(item.completedAt);
      return date >= start && date < end;
    })
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** Les badges d'événement mérités d'après l'historique (plantes du balcon et plantes retirées). */
export function eventAwards(plants: ResolvedPlant[], events: MaintenanceEvent[], now: Date): Record<string, string> {
  const awards: Record<string, string> = {};
  for (const event of SEASONAL_EVENTS) {
    for (let year = now.getFullYear() - 1; year <= now.getFullYear(); year += 1) {
      const first = eventPlanted(event, year, plants, events)[0];
      if (first) awards[eventAwardKey(event, year)] = first.completedAt;
    }
  }
  return awards;
}

/** Le geste de protection (« Paille tes pots ») noté pour un pot : une fois par édition. */
export function protectionEventId(event: SeasonalEvent, year: number, plantId: string) {
  return `event:${event.id}:${year}:${event.protection?.id ?? "protect"}:${plantId}`;
}

export function protectionEvents(event: SeasonalEvent, year: number, plants: ResolvedPlant[], now: Date): MaintenanceEvent[] {
  const protection = event.protection;
  if (!protection) return [];
  return plants
    .filter(({ plant }) => !plant.toPlant)
    .map(({ plant }) => ({ id: protectionEventId(event, year, plant.id), plantId: plant.id, type: "protection" as const, completedAt: now.toISOString(), source: "manual" as const, note: protection.title }));
}

export function protectionDone(event: SeasonalEvent, year: number, events: MaintenanceEvent[]) {
  const prefix = `event:${event.id}:${year}:${event.protection?.id ?? "protect"}:`;
  return events.some((item) => item.id.startsWith(prefix));
}

/**
 * La notification de lancement : le premier jour, à l'heure du conseil choisie (jamais dans la plage calme, Réglages
 * s'en assure). null quand l'édition de l'année a déjà commencé : la carte d'Aujourd'hui suffit.
 */
export function nextEventNotification(now: Date, timing: { preferredHour: number; preferredMinute: number }, events = SEASONAL_EVENTS): { event: SeasonalEvent; date: Date } | null {
  let best: { event: SeasonalEvent; date: Date } | null = null;
  for (const event of events) {
    for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
      const date = at(year, event.start);
      date.setHours(timing.preferredHour, timing.preferredMinute, 0, 0);
      if (date.getTime() <= now.getTime()) continue;
      if (!best || date < best.date) best = { event, date };
      break;
    }
  }
  return best;
}

export const eventNotificationSource = (event: Pick<SeasonalEvent, "id">) => `balco-event-${event.id}`;

/** « Sainte-Catherine · 2026 » */
export function eventBadgeTitle(event: SeasonalEvent, year: number) {
  return `${event.badge.title} · ${year}`;
}

/** Pour les tests et l'écran : le jour de l'édition en clair. */
export function eventDayKey(event: SeasonalEvent, year: number) {
  return dayKey(at(year, event.start));
}
