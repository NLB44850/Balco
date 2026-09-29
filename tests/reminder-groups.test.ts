import { describe, expect, it } from "vitest";

import { decideReminders, type MaintenanceEvent, type PlantCareProfile, type WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { groupReminders, listPlants, selectGroups } from "../lib/reminders/reminder-groups";

const now = new Date("2026-09-29T15:00:00.000Z");

function plant(plantId: string, label: string, overrides: Partial<PlantCareProfile> = {}): PlantCareProfile {
  return {
    plantId,
    displayName: label,
    label,
    wateringIntervalHours: 48,
    rainSkipMm: 2,
    heatThresholdC: 30,
    frostThresholdC: 3,
    windThresholdKmh: 40,
    frostSensitive: true,
    allowedTaskTypes: ["watering", "observation", "protection"],
    ...overrides,
  };
}

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    fetchedAt: now.toISOString(),
    timezone: "Europe/Paris",
    city: "Nantes",
    latitude: 47.2,
    longitude: -1.55,
    current: { temperatureC: 18, apparentTemperatureC: 18, weatherCode: 1 },
    next12h: { precipitationMm: 0, precipitationProbabilityMax: 5, windGustKmhMax: 10 },
    today: { precipitationMm: 0, temperatureMinC: 12, temperatureMaxC: 20, windGustKmhMax: 10 },
    ...overrides,
  };
}

const wateredDaysAgo = (plantId: string, days: number): MaintenanceEvent => ({
  id: `${plantId}-w`,
  plantId,
  type: "watering",
  completedAt: new Date(now.getTime() - days * 86400_000).toISOString(),
  source: "manual",
});

const basil = plant("basil-1", "le basilic");
const mint = plant("mint-1", "la menthe");
const tomato = plant("tomato-1", "les tomates cerises");
const all = [basil, mint, tomato];
const history = all.map((item) => wateredDaysAgo(item.plantId, 3));

function decide(snapshot: WeatherSnapshot, plants = all, events = history) {
  return decideReminders(plants.map((item) => ({ plant: item, history: events, weather: snapshot, settings: { enabled: true }, now })));
}

describe("regroupement des alertes météo", () => {
  it("une seule alerte « n'arrose pas » pour toutes les plantes quand il va pleuvoir", () => {
    const groups = groupReminders(decide(weather({ next12h: { precipitationMm: 8, precipitationProbabilityMax: 90, windGustKmhMax: 10 } })));
    expect(groups).toHaveLength(1);
    expect(groups[0].decisions.map((decision) => decision.plantId)).toEqual(["basil-1", "mint-1", "tomato-1"]);
    expect(groups[0].title).toBe("N’arrose pas tes plantes aujourd’hui");
    expect(groups[0].body).toBe("8 mm de pluie sont prévus dans les 12 prochaines heures pour le basilic, la menthe et les tomates cerises.");
    expect(groups[0].action).toBe("skip");
  });

  it("une seule alerte gel, avec la température et les plantes à protéger", () => {
    const groups = groupReminders(decide(weather({ today: { precipitationMm: 0, temperatureMinC: -2, temperatureMaxC: 8, windGustKmhMax: 10 } })));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ priority: "urgent", action: "protect", title: "Gel cette nuit : protège 3 plantes" });
    expect(groups[0].body).toContain("Jusqu’à -2 °C cette nuit");
    expect(groups[0].body.length).toBeLessThanOrEqual(120);
    expect(groups[0].reason).toBe("Minimum prévu -2 °C, sous ce que ces plantes supportent.");
  });

  it("une seule alerte orage et une seule alerte vent", () => {
    const storm = groupReminders(decide(weather({ current: { temperatureC: 20, apparentTemperatureC: 20, weatherCode: 95 } })));
    expect(storm.map((group) => group.title)).toEqual(["Orage : mets tes plantes à l’abri"]);
    const wind = groupReminders(decide(weather({ next12h: { precipitationMm: 0, precipitationProbabilityMax: 5, windGustKmhMax: 70 } })));
    expect(wind.map((group) => group.title)).toEqual(["Vent fort : mets 3 plantes à l’abri"]);
  });

  it("garde un conseil par plante quand seule la soif est en cause", () => {
    const groups = groupReminders(decide(weather()));
    expect(groups.map((group) => group.title)).toEqual([
      "Arrose le basilic si la terre est sèche",
      "Arrose la menthe si la terre est sèche",
      "Arrose les tomates cerises si la terre est sèche",
    ]);
  });

  it("une plante seule garde son message d'origine", () => {
    const [group] = groupReminders(decide(weather({ next12h: { precipitationMm: 8, precipitationProbabilityMax: 90, windGustKmhMax: 10 } }), [basil]));
    expect(group.title).toBe("N’arrose pas le basilic aujourd’hui");
  });

  it("met l'alerte la plus urgente en premier, et limite les conseils ordinaires", () => {
    // Gel pour les plantes sensibles, soif pour la menthe qui ne craint pas le froid.
    const hardyMint = plant("mint-1", "la menthe", { frostSensitive: false });
    const decisions = decide(weather({ today: { precipitationMm: 0, temperatureMinC: -1, temperatureMaxC: 8, windGustKmhMax: 10 } }), [basil, hardyMint, tomato]);
    const groups = groupReminders(decisions);
    expect(groups.map((group) => [group.priority, group.decisions.length])).toEqual([["urgent", 2], ["normal", 1]]);
    expect(selectGroups(groups, 0)).toHaveLength(1);
  });

  it("abrège une longue liste de plantes", () => {
    expect(listPlants(["le basilic"])).toBe("le basilic");
    expect(listPlants(["le basilic", "la menthe"])).toBe("le basilic et la menthe");
    expect(listPlants(["le basilic", "la menthe", "le thym", "la sauge", "le persil"])).toBe("le basilic, la menthe et 3 autres plantes");
  });
});
