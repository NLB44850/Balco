/**
 * L'herbier : une carte par plante du catalogue récoltée, ou fleurie, pour la première fois (« Ton herbier · 7 plantes
 * sur 101 »). Les récoltes déjà notées comptent dès son arrivée. Pour les fleurs, « Elle a fleuri » sur la fiche,
 * seulement pendant ses mois de floraison. Les cartes vont dans le carnet des récompenses (`herbier:<id>`) : rien ne
 * se perd. Logique pure.
 */
import { PLANT_CATALOG, type CatalogPlant } from "../plants/catalog";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import type { ResolvedPlant } from "./garden-logic";

export const herbariumKey = (catalogId: string) => `herbier:${catalogId}`;

/** Une plante à fleurs (catégorie fleur) : ses mois de « récolte » sont ceux de sa floraison. */
export function isFlower(entry: Pick<CatalogPlant, "category">) {
  return entry.category === "flower";
}

/** « Elle a fleuri » : une fois par an et par plante. */
export function bloomEventId(plantId: string, year: number) {
  return `bloom:${plantId}:${year}`;
}

export function bloomEvent(resolved: ResolvedPlant, now: Date): MaintenanceEvent {
  return { id: bloomEventId(resolved.plant.id, now.getFullYear()), plantId: resolved.plant.id, type: "observation", completedAt: now.toISOString(), source: "manual", note: "A fleuri" };
}

/** Le bouton « Elle a fleuri » : une fleur en terre, pendant ses mois de floraison, pas encore notée cette année. */
export function canMarkBloom(resolved: ResolvedPlant, events: MaintenanceEvent[], now: Date) {
  if (!isFlower(resolved.entry) || resolved.plant.toPlant) return false;
  if (!resolved.entry.harvestMonths.includes((now.getMonth() + 1) as never)) return false;
  return !events.some((event) => event.id === bloomEventId(resolved.plant.id, now.getFullYear()));
}

/** Les cartes méritées d'après l'historique : la première récolte ou floraison de chaque plante du catalogue. */
export function herbariumAwards(plants: ResolvedPlant[], events: MaintenanceEvent[]): Record<string, string> {
  const catalogOf = new Map(plants.map(({ plant, entry }) => [plant.id, entry.id]));
  const awards: Record<string, string> = {};
  for (const event of events) {
    if (event.type !== "harvest" && !event.id.startsWith("bloom:")) continue;
    const catalogId = catalogOf.get(event.plantId);
    if (!catalogId) continue;
    const key = herbariumKey(catalogId);
    if (!awards[key] || event.completedAt < awards[key]) awards[key] = event.completedAt;
  }
  return awards;
}

export type HerbariumCard = { entry: CatalogPlant; at: string; kind: "harvest" | "bloom" };

/** Les cartes de l'herbier, de la plus récente à la plus ancienne. */
export function herbariumCards(awards: Record<string, string>): HerbariumCard[] {
  return PLANT_CATALOG.filter((entry) => awards[herbariumKey(entry.id)])
    .map((entry) => ({ entry, at: awards[herbariumKey(entry.id)], kind: isFlower(entry) ? ("bloom" as const) : ("harvest" as const) }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export const herbariumTotal = PLANT_CATALOG.length;
