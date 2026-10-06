/**
 * Suggestions de saison : ce qu'on peut semer ou planter ce mois-ci sur ton balcon. Les plantes qui
 * ne pousseront pas chez toi (soleil, espace) sont écartées, celles que tu as déjà aussi ; l'ordre suit
 * tes envies et la facilité (`recommendPlants`), et les dates suivent ton climat. Avec `seed` (le jour),
 * les suggestions tournent chaque jour parmi les meilleures, pour que l'app ne propose pas toujours les
 * mêmes ; le même jour, elles restent identiques partout (Aujourd'hui montre la 1ʳᵉ de Saisons). Logique pure.
 */
import {
  DEFAULT_PICKS,
  fitsSpace,
  fitsSunlight,
  formatMonthRange,
  getCatalogPlant,
  GOAL_FLAGSHIPS,
  MONTH_LONG,
  recommendPlants,
  sowsIndoors,
  type CatalogPlant,
  type GoalTag,
  type Month,
  type OnboardingAnswers,
  type SpaceSize,
  type Sunlight,
} from "./catalog";
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
  /** « Dernier mois pour la planter · récolte de mai à septembre », « Récolte de juin à septembre · facile ». */
  reason: string;
  /** Le mois de la suggestion (utile pour une saison, qui en compte plusieurs). */
  month: number;
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

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** « de mai à septembre », « d’août à octobre », « en juillet », « d’avril à juin et d’octobre à novembre ». */
export function monthSpan(months: number[]) {
  const range = formatMonthRange(months);
  if (range === "toute l’année" || range === "") return range;
  const from = (month: string) => (/^[aeiouo]/u.test(month) ? `d’${month}` : `de ${month}`);
  return range
    .split(", ")
    .map((run) => {
      const [start, end] = run.split("–");
      return end ? `${from(start)} à ${end}` : `en ${start}`;
    })
    .join(" et ");
}

const INFINITIVES: Record<SuggestionAction, string> = { sow: "semer", plant: "planter", both: "semer ou planter" };

/** « Dernier mois pour la planter », « pour les semer » ; « pour planter l’aubergine » quand l’article ne dit pas le genre. */
export function lastChanceText(label: string, action: SuggestionAction) {
  const verb = INFINITIVES[action];
  const article = label.split(" ")[0];
  if (article === "le" || article === "la" || article === "les") return `Dernier mois pour ${article} ${verb}`;
  return `Dernier mois pour ${verb} ${label}`;
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
  // Une fleur ne se récolte pas : on dit quand elle fleurit.
  const harvest = `${entry.category === "flower" ? "fleurit" : "récolte"} ${monthSpan(entry.harvestMonths)}`;
  const parts = lastChance ? [lastChanceText(entry.label, action), harvest] : [capitalize(harvest), entry.difficulty === "easy" ? "facile" : null];
  const indoors = sow && sowsIndoors(entry, m);
  const title = !indoors ? `${VERBS[action]} ${entry.label}` : action === "sow" ? `Sème ${entry.label} au chaud` : `Sème au chaud ou plante ${entry.label}`;
  return { entry, action, lastChance, indoors, title, reason: parts.filter(Boolean).join(" · "), month };
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

/**
 * Les suggestions d'une saison : ce qui se sème ou se plante dans l'un de ses mois (à partir du mois en
 * cours pour la saison en cours), chaque plante une seule fois, au premier mois où c'est possible.
 */
export function seasonSuggestions(answers: OnboardingAnswers | null, options: Omit<SuggestionOptions, "month"> & { months: number[] }) {
  const { months, limit = 5, seed, ...rest } = options;
  const byPlant = new Map<string, SeasonalSuggestion>();
  for (const month of months) {
    for (const suggestion of seasonalSuggestions(answers, { ...rest, month, limit: ROTATION_POOL })) {
      if (byPlant.has(suggestion.entry.id)) continue;
      // Retenue en novembre mais déjà possible en octobre : on la propose pour octobre.
      // (Depuis la fiche du catalogue : celle de la suggestion a déjà ses dates adaptées au climat.)
      const original = getCatalogPlant(suggestion.entry.id) ?? suggestion.entry;
      const earliest = months.map((candidate) => suggestionFor(original, candidate, rest.climate)).find(Boolean);
      byPlant.set(suggestion.entry.id, earliest ?? suggestion);
    }
  }
  // Comme pour un mois : le tirage du jour se fait parmi les mieux adaptées.
  const all = [...byPlant.values()].slice(0, seed ? Math.max(limit, ROTATION_POOL) : limit);
  if (!seed) return all;
  return all
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

/** Plantes de départ : ce que l'onboarding, l'accueil et Saisons proposent quand le balcon est vide. */
export type SeasonalStarters = {
  /** Fiches d'origine du catalogue (dates non décalées : chaque écran applique le climat lui-même). */
  plants: CatalogPlant[];
  /** « Les tomates se plantent en mai. En attendant, voici ce qui pousse maintenant. », ou null. */
  notice: string | null;
};

/** Sujet de la phrase d'attente : l'envie telle que l'utilisateur la pense, sinon le nom de la plante phare. */
const GOAL_SUBJECTS: Partial<Record<GoalTag, string>> = { tomatoes: "les tomates" };

/** « Les tomates se plantent en mai. » : le prochain mois où la plante phare se plante (ou se sème dehors). */
function waitingSentence(goal: GoalTag, month: number, climate: ClimateInfo | null | undefined, answers: OnboardingAnswers) {
  let best: { offset: number; sentence: string } | null = null;
  for (const id of GOAL_FLAGSHIPS[goal] ?? []) {
    const flagship = getCatalogPlant(id);
    // Une plante phare qui ne poussera pas sur ce balcon (soleil, espace) : rien à promettre.
    if (!flagship || !fitsSunlight(flagship, answers.sunlight as Sunlight | undefined) || !fitsSpace(flagship, answers.space as SpaceSize | undefined)) continue;
    const entry = adaptToClimate(flagship, climate);
    for (let offset = 1; offset < 12 && (!best || offset < best.offset); offset += 1) {
      const next = (((month - 1 + offset) % 12) + 1) as Month;
      // Planter un plant acheté passe avant semer au chaud : le geste le plus simple sur un balcon.
      const verb = entry.plantMonths.includes(next) ? "plante" : entry.sowMonths.includes(next) && !sowsIndoors(entry, next) ? "sème" : null;
      if (!verb) continue;
      // Le sujet : l'envie telle que l'utilisateur la pense (« les tomates »), sinon le nom de la plante.
      const subject = (GOAL_FLAGSHIPS[goal].length === 1 && GOAL_SUBJECTS[goal]) || entry.label;
      const plural = subject.startsWith("les ");
      best = { offset, sentence: `${capitalize(subject)} se ${verb}${plural ? "nt" : ""} en ${MONTH_LONG[next - 1]}.` };
    }
  }
  return best?.sentence ?? null;
}

/**
 * Les plantes à proposer pour démarrer : seulement celles qu'on peut semer ou planter ce mois-ci dans ton
 * climat (Paris tant que la ville n'est pas connue), triées par envies, soleil et espace. Sans réponses
 * (« Je regarderai plus tard »), les valeurs sûres d'abord. Si une envie n'a rien de saison, une phrase dit
 * quand revenir (« Les tomates se plantent en mai. En attendant, voici ce qui pousse maintenant. »).
 */
export function seasonalStarters(
  answers: OnboardingAnswers | null,
  options: { month: number; climate?: ClimateInfo | null; limit?: number; ownedCatalogIds?: string[] },
): SeasonalStarters {
  const { month, climate, limit = 6 } = options;
  const owned = new Set(options.ownedCatalogIds ?? []);
  const answered = answers && !answers.skipped ? answers : null;
  let ranked = recommendPlants(answered ?? {}, { month });
  if (!answered) {
    // Sans réponses : les valeurs sûres (basilic, menthe, radis…) passent devant, si c'est leur saison.
    const safe = DEFAULT_PICKS.map((id) => ranked.find((entry) => entry.id === id)).filter((entry): entry is CatalogPlant => Boolean(entry));
    ranked = [...safe, ...ranked.filter((entry) => !DEFAULT_PICKS.includes(entry.id))];
  }
  const inSeason = ranked.filter((entry) => !owned.has(entry.id) && suggestionFor(entry, month, climate));
  const goals = (answered?.goals ?? []).filter((goal): goal is GoalTag => goal in GOAL_FLAGSHIPS);
  const waiting = goals
    .filter((goal) => !inSeason.some((entry) => entry.goals.includes(goal)))
    .map((goal) => waitingSentence(goal, month, climate, answered ?? {}))
    .filter((sentence): sentence is string => Boolean(sentence));
  const notice = waiting.length > 0 ? `${waiting.join(" ")} En attendant, voici ce qui pousse maintenant.` : null;
  return { plants: inSeason.slice(0, limit), notice };
}
