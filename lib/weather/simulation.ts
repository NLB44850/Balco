/**
 * Simulation météo pour les versions de test : remplace la météo réelle par un scénario
 * (pluie, gel, orage…) afin de voir les alertes sans attendre le mauvais temps. Logique pure.
 */
import type { WeatherSnapshot } from "../reminders/reminder-engine";

export type WeatherScenario = "none" | "rain" | "frost" | "storm" | "wind" | "heat";

export const WEATHER_SCENARIOS: Array<{ id: WeatherScenario; label: string; hint: string }> = [
  { id: "none", label: "Météo réelle", hint: "Balco utilise la vraie météo de ta ville." },
  { id: "rain", label: "Pluie", hint: "8 mm dans les 12 h. Visible pour les plantes dont l’arrosage est dû." },
  { id: "frost", label: "Gel", hint: "-3 °C cette nuit. Alerte pour les plantes qui craignent le froid." },
  { id: "storm", label: "Orage", hint: "Orage en cours : alerte pour toutes les plantes." },
  { id: "wind", label: "Vent fort", hint: "Rafales à 75 km/h : alerte pour toutes les plantes." },
  { id: "heat", label: "Canicule", hint: "35 °C. Visible pour les plantes arrosées il y a plus d’un jour." },
];

export function scenarioLabel(scenario: WeatherScenario) {
  return WEATHER_SCENARIOS.find((item) => item.id === scenario)?.label ?? "Météo réelle";
}

/** La météo réelle, modifiée selon le scénario, et datée de maintenant pour être jugée fraîche. */
export function applyWeatherScenario(snapshot: WeatherSnapshot, scenario: WeatherScenario, now = new Date()): WeatherSnapshot {
  if (scenario === "none") return snapshot;
  const base: WeatherSnapshot = { ...snapshot, fetchedAt: now.toISOString(), current: { ...snapshot.current }, next12h: { ...snapshot.next12h }, today: { ...snapshot.today } };
  switch (scenario) {
    case "rain":
      return { ...base, current: { ...base.current, weatherCode: 61 }, next12h: { ...base.next12h, precipitationMm: 8, precipitationProbabilityMax: 90 }, today: { ...base.today, precipitationMm: 10 } };
    case "frost":
      return { ...base, current: { ...base.current, temperatureC: 1, apparentTemperatureC: -1, weatherCode: 0 }, today: { ...base.today, temperatureMinC: -3, temperatureMaxC: 6 } };
    case "storm":
      return { ...base, current: { ...base.current, weatherCode: 95 } };
    case "wind":
      return { ...base, next12h: { ...base.next12h, windGustKmhMax: 75 }, today: { ...base.today, windGustKmhMax: 75 } };
    case "heat":
      return { ...base, current: { ...base.current, temperatureC: 33, apparentTemperatureC: 35, weatherCode: 0 }, today: { ...base.today, temperatureMaxC: 35, temperatureMinC: 22 }, next12h: { ...base.next12h, precipitationMm: 0, precipitationProbabilityMax: 0 } };
  }
}
