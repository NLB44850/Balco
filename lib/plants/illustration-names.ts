/** Les illustrations du pas-à-pas : leurs noms (sans dessin), utilisables partout, même dans les tests. */
export type IllustrationId =
  | "pot-holes"
  | "clay-balls"
  | "fill-soil"
  | "finger-hole"
  | "drop-seeds"
  | "scatter-seeds"
  | "cover-seeds"
  | "fine-water"
  | "cells"
  | "cover-bag"
  | "windowsill"
  | "sprouts"
  | "dig-hole"
  | "unpot"
  | "place-plant"
  | "firm-soil"
  | "water-well"
  | "bulb"
  | "big-pot"
  | "thin"
  | "pinch"
  | "harden-off"
  | "roots-out"
  | "loosen-roots"
  | "scrape-top"
  | "two-shoots";

/** Le nom de chaque dessin, pour l'écran de revue et l'accessibilité. */
export const ILLUSTRATION_LABELS: Record<IllustrationId, string> = {
  "pot-holes": "Un pot percé, sur sa soucoupe",
  "clay-balls": "Des billes d’argile au fond du pot",
  "fill-soil": "Le terreau versé dans le pot",
  "finger-hole": "Un doigt fait un petit trou",
  "drop-seeds": "Des graines tombent dans les trous",
  "scatter-seeds": "Des graines semées serrées",
  "cover-seeds": "Un peu de terre sur les graines",
  "fine-water": "Une pluie fine d’arrosoir",
  cells: "Des godets en rang",
  "cover-bag": "Un sac transparent sur le pot",
  windowsill: "Le pot près d’une fenêtre, au chaud",
  sprouts: "Les pousses sortent",
  "dig-hole": "Un trou de la taille de la motte",
  unpot: "La motte sort du godet",
  "place-plant": "Le plant posé dans le trou",
  "firm-soil": "Deux mains tassent la terre",
  "water-well": "On arrose au pied",
  bulb: "Un bulbe, pointe vers le haut",
  "big-pot": "Un arbuste dans un grand pot",
  thin: "Des ciseaux coupent une pousse en trop",
  pinch: "Des doigts pincent le bout de la tige",
  "harden-off": "Le plant à l’ombre légère, dehors",
  "roots-out": "Des racines sortent sous le pot",
  "loosen-roots": "Des doigts démêlent les racines de la motte",
  "scrape-top": "Une fourchette gratte la terre du dessus",
  "two-shoots": "Deux tiges repartent sous la coupe",
};

export const ILLUSTRATION_IDS = Object.keys(ILLUSTRATION_LABELS) as IllustrationId[];
