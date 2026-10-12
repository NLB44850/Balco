/**
 * Simulateur de soleil (chantier « Pots et balcon », étape 3) : combien d'heures de soleil direct reçoit un balcon,
 * d'après son orientation, la latitude de la ville et la date, sans aucun service extérieur. Position du soleil
 * calculée par les formules astronomiques simplifiées (déclinaison, angle horaire), en heure solaire.
 * Plein soleil : 6 h ou plus ; mi-ombre : 3 à 6 h ; ombre : moins de 3 h (repères des fiches de culture).
 */

export type Orientation = "S" | "E" | "W" | "N";
export type SunDetails = { orientation: Orientation; latitude: number; /** Balcon au-dessus, auvent. */ covered?: boolean; /** Immeuble ou arbre en face. */ facing?: boolean };
export type SunClass = "sunny" | "partial" | "shade";

/** Direction vers laquelle regarde le balcon, en degrés depuis le nord (sens des aiguilles d'une montre). */
const AZIMUTH: Record<Orientation, number> = { N: 0, E: 90, S: 180, W: 270 };
/** Sous cette hauteur, le soleil est caché par les toits et les rambardes alentour. */
const HORIZON_DEG = 10;
/** Un immeuble ou un arbre en face cache le soleil plus bas que cela. */
const FACING_DEG = 25;
/** Couvert : plus haut que cela, le soleil ne passe plus sous le balcon du dessus jusqu'aux pots. */
const COVERED_DEG = 55;
/** Le soleil doit être devant le balcon, pas en rasant la façade (moins de 75° de part et d’autre). */
const MAX_SIDE_DEG = 75;
/** La saison de culture : on fait la moyenne du 15 de chaque mois, d'avril à septembre. */
const SEASON_MONTHS = [4, 5, 6, 7, 8, 9];

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (value: number) => (value * 180) / Math.PI;

function dayOfYear(date: Date) {
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000);
}

/** Hauteur et direction du soleil à une heure solaire donnée (12 = midi au soleil). */
export function sunPosition(latitude: number, date: Date, solarHour: number): { altitude: number; azimuth: number } {
  const declination = rad(23.44) * Math.sin(rad((360 / 365) * (dayOfYear(date) - 81)));
  const hourAngle = rad(15 * (solarHour - 12));
  const lat = rad(latitude);
  const sinAlt = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // Direction depuis le nord : le matin à l'est (< 180°), l'après-midi à l'ouest (> 180°).
  const cosAz = (Math.sin(declination) - Math.sin(altitude) * Math.sin(lat)) / (Math.cos(altitude) * Math.cos(lat));
  const azimuth = deg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  return { altitude: deg(altitude), azimuth: solarHour <= 12 ? azimuth : 360 - azimuth };
}

/** Heures de soleil direct sur le balcon ce jour-là, au quart d'heure près. */
export function sunHoursOn(details: SunDetails, date: Date): number {
  const facing = AZIMUTH[details.orientation];
  const minAltitude = details.facing ? FACING_DEG : HORIZON_DEG;
  const maxAltitude = details.covered ? COVERED_DEG : 90;
  const step = 0.25;
  let hours = 0;
  for (let hour = 0; hour < 24; hour += step) {
    const { altitude, azimuth } = sunPosition(details.latitude, date, hour + step / 2);
    const side = Math.abs(((azimuth - facing + 540) % 360) - 180);
    if (altitude >= minAltitude && altitude <= maxAltitude && side <= MAX_SIDE_DEG) hours += step;
  }
  return hours;
}

/** Moyenne par jour d'avril à septembre, arrondie à la demi-heure : c'est elle qui classe le balcon. */
export function seasonSunHours(details: SunDetails, year = 2026): number {
  const total = SEASON_MONTHS.reduce((sum, month) => sum + sunHoursOn(details, new Date(year, month - 1, 15)), 0);
  return Math.round((total / SEASON_MONTHS.length) * 2) / 2;
}

export function sunClass(hours: number): SunClass {
  return hours >= 6 ? "sunny" : hours >= 3 ? "partial" : "shade";
}

export const SUN_CLASS_LABELS: Record<SunClass, string> = { sunny: "plein soleil", partial: "mi-ombre", shade: "ombre" };

/** « Environ 5 h de soleil par jour d'avril à septembre : mi-ombre. » */
export function sunSummary(hours: number) {
  const value = String(hours).replace(".5", " h 30").replace(/^(\d+)$/u, "$1 h");
  return `Environ ${value} de soleil par jour, d’avril à septembre : ${SUN_CLASS_LABELS[sunClass(hours)]}.`;
}

/** Les orientations du choix, dans l'accueil et dans Réglages. */
export const ORIENTATION_OPTIONS: ReadonlyArray<{ id: Orientation; icon: string; title: string; text: string }> = [
  { id: "S", icon: "☀️", title: "Plein sud", text: "Le soleil passe devant toi presque toute la journée." },
  { id: "E", icon: "🌅", title: "À l’est", text: "Le soleil du matin." },
  { id: "W", icon: "🌇", title: "À l’ouest", text: "Le soleil de l’après-midi et du soir." },
  { id: "N", icon: "🌥️", title: "Au nord", text: "Peu de soleil direct." },
];

export function isOrientation(value: unknown): value is Orientation {
  return value === "S" || value === "E" || value === "W" || value === "N";
}

/** La latitude par défaut (Paris) tant que la ville n'est pas connue. */
export const DEFAULT_LATITUDE = 48.85;
