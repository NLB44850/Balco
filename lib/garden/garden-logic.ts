/**
 * Logique pure du jardin de l'utilisateur : session du jour, état des plantes,
 * statistiques, badges et points. Aucune dépendance React Native, pour rester testable.
 */
import { getCatalogPlant, tasksForMonth, type CareTask, type CatalogPlant } from "../plants/catalog";
import type { MaintenanceEvent, MaintenanceTaskType, PlantCareProfile } from "../reminders/reminder-engine";

export type GardenPlant = {
  /** Identifiant d'instance : deux pieds de tomates ont deux ids différents. */
  id: string;
  catalogId: string;
  nickname?: string;
  addedAt: string;
};

export type ResolvedPlant = { plant: GardenPlant; entry: CatalogPlant };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const MAX_STORED_EVENTS = 1000;

export function createGardenPlant(catalogId: string, now = new Date()): GardenPlant {
  return { id: `${catalogId}-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`, catalogId, addedAt: now.toISOString() };
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

export function careProfileFor(resolved: ResolvedPlant): PlantCareProfile {
  const { plant, entry } = resolved;
  return {
    plantId: plant.id,
    displayName: plantDisplayName(resolved),
    ...entry.care,
    allowedTaskTypes: Array.from(new Set<MaintenanceTaskType>([...entry.tasks.map((task) => task.type), "observation", "protection"])),
  };
}

// --- Dates -------------------------------------------------------------------

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayOfYear(date: Date) {
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
 * Choisit un geste par plante pour aujourd'hui, puis garde les plus utiles.
 * Le classement ignore les gestes du jour pour que la liste ne se réordonne pas
 * au moment où l'utilisateur valide une tâche.
 */
export function buildDailySession(plants: ResolvedPlant[], events: MaintenanceEvent[], now = new Date(), limit = 3): SessionTask[] {
  const today = startOfDay(now);
  const month = now.getMonth() + 1;
  const eventIds = new Set(events.map((event) => event.id));

  return plants
    .map((resolved, index) => {
      const candidates = tasksForMonth(resolved.entry, month);
      if (candidates.length === 0) return null;
      const interval = resolved.entry.care.wateringIntervalHours * HOUR_MS;
      const lastWatering = lastEventDate(events, resolved.plant.id, "watering", today);
      const wateringTask = candidates.find((task) => task.type === "watering");
      const wateringDue = !lastWatering || today.getTime() - lastWatering.getTime() >= interval;
      const task = wateringTask && wateringDue ? wateringTask : candidates[(dayOfYear(now) + index) % candidates.length];

      const lastCare = lastEventDate(events, resolved.plant.id, undefined, today);
      const urgency = lastCare ? (today.getTime() - lastCare.getTime()) / interval : 10;
      const eventId = sessionEventId(resolved.plant.id, task.id, now);
      return { item: { resolved, task, eventId, done: eventIds.has(eventId) }, urgency };
    })
    .filter((value): value is { item: SessionTask; urgency: number } => value !== null)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function eventForSessionTask({ resolved, task, eventId }: SessionTask, now = new Date()): MaintenanceEvent {
  return { id: eventId, plantId: resolved.plant.id, type: task.type, completedAt: now.toISOString(), source: "daily_task", note: task.title };
}

// --- Statistiques, badges, points ---------------------------------------------

export type GardenStats = { gestures: number; streakDays: number; plants: number; harvests: number; observations: number; weatherTipsFollowed: number; melliferousPlants: number };

export function streakDays(events: MaintenanceEvent[], now = new Date()) {
  const days = new Set(events.map((event) => dayKey(new Date(event.completedAt))));
  const cursor = startOfDay(now);
  // Une journée sans geste n'est pas encore perdue tant qu'elle n'est pas finie.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeStats(plants: ResolvedPlant[], events: MaintenanceEvent[], now = new Date()): GardenStats {
  const plantIds = new Set(plants.map(({ plant }) => plant.id));
  const own = events.filter((event) => plantIds.has(event.plantId));
  return {
    gestures: own.length,
    streakDays: streakDays(own, now),
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
