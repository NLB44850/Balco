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
import { INDOOR_WINTER_IDS, INDOOR_WINTER_MONTHS, sowsOnWindowsill } from "./indoor";

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
  /** Hiver (novembre à février, ou moins de 3 plantes de saison) : à semer sur le rebord intérieur. */
  indoor: CatalogPlant[];
  /** Hiver : les envies pour le printemps (à semer ou planter de mars à mai), à garder pour un rappel en mars. */
  spring: CatalogPlant[];
};

/** En dessous, la saison est trop calme : on propose aussi le rebord intérieur et le printemps. */
export const WINTER_MIN_PLANTS = 3;
const SPRING_MONTHS: Month[] = [3, 4, 5];

/** Sujet de la phrase d'attente : l'envie telle que l'utilisateur la pense, sinon le nom de la plante phare. */
const GOAL_SUBJECTS: Partial<Record<GoalTag, string>> = { tomatoes: "les tomates" };

const SPACE_NEEDS: Record<SpaceSize, string> = { windowsill: "un rebord de fenêtre", planter: "au moins une jardinière", balcony: "au moins un petit balcon", terrace: "une terrasse" };

type GoalNotice = { sentence: string; waiting: boolean };

/**
 * Pourquoi une envie n'a rien à proposer maintenant. Sa plante phare pousse chez toi : « Les tomates se plantent
 * en mai. » (le prochain mois où elle se plante, ou se sème dehors). Elle n'y pousse pas : on le dit
 * (« Les tomates ont besoin de soleil presque toute la journée. »), plutôt que de se taire.
 */
function goalNotice(goal: GoalTag, month: number, climate: ClimateInfo | null | undefined, answers: OnboardingAnswers): GoalNotice | null {
  const sunlight = answers.sunlight as Sunlight | undefined;
  const space = answers.space as SpaceSize | undefined;
  const flagships = (GOAL_FLAGSHIPS[goal] ?? []).map((id) => getCatalogPlant(id)).filter((entry): entry is CatalogPlant => Boolean(entry));
  // Le sujet : l'envie telle que l'utilisateur la pense (« les tomates »), sinon le nom de la plante.
  const subjectOf = (entry: CatalogPlant) => (flagships.length === 1 && GOAL_SUBJECTS[goal]) || entry.label;
  let best: { offset: number; sentence: string } | null = null;
  for (const flagship of flagships) {
    if (!fitsSunlight(flagship, sunlight) || !fitsSpace(flagship, space)) continue;
    const entry = adaptToClimate(flagship, climate);
    for (let offset = 1; offset < 12 && (!best || offset < best.offset); offset += 1) {
      const next = (((month - 1 + offset) % 12) + 1) as Month;
      // Planter un plant acheté passe avant semer au chaud : le geste le plus simple sur un balcon.
      const verb = entry.plantMonths.includes(next) ? "plante" : entry.sowMonths.includes(next) && !sowsIndoors(entry, next) ? "sème" : null;
      if (!verb) continue;
      const subject = subjectOf(entry);
      best = { offset, sentence: `${capitalize(subject)} se ${verb}${subject.startsWith("les ") ? "nt" : ""} en ${MONTH_LONG[next - 1]}.` };
    }
  }
  if (best) return { sentence: best.sentence, waiting: true };
  // Aucune plante phare ne pousse sur ce balcon : on dit ce qui manque.
  const flagship = flagships[0];
  if (!flagship) return null;
  const subject = subjectOf(flagship);
  const plural = subject.startsWith("les ");
  if (!fitsSunlight(flagship, sunlight)) {
    const need = flagship.sunlight.includes("partial") ? "d’au moins quelques heures de soleil" : "de soleil presque toute la journée";
    return { sentence: `${capitalize(subject)} ${plural ? "ont" : "a"} besoin ${need}.`, waiting: false };
  }
  if (!fitsSpace(flagship, space)) return { sentence: `${capitalize(subject)} demande${plural ? "nt" : ""} ${SPACE_NEEDS[flagship.minSpace]}.`, waiting: false };
  return null;
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
  const notices = goals
    .filter((goal) => !inSeason.some((entry) => entry.goals.includes(goal)))
    .map((goal) => goalNotice(goal, month, climate, answered ?? {}))
    .filter((notice): notice is GoalNotice => Boolean(notice));
  const ending = notices.every((notice) => notice.waiting) ? "En attendant, voici ce qui pousse maintenant." : "Voici plutôt ce qui pousse bien chez toi maintenant.";
  const notice = notices.length > 0 ? `${notices.map((item) => item.sentence).join(" ")} ${ending}` : null;
  const plants = inSeason.slice(0, limit);
  // L'hiver (novembre à février), ou un mois trop calme : on propose aussi le rebord intérieur et le printemps.
  if (plants.length >= WINTER_MIN_PLANTS && !INDOOR_WINTER_MONTHS.includes(month)) return { plants, notice, indoor: [], spring: [] };
  // Saison calme (l'hiver) : le rebord intérieur, et ce qui t'attend au printemps.
  const shown = new Set([...plants.map((entry) => entry.id), ...owned]);
  const indoor = INDOOR_WINTER_IDS.map((id) => getCatalogPlant(id)).filter((entry): entry is CatalogPlant => Boolean(entry) && !shown.has(entry!.id) && sowsOnWindowsill(entry!, month));
  indoor.forEach((entry) => shown.add(entry.id));
  const spring = ranked
    .filter((entry) => {
      if (shown.has(entry.id)) return false;
      const adapted = adaptToClimate(entry, climate);
      return SPRING_MONTHS.some((m) => adapted.plantMonths.includes(m) || (adapted.sowMonths.includes(m) && !sowsIndoors(adapted, m)));
    })
    .slice(0, limit);
  return { plants, notice, indoor: indoor.slice(0, 3), spring };
}

/** Ajouter depuis le catalogue : la plante est-elle déjà sur le balcon, ou à semer / planter ? */
export type AddChoice = "installed" | "toPlant";
export const ADD_CHOICE_LABELS: Record<AddChoice, string> = { installed: "Déjà sur mon balcon", toPlant: "À planter" };

/** L'ordre des deux boutons : « À planter » d'abord si c'est sa saison, sinon « Déjà sur mon balcon ». */
export function addChoices(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): AddChoice[] {
  return suggestionFor(entry, month, climate) ? ["toPlant", "installed"] : ["installed", "toPlant"];
}
