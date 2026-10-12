/**
 * Le geste « Engrais » (chantier « Pots et balcon », étape 4) : rythme, mois et engrais tirés des fiches Spécial pot
 * (lib/plants/pot-sheet.ts, chaque valeur vérifiée sur 2 sources). Trois cas :
 * - « Tous les 14 jours » (need: regular) : un geste espacé, compté depuis le dernier engrais, sinon depuis l'arrivée
 *   ou la mise en terre de la plante (le terreau neuf la nourrit déjà) ;
 * - « Un peu » (need: light) : une seule fois dans la période de la fiche (« compost en surface au printemps ») ; rien
 *   quand l'apport se fait au semis ou à la plantation (mêlé au terreau : le pas-à-pas le dit déjà) ;
 * - « Pas besoin » : aucun rappel (thym, lavande, capucine, radis…).
 * Jamais en hiver. Toujours un engrais organique, jamais de chimie de synthèse.
 */
import type { CareTask, Month } from "./catalog";
import { possessive, type Agreeable } from "./grammar";
// Les données directement (pas pot-sheet.ts, qui importe le catalogue : le catalogue appelle fertilizeTask en se créant).
import type { PotFeeding } from "./pot-sheet";
import { POT_SHEETS } from "./pot-sheets-data";

/** Rien en hiver, même si une fiche le disait. */
const WINTER: Month[] = [11, 12, 1, 2];
/** L'apport « au semis » ou « à la plantation » se mêle au terreau : pas de rappel une fois la plante en terre. */
const AT_START = /^(au semis|à la plantation)$/u;

export type Feeding = { everyDays: number | null; months: Month[]; kind: string };

/** Le rappel d'engrais d'une plante selon sa fiche, ou null quand elle n'en a pas besoin (ou seulement au départ). */
export function feedingFor(catalogId: string): Feeding | null {
  const feeding: PotFeeding | undefined = POT_SHEETS[catalogId]?.feeding;
  if (!feeding || feeding.need === "none") return null;
  const months = feeding.months.filter((month) => !WINTER.includes(month));
  if (months.length === 0) return null;
  const kind = feeding.kind ?? "engrais organique";
  if (feeding.need === "regular" && feeding.everyDays) return { everyDays: feeding.everyDays, months, kind };
  if (feeding.from && AT_START.test(feeding.from)) return null;
  return { everyDays: null, months, kind };
}

export function fertilizeTask(plant: Agreeable & { id: string }): CareTask | null {
  const feeding = feedingFor(plant.id);
  if (!feeding) return null;
  const careful = "Toujours sur une terre déjà humide, jamais sèche ; pas la veille d’une grosse pluie ni par canicule.";
  if (feeding.everyDays === null) {
    return {
      id: "feed",
      type: "fertilizing",
      title: `Nourris ${possessive(plant)}`,
      instruction: `Une fois en ce moment : ${feeding.kind}. ${careful}`,
      minutes: 3,
      months: feeding.months,
      oncePerSeason: true,
      doneTitle: "Plante nourrie, bravo.",
      doneText: "C’est tout pour cette saison.",
    };
  }
  return {
    id: "feed",
    type: "fertilizing",
    title: `Nourris ${possessive(plant)}`,
    instruction: `Engrais : ${feeding.kind}. ${careful} À refaire dans ${feeding.everyDays} jours.`,
    minutes: 3,
    months: feeding.months,
    everyDays: feeding.everyDays,
    doneTitle: "Plante nourrie, bravo.",
    doneText: `Prochain engrais dans ${feeding.everyDays} jours : Balco te le rappellera.`,
  };
}
