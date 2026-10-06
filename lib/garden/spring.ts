/**
 * « Tes envies pour le printemps » : les plantes choisies l'hiver dans l'accueil, gardées dans les réponses
 * (`springWishes`) ; en mars, une carte sur Aujourd'hui (et une notification le 1er mars à 9 h) rappelle
 * que c'est le moment. Logique pure.
 */
import { getCatalogPlant, type CatalogPlant } from "../plants/catalog";

/** Le prochain 1er mars à 9 h (celui de cette année s'il n'est pas passé). */
export function nextSpringReminder(now: Date) {
  const thisYear = new Date(now.getFullYear(), 2, 1, 9, 0);
  return thisYear.getTime() > now.getTime() ? thisYear : new Date(now.getFullYear() + 1, 2, 1, 9, 0);
}

/** La carte de mars et avril : les envies pas encore sur le balcon ; rien le reste de l'année. */
export function springCard(wishes: string[] | undefined, ownedCatalogIds: string[], now: Date): CatalogPlant[] {
  const month = now.getMonth() + 1;
  if (!wishes?.length || month < 3 || month > 4) return [];
  const owned = new Set(ownedCatalogIds);
  return wishes.filter((id) => !owned.has(id)).map((id) => getCatalogPlant(id)).filter((entry): entry is CatalogPlant => Boolean(entry));
}

/** « Basilic, tomates cerises et menthe » pour la notification. */
export function wishNames(entries: CatalogPlant[]) {
  const names = entries.map((entry, index) => (index === 0 ? entry.name : entry.name.toLowerCase()));
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}

/** Source de la notification du 1er mars (une seule à la fois). */
export const SPRING_REMINDER_SOURCE = "balco-spring-wishes";
