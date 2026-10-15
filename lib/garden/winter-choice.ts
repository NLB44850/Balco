/**
 * Le choix pour l'hiver d'une plante frileuse en fin de saison (chantier « Plante hors saison », étape 3) :
 * « Ton basilic n'aime pas le froid. Que veux-tu faire ? »
 * 1. « Tout récolter » (annuelles) : « Ton basilic est-il tout récolté ? », puis « Ton pot est libre », avec une astuce
 *    de conservation vérifiée quand elle existe (lib/plants/conservation.ts).
 * 2. « Le rentrer à l'intérieur » : seulement si la rentrer vaut la peine (lib/plants/cold-hardiness.ts) ; la suite est
 *    l'étape 4.
 * 3. « Le laisser dehors » : rien ne change, Balco prévient le soir du gel, puis « Ta saison … est finie ? ».
 * Sur Aujourd'hui, « Décide pour ton basilic avant le froid » s'affiche le premier jour, puis seulement quand une nuit
 * sous son seuil est annoncée. Tant qu'elle n'a pas de réponse, « Ta saison … est finie ? » attend : jamais deux
 * questions pour une même plante. Logique pure.
 */
import type { CatalogPlant } from "../plants/catalog";
import type { ClimateInfo } from "../plants/climate";
import { canComeIndoors, coldTenderOf } from "../plants/cold-hardiness";
import { conservationTip } from "../plants/conservation";
import { capitalize, objectPronoun, possessive, subjectPronoun, verb } from "../plants/grammar";
import { dayKey, type ResolvedPlant } from "./garden-logic";
import type { HarvestEndState } from "./harvest-end";
import { offSeasonOf } from "./off-season";
import type { WinterChoice, WinterPlan } from "./winter-plan";

/** Les nuits regardées pour dire qu'un froid arrive : aujourd'hui et les trois jours qui viennent. */
export const COLD_NIGHTS_AHEAD = 4;

/** La question de l'hiver la concerne : frileuse, en terre, en fin de saison ou à rentrer avant l'hiver. */
export function asksWinter(resolved: ResolvedPlant, now: Date, climate?: ClimateInfo | null) {
  if (resolved.plant.toPlant || !coldTenderOf(resolved.entry)) return false;
  const off = offSeasonOf(resolved.entry, now, climate);
  return off?.kind === "season-end" || off?.kind === "before-winter";
}

/** Une nuit sous son seuil est annoncée (`nights` : les minimales des jours qui viennent, aujourd'hui d'abord). */
export function coldNightAhead(entry: Pick<CatalogPlant, "id">, nights: number[] | undefined) {
  const data = coldTenderOf(entry);
  return Boolean(data && nights?.slice(0, COLD_NIGHTS_AHEAD).some((temperature) => temperature < data.nightC));
}

/** « Décide pour ton basilic avant le froid » est due aujourd'hui : le premier jour, puis quand le froid arrive. */
export function winterDecisionDue(resolved: ResolvedPlant, now: Date, state: HarvestEndState | undefined, nights: number[] | undefined, climate?: ClimateInfo | null) {
  if (resolved.plant.winter || !asksWinter(resolved, now, climate)) return false;
  if (!state?.winterAskedOn || state.winterAskedOn === dayKey(now)) return true;
  return coldNightAhead(resolved.entry, nights);
}

// --- Les phrases ---------------------------------------------------------------------------------------

/** « Ton basilic n'aime pas le froid. Que veux-tu faire ? », « Tes tomates cerises n'aiment pas… » */
export const winterQuestion = (entry: CatalogPlant) => `${capitalize(possessive(entry))} n’${verb(entry, "aime", "aiment")} pas le froid. Que veux-tu faire ?`;

/** « Il souffre quand les nuits passent sous 10 °C. » ; une valeur à une seule source est dite estimée. */
export function winterWhy(entry: CatalogPlant) {
  const data = coldTenderOf(entry);
  if (!data) return "";
  return `${capitalize(subjectPronoun(entry))} ${verb(entry, "souffre", "souffrent")} quand les nuits passent sous ${data.nightC} °C${data.nightEstimate ? " (estimation Balco)" : ""}.`;
}

/** « Décide pour ton basilic avant le froid » */
export const winterDecideTitle = (entry: CatalogPlant) => `Décide pour ${possessive(entry)} avant le froid`;

export type WinterOption = { choice: WinterChoice; label: string; detail: string };

/** Les réponses possibles, toujours dans le même ordre. « Tout récolter » pour une annuelle, « Le rentrer » s'il vaut la peine. */
export function winterOptions(entry: CatalogPlant): WinterOption[] {
  const data = coldTenderOf(entry);
  const options: WinterOption[] = [];
  if (!entry.perennial) options.push({ choice: "harvest", label: "Tout récolter", detail: conservationTip(entry.id) ?? "Puis Balco te propose quoi mettre dans le pot." });
  if (data && canComeIndoors(entry)) {
    const where =
      data.indoor === "weeks"
        ? `À l’intérieur, ${subjectPronoun(entry)} ${verb(entry, "tiendra", "tiendront")} souvent quelques semaines de plus.`
        : `${capitalize(subjectPronoun(entry))} ${verb(entry, "passe", "passent")} l’hiver ${data.place === "cool" ? "au frais, à l’abri du gel" : "près d’une fenêtre lumineuse"}.`;
    options.push({ choice: "indoors", label: `${capitalize(objectPronoun(entry))} rentrer à l’intérieur`, detail: data.indoorEstimate ? `${where.slice(0, -1)} (estimation Balco).` : where });
  }
  options.push({ choice: "outside", label: `${capitalize(objectPronoun(entry))} laisser dehors`, detail: "Balco te prévient le soir du gel." });
  return options;
}

/** Sous « Décide pour ton basilic… » : « Tout récolter, le rentrer ou le laisser dehors ». */
export function winterDecideSubtitle(entry: CatalogPlant) {
  const labels = winterOptions(entry).map((option, index) => (index === 0 ? option.label : option.label.charAt(0).toLowerCase() + option.label.slice(1)));
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} ou ${labels.at(-1)}` : labels[0];
}

/** Sur la fiche, une fois choisi : « Pour l'hiver : le rentrer à l'intérieur ». */
export function winterChoiceSummary(entry: CatalogPlant, plan: WinterPlan) {
  const option = winterOptions(entry).find((candidate) => candidate.choice === plan.choice);
  const label = option?.label ?? "Tout récolter";
  return `Pour l’hiver : ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

/** Le message du bas après le choix. */
export function winterChoiceToast(entry: CatalogPlant, choice: WinterChoice) {
  if (choice === "harvest") return "Noté : récolte tout, puis dis-le sur Aujourd’hui";
  if (choice === "indoors") return `Noté : Balco te dira quand ${objectPronoun(entry)} rentrer`;
  return "Noté : Balco te prévient le soir du gel";
}

/** Le choix fait aujourd'hui. */
export const winterPlanOf = (choice: WinterChoice, now: Date): WinterPlan => ({ choice, decidedAt: now.toISOString() });
