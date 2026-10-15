/**
 * La première tâche liée au pot (chantier « Pots et balcon », étape 3c) : juste après l'accueil, une carte
 * « Prépare tes pots » (plantes à planter) ou « Vérifie tes pots » (plantes déjà là) sur Aujourd'hui. Une ligne par
 * plante : le pot et le terreau de sa fiche Spécial pot pour une plante à planter, la taille notée d'office à l'ajout
 * pour une plante déjà là (à confirmer sur sa fiche). « C'est bon » la ferme pour de bon ; elle s'efface seule
 * deux semaines après l'accueil. Logique pure.
 */
import { afterColon, capitalize } from "../plants/grammar";
import { potFit, potLabel, potNeedShort, soilPhrase } from "../plants/pot-sheet";
import { potSizeLabel, potSizeOf } from "../plants/pot-size";
import { plantDisplayName, type ResolvedPlant } from "./garden-logic";

/** La carte reste au plus deux semaines après l'accueil. */
export const FIRST_POTS_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type FirstPotLine = {
  plantId: string;
  name: string;
  /** Une ligne courte : « Moyen (21 à 30 cm) », « Taille à choisir », « Trop petit : prends un grand pot ». */
  detail: string;
  /** small : pot noté trop petit (orange) ; choose : taille inconnue ; prepare : plante à planter ; ok : pot noté qui convient. */
  tone: "small" | "choose" | "prepare" | "ok";
};

/**
 * Une seule ligne sur Aujourd'hui (14/10 : la carte détaillée prenait plus d'un écran dès 9 plantes), le détail dans
 * une feuille du bas : « Vérifie le pot de 9 plantes · 1 trop petit · 6 à choisir ».
 */
export type FirstPotsCard = { key: string; title: string; summary: string; intro: string; lines: FirstPotLine[] };

/** La clé de fermeture, propre à cet accueil (un nouvel accueil la remontre). */
export function firstPotsKey(completedAt: string) {
  return `first-pots:${completedAt}`;
}

/** Les plantes à corriger d'abord, celles qui vont bien à la fin. */
const ORDER: FirstPotLine["tone"][] = ["small", "choose", "prepare", "ok"];

function lineFor(resolved: ResolvedPlant): FirstPotLine {
  const { plant, entry } = resolved;
  const name = plantDisplayName(resolved);
  if (plant.toPlant) return { plantId: plant.id, name, detail: `${capitalize(potNeedShort(entry, { pierced: true }))}, ${soilPhrase(entry)}`, tone: "prepare" };
  const size = potSizeOf(plant);
  // Pas de taille notée : la taille conseillée par sa fiche, dite comme telle (à confirmer sur la fiche).
  if (size === "unknown") return { plantId: plant.id, name, detail: potLabel(entry, "unknown").text, tone: "ok" };
  const fit = potFit(entry, size);
  if (fit.tone === "small") {
    const advice = fit.detail.split(". ").pop()?.replace(/\.$/u, "") ?? "";
    return { plantId: plant.id, name, detail: `${fit.title} : ${advice.charAt(0).toLowerCase()}${advice.slice(1)}`, tone: "small" };
  }
  return { plantId: plant.id, name, detail: potSizeLabel(size), tone: "ok" };
}

const counted = (count: number, one: string, many: string) => (count === 0 ? null : `${count} ${count > 1 ? many : one}`);

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
  const lines = plants.map(lineFor).sort((a, b) => ORDER.indexOf(a.tone) - ORDER.indexOf(b.tone));
  const count = (tone: FirstPotLine["tone"]) => lines.filter((line) => line.tone === tone).length;
  const allToPlant = count("prepare") === lines.length;
  const verb = allToPlant ? "Prépare" : "Vérifie";
  const title = lines.length === 1 ? `${verb} le pot : ${afterColon(lines[0].name)}` : `${verb} le pot de ${lines.length} plantes`;
  const parts = [counted(count("small"), "trop petit", "trop petits"), counted(count("choose"), "à choisir", "à choisir"), counted(count("prepare"), "à préparer", "à préparer")].filter(Boolean);
  const summary = lines.length === 1 ? lines[0].detail : parts.length > 0 ? parts.join(" · ") : "Pots conseillés par Balco : c’est bien ça ?";
  return {
    key,
    title,
    summary,
    intro: allToPlant ? "Le pot et le terreau qu’il faut à chaque plante. Touche une plante pour noter son pot." : "Balco a noté un pot pour chaque plante. Touche une plante pour le changer.",
    lines,
  };
}
