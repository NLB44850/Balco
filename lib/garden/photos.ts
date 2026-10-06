/**
 * Les photos de tes plantes : le journal photo de chaque plante (la plus récente sert de
 * couverture sur Balcon et sur la fiche), mêlé à l'historique des gestes. Logique pure.
 * Les photos restent sur l'appareil ; seul l'emplacement du fichier est enregistré ici.
 */
import { SUNLIGHT_LABELS, type CatalogPlant, type Sunlight } from "../plants/catalog";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { dayKey, daysBetween, eventsForPlant, historyDayLabel, relativeDay, type ResolvedPlant } from "./garden-logic";

export type PlantPhoto = {
  id: string;
  plantId: string;
  takenAt: string;
  /** Nom du fichier sur le téléphone, ou l'image elle-même (data:) dans l'app web. */
  source: string;
  /** D'où vient la photo : prise pour la fiche, ou envoyée à Nora pour un diagnostic. */
  origin?: "journal" | "scanner";
};

/** Au-delà, les plus anciennes photos d'une plante laissent la place aux nouvelles. */
export const MAX_PHOTOS_PER_PLANT = 24;

export function photoId(plantId: string, now = new Date()) {
  return `${plantId}-photo-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Les photos d'une plante, de la plus récente à la plus ancienne. */
export function photosForPlant(photos: PlantPhoto[], plantId: string) {
  return photos.filter((photo) => photo.plantId === plantId).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

/** La photo de couverture de chaque plante : sa plus récente. */
export function coverPhotos(photos: PlantPhoto[]) {
  const covers = new Map<string, PlantPhoto>();
  for (const photo of photos) {
    const current = covers.get(photo.plantId);
    if (!current || photo.takenAt > current.takenAt) covers.set(photo.plantId, photo);
  }
  return covers;
}

/** Ajoute une photo ; renvoie aussi celles qui ont dû partir (pour effacer leur fichier). */
export function addPhoto(photos: PlantPhoto[], photo: PlantPhoto, max = MAX_PHOTOS_PER_PLANT) {
  const next = [photo, ...photos.filter((existing) => existing.id !== photo.id)];
  const dropped = photosForPlant(next, photo.plantId).slice(max);
  const droppedIds = new Set(dropped.map((item) => item.id));
  return { photos: next.filter((item) => !droppedIds.has(item.id)), dropped };
}

/** Les photos des plantes qui ne sont plus sur le balcon. */
export function orphanPhotos(photos: PlantPhoto[], plantIds: Iterable<string>) {
  const keep = new Set(plantIds);
  return photos.filter((photo) => !keep.has(photo.plantId));
}

/** « Ta photo d’aujourd’hui », « Ta photo d’hier », « Ta photo · il y a 3 jours », « Ta photo du 12 sept. ». */
export function photoDateLabel(takenAt: string, now = new Date()) {
  const date = new Date(takenAt);
  const days = daysBetween(date, now);
  if (days <= 0) return "Ta photo d’aujourd’hui";
  if (days === 1) return "Ta photo d’hier";
  if (days < 30) return `Ta photo · ${relativeDay(date, now)}`;
  return `Ta photo du ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }) })}`;
}

/** Depuis combien de temps la plante est sur le balcon : « Depuis aujourd’hui », « Depuis 12 jours », « Depuis 3 mois »… */
export function growingSince(addedAt: string, now = new Date()) {
  const days = Math.max(0, daysBetween(new Date(addedAt), now));
  if (days === 0) return "Depuis aujourd’hui";
  if (days < 21) return `Depuis ${days} jour${days > 1 ? "s" : ""}`;
  if (days < 60) return `Depuis ${Math.round(days / 7)} semaines`;
  if (days < 365) return `Depuis ${Math.round(days / 30.4)} mois`;
  const years = Math.floor(days / 365);
  return `Depuis ${years} an${years > 1 ? "s" : ""}`;
}

/** « Soleil », « Soleil ou mi-ombre »… : ce que la plante aime, en une pastille. */
export function sunlightLabel(entry: CatalogPlant) {
  const order: Sunlight[] = ["sunny", "partial", "shade"];
  const labels = order.filter((value) => entry.sunlight.includes(value)).map((value) => SUNLIGHT_LABELS[value]);
  if (labels.length === 0 || labels.length === order.length) return "Toute exposition";
  return [labels[0], ...labels.slice(1).map((label) => label.toLowerCase())].join(" ou ");
}

export type JournalDay = { key: string; label: string; events: MaintenanceEvent[]; photos: PlantPhoto[] };

/** L'historique d'une plante jour par jour : photos et gestes, du plus récent au plus ancien. */
export function journalByDay(events: MaintenanceEvent[], photos: PlantPhoto[], plantId: string, now = new Date()): JournalDay[] {
  const days = new Map<string, JournalDay>();
  const dayFor = (date: Date) => {
    const key = dayKey(date);
    let day = days.get(key);
    if (!day) {
      day = { key, label: historyDayLabel(date, now), events: [], photos: [] };
      days.set(key, day);
    }
    return day;
  };
  for (const event of eventsForPlant(events, plantId)) dayFor(new Date(event.completedAt)).events.push(event);
  for (const photo of photosForPlant(photos, plantId)) dayFor(new Date(photo.takenAt)).photos.push(photo);
  return [...days.values()].sort((a, b) => b.key.localeCompare(a.key));
}
