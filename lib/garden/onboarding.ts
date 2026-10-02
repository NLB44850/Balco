/**
 * Les questions de l'accueil (première ouverture) et leurs réponses possibles. Les mêmes choix
 * servent dans Réglages, pour changer l'exposition ou l'espace sans tout recommencer.
 */
export type OnboardingOption = { id: string; icon: string; title: string; text: string };

export const EXPERIENCE_OPTIONS: OnboardingOption[] = [
  { id: "beginner", icon: "🌱", title: "Je débute", text: "J'ai besoin d'être guidé pas à pas." },
  { id: "curious", icon: "🪴", title: "Je me lance", text: "J'ai déjà quelques plantes à la maison." },
  { id: "experienced", icon: "🌿", title: "J'ai déjà un potager", text: "Je veux mieux organiser mes cultures." },
];

export const SUNLIGHT_OPTIONS: OnboardingOption[] = [
  { id: "shade", icon: "☁️", title: "Plutôt ombragé", text: "Moins de 3 h de soleil direct." },
  { id: "partial", icon: "⛅", title: "Mi-ombre", text: "Entre 3 et 6 h de soleil direct." },
  { id: "sunny", icon: "☀️", title: "Très ensoleillé", text: "Plus de 6 h de soleil direct." },
];

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
  { id: "zero-waste", icon: "♻️", title: "Moins de gaspillage", text: "Composter, récupérer et arroser mieux." },
];

export function optionTitle(options: OnboardingOption[], id: string | undefined) {
  return options.find((option) => option.id === id)?.title;
}
