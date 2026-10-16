/**
 * Une frileuse rentrée à l'intérieur pour l'hiver (chantier « Plante hors saison », étape 4).
 * - « Rentre ton basilic » : la plante choisie pour rentrer (`winter.choice === "indoors"`), dès qu'une nuit sous son
 *   seuil est annoncée dans les 3 jours ; tant que les nuits restent douces, la ligne attend.
 * - Une fois rentrée (`winter.indoorsAt`) : « 🏠 À l'intérieur », ni pluie, ni gel, ni vent, ni chaleur, pas d'eau
 *   économisée, pas d'engrais jusqu'au printemps ; l'arrosage continue, plus espacé, toujours « Sèche sur 2 cm ? ».
 *
 * Rythme d'arrosage à l'intérieur (docs/sources-froid.md, § « À l'intérieur ») : au frais (5 à 12 °C), toutes les deux
 * semaines environ, vérifié pour le citronnier (Promesse de Fleurs et Gamm vert : « toutes les 2 à 3 semaines »),
 * estimation Balco pour les autres ; près d'une fenêtre dans la maison, deux fois moins souvent que dehors
 * (estimation Balco : les sources disent seulement « très peu » ou « arrosage réduit ») ; le dahlia, au sec, sans
 * arroser (Promesse de Fleurs, Gerbeaud). Logique pure.
 */
import type { CatalogPlant } from "../plants/catalog";
import { coldTenderOf } from "../plants/cold-hardiness";
import { capitalize, objectPronoun, possessive, subjectPronoun, verb } from "../plants/grammar";
import type { WinterPlan } from "./winter-plan";

type WithWinter = { winter?: WinterPlan };

/** Rentrée à l'intérieur pour l'hiver. */
export const isIndoors = (plant: WithWinter) => plant.winter?.choice === "indoors" && Boolean(plant.winter.indoorsAt);

/** Choisie pour rentrer, pas encore rentrée. */
export const waitsToComeIn = (plant: WithWinter) => plant.winter?.choice === "indoors" && !plant.winter.indoorsAt;

export const INDOORS_LABEL = "🏠 À l’intérieur";

/** Au frais, hors gel : environ toutes les deux semaines. */
const COOL_WATERING_DAYS = 14;
/** Près d'une fenêtre, dans la maison : deux fois moins souvent que dehors. */
const LIGHT_WATERING_FACTOR = 2;
/** Plantes gardées au sec tout l'hiver : on n'arrose plus. */
const KEPT_DRY = new Set(["dahlia"]);
/** Rythme au frais vérifié sur deux sources. */
const COOL_VERIFIED = new Set(["lemon-tree"]);

export type IndoorWatering = { kind: "dry" } | { kind: "every"; hours: number; estimate: boolean };

/** L'arrosage à l'intérieur : au sec, ou un rythme (en heures) à partir de celui de dehors. */
export function indoorWatering(entry: Pick<CatalogPlant, "id">, outdoorHours: number): IndoorWatering {
  if (KEPT_DRY.has(entry.id)) return { kind: "dry" };
  if (coldTenderOf(entry)?.place === "cool") return { kind: "every", hours: COOL_WATERING_DAYS * 24, estimate: !COOL_VERIFIED.has(entry.id) };
  return { kind: "every", hours: Math.round(outdoorHours * LIGHT_WATERING_FACTOR), estimate: true };
}

// --- Les phrases ---------------------------------------------------------------------------------------

/** « Rentre ton basilic », « Rentre tes tomates cerises ». */
export const bringInTitle = (entry: CatalogPlant) => `Rentre ${possessive(entry)}`;

/** Sous la ligne : pourquoi aujourd'hui. */
export function bringInSubtitle(entry: CatalogPlant) {
  const data = coldTenderOf(entry);
  return data ? `Nuit sous ${data.nightC} °C annoncée · pas-à-pas` : "Une nuit froide arrive · pas-à-pas";
}

/** Sur la carte de l'hiver de la fiche, quand la ligne « Rentre » est due : « Nuit sous 10 °C annoncée : rentre-le aujourd'hui. » */
export function bringInUrgent(entry: CatalogPlant) {
  const data = coldTenderOf(entry);
  return `${data ? `Nuit sous ${data.nightC} °C annoncée` : "Une nuit froide arrive"} : rentre-${objectPronoun(entry)} aujourd’hui.`;
}

/** Le message du bas une fois rentrée. */
export const broughtInToast = (entry: CatalogPlant) => `${capitalize(possessive(entry))} : à l’intérieur, Balco adapte ses soins`;

/** Sur la fiche : comment l'arroser à l'intérieur. */
export function indoorCareText(entry: CatalogPlant, outdoorHours: number) {
  const watering = indoorWatering(entry, outdoorHours);
  if (watering.kind === "dry") return `Garde-${objectPronoun(entry)} au sec, sans arroser, jusqu’au printemps.`;
  const days = Math.round(watering.hours / 24);
  return `Arrose environ tous les ${days} jours, si la terre est sèche sur 2 cm${watering.estimate ? " (estimation Balco)" : ""}. Pas d’engrais jusqu’au printemps.`;
}

/** Honnêteté pour les plantes « quelques semaines de plus » : « À l'intérieur, il tiendra souvent quelques semaines de plus. » */
export function indoorWeeksNote(entry: CatalogPlant) {
  return coldTenderOf(entry)?.indoor === "weeks" ? `À l’intérieur, ${subjectPronoun(entry)} ${verb(entry, "tiendra", "tiendront")} souvent quelques semaines de plus.` : null;
}

/** Le moment où elle est rentrée. */
export const broughtIn = (plan: WinterPlan, now: Date): WinterPlan => ({ ...plan, choice: "indoors", indoorsAt: now.toISOString() });

/** « La remettre dehors » : annule la rentrée, le choix « la rentrer » reste. */
export const backOutside = ({ indoorsAt: _indoorsAt, ...plan }: WinterPlan): WinterPlan => plan;
