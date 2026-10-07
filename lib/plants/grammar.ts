/**
 * Accorder les phrases à la plante : « Garde-le à l'ombre » pour le thym, « Garde-la » pour la menthe,
 * « Garde-les » pour les radis. Le genre et le nombre viennent du catalogue (`gender`, `plural`), ils
 * valent pour `label` (« les betteraves ») plutôt que pour `name` (« Betterave »). Logique pure.
 */
import type { CatalogPlant } from "./catalog";

export type Agreeable = Pick<CatalogPlant, "label" | "gender" | "plural">;

/** La forme qui convient parmi quatre : masculin, féminin, masculin pluriel, féminin pluriel. */
export function byForm<T>(plant: Agreeable, masculine: T, feminine: T, masculinePlural: T, femininePlural: T): T {
  if (plant.plural) return plant.gender === "f" ? femininePlural : masculinePlural;
  return plant.gender === "f" ? feminine : masculine;
}

/** Singulier ou pluriel : « repart » / « repartent ». */
export const verb = (plant: Agreeable, singular: string, plural: string) => (plant.plural ? plural : singular);

/** Sujet : il, elle, ils, elles. */
export const subjectPronoun = (plant: Agreeable) => byForm(plant, "il", "elle", "ils", "elles");

/** Complément après un impératif ou une préposition : « Garde-le », « chez elle » (`stressed`). */
export const objectPronoun = (plant: Agreeable) => byForm(plant, "le", "la", "les", "les");
export const stressedPronoun = (plant: Agreeable) => byForm(plant, "lui", "elle", "eux", "elles");

/** Complément devant un verbe, élidé devant une voyelle : « tu le pinceras », « l’arrose », « les nourrit ». */
export function objectBefore(plant: Agreeable, verbForm: string) {
  if (!plant.plural && /^[aeéèêiouyh]/iu.test(verbForm)) return `l’${verbForm}`;
  return `${objectPronoun(plant)} ${verbForm}`;
}

/**
 * Adjectif ou participe accordé, depuis son masculin : « touffu » → touffue, touffus, touffues ; « récolté »
 * → récoltée… Un masculin qui finit déjà par -e ne change pas au féminin (dense), ni par -s ou -x au pluriel.
 */
export function agree(plant: Agreeable, masculine: string) {
  const feminine = masculine.endsWith("e") ? masculine : `${masculine}e`;
  const pluralOf = (word: string) => (/[sx]$/u.test(word) ? word : `${word}s`);
  return byForm(plant, masculine, feminine, pluralOf(masculine), pluralOf(feminine));
}

/** Le nom sans son article : « radis », « ail », « tomates cerises ». */
export const withoutArticle = (plant: Pick<CatalogPlant, "label">) => plant.label.replace(/^(le |la |les |l’|l')/u, "");

/** Le même, avec une majuscule, pour commencer une phrase : « Radis récoltés ». */
export const bareName = (plant: Pick<CatalogPlant, "label">) => capitalize(withoutArticle(plant));

/** « tes radis », « ton thym », « ta menthe », « ton ail » (« ton » devant une voyelle, même au féminin : ton alysse). */
export function possessive(plant: Agreeable) {
  if (plant.plural) return `tes ${withoutArticle(plant)}`;
  const bare = withoutArticle(plant);
  return `${plant.gender === "f" && !/^[aeéèêiouyh]/iu.test(bare) ? "ta" : "ton"} ${bare}`;
}

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
