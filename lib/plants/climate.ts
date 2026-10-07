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
  /** Leur mois (repère pour dire « gelées possibles jusqu'à… » ou « plus de gel avant l'automne »). */
  lastFrostMonth: number;
  /** Période habituelle des premières gelées d'automne, et leur mois. */
  firstFrost: string;
  firstFrostMonth: number;
  /** Décalage des semis et plantations des plantes frileuses, en mois (négatif = plus tôt). */
  springShift: number;
  /** Position hors de France métropolitaine : le calendrier reste calé sur la France. */
  outsideFrance: boolean;
};

const ZONES: Record<ClimateZone, Omit<ClimateInfo, "zone" | "outsideFrance">> = {
  mediterranean: { label: "méditerranéen", lastFrost: "mi-mars", lastFrostMonth: 3, firstFrost: "décembre, et elles restent rares", firstFrostMonth: 12, springShift: -1 },
  oceanic: { label: "océanique", lastFrost: "début avril", lastFrostMonth: 4, firstFrost: "fin novembre", firstFrostMonth: 11, springShift: 0 },
  temperate: { label: "tempéré", lastFrost: "mi-avril", lastFrostMonth: 4, firstFrost: "mi-novembre", firstFrostMonth: 11, springShift: 0 },
  continental: { label: "continental", lastFrost: "mi-mai (saints de glace)", lastFrostMonth: 5, firstFrost: "fin octobre", firstFrostMonth: 10, springShift: 0 },
  mountain: { label: "de montagne", lastFrost: "fin mai à début juin", lastFrostMonth: 6, firstFrost: "début octobre", firstFrostMonth: 10, springShift: 1 },
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
  return {
    ...entry,
    sowMonths: shiftMonths(entry.sowMonths, climate.springShift),
    indoorSowMonths: shiftMonths(entry.indoorSowMonths, climate.springShift),
    plantMonths: shiftMonths(entry.plantMonths, climate.springShift),
  };
}

/**
 * Le repère de gel qui compte maintenant : à l'automne les premières gelées, en hiver et au printemps jusqu'à
 * quand il peut geler, l'été rien à craindre. Ex. en octobre à Nantes : « premières gelées vers fin novembre ».
 */
export function frostNote(climate: Pick<ClimateInfo, "lastFrost" | "lastFrostMonth" | "firstFrost" | "firstFrostMonth">, month: number) {
  if (month >= 8 && month <= climate.firstFrostMonth) return `premières gelées vers ${climate.firstFrost}`;
  if (month > climate.lastFrostMonth && month < 8) return "plus de gel à craindre avant l’automne";
  return `gelées possibles jusqu’à ${climate.lastFrost}`;
}

/** Phrase courte pour la carte climat du calendrier, selon le mois. */
export function climateSummary(climate: ClimateInfo, now = new Date()) {
  if (climate.outsideFrance) return "Hors de France : dates calées sur un climat tempéré français.";
  const shift =
    climate.springShift < 0 ? " Semis et plantations frileuses : un mois plus tôt." : climate.springShift > 0 ? " Semis et plantations frileuses : un mois plus tard." : "";
  return `Climat ${climate.label} · ${frostNote(climate, now.getMonth() + 1)}.${shift}`;
}
