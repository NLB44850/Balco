/**
 * « Ma semaine » : le bilan de la semaine en cours (du lundi au dimanche) — les jours où tu as
 * pris soin du balcon, tes gestes, tes récoltes, tes photos, et la comparaison avec la semaine
 * d'avant. Logique pure.
 */
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { dayKey, plantDisplayName, streakDays, type ResolvedPlant } from "./garden-logic";
import type { PlantPhoto } from "./photos";
import { upcomingHarvests, waterSaved, type UpcomingHarvest } from "./progress";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export type WeekDay = { key: string; letter: string; gestures: number; today: boolean; future: boolean };
export type WeekPlant = { resolved: ResolvedPlant; gestures: number; photos: number };

export type WeekSummary = {
  /** Du lundi au dimanche. */
  days: WeekDay[];
  gestures: number;
  previousGestures: number;
  activeDays: number;
  harvests: number;
  photos: number;
  /** Conseils météo suivis (gestes notés depuis une alerte ou un rappel). */
  weatherTips: number;
  streak: number;
  /** Arrosages évités grâce à la pluie cette semaine, et l'eau ainsi économisée. */
  avoidedWaterings: number;
  waterSavedLiters: number;
  /** À récolter ce mois-ci, ou dès le mois prochain. */
  upcoming: UpcomingHarvest[];
  /** Tes plantes, de la plus soignée à la moins soignée cette semaine. */
  plants: WeekPlant[];
  title: string;
  message: string;
};

/** Le lundi de la semaine, à minuit. */
export function startOfWeek(now: Date) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function inRange(iso: string, from: Date, to: Date) {
  const time = new Date(iso).getTime();
  return time >= from.getTime() && time < to.getTime();
}

export function weekSummary(plants: ResolvedPlant[], events: MaintenanceEvent[], photos: PlantPhoto[], now = new Date()): WeekSummary {
  const plantIds = new Set(plants.map(({ plant }) => plant.id));
  const own = events.filter((event) => plantIds.has(event.plantId));
  const monday = startOfWeek(now);
  const nextMonday = addDays(monday, 7);
  const previousMonday = addDays(monday, -7);
  const thisWeek = own.filter((event) => inRange(event.completedAt, monday, nextMonday));
  const weekPhotos = photos.filter((photo) => plantIds.has(photo.plantId) && inRange(photo.takenAt, monday, nextMonday));
  const todayKey = dayKey(now);

  const perDay = new Map<string, number>();
  for (const event of thisWeek) {
    const key = dayKey(new Date(event.completedAt));
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const days = DAY_LETTERS.map((letter, index) => {
    const date = addDays(monday, index);
    const key = dayKey(date);
    return { key, letter, gestures: perDay.get(key) ?? 0, today: key === todayKey, future: key > todayKey };
  });

  const weekPlants = plants
    .map((resolved) => ({
      resolved,
      gestures: thisWeek.filter((event) => event.plantId === resolved.plant.id).length,
      photos: weekPhotos.filter((photo) => photo.plantId === resolved.plant.id).length,
    }))
    .sort((a, b) => b.gestures - a.gestures || b.photos - a.photos);

  const gestures = thisWeek.length;
  const previousGestures = own.filter((event) => inRange(event.completedAt, previousMonday, monday)).length;
  const activeDays = days.filter((day) => day.gestures > 0).length;
  const water = waterSaved(plants, own, monday, nextMonday);
  const { title, message } = weekWords({ gestures, previousGestures, activeDays, top: weekPlants[0], plantCount: plants.length });

  return {
    days,
    gestures,
    previousGestures,
    activeDays,
    harvests: thisWeek.filter((event) => event.type === "harvest").length,
    photos: weekPhotos.length,
    weatherTips: thisWeek.filter((event) => event.source === "reminder").length,
    streak: streakDays(own, now),
    avoidedWaterings: water.avoided,
    waterSavedLiters: water.liters,
    upcoming: upcomingHarvests(plants, now),
    plants: weekPlants,
    title,
    message,
  };
}

/** Le titre et la phrase du bilan : toujours encourageants, jamais culpabilisants. */
function weekWords({ gestures, previousGestures, activeDays, top, plantCount }: { gestures: number; previousGestures: number; activeDays: number; top?: WeekPlant; plantCount: number }) {
  if (plantCount === 0) return { title: "Ta semaine commence ici", message: "Ajoute une plante : Balco te dira chaque jour le geste utile." };
  if (gestures === 0) return { title: "Une semaine tranquille", message: "Rien de noté pour l’instant. Un geste de deux minutes suffit pour lancer la semaine." };
  const favorite = top && top.gestures > 0 ? ` ${plantDisplayName(top.resolved)} a eu le plus de soins.` : "";
  const title = activeDays >= 5 ? "Une semaine au top" : gestures > previousGestures && previousGestures > 0 ? "Tu fais mieux que la semaine dernière" : "Ton balcon te dit merci";
  const count = `${gestures} geste${gestures > 1 ? "s" : ""} sur ${activeDays} jour${activeDays > 1 ? "s" : ""}.`;
  return { title, message: `${count}${favorite}` };
}

/** « +3 par rapport à la semaine dernière », « comme la semaine dernière »… */
export function comparedToLastWeek(summary: Pick<WeekSummary, "gestures" | "previousGestures">) {
  const difference = summary.gestures - summary.previousGestures;
  if (summary.previousGestures === 0) return summary.gestures > 0 ? "Première semaine notée" : "";
  if (difference === 0) return "Comme la semaine dernière";
  return `${difference > 0 ? "+" : "−"}${Math.abs(difference)} par rapport à la semaine dernière`;
}
