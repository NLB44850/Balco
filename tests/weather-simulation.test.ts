import { describe, expect, it } from "vitest";

import { decideReminders, type PlantCareProfile, type WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { groupReminders } from "../lib/reminders/reminder-groups";
import { applyWeatherScenario } from "../lib/weather/simulation";

const now = new Date("2026-09-29T15:00:00.000Z");
const calm: WeatherSnapshot = {
  fetchedAt: new Date(0).toISOString(),
  timezone: "Europe/Paris",
  city: "Nantes",
  latitude: 47.2,
  longitude: -1.55,
  current: { temperatureC: 18, apparentTemperatureC: 18, weatherCode: 1 },
  next12h: { precipitationMm: 0, precipitationProbabilityMax: 5, windGustKmhMax: 10 },
  today: { precipitationMm: 0, temperatureMinC: 12, temperatureMaxC: 20, windGustKmhMax: 10 },
};
const plants: PlantCareProfile[] = ["le basilic", "la menthe"].map((label, index) => ({
  plantId: `p${index}`, displayName: label, label, wateringIntervalHours: 48, rainSkipMm: 2, heatThresholdC: 30, frostThresholdC: 3, windThresholdKmh: 40, frostSensitive: true, allowedTaskTypes: ["watering", "observation", "protection"],
}));
const history = plants.map((plant) => ({ id: `w-${plant.plantId}`, plantId: plant.plantId, type: "watering" as const, completedAt: new Date(now.getTime() - 3 * 86400_000).toISOString(), source: "manual" as const }));
const alerts = (scenario: Parameters<typeof applyWeatherScenario>[1]) =>
  groupReminders(decideReminders(plants.map((plant) => ({ plant, history, weather: applyWeatherScenario(calm, scenario, now), settings: { enabled: true }, now }))));

describe("simulation météo", () => {
  it("laisse la météo réelle intacte par défaut", () => {
    expect(applyWeatherScenario(calm, "none", now)).toBe(calm);
  });

  it("date la météo simulée de maintenant, pour qu'elle soit prise en compte", () => {
    expect(applyWeatherScenario(calm, "frost", now).fetchedAt).toBe(now.toISOString());
  });

  it.each([
    ["rain", "N’arrose pas tes plantes aujourd’hui"],
    ["frost", "Gel cette nuit : protège 2 plantes"],
    ["storm", "Orage : mets tes plantes à l’abri"],
    ["wind", "Vent fort : mets 2 plantes à l’abri"],
    ["heat", "35 °C aujourd’hui : pense à tes plantes"],
  ] as const)("le scénario %s déclenche une seule alerte groupée", (scenario, title) => {
    const groups = alerts(scenario);
    expect(groups.map((group) => group.title)).toEqual([title]);
    expect(groups[0].decisions).toHaveLength(2);
  });
});
