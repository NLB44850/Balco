/**
 * Climat local du balcon, déduit de la position et de l'altitude, pour caler le calendrier.
 * Les mois du catalogue correspondent au climat tempéré du nord de la France (Paris) ;
 * le Midi plante plus tôt, la montagne plus tard. Repères indicatifs, pas de la météo.
 */
import type { CatalogPlant, Month } from "./catalog";

export type ClimateZone = "mediterranean" | "oceanic" | "temperate" | "continental" | "mountain";

export type ClimateInfo = {
  zone: ClimateZone;
  label: string;
  /** Période habituelle des dernières gelées de printemps. */
  lastFrost: string;
  /** Décalage des semis et plantations des plantes frileuses, en mois (négatif = plus tôt). */
  springShift: number;
  /** Position hors de France métropolitaine : le calendrier reste calé sur la France. */
  outsideFrance: boolean;
};

const ZONES: Record<ClimateZone, Omit<ClimateInfo, "zone" | "outsideFrance">> = {
  mediterranean: { label: "méditerranéen", lastFrost: "mi-mars", springShift: -1 },
  oceanic: { label: "océanique", lastFrost: "début avril", springShift: 0 },
  temperate: { label: "tempéré", lastFrost: "mi-avril", springShift: 0 },
  continental: { label: "continental", lastFrost: "mi-mai (saints de glace)", springShift: 0 },
  mountain: { label: "de montagne", lastFrost: "fin mai à début juin", springShift: 1 },
};

const MOUNTAIN_ELEVATION_M = 800;

function inMetropolitanFrance(latitude: number, longitude: number) {
  return latitude >= 41 && latitude <= 51.2 && longitude >= -5.3 && longitude <= 9.7;
}

export function climateZoneFor(latitude: number, longitude: number, elevationM?: number): ClimateInfo {
  const outsideFrance = !inMetropolitanFrance(latitude, longitude);
  let zone: ClimateZone = "temperate";
  if (!outsideFrance) {
    if (elevationM !== undefined && elevationM >= MOUNTAIN_ELEVATION_M) zone = "mountain";
    // Pourtour méditerranéen (Roussillon, Languedoc, Provence, Côte d'Azur) et Corse.
    else if ((latitude < 44.3 && longitude > 2.6) || (latitude < 43.2 && longitude > 8.4)) zone = "mediterranean";
    // Façade atlantique et Sud-Ouest.
    else if (longitude < -0.8 || (latitude < 46.3 && longitude < 1.2) || (latitude < 44.5 && longitude < 2.5)) zone = "oceanic";
    // Nord-Est (Alsace, Lorraine, Champagne orientale) et vallées de l'Est.
    else if ((longitude > 5.2 && latitude > 45.6) || (latitude > 48.3 && longitude > 4.5)) zone = "continental";
  }
  return { zone, outsideFrance, ...ZONES[zone] };
}

const SPRING_MONTHS = new Set([2, 3, 4, 5, 6]);

function shiftMonths(months: Month[], shift: number): Month[] {
  const shifted = months.map((month) => (SPRING_MONTHS.has(month) ? Math.min(12, Math.max(1, month + shift)) : month));
  return Array.from(new Set(shifted)).sort((a, b) => a - b) as Month[];
}

/** Les dates d'une plante adaptées au climat : seules les plantes frileuses bougent, et seulement au printemps. */
export function adaptToClimate(entry: CatalogPlant, climate: ClimateInfo | null | undefined): CatalogPlant {
  if (!climate || climate.springShift === 0 || !entry.care.frostSensitive) return entry;
  return { ...entry, sowMonths: shiftMonths(entry.sowMonths, climate.springShift), plantMonths: shiftMonths(entry.plantMonths, climate.springShift) };
}

/** Phrase courte pour la carte climat du calendrier. */
export function climateSummary(climate: ClimateInfo) {
  if (climate.outsideFrance) return "Hors de France : dates calées sur un climat tempéré français.";
  const shift =
    climate.springShift < 0 ? " Semis et plantations frileuses : un mois plus tôt." : climate.springShift > 0 ? " Semis et plantations frileuses : un mois plus tard." : "";
  return `Climat ${climate.label} · dernières gelées vers ${climate.lastFrost}.${shift}`;
}
