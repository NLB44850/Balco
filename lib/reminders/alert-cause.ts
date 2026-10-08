/**
 * La cause météo d'une alerte suivie (« C'est fait ») : gel, chaleur, vent, orage. Sans dépendance, pour servir aux
 * badges (lib/garden/garden-logic.ts) comme aux rappels.
 */
import type { MaintenanceEvent } from "./reminder-engine";

/** Les alertes dont la cause est gardée dans l'identifiant du geste (badges « Protégé du gel », « Canicule maîtrisée »…). */
export const WEATHER_ALERT_CAUSES = ["frost", "heat", "wind", "storm"] as const;
export type WeatherAlertCause = (typeof WEATHER_ALERT_CAUSES)[number];

/**
 * La cause météo d'une alerte suivie (« C'est fait ») : lue dans l'identifiant, ou retrouvée par le titre pour les
 * gestes notés avant que la cause n'y entre. null : pas une alerte météo (arrosage, pluie, geste ordinaire).
 */
export function alertCauseOf(event: MaintenanceEvent): WeatherAlertCause | null {
  if (event.source !== "reminder" || !event.id.startsWith("reminder:")) return null;
  const parts = event.id.split(":");
  const fromId = parts.length >= 5 ? parts[parts.length - 2] : null;
  if (fromId && (WEATHER_ALERT_CAUSES as readonly string[]).includes(fromId)) return fromId as WeatherAlertCause;
  const title = event.note ?? "";
  if (/^(Gel cette nuit|Nuit fraîche)|avant cette nuit|^Cueille tes derniers/u.test(title)) return "frost";
  if (/^Orage/u.test(title)) return "storm";
  if (/^(Vent fort|Coup de vent)/u.test(title)) return "wind";
  if (/^\d+ °C aujourd/u.test(title)) return "heat";
  return null;
}
