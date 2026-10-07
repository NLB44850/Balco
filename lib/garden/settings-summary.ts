/**
 * Réglages : les valeurs courtes affichées au bout de chaque ligne (« Toute la journée », « Tomates cerises et
 * 2 autres »). Les phrases longues restent dans les feuilles du bas (mêmes choix que l'accueil). Logique pure.
 */
import { getCatalogPlant, type CatalogPlant, type OnboardingAnswers } from "../plants/catalog";
import { GOAL_OPTIONS, SPACE_OPTIONS, SUNLIGHT_OPTIONS, SUNLIGHT_UNKNOWN, type OnboardingOption } from "./onboarding";

/** Ligne « Soleil » : la réponse de l'accueil en quelques mots. */
const SUNLIGHT_SHORT: Record<string, string> = { sunny: "Toute la journée", partial: "Matin ou après-midi", shade: "Presque jamais", [SUNLIGHT_UNKNOWN.id]: "Je ne sais pas" };
/** Ligne « Envies » : le nom de chaque envie dans une liste (« Tomates cerises, salades »). */
const GOAL_SHORT: Record<string, string> = { tomatoes: "Tomates cerises", aromatics: "Basilic et menthe", bees: "Fleurs pour les abeilles", salads: "Salades" };

/** Pas encore de réponse (accueil passé). */
export const NOT_YET = "Pas encore";

/** Les choix de la feuille « Combien de soleil reçoit ton balcon ? » : ceux de l'accueil, avec « Je ne sais pas ». */
export const SUNLIGHT_CHOICES: OnboardingOption[] = [...SUNLIGHT_OPTIONS, SUNLIGHT_UNKNOWN];
export const SUNLIGHT_TIP = "Astuce : regarde ton balcon à 10 h, 14 h et 18 h.";

/** Le choix coché dans la feuille : « Je ne sais pas » est gardé à part (Balco compte alors sur une mi-ombre). */
export function sunlightChoice(answers: Pick<OnboardingAnswers, "sunlight" | "sunlightUnknown"> | null | undefined) {
  if (answers?.sunlightUnknown) return SUNLIGHT_UNKNOWN.id;
  return answers?.sunlight;
}

/** Ce que la feuille enregistre pour un choix de soleil. */
export function sunlightPatch(id: string): Pick<OnboardingAnswers, "sunlight" | "sunlightUnknown"> {
  return id === SUNLIGHT_UNKNOWN.id ? { sunlight: "partial", sunlightUnknown: true } : { sunlight: id, sunlightUnknown: false };
}

export function sunlightValue(answers: Pick<OnboardingAnswers, "sunlight" | "sunlightUnknown"> | null | undefined) {
  const choice = sunlightChoice(answers);
  return (choice && SUNLIGHT_SHORT[choice]) ?? NOT_YET;
}

export function spaceValue(space: string | undefined) {
  return SPACE_OPTIONS.find((option) => option.id === space)?.title ?? NOT_YET;
}

/** « Tomates cerises, salades » ; au-delà de deux : « Tomates cerises et 2 autres » ; « Aucune » sans envie. */
export function shortList(names: string[], empty: string) {
  if (names.length === 0) return empty;
  const [first, ...rest] = names;
  if (names.length > 2) return `${first} et ${rest.length} autres`;
  return [first, ...rest.map((name) => name.toLowerCase())].join(", ");
}

export function goalsValue(goals: string[] | undefined) {
  const names = GOAL_OPTIONS.filter((option) => goals?.includes(option.id)).map((option) => GOAL_SHORT[option.id] ?? option.title);
  return shortList(names, "Aucune");
}

/** Les envies du printemps qui existent encore dans le catalogue, dans l'ordre où elles ont été gardées. */
export function springWishEntries(wishes: string[] | undefined): CatalogPlant[] {
  return (wishes ?? []).map((id) => getCatalogPlant(id)).filter((entry): entry is CatalogPlant => Boolean(entry));
}

export function springWishesValue(wishes: string[] | undefined) {
  return shortList(springWishEntries(wishes).map((entry) => entry.name), "Aucune pour l’instant");
}

/** Ligne « Ville » : « Lyon », ou « Paris, par défaut » tant qu'aucune ville n'est choisie. */
export function cityValue(weather: { city: string; isFallback?: boolean }) {
  return weather.isFallback ? "Paris, par défaut" : weather.city;
}
