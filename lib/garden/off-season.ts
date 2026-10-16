/**
 * Une plante hors saison (chantier « Plante hors saison », étape 2) : un état juste, en neutre, au lieu de « Nouvelle »
 * ou « En forme » quand sa saison est passée.
 * - Fin de saison : une annuelle après ses mois de récolte ou de floraison (basilic en octobre, cosmos en novembre) ;
 *   une frileuse dès son dernier mois, à partir de septembre (aubergine, tomates en octobre).
 * - À rentrer avant l'hiver : une vivace frileuse d'octobre à février (citronnier, citronnelle, dahlia…).
 * - Au repos jusqu'en avril : une plante rustique sans aucun geste ce mois-ci (menthe, lavande en novembre), jusqu'au
 *   mois où ses gestes reprennent, avancé d'un mois dans le Midi, retardé d'un mois en montagne.
 * Logique pure.
 */
import { MONTH_LONG, type CatalogPlant, type Month } from "../plants/catalog";
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { isColdTender } from "../plants/cold-hardiness";
import { endsWithSeason, isHarvestedOnce } from "../plants/season-end";

export type OffSeason =
  | { kind: "season-end"; label: string }
  | { kind: "before-winter"; label: string }
  | { kind: "resting"; label: string; month: number };

export const SEASON_END_LABEL = "Fin de saison";
export const BEFORE_WINTER_LABEL = "À rentrer avant l’hiver";
export const restingLabel = (month: number) => `Au repos jusqu’en ${MONTH_LONG[month - 1]}`;

/** Les mois où une vivace frileuse doit passer l'hiver à l'abri. */
const WINTER_SHELTER_MONTHS = [10, 11, 12, 1, 2];
/** L'hiver : une annuelle encore là a fini sa saison, sauf si elle se récolte encore (mâche, chou kale…). */
const WINTER_MONTHS = [1, 2];
/** Les mois de printemps que le climat avance ou retarde (comme les semis des frileuses). */
const SPRING_MONTHS = [2, 3, 4, 5, 6];

/** Une annuelle dont la saison finit (au fil des cueillettes, ou frileuse) : pas celles récoltées en une fois. */
const hasSeasonEnd = (entry: CatalogPlant) => !entry.perennial && !isHarvestedOnce(entry) && (endsWithSeason(entry) || isColdTender(entry));

/**
 * Sa saison est passée : après son dernier mois de récolte de l'été ou de l'automne, ou en plein hiver. Une frileuse
 * est en fin de saison dès ce dernier mois, à partir de septembre (l'aubergine en octobre : les nuits fraîchissent).
 */
function pastItsSeason(entry: CatalogPlant, month: number, climate?: ClimateInfo | null) {
  const harvest = adaptToClimate(entry, climate).harvestMonths as number[];
  const lastAutumn = Math.max(...harvest.filter((candidate) => candidate >= 6));
  if (isColdTender(entry) && month >= 9 && month === lastAutumn) return true;
  if (harvest.includes(month)) return false;
  if (WINTER_MONTHS.includes(month)) return true;
  return month >= 8 && Number.isFinite(lastAutumn) && month > lastAutumn;
}

/** Les mois où la plante a au moins un geste (arroser, récolter, observer, nourrir…). */
function activeMonths(entry: CatalogPlant) {
  const months = new Set<number>();
  for (const task of entry.tasks) for (const month of task.months ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) months.add(month);
  return months;
}

/** Le prochain mois où ses gestes reprennent, calé sur le climat de la ville ; null si elle n'est pas au repos. */
export function restUntil(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): number | null {
  const active = activeMonths(entry);
  if (active.size === 0 || active.has(month)) return null;
  for (let step = 1; step <= 12; step += 1) {
    const candidate = ((month - 1 + step) % 12) + 1;
    if (!active.has(candidate)) continue;
    const shift = climate && SPRING_MONTHS.includes(candidate) ? climate.springShift : 0;
    return Math.min(12, Math.max(1, candidate + shift)) as Month;
  }
  return null;
}

/** L'état hors saison d'une plante déjà sur le balcon, ou null quand c'est sa saison. */
export function offSeasonOf(entry: CatalogPlant, now: Date, climate?: ClimateInfo | null): OffSeason | null {
  const month = now.getMonth() + 1;
  if (hasSeasonEnd(entry)) return pastItsSeason(entry, month, climate) ? { kind: "season-end", label: SEASON_END_LABEL } : null;
  if (entry.perennial && isColdTender(entry)) return WINTER_SHELTER_MONTHS.includes(month) ? { kind: "before-winter", label: BEFORE_WINTER_LABEL } : null;
  if (isHarvestedOnce(entry)) return null;
  const until = restUntil(entry, month, climate);
  return until === null ? null : { kind: "resting", label: restingLabel(until), month: until };
}
