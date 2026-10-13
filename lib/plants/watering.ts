/**
 * L'arrosage selon le pot (chantier « Pots et balcon », étape 6a, choix du 13/10) : le rythme de la plante corrigé par
 * la taille de son pot, et la quantité d'eau à verser. Estimations Balco, notées dans docs/sources-pots.md (les sources
 * disent seulement qu'un petit pot sèche plus vite et qu'un grand garde l'humidité) : rien de plus à l'écran que la
 * quantité. Logique pure, partagée par l'app et le serveur.
 */
import type { CatalogPlant } from "./catalog";
import { potNeedFor } from "./pot-sheet";
import { POT_LITERS, type PotSize } from "./pot-size";

/** Petit pot ≈ 30 % plus souvent, grand ≈ 30 % moins souvent, jardinière (peu profonde) ≈ 15 % plus souvent. */
export const POT_WATERING_FACTOR: Record<PotSize, number> = { small: 0.7, medium: 1, large: 1.3, planter: 0.85, unknown: 1 };

/** Le rythme d'arrosage de la plante dans son pot, en heures. */
export function wateringIntervalHours(entry: Pick<CatalogPlant, "care">, potSize: PotSize | undefined) {
  return Math.round(entry.care.wateringIntervalHours * POT_WATERING_FACTOR[potSize ?? "unknown"]);
}

/** Un arrosage ≈ 20 % du volume du pot (repère validé le 13/10, déjà celui de l'eau économisée). */
export const WATERING_SHARE_OF_POT = 0.2;

/** Litres d'un arrosage, arrondis au demi-litre : petit 1 L, moyen 2 L, grand 4,5 L, jardinière 4 L ; taille inconnue : le pot de sa fiche. */
export function wateringLiters(entry: Pick<CatalogPlant, "id" | "potLiters">, potSize: PotSize | undefined) {
  const potLiters = potSize && potSize !== "unknown" ? POT_LITERS[potSize] : potNeedFor(entry).liters;
  return Math.max(0.5, Math.round(potLiters * WATERING_SHARE_OF_POT * 2) / 2);
}

/** « 1 L », « 4,5 L », « 0,5 L ». */
export function litersText(liters: number) {
  return `${String(liters).replace(".", ",")} L`;
}

/** La phrase de la quantité : « Arrose environ 1 L, jusqu'à ce que ça coule. » */
export function waterAmountText(liters: number) {
  return `Arrose environ ${litersText(liters)}, jusqu’à ce que ça coule.`;
}

/** Le sous-titre court d'une ligne d'arrosage (la quantité est dans la pastille « 💧 2 L ») : « Sèche sur 2 cm ? Arrose au pied ». */
export function wateringSubtitle(depthCm: number) {
  return `Sèche sur ${depthCm} cm ? Arrose au pied`;
}

/** Une grande bouteille d'eau : le repère de la quantité, dessiné dans le détail d'un arrosage. */
export const BOTTLE_LITERS = 1.5;

/** Les bouteilles à dessiner : pleines, puis un tiers ou deux tiers de la dernière (les litres vont par demi-litre). */
export function bottleParts(liters: number) {
  const thirds = Math.max(1, Math.round(liters / (BOTTLE_LITERS / 3)));
  return { full: Math.floor(thirds / 3), thirds: thirds % 3 };
}

/** « 1 grande bouteille et ⅓ », « ⅔ de grande bouteille », « 3 grandes bouteilles ». */
export function bottlesText(liters: number) {
  const { full, thirds } = bottleParts(liters);
  const part = thirds === 1 ? "⅓" : "⅔";
  if (full === 0) return `${part} de grande bouteille`;
  const whole = `${full} grande${full > 1 ? "s" : ""} bouteille${full > 1 ? "s" : ""}`;
  return thirds === 0 ? whole : `${whole} et ${part}`;
}

/** Balcon couvert : la pluie annoncée n'arrive pas jusqu'aux pots. */
export const SHELTERED_TEXT = "Ton balcon est couvert : la pluie n’arrive pas jusqu’à tes pots.";
