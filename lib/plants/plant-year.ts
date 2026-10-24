/**
 * « L'année de tes plantes » dans Saisons (24/10, maquette B) : pour chaque plante, ce qui se passe chaque mois
 * (semis, plantation, récolte, floraison ou belle saison), dates adaptées au climat de la ville comme le reste du
 * calendrier. Et la saison de chaque mois, pour les dessins de Saisons. Logique pure.
 */
import type { CatalogPlant, Month } from "./catalog";
import { isFlower } from "./catalog";
import { adaptToClimate, type ClimateInfo } from "./climate";

export type YearStep = "sow" | "plant" | "harvest" | "bloom" | "foliage";
export type SeasonId = "spring" | "summer" | "autumn" | "winter";

export const YEAR_STEP_LABELS: Record<YearStep, string> = { sow: "Semis", plant: "Plantation", harvest: "Récolte", bloom: "Floraison", foliage: "Belle saison" };

/** Ce que la plante donne : sa récolte, sa floraison ou sa belle saison (feuillages). */
export function yieldStep(entry: Pick<CatalogPlant, "category" | "bloomOnly" | "foliage">): YearStep {
  return isFlower(entry) ? "bloom" : entry.foliage ? "foliage" : "harvest";
}

/** Les 12 mois (janvier d'abord) : au plus deux étapes par mois, la plus visible d'abord (récolte, plantation, semis). */
export function plantYear(entry: CatalogPlant, climate?: ClimateInfo | null): YearStep[][] {
  const adapted = adaptToClimate(entry, climate);
  const yieldKind = yieldStep(entry);
  return Array.from({ length: 12 }, (_, index) => {
    const month = (index + 1) as Month;
    const steps: YearStep[] = [];
    if (adapted.harvestMonths.includes(month)) steps.push(yieldKind);
    if (adapted.plantMonths.includes(month)) steps.push("plant");
    if (adapted.sowMonths.includes(month)) steps.push("sow");
    return steps.slice(0, 2);
  });
}

/** Les étapes présentes dans une frise, pour sa légende (dans l'ordre de l'année d'une plante). */
export function yearLegend(years: YearStep[][][]): YearStep[] {
  const seen = new Set(years.flat(2));
  return (["sow", "plant", "harvest", "bloom", "foliage"] as const).filter((step) => seen.has(step));
}

export function seasonOfMonth(month: number): SeasonId {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

/** La carte de saison en haut de Saisons : son titre et sa phrase. */
export const SEASON_SCENES: Record<SeasonId, { title: string; text: string }> = {
  winter: { title: "L’hiver sur ton balcon", text: "Le balcon se repose : on protège du froid et on prépare le printemps." },
  spring: { title: "Le printemps sur ton balcon", text: "Le temps des semis et des plantations." },
  summer: { title: "L’été sur ton balcon", text: "La pleine saison : arrosages, récoltes et fleurs." },
  autumn: { title: "L’automne sur ton balcon", text: "Le temps des dernières récoltes et des bulbes de printemps." },
};
