/**
 * Le geste « Engrais » : quelles plantes du catalogue en ont besoin, à quel rythme et quand. Les
 * aromatiques méditerranéennes, les capucines, la lavande, les radis ou les haricots s'en passent
 * très bien (ils fleurissent ou poussent moins bien quand on les nourrit trop) : ils n'ont rien.
 * Toujours un engrais organique, jamais de chimie de synthèse.
 */
import type { CareTask, Month } from "./catalog";

type Feeding = { everyDays: number; months: Month[]; product: string };

const FRUITS: Feeding = { everyDays: 14, months: [6, 7, 8, 9], product: "un engrais organique liquide pour tomates (ou du purin de consoude)" };
const LEAVES: Feeding = { everyDays: 21, months: [5, 6, 7, 8, 9], product: "un engrais organique liquide pour légumes (ou du purin d’ortie)" };
const FLOWERS: Feeding = { everyDays: 21, months: [6, 7, 8], product: "un engrais organique liquide pour fleurs" };
const BERRIES: Feeding = { everyDays: 30, months: [3, 4, 5, 6], product: "une poignée d’engrais organique pour petits fruits, griffé en surface" };

export const FERTILIZING: Record<string, Feeding> = {
  "cherry-tomato": FRUITS,
  "dwarf-tomato": FRUITS,
  chili: FRUITS,
  "sweet-pepper": FRUITS,
  eggplant: FRUITS,
  zucchini: FRUITS,
  "mini-cucumber": FRUITS,
  cucamelon: FRUITS,
  "mini-melon": FRUITS,
  physalis: FRUITS,
  tomatillo: FRUITS,
  okra: FRUITS,
  "west-indian-gherkin": FRUITS,
  chard: LEAVES,
  kale: LEAVES,
  "pak-choi": LEAVES,
  basil: { everyDays: 30, months: [6, 7, 8], product: "un engrais organique liquide pour aromatiques, à demi-dose" },
  lemongrass: { everyDays: 30, months: [5, 6, 7, 8], product: "un engrais organique liquide, à demi-dose" },
  "lemon-verbena": { everyDays: 30, months: [5, 6, 7, 8], product: "un engrais organique liquide, à demi-dose" },
  zinnia: FLOWERS,
  marigold: FLOWERS,
  "sweet-pea": FLOWERS,
  "dwarf-sunflower": FLOWERS,
  dahlia: FLOWERS,
  viola: { ...FLOWERS, months: [3, 4, 5] },
  strawberry: { ...BERRIES, months: [3, 4, 5, 6, 7] },
  "dwarf-raspberry": BERRIES,
  redcurrant: BERRIES,
  "dwarf-fig": BERRIES,
  blackcurrant: BERRIES,
  "thornless-blackberry": BERRIES,
  kiwiberry: { ...BERRIES, months: [3, 4, 5, 6, 7] },
  blueberry: { ...BERRIES, product: "un engrais organique pour terre de bruyère (le myrtillier n’aime pas le calcaire)" },
};

export function fertilizeTask(catalogId: string, label: string): CareTask | null {
  const feeding = FERTILIZING[catalogId];
  if (!feeding) return null;
  return {
    id: "feed",
    type: "fertilizing",
    title: `Aujourd’hui, nourris ${label} (engrais).`,
    instruction: `Mets ${feeding.product} dans l’arrosoir, sur une terre déjà humide, jamais sèche. Évite la veille d’une grosse pluie (tout serait lessivé) et les jours de canicule. À refaire dans ${feeding.everyDays} jours.`,
    minutes: 3,
    months: feeding.months,
    everyDays: feeding.everyDays,
    doneTitle: "Plante nourrie, bravo.",
    doneText: `Prochain engrais dans ${feeding.everyDays} jours : Balco te le rappellera.`,
  };
}
