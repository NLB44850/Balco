/**
 * Simulation météo pour les versions de test : remplace la météo réelle par un scénario
 * (pluie, gel, orage…) afin de voir les alertes sans attendre le mauvais temps. Logique pure.
 */
import type { WeatherSnapshot } from "../reminders/reminder-engine";

export type WeatherScenario = "none" | "rain" | "cold" | "frost" | "storm" | "wind" | "heat" | "mild";

export const WEATHER_SCENARIOS: { id: WeatherScenario; label: string; hint: string }[] = [
  { id: "none", label: "Météo réelle", hint: "Balco utilise la vraie météo de ta ville." },
  { id: "rain", label: "Pluie", hint: "8 mm dans les 12 h. Visible pour les plantes dont l’arrosage est dû." },
  { id: "cold", label: "Nuit fraîche", hint: "9 °C cette nuit, sans gel. Les frileuses en fin de saison le sentent." },
  { id: "frost", label: "Gel", hint: "-3 °C cette nuit. Alerte pour les plantes qui craignent le froid." },
  { id: "storm", label: "Orage", hint: "Orage en cours : alerte pour toutes les plantes." },
  { id: "wind", label: "Vent fort", hint: "Rafales à 75 km/h : alerte pour toutes les plantes." },
  // Étape 5 du chantier « Plante hors saison » : la météo réelle d'octobre (vent, nuits fraîches) cachait la sortie
  // au printemps, même avec une date simulée en mai.
  { id: "mild", label: "Nuits douces", hint: "14 °C la nuit, sans vent ni pluie : pour tester la sortie au printemps." },
  { id: "heat", label: "Canicule", hint: "35 °C. Alerte pour les plantes qui n’ont pas été arrosées depuis hier." },
];

export function scenarioLabel(scenario: WeatherScenario) {
  return WEATHER_SCENARIOS.find((item) => item.id === scenario)?.label ?? "Météo réelle";
}

/** « Nuit fraîche » : sous le seuil du basilic (10 °C), au-dessus de son alerte gel (8 °C). */
const COLD_NIGHT_C = 9;
/** « Nuits douces » : au-dessus du seuil de toutes les frileuses (13 °C au plus). */
const MILD_NIGHT_C = 14;

/** La météo réelle, modifiée selon le scénario, et datée de maintenant pour être jugée fraîche. */
export function applyWeatherScenario(snapshot: WeatherSnapshot, scenario: WeatherScenario, now = new Date()): WeatherSnapshot {
  if (scenario === "none") return snapshot;
  const base: WeatherSnapshot = { ...snapshot, fetchedAt: now.toISOString(), current: { ...snapshot.current }, next12h: { ...snapshot.next12h }, today: { ...snapshot.today } };
  switch (scenario) {
    case "rain":
      return { ...base, current: { ...base.current, weatherCode: 61 }, next12h: { ...base.next12h, precipitationMm: 8, precipitationProbabilityMax: 90 }, today: { ...base.today, precipitationMm: 10 } };
    case "cold":
      return { ...base, current: { ...base.current, temperatureC: 12, apparentTemperatureC: 11, weatherCode: 0 }, today: { ...base.today, temperatureMinC: COLD_NIGHT_C, temperatureMaxC: 15 }, nights: [COLD_NIGHT_C, COLD_NIGHT_C, COLD_NIGHT_C, COLD_NIGHT_C] };
    case "frost":
      return { ...base, current: { ...base.current, temperatureC: 1, apparentTemperatureC: -1, weatherCode: 0 }, today: { ...base.today, temperatureMinC: -3, temperatureMaxC: 6 }, nights: [-3, -3, -3, -3] };
    case "storm":
      return { ...base, current: { ...base.current, weatherCode: 95 } };
    case "mild":
      return { ...base, current: { ...base.current, temperatureC: 19, apparentTemperatureC: 19, weatherCode: 1 }, next12h: { precipitationMm: 0, precipitationProbabilityMax: 5, windGustKmhMax: 15 }, today: { ...base.today, precipitationMm: 0, temperatureMinC: MILD_NIGHT_C, temperatureMaxC: 22, windGustKmhMax: 15 }, nights: [MILD_NIGHT_C, MILD_NIGHT_C, MILD_NIGHT_C, MILD_NIGHT_C] };
    case "wind":
      return { ...base, next12h: { ...base.next12h, windGustKmhMax: 75 }, today: { ...base.today, windGustKmhMax: 75 } };
    case "heat":
      return { ...base, current: { ...base.current, temperatureC: 33, apparentTemperatureC: 35, weatherCode: 0 }, today: { ...base.today, temperatureMaxC: 35, temperatureMinC: 22 }, next12h: { ...base.next12h, precipitationMm: 0, precipitationProbabilityMax: 0 } };
  }
}
