/**
 * Quelles plantes libèrent leur pot : celles récoltées en une fois (radis, ail…) et les annuelles en fin de saison
 * (basilic, tomates, cosmos…). Sans dépendance au jardin, pour servir aussi au profil de soin des rappels.
 * Logique pure.
 */
import type { CatalogPlant } from "./catalog";
import { byForm, possessive, subjectPronoun, verb } from "./grammar";

export const isHarvestedOnce = (entry: Pick<CatalogPlant, "harvestOnceDays">) => entry.harvestOnceDays !== undefined;

/** Les micro-pousses se récoltent toute l'année, semis après semis : pas de fin de saison. */
const NO_SEASON_END = new Set(["microgreens"]);

/**
 * Une annuelle qui produit au fil des cueillettes (basilic, tomates, cosmos…) : sa saison finit à la fin de ses
 * mois de récolte ou de floraison, ou à la première gelée pour une plante frileuse. « Ta saison de basilic est
 * finie ? », puis le même « Ton pot est libre ».
 */
export const endsWithSeason = (entry: Pick<CatalogPlant, "id" | "perennial" | "harvestOnceDays">) => !entry.perennial && !isHarvestedOnce(entry) && !NO_SEASON_END.has(entry.id);

/** Le gel finit la saison des frileuses en automne seulement : au printemps, on protège les jeunes plants. */
export const SEASON_FROST_MONTHS = [8, 9, 10, 11, 12];

/** Une plante dont le pot se libère : récoltée en une fois, ou annuelle en fin de saison. */
export const freesItsPot = (entry: Pick<CatalogPlant, "id" | "perennial" | "harvestOnceDays">) => isHarvestedOnce(entry) || endsWithSeason(entry);

/**
 * Le soir de gel, pour une annuelle frileuse en automne : le bandeau météo dit de tout récolter (« Récolte tout
 * ton basilic avant cette nuit »), ou de cueillir les dernières fleurs ; `{min}` reçoit la température prévue.
 */
export function seasonFrostText(entry: CatalogPlant) {
  const bare = entry.label.replace(/^(le |la |les |l’|l')/u, "");
  const flowers = entry.category === "flower";
  const title = flowers
    ? `Cueille ${byForm(entry, `ton dernier ${bare}`, `ta dernière ${bare}`, `tes derniers ${bare}`, `tes dernières ${bare}`)} avant cette nuit`
    : `Récolte ${byForm(entry, "tout", "toute", "tous", "toutes")} ${possessive(entry)} avant cette nuit`;
  const body = `Jusqu’à {min} °C cette nuit : ${subjectPronoun(entry)} n’y ${verb(entry, "résistera", "résisteront")} pas. ${flowers ? "Coupe les plus belles fleurs pour un bouquet" : "Cueille tout ce qui peut l’être"} avant ce soir.`;
  return { title, body };
}

