/**
 * La liste de courses pour la jardinerie (chantier « Pots et balcon », étape 5) : ce qu'il faut acheter pour les
 * 6 semaines qui viennent, calculé d'après les plantes et leurs fiches Spécial pot, sans marque.
 * - Pots : les plantes « à planter » dont le semis ou la plantation tombe dans la fenêtre (taille notée, sinon celle de
 *   la fiche avec « Choisir la taille »), et les pots plus grands des rempotages annoncés.
 * - Terre : le terreau de ces pots en litres, selon le terreau de chaque fiche (compost, sable, terre de bruyère…),
 *   avec le sac à prendre.
 * - Plus de billes d'argile (retirées le 15/10 : la couche du fond ne draine pas, docs/sources-drainage.md) ; le pot
 *   est dit « Percé au fond ».
 * - Semis : godets et terreau de semis des semis au chaud qui arrivent.
 * - Engrais : celui des fiches, seulement pendant ses mois, un par famille (« pour tomates », « pour fleurs »…).
 * Logique pure : l'écran garde les coches sur le téléphone.
 */
import { activityGroupSummary, potCareFor, type CalendarSubject } from "../plants/calendar";
import { getCatalogPlant, sowsIndoors, type CatalogPlant, type Month } from "../plants/catalog";
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { feedingFor } from "../plants/fertilizing";
import { nextPotFor, potLabel, potNeedFor, potSheetFor, smallestFit, type SoilKind } from "../plants/pot-sheet";
import { POT_LITERS, potSizeOf, type KnownPotSize } from "../plants/pot-size";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { anticipationMonths } from "./anticipate";
import { plantDisplayName, potHistory, type ResolvedPlant } from "./garden-logic";

export type ShoppingSection = "pots" | "soil" | "seeds" | "feed";

export const SECTION_TITLES: Record<ShoppingSection, string> = { pots: "Pots", soil: "Terre et terreau", seeds: "Semis", feed: "Engrais" };
const SECTION_ORDER: ShoppingSection[] = ["pots", "soil", "seeds", "feed"];

export type ShoppingItem = {
  /** Stable d'un jour à l'autre : la coche y reste attachée. */
  id: string;
  section: ShoppingSection;
  icon: string;
  title: string;
  detail: string;
  /** Les plantes du balcon concernées (pas les envies du printemps). */
  plantIds: string[];
  /** Pot noté « Je ne sais pas » : la plante dont il faut choisir la taille. */
  chooseSizeOf?: string;
};

export type ShoppingInput = {
  plants: ResolvedPlant[];
  events: MaintenanceEvent[];
  springWishes?: string[];
  now: Date;
  climate?: ClimateInfo | null;
  /** « Pas besoin cette année » (rempotage). */
  repotSkips?: Map<string, string>;
  /** Plantes au pot libre (saison finie) : plus d'engrais. */
  freePots?: Set<string>;
};

/** Les sacs du commerce, en litres. */
const SACKS = [10, 20, 40, 50];

/** « un sac de 40 L », « 2 sacs de 50 L ». */
export function sackText(liters: number) {
  const sack = SACKS.find((size) => liters <= size);
  if (sack) return `un sac de ${sack} L`;
  return `${Math.ceil(liters / 50)} sacs de 50 L`;
}

const SIZE_TITLES: Record<KnownPotSize, string> = { small: "Petit pot (jusqu’à 20 cm)", medium: "Pot moyen (21 à 30 cm)", large: "Grand pot (31 à 40 cm)", xlarge: "Très grand pot ou bac (plus de 40 cm)", planter: "Jardinière de 60 cm" };

/** Volume d'un pot rond aussi haut que large (l'inverse de roundPotWidthCm). */
const litersForWidth = (widthCm: number) => Math.round((0.707 * widthCm ** 3) / 1000);

type SoilLine = { id: string; title: string; detail: string };
const SOIL_LINES: Record<string, SoilLine> = {
  soil: { id: "soil", title: "Terreau", detail: "Un terreau neuf, sans tourbe si possible" },
  light: { id: "soil-light", title: "Terreau léger", detail: "Sans cailloux ni fumier" },
  compost: { id: "compost", title: "Compost", detail: "Un tiers, mêlé au terreau" },
  sand: { id: "sand", title: "Sable de rivière", detail: "Un tiers, mêlé au terreau" },
  acid: { id: "heath-soil", title: "Terre de bruyère", detail: "Une terre acide, sans calcaire" },
  citrus: { id: "citrus-soil", title: "Terreau pour agrumes", detail: "Drainant, un peu acide" },
  seed: { id: "seed-soil", title: "Terreau de semis", detail: "Un terreau fin, sans engrais" },
};

/** Comment se répartissent les litres d'un pot selon le terreau de la fiche. */
function soilShares(kind: SoilKind | undefined, liters: number): [keyof typeof SOIL_LINES, number][] {
  switch (kind) {
    case "rich": return [["soil", (liters * 2) / 3], ["compost", liters / 3]];
    case "draining": return [["soil", (liters * 2) / 3], ["sand", liters / 3]];
    case "light": return [["light", liters]];
    case "acid": return [["acid", liters]];
    case "citrus": return [["citrus", liters]];
    case "seed": return [["seed", liters]];
    default: return [["soil", liters]];
  }
}

/** La famille d'engrais d'une plante, pour n'acheter qu'un flacon par famille. */
type FeedFamily = "tomato" | "flowers" | "leaves" | "berries" | "citrus" | "acid" | "compost" | "general";
const FEED_TITLES: Record<FeedFamily, string> = {
  tomato: "Engrais organique pour tomates (riche en potasse)",
  flowers: "Engrais organique pour plantes fleuries",
  leaves: "Purin d’ortie ou engrais organique pour légumes",
  berries: "Engrais organique pour petits fruits",
  citrus: "Engrais organique pour agrumes",
  acid: "Engrais organique pour terre de bruyère",
  compost: "Compost bien mûr",
  general: "Engrais organique liquide (aux algues)",
};

export function feedFamily(entry: Pick<CatalogPlant, "category">, kind: string): FeedFamily {
  if (/bruyère/u.test(kind)) return "acid";
  if (/agrumes/u.test(kind)) return "citrus";
  // Du compost seul (pas « compost et engrais pour petits fruits »).
  if (/^(un peu de |une poignée de )?(compost|terreau)/u.test(kind) && !/engrais/u.test(kind)) return "compost";
  if (entry.category === "small-fruit" || entry.category === "fruit-tree" || /fraisier|petits fruits|fruitiers/u.test(kind)) return "berries";
  if (/tomate|potasse/u.test(kind)) return "tomato";
  if (/fleur/u.test(kind)) return "flowers";
  // « pauvre en azote », « pas trop azoté » : un engrais ordinaire, pas un engrais pour feuilles.
  if (/pauvre en azote|pas trop azoté/u.test(kind)) return "general";
  if (/ortie|azot|légumes/u.test(kind)) return "leaves";
  return "general";
}

type Need = { plantId?: string; name: string; entry: CatalogPlant };

/** Les mois regardés : ce mois-ci et ceux des 6 semaines qui viennent. */
export function shoppingMonths(now: Date): Month[] {
  return [(now.getMonth() + 1) as Month, ...anticipationMonths(now).map(({ month }) => month)];
}

export function shoppingList({ plants, events, springWishes = [], now, climate, repotSkips, freePots }: ShoppingInput): ShoppingItem[] {
  const months = shoppingMonths(now);
  const current = months[0];
  const pots = new Map<string, { title: string; detail: string; names: string[]; plantIds: string[]; chooseSizeOf?: string }>();
  const soil = new Map<string, { liters: number; names: Set<string> }>();
  const indoor: Need[] = [];
  const feeds = new Map<FeedFamily, { names: string[]; plantIds: string[] }>();

  const addPot = (key: string, title: string, need: Need, chooseSizeOf?: string) => {
    const pot = pots.get(key) ?? { title, detail: "Percé au fond", names: [], plantIds: [], chooseSizeOf };
    pot.names.push(need.name);
    if (need.plantId) pot.plantIds.push(need.plantId);
    pots.set(key, pot);
  };
  const addSoil = (need: Need, liters: number) => {
    for (const [line, amount] of soilShares(potSheetFor(need.entry.id)?.soil, liters)) {
      const entry = soil.get(line) ?? { liters: 0, names: new Set<string>() };
      entry.liters += amount;
      entry.names.add(need.name);
      soil.set(line, entry);
    }
  };

  /** Une plante pas encore en terre : un semis au chaud (godets) ou un pot et sa terre, si c'est pour bientôt. */
  const startNeeds = (need: Need, potSize: string | undefined) => {
    const entry = adaptToClimate(need.entry, climate);
    const month = months.find((candidate) => entry.sowMonths.includes(candidate) || entry.plantMonths.includes(candidate));
    if (!month) return;
    if (!entry.plantMonths.includes(month) && sowsIndoors(entry, month)) {
      indoor.push(need);
      // Les plants sortent au balcon dans les 6 semaines : leur pot aussi.
      if (!months.some((candidate) => entry.plantMonths.includes(candidate))) return;
    }
    // Taille pas notée : celle que conseille sa fiche, comme sur la fiche, le poids et l'arrosage (retour du 14/10) ;
    // plus grand qu'un grand pot : un bac de sa largeur.
    const fiche = potNeedFor(need.entry);
    const noted = potSizeOf({ potSize });
    if (noted === "unknown") {
      const guessed = smallestFit(fiche);
      // Même libellé que la fiche : « Pot conseillé : grand (31 à 40 cm) », avec « choisir la taille ».
      addPot(`guess-${guessed ?? fiche.widthCm}`, potLabel(need.entry, "unknown").text, need, need.plantId);
      addSoil(need, fiche.liters);
      return;
    }
    const size: KnownPotSize = noted;
    addPot(size, SIZE_TITLES[size], need);
    addSoil(need, POT_LITERS[size]);
  };

  for (const resolved of plants) {
    const { plant, entry } = resolved;
    const need: Need = { plantId: plant.id, name: plantDisplayName(resolved), entry };
    if (plant.toPlant) {
      startNeeds(need, plant.potSize);
      continue;
    }
    // Un rempotage annoncé (ce mois-ci s'il n'est pas déjà fait, ou dans les 6 semaines) : un pot plus grand.
    const history = potHistory(plant, events);
    const subject: CalendarSubject = { id: plant.id, entry, displayName: need.name, addedAt: plant.addedAt, ...history, repotSkippedUntil: repotSkips?.get(plant.id), potSize: plant.potSize };
    const repottedThisMonth = history.lastRepot !== undefined && new Date(history.lastRepot).getMonth() === now.getMonth() && new Date(history.lastRepot).getFullYear() === now.getFullYear();
    const repotSoon = months.some((month) => potCareFor(subject, entry, month, now) === "repot" && !(month === current && repottedThisMonth));
    if (repotSoon) {
      const next = nextPotFor(entry, subject.potSize, history.repots);
      addPot(`width-${next.widthCm}`, `Pot d’environ ${next.widthCm} cm de large`, need);
      addSoil(need, next.size ? POT_LITERS[next.size] : litersForWidth(next.widthCm));
    }
    // L'engrais de sa fiche, s'il sert maintenant ou dans les 6 semaines.
    const feeding = feedingFor(entry.id);
    if (feeding && !freePots?.has(plant.id) && feeding.months.some((month) => months.includes(month))) {
      const family = feedFamily(entry, feeding.kind);
      const line = feeds.get(family) ?? { names: [], plantIds: [] };
      line.names.push(need.name);
      line.plantIds.push(plant.id);
      feeds.set(family, line);
    }
  }
  // Les envies du printemps pas encore sur le balcon.
  const owned = new Set(plants.map(({ entry }) => entry.id));
  for (const id of springWishes) {
    const entry = getCatalogPlant(id);
    if (entry && !owned.has(id)) startNeeds({ name: entry.name, entry }, undefined);
  }

  const items: ShoppingItem[] = [];
  for (const [key, pot] of pots) {
    const count = pot.names.length;
    items.push({ id: `pot:${key}`, section: "pots", icon: "🪴", title: count > 1 ? `${count} × ${pot.title}` : pot.title, detail: `${pot.detail} · ${activityGroupSummary(pot.names)}`, plantIds: pot.plantIds, ...(pot.chooseSizeOf ? { chooseSizeOf: pot.chooseSizeOf } : {}) });
  }
  if (indoor.length > 0) {
    soil.set("seed", { liters: Math.max(soil.get("seed")?.liters ?? 0, 3 * indoor.length), names: new Set([...(soil.get("seed")?.names ?? []), ...indoor.map((need) => need.name)]) });
    items.push({ id: "seed-pots", section: "seeds", icon: "🌱", title: `Godets · une dizaine par semis`, detail: `Pour ${indoor.length > 1 ? `${indoor.length} semis au chaud` : "un semis au chaud"} · ${activityGroupSummary(indoor.map((need) => need.name))}`, plantIds: indoor.flatMap((need) => (need.plantId ? [need.plantId] : [])) });
  }
  for (const [line, { liters, names }] of soil) {
    const look = SOIL_LINES[line];
    const rounded = Math.max(1, Math.ceil(liters));
    const amount = line === "compost" || line === "sand" ? `≈ ${rounded} L` : `${rounded} L, ${sackText(rounded)}`;
    items.push({ id: look.id, section: line === "seed" ? "seeds" : "soil", icon: line === "seed" ? "🌱" : "🟫", title: `${look.title} · ${amount}`, detail: `${look.detail} · ${activityGroupSummary([...names])}`, plantIds: [] });
  }
  for (const [family, line] of feeds) {
    items.push({ id: `feed:${family}`, section: "feed", icon: "🌿", title: FEED_TITLES[family], detail: activityGroupSummary(line.names), plantIds: line.plantIds });
  }
  return items.sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));
}

/** Le texte à partager (SMS, WhatsApp) : par rubrique, ce qui est déjà pris coché. */
export function shoppingShareText(items: ShoppingItem[], checked: Set<string>) {
  const lines = ["Ma liste pour la jardinerie 🌿"];
  for (const section of SECTION_ORDER) {
    const inSection = items.filter((item) => item.section === section);
    if (inSection.length === 0) continue;
    lines.push("", SECTION_TITLES[section]);
    for (const item of inSection) lines.push(`${checked.has(item.id) ? "✓" : "☐"} ${item.title}`);
  }
  lines.push("", "Préparé avec Balco");
  return lines.join("\n");
}
