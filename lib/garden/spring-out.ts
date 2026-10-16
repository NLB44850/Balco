/**
 * La sortie au printemps d'une frileuse rentrée pour l'hiver (chantier « Plante hors saison », étape 5).
 * - Feu vert : le lendemain des Saints de glace (14 mai) dans les climats océanique, tempéré et continental, comme la
 *   carte du temps fort ; dans le Midi (15 avril) et en montagne (15 juin), estimation Balco tirée des dernières
 *   gelées de la zone (lib/plants/climate.ts), un mois après comme ailleurs.
 * - Et pas de nuit sous son seuil annoncée dans les 3 jours (docs/sources-froid.md, § « Au printemps ») : la sortie
 *   attend des nuits au-dessus de 10 à 12 °C, sinon « Ressors ton basilic » attend.
 * - Une fois sortie, son choix pour l'hiver s'efface : elle reprend son état et ses rappels normaux.
 * Logique pure.
 */
import type { CatalogPlant } from "../plants/catalog";
import type { ClimateInfo } from "../plants/climate";
import { capitalize, possessive } from "../plants/grammar";
import type { ResolvedPlant } from "./garden-logic";
import { isIndoors } from "./indoors";
import { coldNightAhead } from "./winter-choice";

/** Le feu vert de l'année : sa date, et si c'est une estimation Balco (Midi, montagne). */
export function springOutDate(year: number, climate?: Pick<ClimateInfo, "zone"> | null): { date: Date; estimate: boolean } {
  if (climate?.zone === "mediterranean") return { date: new Date(year, 3, 15), estimate: true };
  if (climate?.zone === "mountain") return { date: new Date(year, 5, 15), estimate: true };
  return { date: new Date(year, 4, 14), estimate: false };
}

/** « Ressors ton basilic » est due : rentrée avant le feu vert de cette année, feu vert passé, nuits douces. */
export function bringOutDue(resolved: ResolvedPlant, now: Date, climate: Pick<ClimateInfo, "zone"> | null | undefined, nights: number[] | undefined) {
  if (!isIndoors(resolved.plant)) return false;
  const { date } = springOutDate(now.getFullYear(), climate);
  const indoorsAt = new Date(resolved.plant.winter?.indoorsAt ?? "");
  if (!(indoorsAt < date) || now < date) return false;
  return !coldNightAhead(resolved.entry, nights);
}

// --- Les phrases ---------------------------------------------------------------------------------------

/** « Ressors ton basilic », « Ressors tes tomates cerises ». */
export const bringOutTitle = (entry: CatalogPlant) => `Ressors ${possessive(entry)}`;

/** Sous la ligne : pourquoi maintenant. */
export function bringOutSubtitle(climate: Pick<ClimateInfo, "zone"> | null | undefined) {
  return springOutDate(2000, climate).estimate ? "Les nuits se radoucissent · pas-à-pas" : "Feu vert des Saints de glace · pas-à-pas";
}

/** Le message du bas une fois sortie. */
export const broughtOutToast = (entry: CatalogPlant) => `${capitalize(possessive(entry))} : de retour dehors, Balco reprend ses rappels`;
