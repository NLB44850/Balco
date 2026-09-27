import { and, desc, eq } from "drizzle-orm";

import { maintenanceEvents, reminderPlants, reminderProfiles } from "../../drizzle/schema";
import { getCatalogPlant, MONTH_LONG, SPACE_LABELS, SUNLIGHT_LABELS, type OnboardingAnswers, type SpaceSize, type Sunlight } from "../../lib/plants/catalog";
import { seasonName } from "../../lib/garden/garden-logic";
import { getDb } from "../db";

const TASK_LABELS: Record<string, string> = { watering: "arrosage", observation: "observation", pruning: "taille", protection: "protection", harvest: "récolte" };

export type GardenFacts = {
  firstName: string | null;
  city: string | null;
  sunlight: string | null;
  space: string | null;
  plants: Array<{ id: string; catalogId: string | null; name: string }>;
  recentEvents: Array<{ plantName: string; type: string; daysAgo: number }>;
};

/** Ce que Nora sait du balcon : lu en base, jamais fourni par le client (pas de contexte falsifiable). */
export async function loadGardenFacts(userId: number, now = new Date()): Promise<GardenFacts> {
  const db = await getDb();
  if (!db) return { firstName: null, city: null, sunlight: null, space: null, plants: [], recentEvents: [] };
  const [profile] = await db.select().from(reminderProfiles).where(eq(reminderProfiles.userId, userId)).limit(1);
  const rows = await db.select().from(reminderPlants).where(and(eq(reminderPlants.userId, userId), eq(reminderPlants.active, 1)));
  const events = await db.select().from(maintenanceEvents).where(eq(maintenanceEvents.userId, userId)).orderBy(desc(maintenanceEvents.completedAt)).limit(8);
  let balcony: OnboardingAnswers | null = null;
  try {
    balcony = profile?.balconyJson ? (JSON.parse(profile.balconyJson) as OnboardingAnswers) : null;
  } catch {
    balcony = null;
  }
  const plants = rows.map((row) => {
    const entry = getCatalogPlant(row.catalogId ?? "");
    const variety = entry?.varieties.find((item) => item.id === row.varietyId);
    const name = row.nickname?.trim() || entry?.name || row.displayName;
    return { id: row.plantId, catalogId: row.catalogId, name: variety ? `${name} (variété ${variety.name})` : name };
  });
  const nameOf = new Map(plants.map((plant) => [plant.id, plant.name]));
  return {
    firstName: profile?.firstName ?? null,
    city: profile?.locationUpdatedAt ? profile.city : null,
    sunlight: balcony?.sunlight && !balcony.skipped ? SUNLIGHT_LABELS[balcony.sunlight as Sunlight] ?? null : null,
    space: balcony?.space && !balcony.skipped ? SPACE_LABELS[balcony.space as SpaceSize] ?? null : null,
    plants,
    recentEvents: events
      .filter((event) => nameOf.has(event.plantId))
      .map((event) => ({ plantName: nameOf.get(event.plantId)!, type: TASK_LABELS[event.type] ?? event.type, daysAgo: Math.max(0, Math.round((now.getTime() - event.completedAt.getTime()) / 86_400_000)) })),
  };
}

/** Résumé en français, placé après les instructions fixes pour ne pas casser le cache de prompt. */
export function describeGarden(facts: GardenFacts, now = new Date()) {
  const lines = [
    `Date : ${now.getDate()} ${MONTH_LONG[now.getMonth()]} ${now.getFullYear()} (${seasonName(now)}), France métropolitaine.`,
    facts.firstName ? `Prénom de la personne : ${facts.firstName}.` : null,
    facts.city ? `Ville : ${facts.city}.` : null,
    facts.space || facts.sunlight ? `Balcon : ${[facts.space, facts.sunlight ? `exposition ${facts.sunlight.toLowerCase()}` : null].filter(Boolean).join(", ")}.` : null,
    facts.plants.length > 0 ? `Plantes cultivées : ${facts.plants.map((plant) => plant.name).join(", ")}.` : "Aucune plante enregistrée pour l'instant.",
    facts.recentEvents.length > 0 ? `Derniers gestes : ${facts.recentEvents.map((event) => `${event.type} de ${event.plantName} (${event.daysAgo === 0 ? "aujourd'hui" : `il y a ${event.daysAgo} j`})`).join(" ; ")}.` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
