/**
 * Ce qui se sème sur un rebord de fenêtre, à l'intérieur, quand il fait trop froid dehors (novembre à février) :
 * des pousses et des aromatiques qui lèvent à la température de la maison, près d'une fenêtre lumineuse.
 *
 * Sources (6 octobre 2026, deux au moins par plante) :
 * - Jardiland, « 8 plantes aromatiques à cultiver à l'intérieur en hiver » : persil, ciboulette.
 * - Promesse de Fleurs, « Comment cultiver des aromatiques en intérieur durant l'hiver ? » : persil, ciboulette.
 * - Semaille, « Cresson alénois frisé » : semis toute l'année à l'intérieur, idéal en micro-pousses.
 * - Tom le jardinier, « Semer le cresson alénois en hiver » : à l'intérieur, sur un rebord lumineux.
 * - Jardiner malin, « Cresson alénois » : semis en pot toute l'année dans la maison bien éclairée.
 */
import type { CatalogPlant } from "./catalog";

/** Plantes à semer à l'intérieur en hiver, des plus rapides aux plus lentes. */
export const INDOOR_WINTER_IDS = ["microgreens", "garden-cress", "chives", "parsley"];

/** Les mois où il fait trop froid pour semer dehors : le rebord intérieur prend le relais. */
export const INDOOR_WINTER_MONTHS = [11, 12, 1, 2];

/** Ce mois-ci, cette plante se sème-t-elle à l'intérieur, hors de sa saison dehors ? */
export function sowsOnWindowsill(entry: CatalogPlant, month: number) {
  return INDOOR_WINTER_IDS.includes(entry.id) && INDOOR_WINTER_MONTHS.includes(month) && !entry.sowMonths.includes(month as never);
}
