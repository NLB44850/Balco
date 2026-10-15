/**
 * Le coach d'arrosage Balco+ (chantier « Pots et balcon », étape 6b) : plante par plante, ce qui reste d'eau dans le pot
 * et la quantité à verser, d'après la chaleur du jour, le vent, le soleil du balcon, le volume du pot et la soif de la
 * plante. Sans service extérieur : l'évaporation du jour est estimée par la formule de Hargreaves (FAO-56) à partir des
 * températures et de la latitude, déjà dans la météo. Les paramètres sont des estimations Balco, notées dans
 * docs/sources-pots.md. Logique pure, partagée par l'app et, plus tard, le serveur.
 */
import { sunHoursOn, type Orientation } from "../garden/sun";
import type { CatalogPlant } from "./catalog";
import { potNeedFor, POT_SHAPES } from "./pot-sheet";
import { POT_LITERS, type PotSize } from "./pot-size";

/** Part du volume du pot que la plante peut boire (eau utile d'un terreau). */
export const AVAILABLE_WATER_SHARE = 0.25;
/** On arrose quand la moitié de cette eau est partie. */
export const ALLOWED_DEPLETION = 0.5;
/**
 * Un pot sèche aussi par ses côtés et chauffe au soleil, d'autant plus qu'il est petit : bien plus qu'un sol en pleine
 * terre. Calé pour retrouver, un jour d'été ordinaire (26 °C à Paris, plein sud), le rythme de la version gratuite
 * (basilic : petit pot chaque jour, pot moyen toutes les 36 h, grand pot tous les 2 jours).
 */
export const CONTAINER_FACTOR: Record<PotSize, number> = { small: 3.5, medium: 3, large: 2.6, xlarge: 2.6, planter: 3, unknown: 3 };

export type CoachWeather = { latitude: number; today: { temperatureMinC: number; temperatureMaxC: number; precipitationMm: number; windGustKmhMax: number } };
export type CoachBalcony = { orientation?: Orientation; covered?: boolean; facing?: boolean };

export type CoachAdvice = {
  /** À arroser aujourd'hui. */
  due: boolean;
  /** Quantité arrondie au demi-litre (« environ 1,5 L »). */
  liters: number;
  /** Part de l'eau utile qui reste dans le pot (0 à 1). */
  remaining: number;
  /** Jours avant le prochain arrosage (0 : aujourd'hui). */
  nextInDays: number;
  /** Rythme estimé à la météo du jour, en heures (pour les rappels). */
  intervalHours: number;
  /** Litres perdus par jour. */
  dailyLoss: number;
};

/** Rayonnement extraterrestre du jour, en mm d'eau évaporable (FAO-56, équation 21). */
export function extraterrestrialMm(latitude: number, date: Date) {
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000);
  const phi = (latitude * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * day) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * day) / 365 - 1.39);
  const omega = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (omega * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(omega));
  return Math.max(0, ra * 0.408);
}

/** Évaporation de référence du jour en mm (Hargreaves). */
export function referenceEvaporationMm(weather: CoachWeather, date: Date) {
  const { temperatureMinC: min, temperatureMaxC: max } = weather.today;
  return Math.max(0, 0.0023 * ((min + max) / 2 + 17.8) * Math.sqrt(Math.max(0, max - min)) * extraterrestrialMm(weather.latitude, date));
}

/** La soif de la plante d'après son rythme d'arrosage de base (36 h : assoiffée, 96 h : sobre). */
export function thirstFactor(entry: Pick<CatalogPlant, "care">) {
  return Math.max(0.4, Math.min(1.2, 40 / entry.care.wateringIntervalHours));
}

/** Le soleil du balcon : un balcon au nord sèche moins qu'un plein sud ; orientation inconnue, entre les deux. */
export function sunFactor(balcony: CoachBalcony, latitude: number, date: Date) {
  if (!balcony.orientation) return 0.75;
  const hours = sunHoursOn({ orientation: balcony.orientation, latitude, covered: balcony.covered, facing: balcony.facing }, date);
  return 0.35 + 0.65 * Math.min(1, hours / 8);
}

/** Surface de terre du pot, en m². */
function potAreaM2(entry: Pick<CatalogPlant, "id" | "potLiters">, potSize: PotSize | undefined) {
  if (potSize === "planter") return 0.6 * 0.18;
  const widthCm = potSize && potSize !== "unknown" ? POT_SHAPES[potSize].widthCm : potNeedFor(entry).widthCm;
  return Math.PI * (widthCm / 200) ** 2;
}

const half = (liters: number) => Math.max(0.5, Math.round(liters * 2) / 2);

export function coachAdvice(input: {
  entry: Pick<CatalogPlant, "id" | "potLiters" | "care">;
  potSize: PotSize | undefined;
  /** Dernier arrosage noté, ou null. */
  lastWatering: Date | null;
  weather: CoachWeather;
  balcony: CoachBalcony;
  now: Date;
}): CoachAdvice {
  const { entry, potSize, lastWatering, weather, balcony, now } = input;
  const potLiters = potSize && potSize !== "unknown" ? POT_LITERS[potSize] : potNeedFor(entry).liters;
  const capacity = potLiters * AVAILABLE_WATER_SHARE;
  const threshold = capacity * ALLOWED_DEPLETION;
  const area = potAreaM2(entry, potSize);
  const wind = weather.today.windGustKmhMax >= 40 ? 1.15 : 1;
  const dailyLoss = referenceEvaporationMm(weather, now) * thirstFactor(entry) * sunFactor(balcony, weather.latitude, now) * wind * area * CONTAINER_FACTOR[potSize ?? "unknown"];
  const intervalHours = Math.round(Math.max(12, Math.min(240, (24 * threshold) / Math.max(dailyLoss, 0.01))));
  // Jamais arrosée dans l'app : comme d'habitude, on propose d'arroser.
  if (!lastWatering) return { due: true, liters: half(threshold), remaining: 0.5, nextInDays: 0, intervalHours, dailyLoss };
  const days = Math.max(0, (now.getTime() - lastWatering.getTime()) / 86_400_000);
  // La pluie du jour remplit le pot, sauf sous un balcon couvert.
  const rain = balcony.covered ? 0 : weather.today.precipitationMm * area;
  const deficit = Math.max(0, Math.min(capacity, dailyLoss * days - rain));
  const due = deficit >= threshold;
  return {
    due,
    liters: half(due ? deficit : threshold),
    remaining: Math.max(0, Math.min(1, 1 - deficit / capacity)),
    nextInDays: due ? 0 : Math.max(1, Math.ceil((threshold - deficit) / Math.max(dailyLoss, 0.01))),
    intervalHours,
    dailyLoss,
  };
}

/** « Pas besoin aujourd'hui : ta terre a encore de l'eau · prochain arrosage dans 2 jours ». */
export function coachSummary(advice: CoachAdvice) {
  if (advice.due) return { title: `Arrose environ ${String(advice.liters).replace(".", ",")} L ce soir`, detail: "Ta terre a soif : il lui reste peu d’eau." };
  const next = advice.nextInDays === 1 ? "demain" : `dans ${advice.nextInDays} jours`;
  return { title: "Pas besoin aujourd’hui", detail: `Ta terre a encore de l’eau · prochain arrosage ${next}` };
}
