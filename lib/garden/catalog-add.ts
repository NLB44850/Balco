/**
 * Ajouter une plante depuis le catalogue en un seul « + » (choix du porteur, 14/10) : Balco choisit « à planter »
 * quand c'est le moment de la semer ou de la planter, sinon « déjà sur mon balcon » ; le message du bas propose
 * l'autre choix en une touche (« Pas encore plantée ? », « Déjà plantée ? »). Hors saison, il prévient :
 * - à planter alors que ce n'est pas sa saison : « Pas avant mai » et, si sa saison revient au printemps, elle rejoint
 *   les envies du printemps (carte de mars, notification du 1er mars) au lieu d'attendre sur le balcon ;
 * - déjà sur le balcon en fin de saison (annuelle frileuse, de septembre à décembre) : « récolte avant les gelées ».
 * Logique pure.
 */
import { MONTH_LONG, type CatalogPlant, type Month } from "../plants/catalog";
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { agree, objectPronoun } from "../plants/grammar";
import { endsWithSeason } from "../plants/season-end";
import { suggestionFor, type AddChoice } from "../plants/suggestions";

/** Le choix de Balco pour un « + » : à planter si c'est sa saison, sinon déjà sur le balcon. */
export function defaultAddChoice(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): AddChoice {
  return suggestionFor(entry, month, climate) ? "toPlant" : "installed";
}

/** Le prochain mois (après celui-ci) où on peut la semer ou la planter, ou null si jamais. */
export function nextStartMonth(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): number | null {
  const adapted = adaptToClimate(entry, climate);
  const months = new Set<number>([...adapted.sowMonths, ...adapted.plantMonths]);
  for (let step = 1; step <= 12; step += 1) {
    const candidate = ((month - 1 + step) % 12) + 1;
    if (months.has(candidate as Month)) return candidate;
  }
  return null;
}

/** Les mois où sa saison revient « au printemps » : la carte des envies (mars-avril) arrive à temps. */
const SPRING_START_MONTHS = [2, 3, 4, 5];

export type ToPlantPlan =
  /** C'est sa saison : elle attend sur le balcon, son premier geste est sur Aujourd'hui. */
  | { kind: "now" }
  /** Sa saison revient au printemps : envie du printemps, pas sur le balcon. */
  | { kind: "spring"; month: number }
  /** Sa saison revient plus tard dans l'année : elle attend sur le balcon, Saisons et Aujourd'hui la proposeront. */
  | { kind: "later"; month: number };

export function toPlantPlan(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): ToPlantPlan {
  if (suggestionFor(entry, month, climate)) return { kind: "now" };
  const next = nextStartMonth(entry, month, climate);
  if (next === null) return { kind: "now" };
  return SPRING_START_MONTHS.includes(next) ? { kind: "spring", month: next } : { kind: "later", month: next };
}

/** Une annuelle frileuse ajoutée de septembre à décembre : sa saison se termine avec les premières gelées. */
export function lateSeasonNote(entry: CatalogPlant, month: number) {
  return endsWithSeason(entry) && entry.care.frostSensitive && month >= 9 ? "Fin de saison : récolte avant les premières gelées" : null;
}

/** « Ajouté : Aubergine en pot moyen (20 à 30 cm) · Fin de saison : récolte avant les premières gelées » */
export function installedText(entry: CatalogPlant, month: number, potPhrase: string) {
  const late = lateSeasonNote(entry, month);
  return `Ajouté : ${entry.name}${potPhrase}${late ? ` · ${late}` : ""}`;
}

/** Le message après « à planter », selon le plan. */
export function toPlantText(entry: CatalogPlant, plan: ToPlantPlan, potPhrase: string) {
  if (plan.kind === "spring") {
    // Un semis au chaud commence à l'intérieur : on le dit, plutôt que « pas avant février ».
    const when = suggestionFor(entry, plan.month)?.indoors ? `à semer au chaud dès ${MONTH_LONG[plan.month - 1]}` : `pas avant ${MONTH_LONG[plan.month - 1]}`;
    return `${entry.name} : ${when}. Balco te ${objectPronoun(entry)} reproposera au printemps`;
  }
  if (plan.kind === "later") return `À planter en ${MONTH_LONG[plan.month - 1]} : ${entry.name}${potPhrase}`;
  return `À planter : ${entry.name}${potPhrase}`;
}

/** Le bouton du message du bas qui passe à l'autre choix : « Pas encore plantée ? », « Déjà plantés ? ». */
export function switchLabel(entry: CatalogPlant, current: AddChoice) {
  const planted = agree(entry, "planté");
  return current === "installed" ? `Pas encore ${planted} ?` : `Déjà ${planted} ?`;
}
