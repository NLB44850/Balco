/**
 * Fiches « Spécial Pot » (chantier « Pots et balcon », étape 2) : pour chaque plante du catalogue, la profondeur de
 * terre, le volume du pot, le terreau et l'engrais en culture en pot. Chaque valeur vérifiée sur 2 sources au moins
 * (données dans pot-sheets-data.ts, détail et sources dans docs/sources-pots.md). Logique pure, sans React Native.
 */
import { MONTH_LONG, type CatalogPlant, type Month } from "./catalog";
import { byForm, elides, type Agreeable } from "./grammar";
import { POT_SHEETS } from "./pot-sheets-data";
import type { KnownPotSize, PotSize } from "./pot-size";

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

/** La valeur courte de la ligne « Engrais » : « Tous les 14 jours », « Un peu », « Pas besoin ». */
export function feedingValue(feeding: PotFeeding) {
  if (feeding.need === "none") return "Pas besoin";
  if (feeding.need === "regular" && feeding.everyDays) return `Tous les ${feeding.everyDays} jours`;
  return "Un peu";
}

/** « au printemps », « en juin » : déjà dit par les mois, on ne le répète pas. */
const SEASON_ONLY = /^(au printemps|à l’automne|en [a-zéû]+|en début d’été)$/u;

/** La phrase sous la ligne « Engrais » : quoi, à partir de quand, quels mois. */
export function feedingDetail(plant: Agreeable, feeding: PotFeeding) {
  if (feeding.need === "none") return byForm(plant, "Il s’en passe très bien.", "Elle s’en passe très bien.", "Ils s’en passent très bien.", "Elles s’en passent très bien.");
  const what = feeding.kind ? feeding.kind.charAt(0).toUpperCase() + feeding.kind.slice(1) : "Engrais organique";
  const months = monthSpan(feeding.months);
  const from = feeding.from && !(months && SEASON_ONLY.test(feeding.from)) ? feeding.from : null;
  const when = [from, months].filter(Boolean).join(", ");
  return when ? `${what}, ${when}.` : `${what}.`;
}

/** Une fiche faite avec peu de sources (choix du porteur, 12/10 : on l'affiche, en le disant). */
export const ESTIMATE_TEXT = "Estimation : peu de sources sur cette plante en pot.";

// --- Le pot qu'il lui faut, en centimètres (retour du porteur, 12/10 : jamais de litres à l'écran) ------------------

/** La forme type de chaque taille de pot (étape 1) : largeur au bord et profondeur de terre, en cm. */
export const POT_SHAPES: Record<KnownPotSize, { widthCm: number; depthCm: number }> = {
  small: { widthCm: 18, depthCm: 18 },
  medium: { widthCm: 27, depthCm: 27 },
  large: { widthCm: 36, depthCm: 36 },
  /** Jardinière de 60 cm vue de face : longue, peu profonde (environ 20 L). */
  planter: { widthCm: 60, depthCm: 18 },
};
const PLANTER_LITERS = 20;
const ROUND_SIZES = ["small", "medium", "large"] as const;
/** Une profondeur un peu plus faible que conseillé passe encore (les pots du commerce varient). */
const DEPTH_TOLERANCE = 0.9;
/** Les tailles du choix « Dans quel pot ? », pour dire laquelle prendre. */
const SIZE_WORDS: Record<KnownPotSize, string> = { small: "un petit pot", medium: "un pot moyen", large: "un grand pot", planter: "une jardinière" };

/** Largeur d'un pot rond à peu près aussi haut que large, arrondie aux 5 cm du dessus (ce qu'on lit en magasin). */
export function roundPotWidthCm(liters: number) {
  return Math.max(15, Math.ceil(Math.cbrt((liters * 1000) / 0.707) / 5) * 5);
}

export type PotNeed = { widthCm: number; depthCm: number; liters: number; /** La fiche parle d'une jardinière (salade à couper…). */ planter: boolean };

/** Le pot qu'il lui faut : largeur et profondeur, d'après sa fiche (sinon d'après le pot conseillé du catalogue). */
export function potNeedFor(entry: Pick<CatalogPlant, "id" | "potLiters">): PotNeed {
  const sheet = potSheetFor(entry.id);
  const liters = sheet?.liters ?? entry.potLiters;
  const widthCm = roundPotWidthCm(liters);
  return { widthCm, depthCm: sheet?.depthCm ?? widthCm, liters, planter: Boolean(sheet && /jardinière/u.test(sheet.forWhat)) };
}

/** « un pot d’au moins 30 cm de large », « une jardinière de 60 cm » : pour les phrases des autres écrans. */
export function potNeedShort(entry: Pick<CatalogPlant, "id" | "potLiters">, options: { pierced?: boolean } = {}) {
  const need = potNeedFor(entry);
  if (need.planter) return "une jardinière de 60 cm";
  return `un pot${options.pierced ? " percé" : ""} d’au moins ${need.widthCm} cm de large`;
}

/** « Il lui faut un pot de 35 cm de large, 30 cm de profondeur. » */
export function potNeedText(need: PotNeed) {
  if (need.planter) return `Il lui faut une jardinière de 60 cm, ${need.depthCm} cm de profondeur.`;
  return `Il lui faut un pot de ${need.widthCm} cm de large, ${need.depthCm} cm de profondeur.`;
}

const fitsRound = (size: (typeof ROUND_SIZES)[number], need: PotNeed) => POT_SHAPES[size].widthCm + 3 >= need.widthCm && POT_SHAPES[size].depthCm >= need.depthCm * DEPTH_TOLERANCE;
const fitsPlanter = (need: PotNeed) => POT_SHAPES.planter.depthCm >= need.depthCm * DEPTH_TOLERANCE && PLANTER_LITERS >= need.liters * DEPTH_TOLERANCE;

/** La plus petite taille du choix qui lui suffit (la jardinière d'abord si c'est sa culture), sinon null (plus grand qu'un grand pot). */
export function smallestFit(need: PotNeed): KnownPotSize | null {
  if (need.planter && fitsPlanter(need)) return "planter";
  return ROUND_SIZES.find((size) => fitsRound(size, need)) ?? null;
}

export type PotFit = {
  tone: "ok" | "small" | "unknown";
  /** « Ton pot lui convient », « Pot trop petit », « Quel est ton pot ? ». */
  title: string;
  /** Ce qu'il lui faut, ou combien de pieds tiennent dans la jardinière. */
  detail: string;
};

/** Le pot choisi (étape 1) lui suffit-il ? Tout en centimètres, avec un conseil propre à la jardinière. */
export function potFit(entry: Pick<CatalogPlant, "id" | "potLiters">, size: PotSize): PotFit {
  const need = potNeedFor(entry);
  const wanted = smallestFit(need);
  const advice = wanted ? `Prends ${SIZE_WORDS[wanted]}.` : `Prends un bac de ${need.widthCm} cm ou plus.`;
  if (size === "unknown") return { tone: "unknown", title: "Quel est ton pot ?", detail: potNeedText(need) };
  if (size === "planter") {
    if (!fitsPlanter(need)) {
      return need.depthCm * DEPTH_TOLERANCE > POT_SHAPES.planter.depthCm
        ? { tone: "small", title: "Jardinière trop peu profonde", detail: `Il lui faut ${need.depthCm} cm de terre. ${advice}` }
        : { tone: "small", title: "Jardinière trop petite", detail: `${potNeedText(need)} ${advice}` };
    }
    if (need.planter) return { tone: "ok", title: "Ta jardinière lui convient", detail: "C’est la culture conseillée en pot." };
    const room = Math.max(1, Math.floor(PLANTER_LITERS / need.liters));
    return { tone: "ok", title: "Ta jardinière lui convient", detail: room > 1 ? `Place pour ${room} pieds dans 60 cm.` : "Place pour un seul pied dans 60 cm." };
  }
  if (fitsRound(size, need)) return { tone: "ok", title: "Ton pot lui convient", detail: potNeedText(need) };
  const shallow = POT_SHAPES[size].widthCm + 3 >= need.widthCm;
  return { tone: "small", title: shallow ? "Pot trop peu profond" : "Pot trop petit", detail: `${potNeedText(need)} ${advice}` };
}

// --- Rempoter et pas-à-pas : le pot suivant et le terreau d'après la fiche ------------------------------------------

/** La largeur haute de chaque taille du choix (« Moyen, 20 à 30 cm » : 30). */
const SIZE_MAX_WIDTH: Record<(typeof ROUND_SIZES)[number], number> = { small: 20, medium: 30, large: 40 };

/** La taille du choix qui correspond à une largeur, ou null au-delà d'un grand pot (un bac). */
export function sizeForWidth(widthCm: number): KnownPotSize | null {
  return ROUND_SIZES.find((size) => widthCm <= SIZE_MAX_WIDTH[size]) ?? null;
}

export type NextPot = {
  widthCm: number;
  /** La taille du choix « Dans quel pot ? » du nouveau pot (null : un bac de plus de 40 cm). */
  size: KnownPotSize | null;
  /** Son pot actuel est plus petit que ce que dit sa fiche. */
  tooSmall: boolean;
};

/**
 * Le pot du prochain rempotage (règles du 12/10) : si son pot (étape 1) est plus petit que sa fiche, celui de la fiche ;
 * sinon un pot de 5 cm plus large que le sien. Taille inconnue : 5 cm de plus que le pot de la fiche, à chaque rempotage.
 */
export function nextPotFor(entry: Pick<CatalogPlant, "id" | "potLiters">, potSize: PotSize | undefined, repots = 0): NextPot {
  const need = potNeedFor(entry);
  const size = potSize ?? "unknown";
  if (size === "unknown") {
    // Sans taille connue, on la suppose dans le pot de sa fiche : un peu plus grand à chaque rempotage.
    const widthCm = need.widthCm + 5 * (repots + 1);
    return { widthCm, size: sizeForWidth(widthCm), tooSmall: false };
  }
  const fit = potFit(entry, size);
  if (fit.tone === "small") return { widthCm: need.widthCm, size: sizeForWidth(need.widthCm), tooSmall: true };
  const current = size === "planter" ? need.widthCm : SIZE_MAX_WIDTH[size];
  const widthCm = current + 5;
  return { widthCm, size: sizeForWidth(widthCm), tooSmall: false };
}

/** « du terreau neuf mêlé de sable », « de la terre de bruyère » : le terreau de sa fiche, pour les phrases. */
export function soilPhrase(entry: Pick<CatalogPlant, "id">) {
  switch (potSheetFor(entry.id)?.soil) {
    case "rich": return "du terreau neuf enrichi de compost";
    case "draining": return "du terreau neuf mêlé de sable";
    case "light": return "du terreau neuf et léger";
    case "acid": return "de la terre de bruyère";
    case "citrus": return "du terreau pour agrumes";
    default: return "du terreau neuf";
  }
}

/** Les fournitures de terre de sa fiche, pour « Ce qu'il te faut » (`shared` : « J'ai déjà » vaut pour toutes). */
export function soilSupplies(entry: Pick<CatalogPlant, "id">, amount: string): { id: string; label: string; detail?: string; shared: boolean }[] {
  switch (potSheetFor(entry.id)?.soil) {
    case "acid": return [{ id: "heath-soil", label: "De la terre de bruyère", detail: "Une terre acide, sans calcaire.", shared: true }];
    case "citrus": return [{ id: "citrus-soil", label: "Du terreau pour agrumes", detail: amount, shared: true }];
    case "seed": return [{ id: "seed-soil", label: "Du terreau de semis", detail: "Un terreau fin, sans engrais.", shared: true }];
    case "rich": return [{ id: "soil", label: "Du terreau", detail: amount, shared: true }, { id: "compost", label: "Du compost", detail: "Un tiers de compost, mêlé au terreau.", shared: true }];
    case "draining": return [{ id: "soil", label: "Du terreau", detail: amount, shared: true }, { id: "sand", label: "Du sable de rivière", detail: "Un tiers de sable, mêlé au terreau.", shared: true }];
    case "light": return [{ id: "soil", label: "Du terreau léger", detail: "Sans cailloux ni fumier : les racines s’allongent bien.", shared: true }];
    default: return [{ id: "soil", label: "Du terreau", detail: amount, shared: true }];
  }
}

/** Ce que dit sa fiche sur l'engrais, pour « Et après ? » du pas-à-pas (null : rien à dire). */
export function feedingNext(entry: Agreeable & Pick<CatalogPlant, "id">): string | null {
  const feeding = potSheetFor(entry.id)?.feeding;
  if (!feeding) return null;
  if (feeding.need === "none") return `Pas d’engrais : ${feedingDetail(entry, feeding).charAt(0).toLowerCase()}${feedingDetail(entry, feeding).slice(1)}`;
  const kind = feeding.kind ?? "engrais organique";
  if (feeding.need === "regular" && feeding.everyDays) return `Engrais tous les ${feeding.everyDays} jours${feeding.from ? `, ${feeding.from}` : ""} : ${kind}.`;
  return `Un peu d’engrais${feeding.from ? ` ${feeding.from}` : ""} : ${kind}.`;
}
