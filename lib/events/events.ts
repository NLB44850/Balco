/**
 * Les temps forts de l'année au balcon (un par saison : Prépare ton printemps, Saints de glace, Balcon en vacances,
 * Sainte-Catherine), décrits par des données : dates, climats, carte compacte d'Aujourd'hui, page de l'événement,
 * plantes proposées, geste avec « C'est fait », lien, badge, question pour Nora, bilan et notification de lancement.
 * Un nouvel événement s'ajoute dans `SEASONAL_EVENTS`. Logique pure.
 *
 * Contenus vérifiés sur deux sources au moins : docs/sources-evenements.md.
 */
import { dayKey, type ResolvedPlant } from "../garden/garden-logic";
import { adaptToClimate, type ClimateInfo, type ClimateZone } from "../plants/climate";
import { fitsSpace, fitsSunlight, PLANT_CATALOG, type CatalogPlant, type Month, type OnboardingAnswers, type SpaceSize, type Sunlight } from "../plants/catalog";
import type { MaintenanceEvent } from "../reminders/reminder-engine";

export type MonthDay = { month: Month; day: number };

/** Ce que la carte compacte peut dire selon le moment (compte à rebours, feu vert selon la météo réelle). */
export type EventCardContext = { now: Date; year: number; frostAnnounced: boolean };

export type SeasonalEvent = {
  id: string;
  /** Première et dernière journée de la carte (incluses), chaque année. */
  start: MonthDay;
  end: MonthDay;
  /** Réservé à ces climats (sans ville connue, l'événement s'affiche). */
  climates?: ClimateZone[];
  emoji: string;
  title: string;
  /** La carte compacte d'Aujourd'hui, sous le bandeau météo. */
  cardText: string | ((context: EventCardContext) => string);
  quote?: string;
  explanation: string;
  /**
   * Les plantes proposées : celles du catalogue qu'on peut semer ou planter ces mois-là, adaptées au balcon.
   * `plant` : « Ajouter » (à planter, avec son pas-à-pas) ; `wish` : « Garder pour le printemps » (envies du printemps).
   */
  plantings?: {
    mode: "plant" | "wish";
    months: Month[];
    listTitle: string;
    /** Seulement les plantes frileuses (Saints de glace). */
    frostSensitiveOnly?: boolean;
    /** L'ordre de préférence (les autres plantes suivent) ; au plus `max`. */
    preferred: string[];
    max: number;
  };
  /** Un geste valable pour tous, avec « C'est fait » (noté pour chaque pot du balcon). */
  protection?: { id: string; title: string; text: string; doneText: string };
  /** Un lien vers un écran de l'app (« Préparer mon départ › »). */
  link?: { title: string; text: string; route: "/vacation" | "/garden/add" };
  /** Climat froid ou gel annoncé : la protection passe avant la plantation. */
  coldNote?: string;
  noraQuestion: string;
  /**
   * Le badge de l'édition, avec son millésime : `event:<id>:<année>`. `plant` : une plante proposée plantée pendant
   * l'événement (à partir de `from`) ; `action` : « C'est fait » sur le geste ; `wish` : une plante gardée pour le printemps.
   */
  badge: { title: string; detail: string; rule: "plant" | "action" | "wish"; from?: MonthDay };
  /** Le bilan, le lendemain de la fin, si l'on a participé (`count` : plantes, envies…). */
  summary: (count: number) => string;
  notification: { title: string; body: string };
  /** La grande carte d'arrivée, en plein écran, à la première ouverture pendant l'événement : ce qui tombe, et son bouton. */
  intro: { particles: string[]; action: string };
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
    mode: "plant",
    months: [11],
    listTitle: "Ce qui se plante maintenant",
    preferred: ["dwarf-raspberry", "redcurrant", "blackcurrant", "blueberry", "thornless-blackberry", "kiwiberry", "garlic", "viola", "wild-garlic"],
    max: 4,
  },
  protection: {
    id: "mulch",
    title: "Paille tes pots avant l’hiver",
    text: "Pose 5 cm de feuilles mortes, de paille ou de copeaux sur la terre de chaque pot : les racines craignent le gel plus que les feuilles.",
    doneText: "C’est noté : tes pots sont paillés",
  },
  coldNote: "Chez toi, le froid arrive tôt : protège d’abord tes pots. Plante seulement un jour doux, quand la terre n’est pas gelée.",
  noraQuestion: "Que planter pour la Sainte-Catherine sur mon balcon ?",
  badge: { title: "Sainte-Catherine", detail: "Une plante installée pour la Sainte-Catherine", rule: "plant" },
  summary: (planted) => `Tu as planté ${planted} plante${planted > 1 ? "s" : ""} pour la Sainte-Catherine. Rendez-vous au printemps pour les voir repartir.`,
  notification: { title: "La Sainte-Catherine approche 🌳", body: "C’est le moment de planter." },
  intro: { particles: ["🍂", "🍁", "🌰"], action: "Voir ce qui se plante" },
};

/** Hiver : en janvier, choisir ses plantes du printemps et préparer son matériel. */
export const PREPARE_SPRING: SeasonalEvent = {
  id: "prepare-ton-printemps",
  start: { month: 1, day: 12 },
  end: { month: 1, day: 31 },
  emoji: "🌱",
  title: "Prépare ton printemps",
  cardText: "Choisis tes plantes du printemps et prépare tes pots",
  explanation: "Le balcon se repose : c’est le bon moment pour choisir ce que tu sèmeras au printemps, faire l’inventaire de tes graines et préparer tes pots. Balco te reproposera tes envies début mars.",
  plantings: {
    mode: "wish",
    months: [3, 4],
    listTitle: "À garder pour le printemps",
    preferred: ["cherry-tomato", "basil", "cut-lettuce", "radish", "strawberry", "nasturtium", "chives", "parsley", "dwarf-tomato", "sweet-pepper"],
    max: 5,
  },
  protection: {
    id: "clean-pots",
    title: "Lave tes pots vides",
    text: "Frotte-les à l’eau savonneuse, rince-les et laisse-les sécher : ils seront propres et prêts pour tes semis.",
    doneText: "C’est noté : tes pots sont prêts pour le printemps",
  },
  noraQuestion: "Que semer au printemps sur mon balcon ?",
  badge: { title: "Prépare ton printemps", detail: "Une plante gardée pour le printemps", rule: "wish" },
  summary: (wishes) => `Tu as ${wishes} plante${wishes > 1 ? "s" : ""} en tête pour le printemps. Balco te les reproposera début mars.`,
  notification: { title: "Prépare ton printemps 🌱", body: "Choisis tes plantes du printemps pendant que le balcon se repose." },
  intro: { particles: ["🌱", "🌸", "🌿"], action: "Choisir mes plantes" },
};

const SAINTS_DAY = 13;

/** Printemps : les Saints de glace (11, 12 et 13 mai), compte à rebours puis feu vert selon la météo réelle. */
export const SAINTS_DE_GLACE: SeasonalEvent = {
  id: "saints-de-glace",
  start: { month: 5, day: 4 },
  end: { month: 5, day: 20 },
  // Ailleurs, les dernières gelées tombent bien plus tôt (Midi) ou bien plus tard (montagne).
  climates: ["oceanic", "temperate", "continental"],
  emoji: "🧊",
  title: "Les Saints de glace",
  cardText: ({ now, year, frostAnnounced }) => {
    const days = Math.round((new Date(year, 4, 11).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
    if (days > 0) return `Dans ${days} jour${days > 1 ? "s" : ""} : garde encore tes plantes frileuses à l’abri`;
    if (now.getDate() <= SAINTS_DAY) return "C’est aujourd’hui : attends encore un peu pour les plantes frileuses";
    return frostAnnounced ? "Pas encore : du gel est annoncé chez toi" : "Feu vert : installe tes plantes frileuses dehors";
  },
  quote: "« Saint Mamert, saint Pancrace et saint Servais sont toujours des saints de glace. »",
  explanation: "Les 11, 12 et 13 mai marquent la fin habituelle des gelées tardives. Tomates, basilic et poivrons attendent ce feu vert pour sortir. Regarde quand même la météo : une nuit froide peut encore arriver.",
  plantings: {
    mode: "plant",
    months: [5],
    listTitle: "À installer dès le feu vert",
    frostSensitiveOnly: true,
    preferred: ["cherry-tomato", "basil", "sweet-pepper", "chili", "dwarf-tomato", "eggplant", "zucchini"],
    max: 4,
  },
  coldNote: "Du gel est annoncé : garde tes plantes frileuses à l’abri encore quelques nuits.",
  noraQuestion: "Quand sortir mes plantes frileuses après les Saints de glace ?",
  badge: { title: "Saints de glace", detail: "Une plante frileuse installée après les Saints de glace", rule: "plant", from: { month: 5, day: SAINTS_DAY + 1 } },
  summary: (planted) => `Tu as installé ${planted} plante${planted > 1 ? "s" : ""} frileuse${planted > 1 ? "s" : ""} après les Saints de glace. Bel été !`,
  notification: { title: "Les Saints de glace approchent 🧊", body: "Garde tes plantes frileuses à l’abri jusqu’au 13 mai." },
  intro: { particles: ["❄️", "🧊", "🍅"], action: "Voir quand planter" },
};

/** Été : avant les départs, préparer le balcon à la chaleur et à l'absence. */
export const SUMMER_HOLIDAYS: SeasonalEvent = {
  id: "balcon-en-vacances",
  start: { month: 7, day: 1 },
  end: { month: 7, day: 15 },
  emoji: "🏖️",
  title: "Balcon en vacances",
  cardText: "Prépare ton balcon à la chaleur et à ton départ",
  explanation: "Avant de partir, quelques gestes suffisent : regroupe tes pots à l’ombre, arrose bien puis paille, et prévois une petite réserve d’eau ou un proche qui passe arroser.",
  protection: {
    id: "summer-mulch",
    title: "Paille tes pots pour l’été",
    text: "Arrose bien, puis pose 2 à 3 cm de paillis (chanvre, lin, feuilles mortes) : la terre garde son humidité bien plus longtemps.",
    doneText: "C’est noté : tes pots sont paillés pour l’été",
  },
  link: { title: "Préparer mon départ", text: "Le mode vacances prépare ton plan et la liste pour la personne qui arrose.", route: "/vacation" },
  noraQuestion: "Comment préparer mon balcon avant de partir en vacances ?",
  badge: { title: "Balcon en vacances", detail: "Tes pots paillés pour l’été", rule: "action" },
  summary: () => "Tes pots sont paillés pour l’été : ils garderont leur fraîcheur plus longtemps. Bonnes vacances !",
  notification: { title: "Balcon en vacances 🏖️", body: "Quelques gestes avant de partir, et ton balcon passe l’été tranquille." },
  intro: { particles: ["☀️", "🌻", "💧"], action: "Préparer mon balcon" },
};

export const SEASONAL_EVENTS: SeasonalEvent[] = [PREPARE_SPRING, SAINTS_DE_GLACE, SUMMER_HOLIDAYS, SAINTE_CATHERINE];

/** Le texte de la carte compacte au moment voulu. */
export function eventCardText(event: SeasonalEvent, context: EventCardContext) {
  return typeof event.cardText === "string" ? event.cardText : event.cardText(context);
}

/** L'événement est-il proposé dans ce climat ? */
export function eventForClimate(event: SeasonalEvent, climate: ClimateInfo | null | undefined) {
  return !event.climates || !climate || event.climates.includes(climate.zone);
}

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
export function eventMoment(now: Date, climate?: ClimateInfo | null, events = SEASONAL_EVENTS): EventMoment | null {
  for (const event of events) {
    if (!eventForClimate(event, climate)) continue;
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

/** La clé de la grande carte d'arrivée déjà vue (une fois par édition), rangée avec les cartes fermées. */
export function eventIntroKey(event: Pick<SeasonalEvent, "id">, year: number) {
  return `${event.id}:${year}:intro`;
}

/** La grande carte d'arrivée est-elle à montrer ? Pendant l'événement, si elle n'a pas été vue ni la carte fermée. */
export function eventIntroDue(moment: EventMoment | null, dismissed: string[]): moment is EventMoment {
  if (!moment || moment.phase !== "running") return false;
  return !dismissed.includes(eventIntroKey(moment.event, moment.year)) && !dismissed.includes(eventDismissKey(moment.event, moment.year, "running"));
}

/** Une plante qu'on peut semer ou planter l'un de ces mois-là, dans ce climat. */
function startsIn(entry: CatalogPlant, months: Month[], mode: "plant" | "wish", climate?: ClimateInfo | null) {
  const adapted = adaptToClimate(entry, climate);
  return months.some((month) => adapted.plantMonths.includes(month) || (mode === "wish" && adapted.sowMonths.includes(month)));
}

/**
 * Les plantes proposées par l'événement : à planter (ou à semer, pour le printemps) ces mois-là dans ce climat,
 * adaptées au soleil et à la place du balcon, pas déjà installées ; les préférées d'abord. `owned` : ids catalogue
 * des plantes en terre sur le balcon.
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
  return PLANT_CATALOG.filter((entry) => startsIn(entry, plantings.months, plantings.mode, options.climate) && (!plantings.frostSensitiveOnly || entry.care.frostSensitive) && fitsSunlight(entry, sunlight) && fitsSpace(entry, space) && !owned.has(entry.id))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "fr"))
    .slice(0, plantings.max);
}

/** Climat froid (montagne) ou gel annoncé : la page met la protection en avant. */
export function coldMode(climate: ClimateInfo | null | undefined, frostAnnounced: boolean) {
  return frostAnnounced || climate?.zone === "mountain";
}

/**
 * Les plantations faites pendant l'édition : le premier geste (« Plante l'ail ») d'une plante proposable par
 * l'événement, coché entre le premier jour (ou `badge.from`) et le dernier. C'est ce qui donne le badge et le bilan.
 */
export function eventPlanted(event: SeasonalEvent, year: number, plants: ResolvedPlant[], events: MaintenanceEvent[]): MaintenanceEvent[] {
  const plantings = event.plantings;
  if (!plantings || plantings.mode !== "plant") return [];
  const { end } = eventWindow(event, year);
  const start = at(year, event.badge.from ?? event.start);
  const eligible = new Set(plants.filter(({ entry }) => startsIn(entry, plantings.months, "plant") && (!plantings.frostSensitiveOnly || entry.care.frostSensitive)).map(({ plant }) => plant.id));
  return events
    .filter((item) => eligible.has(item.plantId) && item.id === `${item.plantId}:start`)
    .filter((item) => {
      const date = new Date(item.completedAt);
      return date >= start && date < end;
    })
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** « C'est fait » sur le geste de l'édition (le premier noté), pendant l'événement. */
export function protectionDoneAt(event: SeasonalEvent, year: number, events: MaintenanceEvent[]) {
  const prefix = `event:${event.id}:${year}:${event.protection?.id ?? "protect"}:`;
  return events.filter((item) => item.id.startsWith(prefix)).map((item) => item.completedAt).sort()[0];
}

/** Combien pour le bilan : plantes plantées, geste fait (1), plantes gardées pour le printemps. */
export function eventParticipation(event: SeasonalEvent, year: number, context: { plants: ResolvedPlant[]; events: MaintenanceEvent[]; awards?: Record<string, string>; springWishes?: string[] }) {
  if (event.badge.rule === "plant") return eventPlanted(event, year, context.plants, context.events).length;
  if (event.badge.rule === "action") return protectionDoneAt(event, year, context.events) ? 1 : 0;
  return context.awards?.[eventAwardKey(event, year)] ? Math.max(1, context.springWishes?.length ?? 0) : 0;
}

/**
 * Les badges d'événement mérités d'après l'historique (plantes du balcon et plantes retirées). Celui des envies du
 * printemps est donné au moment où l'on garde une plante (`grantAward` du contexte).
 */
export function eventAwards(plants: ResolvedPlant[], events: MaintenanceEvent[], now: Date): Record<string, string> {
  const awards: Record<string, string> = {};
  for (const event of SEASONAL_EVENTS) {
    for (let year = now.getFullYear() - 1; year <= now.getFullYear(); year += 1) {
      const at = event.badge.rule === "plant" ? eventPlanted(event, year, plants, events)[0]?.completedAt : event.badge.rule === "action" ? protectionDoneAt(event, year, events) : undefined;
      if (at) awards[eventAwardKey(event, year)] = at;
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
  return protectionDoneAt(event, year, events) !== undefined;
}

/**
 * La notification de lancement : le premier jour, à l'heure du conseil choisie (jamais dans la plage calme, Réglages
 * s'en assure). null quand l'édition de l'année a déjà commencé : la carte d'Aujourd'hui suffit.
 */
export function nextEventNotification(now: Date, timing: { preferredHour: number; preferredMinute: number }, climate?: ClimateInfo | null, events = SEASONAL_EVENTS): { event: SeasonalEvent; date: Date } | null {
  let best: { event: SeasonalEvent; date: Date } | null = null;
  for (const event of events) {
    if (!eventForClimate(event, climate)) continue;
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
