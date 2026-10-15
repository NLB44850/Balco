/**
 * Étape 9 du chantier « Pots et balcon » : le poids de tes pots (Réglages → Mon balcon → Poids de tes pots).
 * Une estimation seulement, comptée large (sources : docs/sources-poids.md) :
 * - terreau bien arrosé : 1 kg par litre (les fiches de terreau disent 0,55 à 0,8 kg/L mouillé ; on arrondit au-dessus
 *   pour l'eau de la soucoupe, la couche drainante et la plante) ;
 * - le pot lui-même, compté comme un pot en terre cuite, le plus lourd (un pot plastique pèse bien moins) ;
 * - taille « Je ne sais pas » : la taille conseillée par la fiche de la plante, signalée comme supposée.
 * Plantes en pot seulement : pas les plantes « à planter », pas les meubles ni les personnes.
 */
import { potNeedFor, smallestFit } from "@/lib/plants/pot-sheet";
import { POT_LITERS, potSizeOf, type KnownPotSize } from "@/lib/plants/pot-size";
import type { CatalogPlant } from "@/lib/plants/catalog";

/** Terreau bien arrosé, compté large. */
export const WET_SOIL_KG_PER_LITER = 1;
/** Le pot vide, compté comme un pot en terre cuite (pots de 30 cm : 2 à 6 kg selon les fiches des magasins). */
export const POT_SHELL_KG: Record<KnownPotSize, number> = { small: 1, medium: 3, large: 6, xlarge: 15, planter: 5 };
/** Charge souvent prévue pour un balcon récent, par m² (fiche de l'Agence qualité construction). */
export const BALCONY_LOAD_KG_PER_M2 = 350;

export type PotWeight = { plantId: string; kg: number; size: KnownPotSize | null; /** Taille pas notée : celle de sa fiche. */ guessed: boolean };
export type BalconyWeight = { totalKg: number; pots: PotWeight[]; guessedCount: number };

type Plant = { plant: { id: string; potSize?: string | null; toPlant?: boolean }; entry: Pick<CatalogPlant, "id" | "potLiters"> };

/** Le poids d'un pot : terreau mouillé + pot vide, au kilo près. */
export function potWeight({ plant, entry }: Plant): PotWeight {
  const noted = potSizeOf(plant);
  if (noted !== "unknown") return { plantId: plant.id, kg: Math.round(POT_LITERS[noted] * WET_SOIL_KG_PER_LITER + POT_SHELL_KG[noted]), size: noted, guessed: false };
  const need = potNeedFor(entry);
  const size = smallestFit(need);
  // Le volume du pot de sa fiche ; sa taille (catégorie conseillée) donne le poids du pot vide.
  const liters = need.liters;
  return { plantId: plant.id, kg: Math.round(liters * WET_SOIL_KG_PER_LITER + (size ? POT_SHELL_KG[size] : POT_SHELL_KG.large)), size, guessed: true };
}

/** Le poids de tous les pots du balcon ; le total arrondi aux 5 kg (une estimation, pas une pesée). */
export function balconyWeight(plants: Plant[]): BalconyWeight {
  const pots = plants.filter(({ plant }) => !plant.toPlant).map(potWeight).sort((a, b) => b.kg - a.kg);
  const sum = pots.reduce((total, pot) => total + pot.kg, 0);
  return { totalKg: sum === 0 ? 0 : Math.max(5, Math.round(sum / 5) * 5), pots, guessedCount: pots.filter((pot) => pot.guessed).length };
}

/** « environ 85 kg », « Aucun pot » : la valeur de la ligne de Réglages. */
export function weightValue(weight: BalconyWeight) {
  return weight.pots.length === 0 ? "Aucun pot" : `≈ ${weight.totalKg} kg`;
}

/** « Tes 4 pots, terre bien arrosée : une estimation comptée large. » */
export function weightIntro(weight: BalconyWeight) {
  const count = weight.pots.length;
  return `${count > 1 ? `Tes ${count} pots` : "Ton pot"}, terre bien arrosée et pot en terre cuite compris : une estimation, comptée large.`;
}

/** Le repère du balcon, avec la charge par m² et le conseil de demander au syndic. */
export const BALCONY_LOAD_NOTE = `Un balcon récent est souvent prévu pour ${BALCONY_LOAD_KG_PER_M2} kg par m², parfois moins dans l’ancien. Un doute, ou un grand bac en projet ? Demande au syndic la charge prévue pour ton balcon.`;
export const LIGHTER_TIP = "Pour alléger : des pots en plastique ou en résine plutôt qu’en terre cuite.";
/** Une taille de pot pas notée : comptée à la taille de sa fiche. */
export function guessedNote(count: number) {
  return count > 1 ? `${count} pots sans taille notée : comptés à la taille conseillée. Note-la dans leur fiche pour un calcul plus juste.` : "Un pot sans taille notée : compté à la taille conseillée. Note-la dans sa fiche pour un calcul plus juste.";
}
