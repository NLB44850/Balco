/**
 * La famille botanique de chaque plante du catalogue (chantier « Pots et balcon », étape 8) : pour ne pas remettre la
 * même famille dans un pot qui vient de se libérer (mêmes maladies et mêmes ravageurs dans la terre). Règle et sources
 * dans docs/sources-rotation.md. Micro-pousses : mélange de graines, pas de famille.
 */
export type PlantFamily =
  | "solanaceae"
  | "cucurbitaceae"
  | "fabaceae"
  | "brassicaceae"
  | "apiaceae"
  | "asteraceae"
  | "amaranthaceae"
  | "alliaceae"
  | "lamiaceae"
  | "rosaceae"
  | "boraginaceae"
  | "verbenaceae"
  | "convolvulaceae"
  | "polygonaceae"
  | "other";

/** Le nom dit simplement, d'après une plante que tout le monde connaît. */
export const FAMILY_NAMES: Record<PlantFamily, string> = {
  solanaceae: "la famille de la tomate",
  cucurbitaceae: "la famille de la courgette",
  fabaceae: "la famille des haricots et des pois",
  brassicaceae: "la famille du chou",
  apiaceae: "la famille de la carotte",
  asteraceae: "la famille de la laitue",
  amaranthaceae: "la famille de l’épinard",
  alliaceae: "la famille de l’oignon",
  lamiaceae: "la famille de la menthe",
  rosaceae: "la famille du fraisier",
  boraginaceae: "la famille de la bourrache",
  verbenaceae: "la famille de la verveine",
  convolvulaceae: "la famille du liseron",
  polygonaceae: "la famille de l’oseille",
  other: "",
};

const BY_FAMILY: Record<Exclude<PlantFamily, "other">, string[]> = {
  solanaceae: ["cherry-tomato", "dwarf-tomato", "chili", "eggplant", "sweet-pepper", "physalis", "tomatillo", "potato"],
  cucurbitaceae: ["zucchini", "mini-cucumber", "cucamelon", "mini-melon", "west-indian-gherkin", "kuri-squash"],
  fabaceae: ["dwarf-bean", "pole-bean", "yardlong-bean", "pea", "sweet-pea", "fava-bean"],
  brassicaceae: ["arugula", "kale", "garden-cress", "pak-choi", "mizuna", "mustard-greens", "kohlrabi", "radish", "turnip", "sweet-alyssum"],
  apiaceae: ["parsley", "coriander", "dill", "chervil", "lovage", "round-carrot", "florence-fennel"],
  asteraceae: ["cut-lettuce", "head-lettuce", "tarragon", "stevia", "calendula", "cosmos", "marigold", "dwarf-sunflower", "zinnia", "cornflower", "dahlia", "artichoke"],
  amaranthaceae: ["spinach", "chard", "beetroot", "strawberry-spinach", "orach"],
  alliaceae: ["chives", "wild-garlic", "spring-onion", "garlic", "perpetual-leek"],
  lamiaceae: ["basil", "mint", "thyme", "rosemary", "sage", "oregano", "lemon-balm", "savory", "shiso", "hyssop", "agastache", "pineapple-sage", "lavender", "crosne"],
  rosaceae: ["strawberry", "woodland-strawberry", "dwarf-raspberry", "thornless-blackberry", "columnar-apple", "dwarf-peach", "dwarf-cherry", "rose-bush", "dwarf-apricot", "dwarf-plum", "columnar-pear", "loquat"],
  boraginaceae: ["borage", "phacelia", "oyster-plant"],
  verbenaceae: ["lemon-verbena", "tall-verbena"],
  convolvulaceae: ["morning-glory", "sweet-potato"],
  polygonaceae: ["sorrel", "rhubarb"],
};

const FAMILY_OF = new Map<string, PlantFamily>(Object.entries(BY_FAMILY).flatMap(([family, ids]) => ids.map((id) => [id, family as PlantFamily] as const)));

/** La famille de la plante ; « other » quand elle est seule de sa famille dans le catalogue (ou un mélange). */
export function familyOf(catalogId: string): PlantFamily {
  return FAMILY_OF.get(catalogId) ?? "other";
}

/** Deux plantes de la même famille (qui compte pour la rotation). */
export function sameFamily(a: string, b: string) {
  const family = familyOf(a);
  return family !== "other" && family === familyOf(b);
}
