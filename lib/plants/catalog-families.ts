/**
 * Les grandes familles du catalogue (retour du 24/10 : « la liste commence à être longue ») : l'écran « Ajouter une
 * plante » s'ouvre sur une tuile par famille, avec sa photo et son nombre de plantes ; on touche une tuile pour voir
 * sa liste, avec ses catégories en pastilles quand elle en a plusieurs. Logique pure.
 */
import { PLANT_CATALOG, type CatalogPlant, type PlantCategory } from "./catalog";

export type CatalogFamilyId = "potager" | "aromatic" | "flower" | "fruit" | "shrub" | "climber";

export type CatalogFamily = {
  id: CatalogFamilyId;
  label: string;
  categories: PlantCategory[];
  /** La plante dont la photo illustre la tuile. */
  cover: string;
};

export const CATALOG_FAMILIES: CatalogFamily[] = [
  { id: "potager", label: "Potager", categories: ["fruiting-vegetable", "leafy-vegetable", "root"], cover: "cherry-tomato" },
  { id: "aromatic", label: "Aromatiques", categories: ["aromatic"], cover: "basil" },
  { id: "flower", label: "Fleurs", categories: ["flower"], cover: "cosmos" },
  { id: "fruit", label: "Fruits", categories: ["small-fruit", "fruit-tree"], cover: "strawberry" },
  { id: "shrub", label: "Arbustes et feuillages", categories: ["shrub"], cover: "hydrangea" },
  { id: "climber", label: "Grimpantes", categories: ["climber"], cover: "clematis" },
];

export function catalogFamily(id: CatalogFamilyId) {
  return CATALOG_FAMILIES.find((family) => family.id === id)!;
}

export function familyOfCategory(category: PlantCategory): CatalogFamily {
  return CATALOG_FAMILIES.find((family) => family.categories.includes(category))!;
}

export function plantsOfFamily(id: CatalogFamilyId, catalog: CatalogPlant[] = PLANT_CATALOG) {
  const { categories } = catalogFamily(id);
  return catalog.filter((entry) => categories.includes(entry.category));
}

/** « 1 plante », « 17 plantes ». */
export function plantCountLabel(count: number) {
  return `${count} plante${count > 1 ? "s" : ""}`;
}
