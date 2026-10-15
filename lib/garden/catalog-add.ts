/**
 * Ajouter une plante depuis le catalogue (14/10) : le « + » pose une seule question, « Où en est ton aubergine ? », avec
 * deux cartes qui disent ce qui va se passer (« Déjà sur mon balcon », « Pas encore plantée ») ; un toucher ajoute, le
 * message du bas n'a plus que « Annuler ». Hors saison, la carte prévient :
 * - à planter alors que ce n'est pas sa saison : « Pas avant mai » et, si sa saison revient au printemps, elle rejoint
 *   les envies du printemps (carte de mars, notification du 1er mars) au lieu d'attendre sur le balcon ;
 * - déjà sur le balcon en fin de saison (annuelle frileuse, de septembre à décembre) : « récolte avant les gelées ».
 * Logique pure.
 */
import { MONTH_LONG, type CatalogPlant, type Month } from "../plants/catalog";
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { afterColon, agree, objectPronoun, possessive, verb } from "../plants/grammar";
import { endsWithSeason } from "../plants/season-end";
import { suggestionFor, type AddChoice } from "../plants/suggestions";

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

/** « Ajouté : Aubergine en pot moyen (21 à 30 cm) · Fin de saison : récolte avant les premières gelées » */
export function installedText(entry: CatalogPlant, month: number, potPhrase: string) {
  const late = lateSeasonNote(entry, month);
  return `Ajouté : ${afterColon(entry.name)}${potPhrase}${late ? ` · ${late}` : ""}`;
}

/** Le message après « à planter », selon le plan. */
export function toPlantText(entry: CatalogPlant, plan: ToPlantPlan, potPhrase: string) {
  if (plan.kind === "spring") {
    // Un semis au chaud commence à l'intérieur : on le dit, plutôt que « pas avant février ».
    const when = suggestionFor(entry, plan.month)?.indoors ? `à semer au chaud dès ${MONTH_LONG[plan.month - 1]}` : `pas avant ${MONTH_LONG[plan.month - 1]}`;
    return `${entry.name} : ${when}. Balco te ${objectPronoun(entry)} reproposera au printemps`;
  }
  if (plan.kind === "later") return `À planter en ${MONTH_LONG[plan.month - 1]} : ${afterColon(entry.name)}${potPhrase}`;
  return `À planter : ${afterColon(entry.name)}${potPhrase}`;
}

// --- La question du « + » (retour du 14/10 : le choix dans le message du bas faisait tourner en rond) ------------

/** « Où en est ton aubergine ? », « Où en sont tes tomates cerises ? » */
export function addQuestion(entry: CatalogPlant) {
  return `Où en ${verb(entry, "est", "sont")} ${possessive(entry)} ?`;
}

export type AddOption = {
  choice: AddChoice;
  title: string;
  /** Ce qui va se passer, dit avant de toucher. */
  detail: string;
  /** « C'est le moment » sur la carte à planter, quand c'est sa saison. */
  badge: string | null;
  /** Une fin de saison à surveiller (en orange). */
  watch: boolean;
};

/** Les deux cartes, toujours dans le même ordre : déjà sur le balcon, puis pas encore plantée. */
export function addOptions(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): AddOption[] {
  const late = lateSeasonNote(entry, month);
  const plan = toPlantPlan(entry, month, climate);
  const later = (plan.kind === "spring" || plan.kind === "later") && plan.month;
  const when = later ? (suggestionFor(entry, later, climate)?.indoors ? `À semer au chaud dès ${MONTH_LONG[later - 1]}` : `Pas avant ${MONTH_LONG[later - 1]}`) : "";
  return [
    {
      choice: "installed",
      title: "Déjà sur mon balcon",
      detail: late ? `${late}.` : "Balco te dit quand l’arroser dès aujourd’hui.",
      badge: null,
      watch: late !== null,
    },
    {
      choice: "toPlant",
      title: `Pas encore ${agree(entry, "planté")}`,
      detail:
        plan.kind === "now"
          ? "Le pas-à-pas t’attend sur Aujourd’hui, étape par étape."
          : plan.kind === "spring"
            ? `${when} : Balco te ${objectPronoun(entry)} reproposera au printemps.`
            : `${when} : Balco te le rappellera le moment venu.`,
      badge: plan.kind === "now" ? "C’est le moment" : null,
      watch: false,
    },
  ];
}
