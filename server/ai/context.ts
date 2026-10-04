import { and, desc, eq, gt } from "drizzle-orm";

import { maintenanceEvents, noraMemories, reminderPlants, reminderProfiles } from "../../drizzle/schema";
import { vacationRange, isValidVacation, type Vacation } from "../../lib/garden/vacation";
import { describeMemory, isNoraLevel, parseNotes, parsePreferences, type NoraMemoryView } from "../../lib/ai/memory";
import { getCatalogPlant, MONTH_LONG, type Month, SPACE_LABELS, SUNLIGHT_LABELS, type OnboardingAnswers, type SpaceSize, type Sunlight } from "../../lib/plants/catalog";
import { seasonName } from "../../lib/garden/garden-logic";
import type { MaintenanceTaskType } from "../../lib/reminders/reminder-engine";
import { getDb } from "../db";

const TASK_LABELS: Record<string, string> = { watering: "arrosage", observation: "observation", pruning: "taille", protection: "protection", harvest: "récolte", repotting: "rempotage", fertilizing: "engrais" };
const DAY_MS = 86_400_000;
/** Nora ne lit que les gestes récents, résumés par plante et par type : un contexte court coûte moins cher. */
export const HISTORY_DAYS = 90;
/** Garde-fou : bien plus que 90 jours de gestes sur un balcon. */
const MAX_HISTORY_EVENTS = 1500;
/** Le dernier geste noté de chaque plante, en clair ; le reste est agrégé (nombre, dernière fois). */
const NOTES_PER_PLANT = 1;
/** Une plante retirée depuis plus longtemps ne sert plus aux conseils. */
const REMOVED_PLANTS_DAYS = 365;

export type PlantHistory = {
  name: string;
  addedDaysAgo: number | null;
  /** Gestes par type, du plus fréquent au plus rare. */
  byType: Array<{ type: string; count: number; lastDaysAgo: number }>;
  /** Gestes conseillés pour cette plante et jamais notés. */
  neverDone: string[];
  recentNotes: Array<{ text: string; daysAgo: number }>;
  /** Engrais conseillé ce mois-ci : tous les combien de jours. */
  feedEveryDays: number | null;
};

export type GardenFacts = {
  firstName: string | null;
  city: string | null;
  /** Coordonnées du balcon (arrondies), utiles quand la ville n'a pas de nom. */
  position?: { latitude: number; longitude: number } | null;
  sunlight: string | null;
  space: string | null;
  goals: string[];
  plants: Array<{ id: string; catalogId: string | null; name: string }>;
  history: PlantHistory[];
  removedPlants: Array<{ name: string; grownDays: number | null; removedDaysAgo: number }>;
  totals: { events: number; last30Days: number; firstDaysAgo: number | null };
  memory: NoraMemoryView;
  vacation?: Vacation | null;
};

type PlantRow = { plantId: string; catalogId: string | null; nickname: string | null; displayName: string; varietyId: string | null; active: number; addedAt: Date | null; removedAt: Date | null };
type EventRow = { plantId: string; type: string; completedAt: Date; note: string | null };

const GOAL_LABELS: Record<string, string> = { tomatoes: "des tomates cerises", aromatics: "des aromatiques pour la cuisine", bees: "des fleurs pour les abeilles", "zero-waste": "moins de gaspillage" };

const daysBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));

function plantName(row: PlantRow) {
  const entry = getCatalogPlant(row.catalogId ?? "");
  const variety = entry?.varieties.find((item) => item.id === row.varietyId);
  const name = row.nickname?.trim() || entry?.name || row.displayName;
  return variety ? `${name} (variété ${variety.name})` : name;
}

/** Gestes que le catalogue prévoit pour une plante : ceux jamais faits sont signalés à Nora. */
function expectedTypes(catalogId: string | null): MaintenanceTaskType[] {
  const entry = getCatalogPlant(catalogId ?? "");
  if (!entry) return [];
  const types = new Set<MaintenanceTaskType>(entry.tasks.map((task) => task.type));
  if (entry.harvestMonths.length > 0) types.add("harvest");
  if (entry.repotMonths.length > 0) types.add("repotting");
  types.delete("observation");
  return [...types];
}

/**
 * Les 90 derniers jours résumés plante par plante : combien de fois chaque type de geste, quand pour la
 * dernière fois, ce qui n'a pas été noté. Les gestes plus anciens sont ignorés.
 */
export function summarizeHistory(plants: PlantRow[], allEvents: EventRow[], now = new Date()) {
  const events = allEvents.filter((event) => now.getTime() - event.completedAt.getTime() <= HISTORY_DAYS * DAY_MS);
  const byPlant = new Map<string, EventRow[]>();
  for (const event of events) byPlant.set(event.plantId, [...(byPlant.get(event.plantId) ?? []), event]);
  const newestFirst = (list: EventRow[]) => [...list].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

  const history: PlantHistory[] = plants.filter((plant) => plant.active === 1).map((plant) => {
    const own = newestFirst(byPlant.get(plant.plantId) ?? []);
    const types = new Map<string, { count: number; last: Date }>();
    for (const event of own) {
      const current = types.get(event.type);
      types.set(event.type, { count: (current?.count ?? 0) + 1, last: current?.last ?? event.completedAt });
    }
    const notes: PlantHistory["recentNotes"] = [];
    for (const event of own) {
      const text = event.note?.replace(/\s+/g, " ").trim().slice(0, 140);
      if (!text || notes.some((note) => note.text === text)) continue;
      notes.push({ text, daysAgo: daysBetween(event.completedAt, now) });
      if (notes.length === NOTES_PER_PLANT) break;
    }
    return {
      name: plantName(plant),
      addedDaysAgo: plant.addedAt ? daysBetween(plant.addedAt, now) : null,
      byType: [...types].sort((a, b) => b[1].count - a[1].count).map(([type, { count, last }]) => ({ type: TASK_LABELS[type] ?? type, count, lastDaysAgo: daysBetween(last, now) })),
      neverDone: expectedTypes(plant.catalogId).filter((type) => !types.has(type)).map((type) => TASK_LABELS[type]),
      recentNotes: notes,
      feedEveryDays: getCatalogPlant(plant.catalogId ?? "")?.tasks.find((task) => task.type === "fertilizing" && task.months?.includes((now.getMonth() + 1) as Month))?.everyDays ?? null,
    };
  });

  const removedPlants = plants
    .filter((plant) => plant.active !== 1 && plant.removedAt && daysBetween(plant.removedAt, now) <= REMOVED_PLANTS_DAYS)
    .map((plant) => ({ name: plantName(plant), grownDays: plant.addedAt && plant.removedAt ? daysBetween(plant.addedAt, plant.removedAt) : null, removedDaysAgo: daysBetween(plant.removedAt!, now) }));

  const known = new Set(plants.map((plant) => plant.plantId));
  const counted = events.filter((event) => known.has(event.plantId));
  const oldest = counted.reduce<Date | null>((min, event) => (!min || event.completedAt < min ? event.completedAt : min), null);
  const totals = {
    events: counted.length,
    last30Days: counted.filter((event) => now.getTime() - event.completedAt.getTime() <= 30 * DAY_MS).length,
    firstDaysAgo: oldest ? daysBetween(oldest, now) : null,
  };
  return { history, removedPlants, totals };
}

function parseBalcony(json: string | null | undefined): OnboardingAnswers | null {
  try {
    return json ? (JSON.parse(json) as OnboardingAnswers) : null;
  } catch {
    return null;
  }
}

/** La mémoire telle que l'écran Nora l'affiche. Le niveau est l'expérience choisie à l'accueil ou dans Réglages. */
export async function loadMemory(userId: number): Promise<NoraMemoryView> {
  const db = await getDb();
  if (!db) return { level: null, preferences: [], notes: [] };
  const [row] = await db.select().from(noraMemories).where(eq(noraMemories.userId, userId)).limit(1);
  const [profile] = await db.select({ balconyJson: reminderProfiles.balconyJson }).from(reminderProfiles).where(eq(reminderProfiles.userId, userId)).limit(1);
  const experience = parseBalcony(profile?.balconyJson)?.experience;
  return { level: isNoraLevel(experience) ? experience : null, preferences: parsePreferences(row?.preferencesJson), notes: parseNotes(row?.notesJson) };
}

/** Ce que Nora sait du balcon : lu en base, jamais fourni par le client (pas de contexte falsifiable). */
export async function loadGardenFacts(userId: number, now = new Date()): Promise<GardenFacts> {
  const db = await getDb();
  const empty = { events: 0, last30Days: 0, firstDaysAgo: null };
  if (!db) return { firstName: null, city: null, sunlight: null, space: null, goals: [], plants: [], history: [], removedPlants: [], totals: empty, memory: { level: null, preferences: [], notes: [] } };
  const [profile] = await db.select().from(reminderProfiles).where(eq(reminderProfiles.userId, userId)).limit(1);
  const rows = await db.select().from(reminderPlants).where(eq(reminderPlants.userId, userId));
  const since = new Date(now.getTime() - HISTORY_DAYS * DAY_MS);
  const events = await db.select().from(maintenanceEvents).where(and(eq(maintenanceEvents.userId, userId), gt(maintenanceEvents.completedAt, since))).orderBy(desc(maintenanceEvents.completedAt)).limit(MAX_HISTORY_EVENTS);
  const balcony = parseBalcony(profile?.balconyJson);
  const asked = balcony && !balcony.skipped ? balcony : null;
  return {
    firstName: profile?.firstName ?? null,
    city: profile?.locationUpdatedAt && profile.city !== "Ma position" ? profile.city : null,
    position: profile?.locationUpdatedAt ? { latitude: Math.round(profile.latitude * 100) / 100, longitude: Math.round(profile.longitude * 100) / 100 } : null,
    sunlight: asked?.sunlight ? SUNLIGHT_LABELS[asked.sunlight as Sunlight] ?? null : null,
    space: asked?.space ? SPACE_LABELS[asked.space as SpaceSize] ?? null : null,
    goals: (asked?.goals ?? []).flatMap((goal) => GOAL_LABELS[goal] ?? []),
    plants: rows.filter((row) => row.active === 1).map((row) => ({ id: row.plantId, catalogId: row.catalogId, name: plantName(row) })),
    ...summarizeHistory(rows, events, now),
    memory: await loadMemory(userId),
    vacation: (() => {
      try {
        const value: unknown = profile?.vacationJson ? JSON.parse(profile.vacationJson) : null;
        return isValidVacation(value) ? value : null;
      } catch {
        return null;
      }
    })(),
  };
}

function ago(days: number) {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 60) return `il y a ${days} j`;
  return `il y a ${Math.round(days / 30)} mois`;
}

function describePlantHistory(plant: PlantHistory) {
  const since = plant.addedDaysAgo === null ? "" : ` (sur le balcon depuis ${plant.addedDaysAgo < 60 ? `${plant.addedDaysAgo} j` : `${Math.round(plant.addedDaysAgo / 30)} mois`})`;
  const parts = [
    plant.byType.length > 0 ? plant.byType.map((item) => `${item.type} ${item.count} fois, dernière fois ${ago(item.lastDaysAgo)}`).join(" ; ") : "aucun geste noté",
    plant.neverDone.length > 0 ? `pas noté depuis ${HISTORY_DAYS} j : ${plant.neverDone.join(", ")}` : null,
    plant.feedEveryDays ? `engrais conseillé tous les ${plant.feedEveryDays} j en ce moment` : null,
    plant.recentNotes.length > 0 ? `dernier geste : ${plant.recentNotes.map((note) => `« ${note.text} » ${ago(note.daysAgo)}`).join(", ")}` : null,
  ];
  return `- ${plant.name}${since} : ${parts.filter(Boolean).join(" ; ")}.`;
}

/** Résumé en français, placé après les instructions fixes pour ne pas casser le cache de prompt. */
export function describeGarden(facts: GardenFacts, now = new Date()) {
  const { totals } = facts;
  const lines = [
    `Date : ${now.getDate()} ${MONTH_LONG[now.getMonth()]} ${now.getFullYear()} (${seasonName(now)}), France métropolitaine.`,
    facts.firstName ? `Prénom de la personne : ${facts.firstName}.` : null,
    facts.city ? `Ville : ${facts.city}.` : null,
    facts.position ? `Position du balcon : ${Math.abs(facts.position.latitude)}° ${facts.position.latitude >= 0 ? "N" : "S"}, ${Math.abs(facts.position.longitude)}° ${facts.position.longitude >= 0 ? "E" : "O"}${facts.city ? "" : " (déduis-en la ville ou la région)"}.` : null,
    facts.space || facts.sunlight ? `Balcon : ${[facts.space, facts.sunlight ? `exposition ${facts.sunlight.toLowerCase()}` : null].filter(Boolean).join(", ")}.` : null,
    facts.goals.length > 0 ? `Envies choisies à l'inscription : ${facts.goals.join(", ")}.` : null,
    ...describeMemory(facts.memory, now),
    facts.vacation && facts.vacation.end >= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` ? `Mode vacances : absence ${vacationRange(facts.vacation)}, ${facts.vacation.helper ? "un proche passe arroser" : "personne ne passe arroser"}.` : null,
    facts.plants.length > 0 ? `Plantes cultivées : ${facts.plants.map((plant) => plant.name).join(", ")}.` : "Aucune plante enregistrée pour l'instant.",
    totals.events > 0 ? `Gestes notés dans Balco ces ${HISTORY_DAYS} derniers jours : ${totals.events}, dont ${totals.last30Days} ces 30 derniers jours.` : null,
    facts.history.length > 0 ? `Historique des ${HISTORY_DAYS} derniers jours, plante par plante :\n${facts.history.map(describePlantHistory).join("\n")}` : null,
    facts.removedPlants.length > 0 ? `Plantes retirées du balcon cette année : ${facts.removedPlants.map((plant) => `${plant.name} (${plant.grownDays === null ? "" : `${plant.grownDays} j sur le balcon, `}retrait ${ago(plant.removedDaysAgo)})`).join(", ")}.` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
