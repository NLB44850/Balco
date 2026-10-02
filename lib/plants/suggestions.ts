/**
 * Suggestions de saison : ce qu'on peut semer ou planter ce mois-ci sur ton balcon. Les plantes qui
 * ne pousseront pas chez toi (soleil, espace) sont écartées, celles que tu as déjà aussi ; l'ordre suit
 * tes envies et la facilité (`recommendPlants`), et les dates suivent ton climat. Logique pure.
 */
import { formatMonthRange, MONTH_LONG, recommendPlants, type CatalogPlant, type Month, type OnboardingAnswers } from "./catalog";
import { adaptToClimate, type ClimateInfo } from "./climate";

export type SuggestionAction = "sow" | "plant" | "both";

export type SeasonalSuggestion = {
  entry: CatalogPlant;
  action: SuggestionAction;
  /** Dernier mois de la période : c'est maintenant, sinon l'an prochain. */
  lastChance: boolean;
  /** « Sème le basilic », « Plante le thym », « Sème ou plante la menthe ». */
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
};

const VERBS: Record<SuggestionAction, string> = { sow: "Sème", plant: "Plante", both: "Sème ou plante" };
export const SUGGESTION_ACTION_LABELS: Record<SuggestionAction, string> = { sow: "À semer", plant: "À planter", both: "À semer ou planter" };

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
  return { entry, action, lastChance, title: `${VERBS[action]} ${entry.label}`, reason: parts.filter(Boolean).join(" · ") };
}

export function seasonalSuggestions(answers: OnboardingAnswers | null, options: SuggestionOptions): SeasonalSuggestion[] {
  const { month, climate, limit = 5 } = options;
  const owned = new Set(options.ownedCatalogIds ?? []);
  // Sans réponses d'onboarding, `recommendPlants` ne renvoie qu'une courte liste : on part alors du catalogue entier.
  const ranked = recommendPlants(answers && !answers.skipped ? answers : {}, { month });
  const suggestions: SeasonalSuggestion[] = [];
  for (const entry of ranked) {
    if (owned.has(entry.id)) continue;
    const suggestion = suggestionFor(entry, month, climate);
    if (suggestion) suggestions.push(suggestion);
    if (suggestions.length >= limit) break;
  }
  return suggestions;
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
