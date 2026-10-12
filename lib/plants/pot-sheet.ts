/**
 * Fiches « Spécial Pot » (chantier « Pots et balcon », étape 2) : pour chaque plante du catalogue, la profondeur de
 * terre, le volume du pot, le terreau et l'engrais en culture en pot. Chaque valeur vérifiée sur 2 sources au moins
 * (données dans pot-sheets-data.ts, détail et sources dans docs/sources-pots.md). Logique pure, sans React Native.
 */
import { MONTH_LONG, type Month } from "./catalog";
import { byForm, elides, type Agreeable } from "./grammar";
import { POT_SHEETS } from "./pot-sheets-data";
import { potLitersOf, type PotSize } from "./pot-size";

export type SoilKind = "universal" | "rich" | "draining" | "light" | "acid" | "citrus" | "seed";

export const SOIL_LABELS: Record<SoilKind, string> = {
  universal: "Terreau universel",
  rich: "Terreau enrichi de compost",
  draining: "Terreau mêlé de sable",
  light: "Terreau léger, sans cailloux",
  acid: "Terre de bruyère",
  citrus: "Terreau pour agrumes",
  seed: "Terreau de semis",
};

export type PotFeeding = {
  /** none : s'en passe ; light : un peu de compost ou d'engrais au printemps ; regular : à intervalles réguliers. */
  need: "none" | "light" | "regular";
  everyDays: number | null;
  /** Quand commencer (« dès la floraison »). */
  from: string | null;
  months: Month[];
  /** L'engrais organique conseillé (« engrais liquide pour tomates »). */
  kind: string | null;
};

export type PotSheet = {
  depthCm: number;
  liters: number;
  /** À quoi correspond le volume : « 1 pied », « un rang de radis ». */
  forWhat: string;
  soil: SoilKind;
  /** Un conseil court au tutoiement, ou null. */
  soilTip: string | null;
  feeding: PotFeeding;
  confidence: "high" | "medium" | "low";
  sources: string[];
  note: string;
};

export function potSheetFor(catalogId: string): PotSheet | undefined {
  return POT_SHEETS[catalogId];
}

/** « de juin à septembre », « d’avril à juin », « en mai ». Mois consécutifs supposés (sinon le premier et le dernier). */
function monthSpan(months: Month[]) {
  if (months.length === 0) return null;
  const first = MONTH_LONG[months[0] - 1];
  if (months.length === 1) return `en ${first}`;
  return `${elides(first) ? "d’" : "de "}${first} à ${MONTH_LONG[months[months.length - 1] - 1]}`;
}

/** La valeur courte de la ligne « Engrais » : « Tous les 14 jours », « Au printemps », « Pas besoin ». */
export function feedingValue(feeding: PotFeeding) {
  if (feeding.need === "none") return "Pas besoin";
  if (feeding.need === "regular" && feeding.everyDays) return `Tous les ${feeding.everyDays} jours`;
  return "Une fois par an";
}

/** La phrase sous la ligne « Engrais » : quoi, à partir de quand, quels mois. */
export function feedingDetail(plant: Agreeable, feeding: PotFeeding) {
  if (feeding.need === "none") return byForm(plant, "Il s’en passe très bien.", "Elle s’en passe très bien.", "Ils s’en passent très bien.", "Elles s’en passent très bien.");
  const what = feeding.kind ? feeding.kind.charAt(0).toUpperCase() + feeding.kind.slice(1) : "Engrais organique";
  const when = [feeding.from, monthSpan(feeding.months)].filter(Boolean).join(", ");
  return when ? `${what}, ${when}.` : `${what}.`;
}

/** Le pot choisi (étape 1) suffit-il ? Comparé au volume de la fiche. */
export function potFit(sheet: PotSheet, size: PotSize): { tone: "ok" | "small" | "unknown"; text: string } {
  const liters = potLitersOf(size);
  if (liters === null) return { tone: "unknown", text: "Choisis sa taille pour vérifier qu’il suffit." };
  return liters >= sheet.liters
    ? { tone: "ok", text: `Assez grand : il faut au moins ${sheet.liters} L.` }
    : { tone: "small", text: `Un peu juste : vise au moins ${sheet.liters} L.` };
}
