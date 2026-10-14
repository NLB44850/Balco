/**
 * « Que planter à la place ? » (chantier « Pots et balcon », étape 8) : quand un pot se libère (récolte en une fois ou
 * fin de saison), trois idées au plus pour le remplir, prises dans les suggestions de saison (soleil, espace, envies,
 * climat) :
 * - à semer ou planter ce mois-ci (le mois suivant s'il en manque), directement dans le pot (pas de semis au chaud) ;
 * - qui tiennent dans ce pot (sa taille notée, sinon le pot que demandait la plante d'avant) ;
 * - d'une autre famille que la plante d'avant (lib/plants/families.ts) : mêmes maladies dans la terre ;
 * - les annuelles avant les vivaces, et après une plante gourmande (engrais régulier dans sa fiche), les sobres d'abord.
 * Et le geste pour la terre avant de replanter. Règles et sources dans docs/sources-rotation.md. Logique pure.
 */
import { MONTH_LONG, type CatalogPlant, type OnboardingAnswers } from "../plants/catalog";
import type { ClimateInfo } from "../plants/climate";
import { FAMILY_NAMES, familyOf, sameFamily } from "../plants/families";
import { potFit, potNeedFor, potSheetFor } from "../plants/pot-sheet";
import { potSizeOf, type PotSize } from "../plants/pot-size";
import { seasonalSuggestions, type SeasonalSuggestion } from "../plants/suggestions";
import type { ResolvedPlant } from "./garden-logic";

export type ReplantIdea = {
  entry: CatalogPlant;
  /** Le mois où la semer ou la planter (ce mois-ci ou le suivant). */
  month: number;
  /** « Récolte de mars à mai · facile », précédé de « En novembre » pour le mois suivant. */
  reason: string;
};

/** Une plante gourmande : sa fiche demande de l'engrais à intervalles réguliers. */
export const isHungry = (entry: Pick<CatalogPlant, "id">) => potSheetFor(entry.id)?.feeding.need === "regular";

/** Sobre : pas d'engrais, ou un peu une fois ; les légumineuses enrichissent même la terre. */
const isSober = (entry: Pick<CatalogPlant, "id">) => (potSheetFor(entry.id)?.feeding.need ?? "light") !== "regular";

/** La nouvelle plante tient-elle dans ce pot ? Taille notée : la règle de la fiche ; sinon, le pot de la plante d'avant. */
export function fitsFreedPot(candidate: Pick<CatalogPlant, "id" | "potLiters">, previous: Pick<CatalogPlant, "id" | "potLiters">, potSize: PotSize) {
  if (potSize !== "unknown") return potFit(candidate, potSize).tone === "ok";
  const need = potNeedFor(candidate);
  const room = potNeedFor(previous);
  return need.liters <= room.liters && need.depthCm <= room.depthCm;
}

export type ReplantOptions = { month: number; climate?: ClimateInfo | null; ownedCatalogIds?: string[]; seed?: string; limit?: number };

/** Le geste pour la terre avant de replanter : renouveler un tiers après une gourmande, sinon un peu de compost. */
export function replantSoilTip(entry: Pick<CatalogPlant, "id">) {
  return isHungry(entry)
    ? "Avant de replanter, remplace un tiers de la terre par du terreau neuf mêlé de compost : la plante d’avant l’a épuisée."
    : "Avant de replanter, aère la terre et mêles-y une poignée de compost.";
}

/** « Pas la famille de la tomate : mêmes maladies dans la terre. » ; null si la plante est seule de sa famille. */
export function rotationNote(entry: Pick<CatalogPlant, "id">) {
  const family = familyOf(entry.id);
  return family === "other" ? null : `Pas ${FAMILY_NAMES[family].replace(/^la /u, "de la ")} : mêmes maladies dans la terre.`;
}

const startsInPot = (suggestion: SeasonalSuggestion) => !(suggestion.indoors && suggestion.action === "sow");

/** Les idées pour remplir le pot libéré par `resolved`, les mieux adaptées d'abord. */
export function replantIdeas(resolved: ResolvedPlant, answers: OnboardingAnswers | null, { month, climate, ownedCatalogIds = [], seed, limit = 3 }: ReplantOptions): ReplantIdea[] {
  const { entry } = resolved;
  const potSize = potSizeOf(resolved.plant);
  const pick = (forMonth: number, excluded: string[]) =>
    seasonalSuggestions(answers, { month: forMonth, climate, ownedCatalogIds: excluded, limit: 60, seed })
      .filter((suggestion) => startsInPot(suggestion) && !sameFamily(suggestion.entry.id, entry.id) && fitsFreedPot(suggestion.entry, entry, potSize))
      // Une saison de plus d'abord (une vivace prend le pot pour des années), puis, après une gourmande, les sobres
      // (tri stable : l'ordre du jour est gardé à l'intérieur).
      .sort((a, b) => Number(a.entry.perennial) - Number(b.entry.perennial) || (isHungry(entry) ? Number(isSober(b.entry)) - Number(isSober(a.entry)) : 0));
  const ideas: ReplantIdea[] = [];
  const add = (forMonth: number, excluded: string[], prefix: string | null) => {
    for (const suggestion of pick(forMonth, excluded)) {
      if (ideas.length >= limit) return;
      if (ideas.some((idea) => idea.entry.id === suggestion.entry.id)) continue;
      const reason = prefix ? `${prefix} · ${suggestion.reason.charAt(0).toLowerCase()}${suggestion.reason.slice(1)}` : suggestion.reason;
      ideas.push({ entry: suggestion.entry, month: forMonth, reason });
    }
  };
  const next = (month % 12) + 1;
  // Ce mois-ci, puis le mois suivant ; puis (balcon à l'ombre, petit pot…) une plante déjà sur le balcon, plutôt que
  // rien (retour du 14/10 : aucune idée après des radis, à l'ombre, avec la ciboulette déjà là).
  add(month, [...ownedCatalogIds, entry.id], null);
  add(next, [...ownedCatalogIds, entry.id], `En ${MONTH_LONG[next - 1]}`);
  add(month, [entry.id], "Déjà sur ton balcon");
  return ideas.slice(0, limit);
}
