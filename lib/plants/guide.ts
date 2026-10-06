/**
 * Le pas-à-pas pour planter, côté données : quel modèle de guide (semer en pot, semer au chaud, planter un
 * plant, planter un bulbe ou un tubercule, installer une vivace en grand pot), « Ce qu'il te faut » et
 * « Et après ? », calculés depuis le catalogue (lib/plants/catalog.ts) et les données de plantation
 * (lib/plants/planting.ts). Logique pure.
 */
import { type CatalogPlant } from "./catalog";
import { sowsOnWindowsill } from "./indoor";
import { PLANTING, type Planting } from "./planting";
import { startActivity } from "./calendar";
import type { ClimateInfo } from "./climate";

export type GuideModel = "sow-pot" | "sow-indoor" | "plant-seedling" | "plant-bulb" | "perennial-pot";

/**
 * Bulbes et tubercules : on ne les sème pas, on ne plante pas un « plant ». Profondeur de plantation et ce qu'on
 * achète (sources : fiches de plantation Promesse de Fleurs, Gamm vert, Jardiner malin, Rustica).
 */
const BULBS: Record<string, { buy: string; depthCm: number; tip: string }> = {
  garlic: { buy: "Des gousses d’ail à planter", depthCm: 3, tip: "pointe vers le haut" },
  potato: { buy: "Des pommes de terre germées", depthCm: 10, tip: "germes vers le haut" },
  oca: { buy: "Des tubercules d’oca", depthCm: 8, tip: "bourgeons vers le haut" },
  crosne: { buy: "Des tubercules de crosnes", depthCm: 5, tip: "couchés à plat" },
  dahlia: { buy: "Des tubercules de dahlia", depthCm: 8, tip: "collet vers le haut" },
};

export function bulbOf(entry: CatalogPlant) {
  return BULBS[entry.id] ?? null;
}

export function plantingOf(entry: CatalogPlant): Planting {
  return PLANTING[entry.id];
}

/** Une vivace qui demande un grand pot (arbuste, petit fruitier) : on l'installe pour des années. */
const BIG_POT_LITERS = 15;

/** Le modèle du guide, d'après le premier geste du mois (« Sème… au chaud », « Plante… »). */
export function guideModelFor(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): GuideModel {
  if (BULBS[entry.id]) return "plant-bulb";
  // Semis serré coupé jeune (micro-pousses, cresson) : une barquette, même à l'intérieur.
  if (plantingOf(entry).perPot === 0) return "sow-pot";
  const start = startActivity({ id: entry.id, entry, displayName: entry.name }, month, { climate });
  if (start.kind === "sow") return start.title.includes("au chaud") || sowsOnWindowsill(entry, month) ? "sow-indoor" : "sow-pot";
  return entry.perennial && entry.potLiters >= BIG_POT_LITERS ? "perennial-pot" : "plant-seedling";
}

export const isSowing = (model: GuideModel) => model === "sow-pot" || model === "sow-indoor";

/** « de mâche », « d’agastache », « de tomates cerises ». */
export function ofName(name: string) {
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  return /^[aeéèêiouyh]/iu.test(lower) ? `d’${lower}` : `de ${lower}`;
}

/**
 * Un objet de « Ce qu'il te faut ». `shared` : commun à toutes les plantes (terreau, billes, arrosoir) ; coché
 * « J'ai déjà » une fois, il l'est partout. Sinon, propre à cette plante (pot, graines, plant).
 */
export type Supply = { id: string; label: string; detail?: string; shared: boolean };

/** Semis serré coupé jeune (micro-pousses, cresson) : une barquette suffit. */
const isDenseSowing = (planting: Planting) => planting.perPot === 0;

export function supplies(entry: CatalogPlant, model: GuideModel): Supply[] {
  const planting = plantingOf(entry);
  const potLabel = model === "perennial-pot" ? `Un grand pot percé de ${entry.potLiters} L ou plus` : `Un pot percé d’au moins ${entry.potLiters} L`;
  const pot: Supply = isDenseSowing(planting)
    ? { id: "tray", label: "Une barquette ou une assiette creuse", detail: "Quelques centimètres de terreau suffisent.", shared: false }
    : { id: "pot", label: potLabel, detail: planting.perPot > 1 ? `Pour ${planting.perPot} plants, à ${planting.spacingCm} cm l’un de l’autre.` : "Avec des trous au fond, et une soucoupe.", shared: false };
  // Le myrtillier ne pousse que dans une terre acide.
  const soil: Supply = entry.id === "blueberry"
    ? { id: "heath-soil", label: "De la terre de bruyère", detail: "Il ne pousse que dans une terre acide.", shared: true }
    : { id: "soil", label: "Du terreau", detail: "Un sac de 20 L remplit deux ou trois pots moyens.", shared: true };
  const clay: Supply = { id: "clay-balls", label: "Une poignée de billes d’argile", detail: "Au fond du pot, l’eau s’écoule mieux.", shared: true };
  const can: Supply = isSowing(model)
    ? { id: "spray", label: "Un vaporisateur ou un arrosoir à pomme fine", detail: "Une pluie fine ne déplace pas les graines.", shared: true }
    : { id: "watering-can", label: "Un arrosoir", shared: true };
  const bulb = BULBS[entry.id];
  const what: Supply = bulb
    ? { id: "bulbs", label: bulb.buy, detail: `${planting.perPot} pour ce pot.`, shared: false }
    : isSowing(model)
      ? { id: "seeds", label: `Un sachet de graines ${ofName(entry.name)}`, shared: false }
      : { id: "plant", label: model === "perennial-pot" ? `Un pied ${ofName(entry.name)} en pot` : `Un plant ${ofName(entry.name)} en godet`, detail: planting.perPot > 1 ? `${planting.perPot} pour ce pot.` : undefined, shared: false };
  if (model === "sow-indoor") {
    return [
      what,
      { id: "cells", label: "Des godets ou de petits pots", detail: "Un par graine ou par pincée de graines.", shared: false },
      soil,
      { id: "cover", label: "Un sac transparent ou un film", detail: "Il garde l’humidité jusqu’à la levée.", shared: true },
      can,
      ...(entry.plantMonths.length > 0 ? [{ ...pot, id: "pot-later", label: `Plus tard : ${pot.label.charAt(0).toLowerCase()}${pot.label.slice(1)}` }] : []),
    ];
  }
  return isDenseSowing(planting) ? [what, pot, soil, can] : [what, pot, clay, soil, can];
}

/** « 5 à 15 jours », « 2 à 3 mois », « l’an prochain » : un délai lisible. */
export function delayText([min, max]: [number, number], unit: "days" | "weeks") {
  if (unit === "days") return min === max ? `${min} jours` : `${min} à ${max} jours`;
  if (max <= 12) return min === max ? `${min} semaines` : `${min} à ${max} semaines`;
  if (min >= 40) return "l’an prochain, parfois plus tard";
  const months = [Math.max(1, Math.round(min / 4.33)), Math.round(max / 4.33)];
  if (months[1] > 12) return `${months[0]} mois à plus d’un an`;
  return months[0] === months[1] ? `${months[0]} mois` : `${months[0]} à ${months[1]} mois`;
}

/**
 * « Et après ? » : ce qui va se passer, tiré des données (levée, première récolte ou floraison).
 * Ex. « Les pousses sortent dans 7 à 10 jours. Garde la terre humide. »
 */
export function whatsNext(entry: CatalogPlant, model: GuideModel): string[] {
  const planting = plantingOf(entry);
  const flower = entry.category === "flower";
  const lines: string[] = [];
  if (isSowing(model) && planting.germinationDays) lines.push(`Les pousses sortent dans ${delayText(planting.germinationDays, "days")}. Garde la terre humide.`);
  if (model === "plant-bulb") lines.push("Les premières pousses sortent en quelques semaines. Arrose peu tant qu’elles ne sont pas sorties.");
  const harvest = isSowing(model) ? planting.harvestWeeksFromSowing : planting.harvestWeeksFromPlanting;
  if (harvest) lines.push(`${flower ? "Premières fleurs" : "Première récolte"} dans ${delayText(harvest, "weeks")}.`);
  return lines;
}
