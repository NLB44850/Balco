/**
 * La première tâche liée au pot (chantier « Pots et balcon », étape 3c) : juste après l'accueil, une carte
 * « Prépare tes pots » (plantes à planter) ou « Vérifie tes pots » (plantes déjà là) sur Aujourd'hui. Une ligne par
 * plante : le pot et le terreau de sa fiche Spécial pot pour une plante à planter, la taille notée d'office à l'ajout
 * pour une plante déjà là (à confirmer sur sa fiche). « C'est bon » la ferme pour de bon ; elle s'efface seule
 * deux semaines après l'accueil. Logique pure.
 */
import { capitalize } from "../plants/grammar";
import { potFit, potNeedShort, soilPhrase } from "../plants/pot-sheet";
import { potSizeLabel, potSizeOf } from "../plants/pot-size";
import { plantDisplayName, type ResolvedPlant } from "./garden-logic";

/** La carte reste au plus deux semaines après l'accueil. */
export const FIRST_POTS_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type FirstPotLine = {
  plantId: string;
  name: string;
  detail: string;
  /** small : le pot noté est trop petit (orange). */
  tone: "ok" | "small" | "todo";
};

export type FirstPotsCard = { key: string; title: string; intro: string; lines: FirstPotLine[] };

/** La clé de fermeture, propre à cet accueil (un nouvel accueil la remontre). */
export function firstPotsKey(completedAt: string) {
  return `first-pots:${completedAt}`;
}

function lineFor(resolved: ResolvedPlant): FirstPotLine {
  const { plant, entry } = resolved;
  const name = plantDisplayName(resolved);
  if (plant.toPlant) return { plantId: plant.id, name, detail: `${capitalize(potNeedShort(entry, { pierced: true }))}, ${soilPhrase(entry)}.`, tone: "todo" };
  const size = potSizeOf(plant);
  if (size === "unknown") return { plantId: plant.id, name, detail: "Choisis la taille de son pot.", tone: "todo" };
  const fit = potFit(entry, size);
  if (fit.tone === "small") {
    const advice = fit.detail.split(". ").pop() ?? "";
    return { plantId: plant.id, name, detail: `${fit.title} : ${advice.charAt(0).toLowerCase()}${advice.slice(1)}`, tone: "small" };
  }
  return { plantId: plant.id, name, detail: `Noté : ${potSizeLabel(size).toLowerCase()}. C’est bien ça ?`, tone: "ok" };
}

export function firstPotsCard({ answers, plants, dismissed, now }: {
  answers: { skipped?: boolean; completedAt?: string } | null;
  plants: ResolvedPlant[];
  dismissed: readonly string[];
  now: Date;
}): FirstPotsCard | null {
  if (!answers?.completedAt || answers.skipped || plants.length === 0) return null;
  const since = now.getTime() - new Date(answers.completedAt).getTime();
  if (!(since >= 0 && since < FIRST_POTS_DAYS * DAY_MS)) return null;
  const key = firstPotsKey(answers.completedAt);
  if (dismissed.includes(key)) return null;
  const toPlant = plants.filter(({ plant }) => plant.toPlant).length;
  return {
    key,
    title: toPlant === plants.length ? "Prépare tes pots" : "Vérifie tes pots",
    intro: toPlant === plants.length ? "Le pot et le terreau qu’il faut à chaque plante." : toPlant === 0 ? "Balco a noté un pot par plante. Touche une plante pour le changer." : "Touche une plante pour noter ou changer son pot.",
    lines: plants.map(lineFor),
  };
}
