/**
 * Logique pure du jardin de l'utilisateur : session du jour, état des plantes,
 * statistiques, badges et points. Aucune dépendance React Native, pour rester testable.
 */
import { getCatalogPlant, soilCheckDepthCm, tasksForMonth, type CareTask, type CatalogPlant } from "../plants/catalog";
import type { MaintenanceEvent, MaintenanceTaskType, PlantCareProfile } from "../reminders/reminder-engine";

export type GardenPlant = {
  /** Identifiant d'instance : deux pieds de tomates ont deux ids différents. */
  id: string;
  catalogId: string;
  nickname?: string;
  /** Variété choisie parmi celles du catalogue ; absente si l'utilisateur ne la connaît pas. */
  varietyId?: string;
  addedAt: string;
  /** Dernière modification sur l'appareil : départage deux appareils qui modifient la même plante. */
  updatedAt?: string;
  /** Plante retirée : conservée comme « pierre tombale » pour que le retrait se propage aux autres appareils. */
  removedAt?: string;
  /**
   * À planter : choisie mais pas encore en terre (ni arrosage ni entretien, son premier geste est « Sème… »
   * ou « Plante… »). Absent ou false : installée sur le balcon. Cocher le premier geste l'installe.
   */
  toPlant?: boolean;
};

export type ResolvedPlant = { plant: GardenPlant; entry: CatalogPlant };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const MAX_STORED_EVENTS = 1000;

export function createGardenPlant(catalogId: string, now = new Date(), options: { toPlant?: boolean } = {}): GardenPlant {
  const plant: GardenPlant = { id: `${catalogId}-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`, catalogId, addedAt: now.toISOString(), updatedAt: now.toISOString() };
  return options.toPlant ? { ...plant, toPlant: true } : plant;
}

/** Identifiant du premier geste d'une plante à planter (« Sème la mâche ») : une seule fois par plante. */
export function startEventId(plantId: string) {
  return `${plantId}:start`;
}

/** La plante dont ce geste est le premier (« Sème… », « Plante… »), sinon null. */
export function startedPlantId(eventId: string) {
  return eventId.endsWith(":start") ? eventId.slice(0, -":start".length) : null;
}

/** En terre depuis : jamais pour une plante à planter, sinon son premier geste ou son arrivée. */
export function inGroundSince(plant: GardenPlant, events: MaintenanceEvent[]): number | null {
  if (plant.toPlant) return null;
  const start = events.find((event) => event.id === startEventId(plant.id));
  return new Date(start?.completedAt ?? plant.addedAt).getTime();
}

export function activePlants(plants: GardenPlant[]) {
  return plants.filter((plant) => !plant.removedAt);
}

export function resolvePlants(plants: GardenPlant[]): ResolvedPlant[] {
  return plants.flatMap((plant) => {
    const entry = getCatalogPlant(plant.catalogId);
    return entry ? [{ plant, entry }] : [];
  });
}

export function plantDisplayName({ plant, entry }: ResolvedPlant) {
  return plant.nickname?.trim() || entry.name;
}

/** Variété choisie, si elle figure toujours dans le catalogue. */
export function plantVariety({ plant, entry }: ResolvedPlant) {
  return plant.varietyId ? entry.varieties.find((variety) => variety.id === plant.varietyId) : undefined;
}

export function careProfileFor(resolved: ResolvedPlant): PlantCareProfile {
  const { plant, entry } = resolved;
  return {
    plantId: plant.id,
    displayName: plantDisplayName(resolved),
    label: plant.nickname?.trim() || entry.label,
    ...entry.care,
    allowedTaskTypes: Array.from(new Set<MaintenanceTaskType>([...entry.tasks.map((task) => task.type), "observation", "protection"])),
    soilCheckCm: soilCheckDepthCm(entry),
  };
}

// --- Dates -------------------------------------------------------------------

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayOfYear(date: Date) {
  return Math.floor((startOfDay(date).getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / DAY_MS);
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function relativeDay(date: Date, now = new Date()) {
  const days = daysBetween(date, now);
  if (days <= 0) return "aujourd’hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  return `le ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
}

export function formatLongDate(now = new Date()) {
  return now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
}

export function seasonName(now = new Date()) {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const at = month * 100 + day;
  if (at >= 321 && at < 621) return "printemps";
  if (at >= 621 && at < 922) return "été";
  if (at >= 922 && at < 1221) return "automne";
  return "hiver";
}

export function gardenDay(plants: GardenPlant[], now = new Date()) {
  const starts = plants.map((plant) => new Date(plant.addedAt).getTime()).filter(Number.isFinite);
  if (starts.length === 0) return null;
  return daysBetween(new Date(Math.min(...starts)), now) + 1;
}

// --- Historique ---------------------------------------------------------------

export function lastEventDate(events: MaintenanceEvent[], plantId: string, type?: MaintenanceTaskType, before?: Date) {
  let latest: Date | null = null;
  for (const event of events) {
    if (event.plantId !== plantId || (type && event.type !== type)) continue;
    const date = new Date(event.completedAt);
    if (!Number.isFinite(date.getTime()) || (before && date >= before)) continue;
    if (!latest || date > latest) latest = date;
  }
  return latest;
}

export function eventsForPlant(events: MaintenanceEvent[], plantId: string) {
  return events.filter((event) => event.plantId === plantId).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

// --- Historique d'une plante --------------------------------------------------

export const EVENT_TYPE_LABELS: Record<MaintenanceTaskType, { label: string; icon: string }> = {
  watering: { label: "Arrosage", icon: "💧" },
  observation: { label: "Observation", icon: "🔎" },
  pruning: { label: "Taille", icon: "✂️" },
  protection: { label: "Protection", icon: "🛡️" },
  harvest: { label: "Récolte", icon: "🧺" },
  repotting: { label: "Rempotage", icon: "🪴" },
  fertilizing: { label: "Engrais", icon: "🌱" },
};

export type HistoryDay = { key: string; label: string; events: MaintenanceEvent[] };

/** Gestes d'une plante, du plus récent au plus ancien, regroupés par jour. */
export function historyByDay(events: MaintenanceEvent[], plantId: string, now = new Date()): HistoryDay[] {
  const days: HistoryDay[] = [];
  for (const event of eventsForPlant(events, plantId)) {
    const date = new Date(event.completedAt);
    const key = startOfDay(date).toISOString();
    const current = days.at(-1);
    if (current?.key === key) current.events.push(event);
    else days.push({ key, label: historyDayLabel(date, now), events: [event] });
  }
  return days;
}

export function historyDayLabel(date: Date, now: Date) {
  const days = daysBetween(date, now);
  if (days <= 0) return "Aujourd’hui";
  if (days === 1) return "Hier";
  const label = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }) });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function isScannerEvent(event: MaintenanceEvent) {
  return event.id.startsWith("scan:");
}

export function appendEvent(events: MaintenanceEvent[], event: MaintenanceEvent) {
  return [event, ...events.filter((existing) => existing.id !== event.id)].slice(0, MAX_STORED_EVENTS);
}

// --- État d'une plante --------------------------------------------------------

export type PlantStatus = { tone: "good" | "watch" | "new"; label: string; meta: string; freshness: number };

export function plantStatus(resolved: ResolvedPlant, events: MaintenanceEvent[], now = new Date()): PlantStatus {
  const last = lastEventDate(events, resolved.plant.id);
  if (!last) return { tone: "new", label: "NOUVELLE", meta: "Aucun soin noté", freshness: 0.1 };
  const lastWatering = lastEventDate(events, resolved.plant.id, "watering") ?? last;
  const ratio = (now.getTime() - lastWatering.getTime()) / (resolved.entry.care.wateringIntervalHours * HOUR_MS);
  const watch = ratio > 1;
  return {
    tone: watch ? "watch" : "good",
    label: watch ? "À SURVEILLER" : "EN FORME",
    meta: `Dernier soin · ${relativeDay(last, now)}`,
    freshness: Math.min(1, Math.max(0.08, 1 - ratio)),
  };
}

// --- Session du jour ----------------------------------------------------------

export type SessionTask = { resolved: ResolvedPlant; task: CareTask; eventId: string; done: boolean };

export function sessionEventId(plantId: string, taskId: string, now: Date) {
  return `${plantId}:${taskId}:${dayKey(now)}`;
}

/**
 * Un geste espacé est dû quand le dernier date d'au moins `everyDays` jours (gestes d'aujourd'hui
 * exclus, pour qu'il reste coché dans la liste du jour). Jamais fait : on compte depuis l'arrivée de
 * la plante, dont le terreau neuf la nourrit déjà.
 */
export function spacedTaskDue(resolved: ResolvedPlant, task: CareTask, events: MaintenanceEvent[], now = new Date()) {
  if (!task.everyDays) return true;
  const today = startOfDay(now);
  const since = lastEventDate(events, resolved.plant.id, task.type, today) ?? new Date(resolved.plant.addedAt);
  if (!Number.isFinite(since.getTime())) return true;
  return daysBetween(since, today) >= task.everyDays;
}

export function eventForSessionTask({ resolved, task, eventId }: SessionTask, now = new Date()): MaintenanceEvent {
  return { id: eventId, plantId: resolved.plant.id, type: task.type, completedAt: now.toISOString(), source: "daily_task", note: task.title };
}

// --- Statistiques, badges, points ---------------------------------------------

export type GardenStats = { gestures: number; streakDays: number; plants: number; harvests: number; observations: number; weatherTipsFollowed: number; melliferousPlants: number };

/** Un « N'arrose pas, il va pleuvoir » suivi : l'arrosage évité est noté comme une observation. */
export function isAvoidedWatering(event: MaintenanceEvent) {
  return event.source === "reminder" && event.type === "observation" && /^N[’']arrose pas/u.test(event.note ?? "");
}

/** Au-delà, la série s'arrête de compter (une année). */
const MAX_FOLLOWED_DAYS = 366;

/**
 * Série de « jours suivis » : un jour compte quand chaque plante qui avait besoin d'eau ce jour-là a été
 * arrosée (ou que la pluie s'en est chargée), ou quand il n'y avait rien à arroser. Récoltes, entretien,
 * engrais et semis sont des bonus : ils ne cassent pas la série. Les alertes météo passées ne sont pas
 * gardées, elles ne comptent donc pas. Aujourd'hui compte dès qu'il est suivi, sans casser la série tant
 * que la journée n'est pas finie. Les jours d'avant la première plante arrêtent la série.
 */
export function followedDays(plants: ResolvedPlant[], events: MaintenanceEvent[], now = new Date()) {
  if (plants.length === 0) return 0;
  const byPlant = plants.map((resolved) => {
    const own = events.filter((event) => event.plantId === resolved.plant.id);
    const waterings = own.filter((event) => event.type === "watering").map((event) => new Date(event.completedAt).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
    const coveredDays = new Set(own.filter((event) => event.type === "watering" || isAvoidedWatering(event)).map((event) => dayKey(new Date(event.completedAt))));
    // Une plante à planter n'a pas soif ; une plante semée ou plantée compte à partir de ce jour-là.
    return { resolved, addedAt: inGroundSince(resolved.plant, events) ?? Number.POSITIVE_INFINITY, waterings, coveredDays };
  });

  /** true : suivi ; false : un arrosage manquait ; null : pas encore de plante ce jour-là. */
  const followed = (day: Date): boolean | null => {
    const start = day.getTime();
    const end = start + DAY_MS;
    const key = dayKey(day);
    const month = day.getMonth() + 1;
    const present = byPlant.filter((plant) => plant.addedAt < end);
    if (present.length === 0) return null;
    return present.every(({ resolved, waterings, coveredDays }) => {
      if (!tasksForMonth(resolved.entry, month).some((task) => task.type === "watering")) return true;
      const last = waterings.filter((time) => time < start).at(-1);
      // Même règle que le plan du jour : à arroser si jamais arrosée, ou si son rythme est dépassé.
      const due = last === undefined || start - last >= resolved.entry.care.wateringIntervalHours * HOUR_MS;
      return !due || coveredDays.has(key);
    });
  };

  const cursor = startOfDay(now);
  if (followed(cursor) !== true) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (streak < MAX_FOLLOWED_DAYS && followed(cursor) === true) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeStats(plants: ResolvedPlant[], events: MaintenanceEvent[], now = new Date()): GardenStats {
  const plantIds = new Set(plants.map(({ plant }) => plant.id));
  const own = events.filter((event) => plantIds.has(event.plantId));
  return {
    // L'arrosage évité grâce à la pluie est compté tout seul : ce n'est pas un geste (ni des points).
    gestures: own.filter((event) => !isAvoidedWatering(event)).length,
    streakDays: followedDays(plants, own, now),
    plants: plants.length,
    harvests: own.filter((event) => event.type === "harvest").length,
    observations: own.filter((event) => event.type === "observation").length,
    weatherTipsFollowed: own.filter((event) => event.source === "reminder").length,
    melliferousPlants: plants.filter(({ entry }) => entry.melliferous).length,
  };
}

export type Badge = { id: string; title: string; detail: string; icon: string; tone: string; current: number; target: number; unlocked: boolean };

const BADGE_RULES: Array<Omit<Badge, "current" | "unlocked"> & { metric: (stats: GardenStats) => number }> = [
  { id: "first-pot", title: "Premier Pot", detail: "Ajoute ta première plante", icon: "❀", tone: "#DCE8C7", target: 1, metric: (stats) => stats.plants },
  { id: "bees", title: "Ami des Abeilles", detail: "3 plantes mellifères", icon: "✺", tone: "#F5D27C", target: 3, metric: (stats) => stats.melliferousPlants },
  { id: "water", title: "Zéro Gâchis d'Eau", detail: "5 conseils météo suivis", icon: "◌", tone: "#B9DCD3", target: 5, metric: (stats) => stats.weatherTipsFollowed },
  { id: "bio", title: "Bio-Défenseur", detail: "5 inspections de tes plantes", icon: "♧", tone: "#DCE8DD", target: 5, metric: (stats) => stats.observations },
  { id: "plate", title: "Du Balcon à l'Assiette", detail: "Ta première récolte", icon: "♡", tone: "#F0D2C5", target: 1, metric: (stats) => stats.harvests },
  { id: "streak", title: "Main Verte", detail: "7 jours de suite", icon: "☀", tone: "#E9EFA6", target: 7, metric: (stats) => stats.streakDays },
];

export function computeBadges(stats: GardenStats): Badge[] {
  return BADGE_RULES.map(({ metric, ...badge }) => {
    const current = Math.min(metric(stats), badge.target);
    return { ...badge, current, unlocked: current >= badge.target };
  });
}

export const POINTS_PER_GESTURE = 4;
export const POINTS_PER_PLANT = 5;
export const POINTS_PER_BADGE = 10;
export const POINTS_PER_LEVEL = 100;
const LEVEL_TITLES = ["Graine curieuse", "Jardinier·ère en herbe", "Main verte", "Pilier du balcon", "Légende urbaine"];

export type Progress = { points: number; level: number; levelTitle: string; pointsInLevel: number; pointsToNext: number };

export function computeProgress(stats: GardenStats, badges: Badge[]): Progress {
  const points = stats.gestures * POINTS_PER_GESTURE + stats.plants * POINTS_PER_PLANT + badges.filter((badge) => badge.unlocked).length * POINTS_PER_BADGE;
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const pointsInLevel = points % POINTS_PER_LEVEL;
  return { points, level, levelTitle: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1], pointsInLevel, pointsToNext: POINTS_PER_LEVEL - pointsInLevel };
}

// --- Identité -----------------------------------------------------------------

export function greeting(firstName?: string | null) {
  const name = firstName?.trim();
  return name ? `Bonjour, ${name}` : "Bonjour";
}

export function initials(firstName?: string | null) {
  const name = firstName?.trim();
  if (!name) return null;
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}

const TIPS = [
  "L’eau de cuisson des légumes, refroidie et sans sel, est un bon coup de pouce pour tes plantes.",
  "Arrose le matin ou le soir : en pleine chaleur, une bonne partie de l’eau s’évapore avant d’atteindre les racines.",
  "Une soucoupe pleine d’eau en permanence fait pourrir les racines : vide-la une heure après l’arrosage.",
  "Un paillage de 2 cm (chanvre, feuilles mortes) garde la terre fraîche et divise les arrosages.",
  "Le marc de café s’utilise en fine couche, mélangé à la terre : en couche épaisse, il moisit.",
  "Tourne tes pots d’un quart de tour chaque semaine pour que les plantes poussent droit vers la lumière.",
  "Les pots en terre cuite respirent mais sèchent vite : ils demandent plus d’eau que le plastique.",
  "Laisse fleurir une aromatique ou deux : les pollinisateurs visiteront aussi tes tomates.",
];

export function dailyTip(now = new Date()) {
  return TIPS[dayOfYear(now) % TIPS.length];
}
