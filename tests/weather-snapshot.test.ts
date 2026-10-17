import { describe, expect, it } from "vitest";

import { buildSnapshot, localHour, staleLabel, storedForecastUsable } from "../lib/weather/snapshot";

/** Tour de l'appli, étape 3 : hors connexion, la dernière vraie prévision, jamais une météo inventée. */
const at = (day: number, hour: number) => new Date(2027, 0, day, hour);
const hours = Array.from({ length: 96 }, (_, index) => localHour(new Date(2027, 0, 10, index)));
const payload = {
  current: { time: localHour(at(10, 8)), temperature_2m: 3, weather_code: 3 },
  // Pluie de 20 h à 21 h le 10 janvier, rafales le 11 au matin.
  hourly: {
    time: hours,
    precipitation: hours.map((time) => (time >= localHour(at(10, 20)) && time <= localHour(at(10, 21)) ? 2 : 0)),
    precipitation_probability: hours.map(() => 10),
    wind_gusts_10m: hours.map((time) => (time === localHour(at(11, 9)) ? 80 : 10)),
  },
  daily: { precipitation_sum: [4, 0, 0, 1], temperature_2m_min: [-2, 5, 6, 7], temperature_2m_max: [6, 9, 10, 11], wind_gusts_10m_max: [20, 80, 15, 15] },
};
const place = { city: "Lyon", latitude: 45.76, longitude: 4.84 };

describe("prévision gardée sur le téléphone", () => {
  it("fraîche : les 12 heures qui suivent la prévision", () => {
    const snapshot = buildSnapshot(payload, place, at(10, 8));
    expect(snapshot.next12h.precipitationMm).toBe(0);
    expect(snapshot.today.temperatureMinC).toBe(-2);
    expect(snapshot.nights).toEqual([-2, 5, 6, 7]);
  });

  it("relue plus tard : glisse à l'heure de maintenant, et au jour suivant après minuit", () => {
    const evening = buildSnapshot(payload, place, at(10, 18), at(10, 8));
    expect(evening.next12h.precipitationMm).toBe(4);
    expect(evening.fetchedAt).toBe(at(10, 8).toISOString());
    const nextMorning = buildSnapshot(payload, place, at(11, 7), at(10, 8));
    expect(nextMorning.today.temperatureMinC).toBe(5);
    expect(nextMorning.next12h.windGustKmhMax).toBe(80);
    expect(nextMorning.nights).toEqual([5, 6, 7]);
  });

  it("utilisable pour la même zone et pendant 48 h seulement", () => {
    const stored = { key: "45.76,4.84", at: at(10, 8).getTime() };
    expect(storedForecastUsable(stored, "45.76,4.84", at(11, 20).getTime())).toBe(true);
    expect(storedForecastUsable(stored, "45.76,4.84", at(12, 9).getTime())).toBe(false);
    expect(storedForecastUsable(stored, "48.86,2.35", at(10, 9).getTime())).toBe(false);
    expect(storedForecastUsable(null, "45.76,4.84")).toBe(false);
  });

  it("dit son âge", () => {
    expect(staleLabel(at(10, 8), at(10, 18))).toBe("météo de 8 h, hors connexion");
    expect(staleLabel(at(10, 18), at(11, 7))).toBe("météo d’hier 18 h, hors connexion");
  });
});
