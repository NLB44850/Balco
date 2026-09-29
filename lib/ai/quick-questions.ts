/**
 * Les questions prêtes à poser à Nora : tirées de tes plantes et de la saison, pour ne rien
 * avoir à écrire. Logique pure.
 */
import { seasonName, type ResolvedPlant } from "../garden/garden-logic";
import type { Month } from "../plants/catalog";

const GENERIC = ["Quoi planter ce mois-ci sur mon balcon ?", "Pourquoi les feuilles jaunissent ?", "Comment économiser l’eau ?"];

export function quickQuestions(plants: ResolvedPlant[], now = new Date(), max = 4): string[] {
  const month = (now.getMonth() + 1) as Month;
  const season = seasonName(now);
  const questions: string[] = [];
  const harvest = plants.find(({ entry }) => entry.harvestMonths.includes(month));
  if (harvest) questions.push(`Comment bien récolter ${harvest.entry.label} ?`);
  const frail = plants.find(({ entry }) => entry.care.frostSensitive);
  if (frail && (season === "automne" || season === "hiver")) questions.push(`Comment protéger ${frail.entry.label} du froid ?`);
  const pruned = plants.find(({ entry }) => entry.tasks.some((task) => task.type === "pruning" && (!task.months || task.months.includes(month))));
  if (pruned) questions.push(`Comment tailler ${pruned.entry.label} ?`);
  const first = plants[0];
  if (first) questions.push(`Tous les combien arroser ${first.entry.label} en ${season} ?`);
  questions.push(season === "automne" || season === "hiver" ? "Que préparer sur mon balcon pour cet hiver ?" : "Quoi semer ce mois-ci sur mon balcon ?");
  for (const question of GENERIC) questions.push(question);
  // Espace insécable avant « ? » : le point d'interrogation ne passe jamais seul à la ligne.
  return Array.from(new Set(questions)).slice(0, max).map((question) => question.replace(/ \?$/u, "\u00A0?"));
}
