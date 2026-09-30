import { describe, expect, it } from "vitest";

import {
  decideReminder,
  decideReminders,
  type MaintenanceEvent,
  type PlantCareProfile,
  type WeatherSnapshot,
} from "../lib/reminders/reminder-engine";

const now = new Date("2026-09-23T18:00:00.000Z");

const plant: PlantCareProfile = {
  plantId: "tomatoes-cherry-01",
  displayName: "Tomates cerises",
  wateringIntervalHours: 48,
  rainSkipMm: 2,
  heatThresholdC: 30,
  frostThresholdC: 2,
  windThresholdKmh: 40,
  frostSensitive: true,
  allowedTaskTypes: ["watering", "observation", "protection"],
};

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    fetchedAt: now.toISOString(),
    timezone: "Europe/Paris",
    city: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    current: {
      temperatureC: 22,
      apparentTemperatureC: 22,
      weatherCode: 0,
    },
    next12h: {
      precipitationMm: 0,
      precipitationProbabilityMax: 10,
      windGustKmhMax: 10,
    },
    today: {
      precipitationMm: 0,
      temperatureMinC: 14,
      temperatureMaxC: 24,
      windGustKmhMax: 10,
    },
    ...overrides,
  };
}

function event(type: MaintenanceEvent["type"], completedAt: string): MaintenanceEvent {
  return {
    id: `${type}-1`,
    plantId: plant.plantId,
    type,
    completedAt,
    source: "manual",
  };
}

describe("decideReminder", () => {
  it("returns no reminder when weather is stale", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather({ fetchedAt: "2026-09-23T10:00:00.000Z" }),
      now,
    });

    expect(result).toBeNull();
  });

  it("prioritizes protection for a hard frost", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather({ today: { precipitationMm: 0, temperatureMinC: -1, temperatureMaxC: 8, windGustKmhMax: 10 } }),
      now,
    });

    expect(result).toMatchObject({ action: "protect", taskType: "protection", priority: "urgent" });
  });

  it("suppresses watering when enough rain is expected", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather({ next12h: { precipitationMm: 6, precipitationProbabilityMax: 80, windGustKmhMax: 10 } }),
      now,
    });

    expect(result).toMatchObject({ action: "skip", taskType: "observation" });
    expect(result?.title).toContain("N’arrose pas");
    expect(result?.body).toContain("mm de pluie sont prévus");
  });

  it("speaks about the plant with its article, as in « N’arrose pas les tomates cerises aujourd’hui »", () => {
    const withLabel = { ...plant, label: "les tomates cerises" };
    const rain = decideReminder({
      plant: withLabel,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather({ next12h: { precipitationMm: 8, precipitationProbabilityMax: 80, windGustKmhMax: 10 } }),
      now,
    });
    expect(rain?.title).toBe("N’arrose pas les tomates cerises aujourd’hui");
    expect(rain?.body).toMatch(/^8 mm de pluie sont prévus dans les 12 prochaines heures/);

    const heat = decideReminder({
      plant: { ...plant, label: "le basilic" },
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather({ today: { precipitationMm: 0, temperatureMinC: 20, temperatureMaxC: 34, windGustKmhMax: 10 } }),
      now,
    });
    expect(heat?.title).toBe("34 °C aujourd’hui : pense au basilic");
    expect(heat?.body).toContain("Dernier arrosage il y a 3 jours");
  });

  it("asks for a soil check after the watering interval", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather(),
      now,
    });

    expect(result).toMatchObject({ action: "observe", taskType: "watering", priority: "normal" });
    expect(result?.body).toContain("terre");
  });

  it("raises watering priority in hot weather without ordering blind watering", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather({ today: { precipitationMm: 0, temperatureMinC: 20, temperatureMaxC: 34, windGustKmhMax: 10 } }),
      now,
    });

    expect(result).toMatchObject({ action: "observe", taskType: "watering", priority: "important" });
    expect(result?.body).toContain("Touche la terre");
  });

  it("limits repeated reminders to one per day", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather(),
      lastReminderAt: "2026-09-23T12:00:00.000Z",
      now,
    });

    expect(result).toBeNull();
  });

  it("does not invent a watering need when there is no history", () => {
    const result = decideReminder({ plant, history: [], weather: weather(), now });

    expect(result).toBeNull();
  });

  it("asks to check the stake for moderate gusts", () => {
    const result = decideReminder({
      plant,
      history: [],
      weather: weather({ next12h: { precipitationMm: 0, precipitationProbabilityMax: 10, windGustKmhMax: 45 } }),
      now,
    });

    expect(result).toMatchObject({ action: "protect", taskType: "protection", priority: "important" });
    expect(result?.body).toContain("45 km/h");
  });

  it("escalates to urgent shelter for strong gusts", () => {
    const result = decideReminder({
      plant,
      history: [],
      weather: weather({ today: { precipitationMm: 0, temperatureMinC: 14, temperatureMaxC: 24, windGustKmhMax: 65 } }),
      now,
    });

    expect(result).toMatchObject({ action: "protect", priority: "urgent" });
  });

  it("tells the user to act from inside during a thunderstorm", () => {
    const result = decideReminder({
      plant,
      history: [],
      weather: weather({ current: { temperatureC: 22, apparentTemperatureC: 22, weatherCode: 95 } }),
      now,
    });

    expect(result).toMatchObject({ action: "protect", priority: "urgent" });
    expect(result?.body).toContain("intérieur");
  });

  it("does not protect frost-tolerant plants", () => {
    const result = decideReminder({
      plant: { ...plant, frostSensitive: false },
      history: [],
      weather: weather({ today: { precipitationMm: 0, temperatureMinC: -1, temperatureMaxC: 8, windGustKmhMax: 10 } }),
      now,
    });

    expect(result).toBeNull();
  });

  it("drops normal reminders when reminders are disabled but keeps urgent alerts", () => {
    const history = [event("watering", "2026-09-20T10:00:00.000Z")];
    expect(decideReminder({ plant, history, weather: weather(), settings: { enabled: false }, now })).toBeNull();

    const frost = decideReminder({
      plant,
      history,
      weather: weather({ today: { precipitationMm: 0, temperatureMinC: -3, temperatureMaxC: 5, windGustKmhMax: 10 } }),
      settings: { enabled: false },
      lastReminderAt: "2026-09-23T12:00:00.000Z",
      now,
    });
    expect(frost).toMatchObject({ priority: "urgent" });
  });

  it("ignores rain suppression when the user opted out of it", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather({ next12h: { precipitationMm: 6, precipitationProbabilityMax: 80, windGustKmhMax: 10 } }),
      settings: { skipWateringWhenRainExpected: false },
      now,
    });

    expect(result).toMatchObject({ action: "observe", taskType: "watering" });
  });

  it("does not remind before the watering interval has elapsed", () => {
    const result = decideReminder({
      plant,
      history: [event("watering", "2026-09-23T08:00:00.000Z")],
      weather: weather(),
      now,
    });

    expect(result).toBeNull();
  });

  it("only uses history from the same plant", () => {
    const result = decideReminder({
      plant,
      history: [{ ...event("watering", "2026-09-20T10:00:00.000Z"), plantId: "basil-01" }],
      weather: weather(),
      now,
    });

    expect(result).toBeNull();
  });

  it("keeps notification bodies short and stamps weather freshness", () => {
    const result = decideReminder({
      plant: { ...plant, displayName: "Une plante au nom vraiment extrêmement long pour tester la coupure du texte" },
      history: [event("watering", "2026-09-20T10:00:00.000Z")],
      weather: weather(),
      now,
    });

    expect(result?.body.length).toBeLessThanOrEqual(120);
    expect(result?.weatherFetchedAt).toBe(now.toISOString());
    expect(new Date(result!.validUntil).getTime()).toBeGreaterThan(now.getTime());
  });

  it("sorts decisions for several plants by priority", () => {
    const history = [event("watering", "2026-09-20T10:00:00.000Z")];
    const frostWeather = weather({ today: { precipitationMm: 0, temperatureMinC: -1, temperatureMaxC: 8, windGustKmhMax: 10 } });
    const results = decideReminders([
      { plant: { ...plant, frostSensitive: false }, history, weather: frostWeather, now },
      { plant: { ...plant, plantId: "basil-01" }, history: [], weather: frostWeather, now },
    ]);

    expect(results.map((decision) => decision.priority)).toEqual(["urgent", "normal"]);
  });

  it("advises not to water a never-watered plant when rain is coming, without inventing thirst otherwise", () => {
    const rainy = weather({ next12h: { precipitationMm: 8, precipitationProbabilityMax: 90, windGustKmhMax: 10 } });
    expect(decideReminder({ plant, history: [], weather: rainy, now })).toMatchObject({ action: "skip", cause: "rain" });
    expect(decideReminder({ plant, history: [], weather: weather(), now })).toBeNull();
  });
});
