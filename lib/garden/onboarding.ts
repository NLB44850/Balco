import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { dayKey, isAvoidedWatering } from "./garden-logic";

/**
 * Les questions de l'accueil (première ouverture) et leurs réponses possibles. Les mêmes choix
 * servent dans Réglages, pour changer l'exposition ou l'espace sans tout recommencer.
 */
export type OnboardingOption = { id: string; icon: string; title: string; text: string };

export const SUNLIGHT_OPTIONS: OnboardingOption[] = [
  { id: "sunny", icon: "☀️", title: "Le soleil tape presque toute la journée", text: "Plus de 6 h de soleil direct." },
  { id: "partial", icon: "⛅", title: "Le matin ou l’après-midi seulement", text: "Entre 3 et 6 h de soleil direct." },
  { id: "shade", icon: "☁️", title: "Presque jamais", text: "Moins de 3 h de soleil direct." },
];

/** Dans l'accueil seulement : « Je ne sais pas » vaut mi-ombre (le choix le plus prudent). */
export const SUNLIGHT_UNKNOWN: OnboardingOption = { id: "unknown", icon: "🤷", title: "Je ne sais pas", text: "Balco part sur une mi-ombre, tu pourras changer." };
export const sunlightFromChoice = (id: string) => (id === SUNLIGHT_UNKNOWN.id ? "partial" : id);

export const SPACE_OPTIONS: OnboardingOption[] = [
  { id: "windowsill", icon: "🪟", title: "Un rebord de fenêtre", text: "Quelques pots compacts, près de la lumière." },
  { id: "planter", icon: "🪴", title: "Une ou deux jardinières", text: "Un espace étroit mais plein de potentiel." },
  { id: "balcony", icon: "🏡", title: "Un petit balcon", text: "De quoi créer un vrai micro-potager." },
  { id: "terrace", icon: "🌳", title: "Une terrasse", text: "Plus de place pour varier les cultures." },
];

export const GOAL_OPTIONS: OnboardingOption[] = [
  { id: "tomatoes", icon: "🍅", title: "Tomates cerises", text: "Du soleil et du goût à récolter." },
  { id: "aromatics", icon: "🌿", title: "Basilic & menthe", text: "Des aromatiques pour la cuisine." },
  { id: "bees", icon: "🐝", title: "Fleurs pour les abeilles", text: "Accueillir les pollinisateurs en ville." },
  { id: "salads", icon: "🥬", title: "Des salades à couper", text: "Des feuilles fraîches qui repoussent." },
];

/** Raccourcis de « Lesquelles ? » : les plantes qu'on a le plus souvent déjà sur un balcon. */
export const COMMON_PLANT_IDS = ["basil", "mint", "cherry-tomato", "strawberry", "parsley", "lavender", "thyme", "chives"];

/** Anciennes réponses : « Moins de gaspillage » est devenu « Des salades à couper » (octobre 2026). */
const LEGACY_GOALS: Record<string, string> = { "zero-waste": "salads" };

export function normalizeOnboarding<T extends { goals?: string[] } | null>(answers: T): T {
  if (!answers?.goals?.some((goal) => goal in LEGACY_GOALS)) return answers;
  return { ...answers, goals: Array.from(new Set(answers.goals.map((goal) => LEGACY_GOALS[goal] ?? goal))) };
}

export function optionTitle(options: OnboardingOption[], id: string | undefined) {
  return options.find((option) => option.id === id)?.title;
}

/**
 * La carte en haut d'Aujourd'hui juste après l'accueil : « Bienvenue, voici ton balcon » le jour même, jusqu'au
 * premier geste coché ; après « Passer », « Quelques questions » pour relancer l'accueil. Sinon, rien.
 */
export function arrivalCard(answers: { skipped?: boolean; completedAt?: string } | null, events: MaintenanceEvent[], now: Date): "welcome" | "questions" | null {
  if (!answers) return null;
  if (answers.skipped) return "questions";
  if (!answers.completedAt) return null;
  const done = new Date(answers.completedAt);
  if (dayKey(done) !== dayKey(now)) return null;
  // Un arrosage évité compté tout seul (pluie) n'est pas un geste coché.
  const checked = events.some((event) => new Date(event.completedAt).getTime() >= done.getTime() && !isAvoidedWatering(event));
  return checked ? null : "welcome";
}

/** Les écrans de l'accueil après la bienvenue, selon le chemin suivi. */
export type OnboardingStep = "has" | "which" | "sun" | "space" | "goals" | "city" | "plants" | "reminders";

/**
 * Le chemin de l'accueil : « Oui, j'ai des plantes » → lesquelles, soleil, espace, ville ; « Pas encore » →
 * soleil, espace, envies, ville (juste avant les plantes : le filtre de saison dépend du climat), premières
 * plantes de saison. Sur un téléphone qui sait notifier, les rappels ferment la marche. Tant que la réponse
 * manque, on suppose « Pas encore » (la barre ne compte que les écrans du chemin suivi).
 */
export function onboardingSteps({ hasPlants, reminders = false }: { hasPlants?: boolean; reminders?: boolean }): OnboardingStep[] {
  const path: OnboardingStep[] = hasPlants ? ["has", "which", "sun", "space", "city"] : ["has", "sun", "space", "goals", "city", "plants"];
  return reminders ? [...path, "reminders"] : path;
}
