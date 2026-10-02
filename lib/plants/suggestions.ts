/**
 * Suggestions de saison : ce qu'on peut semer ou planter ce mois-ci sur ton balcon. Les plantes qui
 * ne pousseront pas chez toi (soleil, espace) sont écartées, celles que tu as déjà aussi ; l'ordre suit
 * tes envies et la facilité (`recommendPlants`), et les dates suivent ton climat. Avec `seed` (le jour),
 * les suggestions tournent chaque jour parmi les meilleures, pour que l'app ne propose pas toujours les
 * mêmes ; le même jour, elles restent identiques partout (Aujourd'hui montre la 1ʳᵉ de Saisons). Logique pure.
 */
import { formatMonthRange, MONTH_LONG, recommendPlants, sowsIndoors, type CatalogPlant, type Month, type OnboardingAnswers } from "./catalog";
import { adaptToClimate, type ClimateInfo } from "./climate";

export type SuggestionAction = "sow" | "plant" | "both";

export type SeasonalSuggestion = {
  entry: CatalogPlant;
  action: SuggestionAction;
  /** Dernier mois de la période : c'est maintenant, sinon l'an prochain. */
  lastChance: boolean;
  /** Semis de ce mois à faire au chaud, à l'intérieur (pas encore sur le balcon). */
  indoors: boolean;
  /** « Sème le basilic au chaud », « Plante le thym », « Sème ou plante la menthe ». */
  title: string;
  /** « Récolte juin–septembre · dernier mois ». */
  reason: string;
};

export type SuggestionOptions = {
  month: number;
  /** Plantes déjà sur le balcon (id du catalogue) : on ne les repropose pas. */
  ownedCatalogIds?: string[];
  climate?: ClimateInfo | null;
  limit?: number;
  /** Change l'ordre chaque jour (« 2026-10-02 ») ; absent : les mieux adaptées d'abord, toujours dans le même ordre. */
  seed?: string;
};

/** Les suggestions du jour sont tirées parmi les plantes les mieux adaptées, pas dans tout le catalogue. */
const ROTATION_POOL = 12;

/** Petit hachage stable (FNV-1a) : même jour + même plante → même rang, sur tous les téléphones. */
function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const VERBS: Record<SuggestionAction, string> = { sow: "Sème", plant: "Plante", both: "Sème ou plante" };
export const SUGGESTION_ACTION_LABELS: Record<SuggestionAction, string> = { sow: "À semer", plant: "À planter", both: "À semer ou planter" };

/** « À semer au chaud », « À planter » : l'étiquette du geste, avec le semis à l'intérieur s'il y a lieu. */
export function suggestionActionLabel({ action, indoors }: Pick<SeasonalSuggestion, "action" | "indoors">) {
  if (!indoors || action === "plant") return SUGGESTION_ACTION_LABELS[action];
  return action === "sow" ? "À semer au chaud" : "À semer au chaud ou planter";
}

/** Le mois est-il le dernier d'une période (mars–mai → mai) ? Une période peut passer d'une année à l'autre. */
function isLastMonth(months: Month[], month: Month) {
  const next = ((month % 12) + 1) as Month;
  return months.includes(month) && !months.includes(next);
}

export function suggestionFor(catalogEntry: CatalogPlant, month: number, climate?: ClimateInfo | null): SeasonalSuggestion | null {
  const entry = adaptToClimate(catalogEntry, climate);
  const m = month as Month;
  const sow = entry.sowMonths.includes(m);
  const plant = entry.plantMonths.includes(m);
  if (!sow && !plant) return null;
  const action: SuggestionAction = sow && plant ? "both" : sow ? "sow" : "plant";
  // « Dernier mois » seulement si plus aucune des deux façons de faire n'est possible le mois suivant.
  const lastChance = (!sow || isLastMonth(entry.sowMonths, m)) && (!plant || isLastMonth(entry.plantMonths, m));
  const harvest = formatMonthRange(entry.harvestMonths);
  // Une fleur ne se récolte pas : on dit quand elle fleurit.
  const verb = entry.category === "flower" ? "Fleurit" : "Récolte";
  const parts = [harvest === "toute l’année" ? `${verb} toute l’année` : `${verb} ${harvest}`, lastChance ? "dernier mois" : entry.difficulty === "easy" ? "facile" : null];
  const indoors = sow && sowsIndoors(entry, m);
  const title = !indoors ? `${VERBS[action]} ${entry.label}` : action === "sow" ? `Sème ${entry.label} au chaud` : `Sème au chaud ou plante ${entry.label}`;
  return { entry, action, lastChance, indoors, title, reason: parts.filter(Boolean).join(" · ") };
}

export function seasonalSuggestions(answers: OnboardingAnswers | null, options: SuggestionOptions): SeasonalSuggestion[] {
  const { month, climate, limit = 5, seed } = options;
  const owned = new Set(options.ownedCatalogIds ?? []);
  // Sans réponses d'onboarding, `recommendPlants` ne renvoie qu'une courte liste : on part alors du catalogue entier.
  const ranked = recommendPlants(answers && !answers.skipped ? answers : {}, { month });
  const pool = seed ? Math.max(limit, ROTATION_POOL) : limit;
  const suggestions: SeasonalSuggestion[] = [];
  for (const entry of ranked) {
    if (owned.has(entry.id)) continue;
    const suggestion = suggestionFor(entry, month, climate);
    if (suggestion) suggestions.push(suggestion);
    if (suggestions.length >= pool) break;
  }
  if (!seed) return suggestions;
  return suggestions
    .map((suggestion) => ({ suggestion, rank: hash(`${seed}:${suggestion.entry.id}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ suggestion }) => suggestion);
}

/** Le prochain mois (après `month`) où il y a quelque chose à semer ou planter, pour les mois calmes. */
export function nextSuggestionMonth(answers: OnboardingAnswers | null, options: SuggestionOptions): number | null {
  for (let offset = 1; offset < 12; offset += 1) {
    const month = ((options.month - 1 + offset) % 12) + 1;
    if (seasonalSuggestions(answers, { ...options, month, limit: 1 }).length > 0) return month;
  }
  return null;
}

/** « À semer ou planter en octobre ». */
export function suggestionsHeading(month: number) {
  return `À semer ou planter en ${MONTH_LONG[month - 1]}`;
}
