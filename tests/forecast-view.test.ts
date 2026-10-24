import { describe, expect, it } from "vitest";

import type { WeatherSnapshot } from "@/lib/reminders/reminder-engine";
import type { OpenMeteoPayload } from "@/lib/weather/forecast-client";
import { forecastView, skyKind, skyLabel, weatherNote } from "@/lib/weather/forecast-view";
import { applyWeatherScenario } from "@/lib/weather/simulation";

const now = new Date(2026, 9, 24, 10, 20);
const pad = (value: number) => String(value).padStart(2, "0");
const hourTimes = Array.from({ length: 96 }, (_, index) => {
  const date = new Date(2026, 9, 24, index);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
});

function payload(overrides: Partial<OpenMeteoPayload["hourly"]> = {}): OpenMeteoPayload {
  return {
    current: { temperature_2m: 12.4, apparent_temperature: 10.2, weather_code: 3, is_day: 1 },
    hourly: {
      time: hourTimes,
      temperature_2m: hourTimes.map((_, index) => 8 + (index % 24) / 3),
      weather_code: hourTimes.map((_, index) => (index >= 15 && index <= 18 ? 61 : 2)),
      is_day: hourTimes.map((_, index) => ((index % 24) >= 7 && (index % 24) < 20 ? 1 : 0)),
      precipitation: hourTimes.map((_, index) => (index >= 15 && index <= 18 ? 1.2 : 0)),
      precipitation_probability: hourTimes.map((_, index) => (index >= 15 && index <= 18 ? 80 : 10)),
      wind_gusts_10m: hourTimes.map(() => 20),
      ...overrides,
    },
    daily: {
      time: ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"],
      weather_code: [61, 2, 0, 0],
      precipitation_sum: [5, 0.4, 0, 0],
      temperature_2m_min: [9, 8, 6, -1],
      temperature_2m_max: [15, 14, 16, 7],
      wind_gusts_10m_max: [30, 20, 15, 10],
    },
  };
}

const snapshot: WeatherSnapshot = {
  fetchedAt: now.toISOString(),
  timezone: "auto",
  city: "Lyon",
  latitude: 45.76,
  longitude: 4.84,
  current: { temperatureC: 12.4, apparentTemperatureC: 10.2, weatherCode: 3 },
  next12h: { precipitationMm: 4.8, precipitationProbabilityMax: 80, windGustKmhMax: 20 },
  today: { precipitationMm: 5, temperatureMinC: 9, temperatureMaxC: 15, windGustKmhMax: 30 },
  nights: [9, 8, 6, -1],
};

describe("carte météo illustrée", () => {
  it("dessine le ciel selon le code météo, la nuit et le gel", () => {
    expect(skyKind(0, true)).toBe("sun");
    expect(skyKind(0, false)).toBe("moon");
    expect(skyKind(2, true)).toBe("partly");
    expect(skyKind(2, false)).toBe("partly-night");
    expect(skyKind(3, true)).toBe("cloudy");
    expect(skyKind(45, true)).toBe("fog");
    expect(skyKind(53, true)).toBe("drizzle");
    expect(skyKind(63, true)).toBe("rain");
    expect(skyKind(81, true)).toBe("rain");
    expect(skyKind(73, true)).toBe("snow");
    expect(skyKind(95, true)).toBe("storm");
    expect(skyKind(0, false, -3)).toBe("frost");
    expect(skyLabel(0, true)).toBe("Ensoleillé");
    expect(skyLabel(0, false)).toBe("Nuit claire");
    expect(skyLabel(80, true)).toBe("Averses");
  });

  it("annonce la pluie à venir, montre 5 moments de la journée et les 3 jours suivants", () => {
    const view = forecastView({ payload: payload(), snapshot, isDay: true, now });
    expect(view.kind).toBe("cloudy");
    expect(view.temperatureC).toBe(12);
    expect(view.apparentC).toBe(10);
    expect(view.headline).toBe("Pluie vers 15 h");
    expect(view.hours.map((hour) => hour.label)).toEqual(["Maint.", "13 h", "16 h", "19 h", "22 h"]);
    expect(view.hours[0]).toMatchObject({ kind: "cloudy", temperatureC: 12 });
    expect(view.hours[2]).toMatchObject({ kind: "rain", rainChance: 80 });
    expect(view.hours[4].kind).toBe("partly-night");
    expect(view.days.map((day) => day.label)).toEqual(["Demain", "Lundi", "Mardi"]);
    expect(view.days[2]).toMatchObject({ kind: "frost", minC: -1, maxC: 7 });
    expect(view.note?.emoji).toBe("🌧️");
  });

  it("sans les heures (ancien serveur), garde le moment présent sans inventer la suite", () => {
    const view = forecastView({ payload: { current: payload().current }, snapshot, isDay: true, now });
    expect(view.hours).toEqual([]);
    expect(view.days).toEqual([]);
    expect(view.temperatureC).toBe(12);
  });

  it("hors connexion : le « maintenant » se lit dans les heures prévues", () => {
    const view = forecastView({ payload: payload(), snapshot: { ...snapshot, current: { temperatureC: 20, apparentTemperatureC: 20, weatherCode: 0 } }, isDay: true, now, stale: true });
    expect(view.temperatureC).toBe(11);
    expect(view.kind).toBe("partly");
  });

  it("une simulation de la version de test colore toute la carte", () => {
    const frost = applyWeatherScenario(snapshot, "frost", now);
    const view = forecastView({ payload: payload(), snapshot: frost, isDay: true, now, simulated: true });
    expect(view.temperatureC).toBe(1);
    expect(view.note).toMatchObject({ tone: "cold", text: "Gel cette nuit (-3°) : protège tes plantes frileuses." });
    expect(view.days.every((day) => day.minC === -3)).toBe(true);
    const rain = forecastView({ payload: payload(), snapshot: applyWeatherScenario(snapshot, "rain", now), isDay: true, now, simulated: true });
    expect(rain.kind).toBe("rain");
    expect(rain.hours.every((hour) => hour.kind === "rain" && hour.rainChance === 90)).toBe(true);
  });

  it("le conseil du balcon : orage, gel, vent, chaleur, pluie, puis gel à venir", () => {
    expect(weatherNote({ ...snapshot, current: { ...snapshot.current, weatherCode: 95 } }, now)?.emoji).toBe("⛈️");
    expect(weatherNote({ ...snapshot, next12h: { ...snapshot.next12h, windGustKmhMax: 62 } }, now)?.text).toBe("Coup de vent (62 km/h) : rapproche les pots du mur.");
    expect(weatherNote({ ...snapshot, today: { ...snapshot.today, temperatureMaxC: 33 }, next12h: { ...snapshot.next12h, precipitationMm: 0 } }, now)?.tone).toBe("warm");
    const dry = { ...snapshot, next12h: { ...snapshot.next12h, precipitationMm: 0 } };
    expect(weatherNote(dry, now, forecastView({ payload: payload(), snapshot: dry, isDay: true, now }).days)?.text).toBe("Gel possible mardi au petit matin : Balco te préviendra la veille.");
    expect(weatherNote({ ...dry, nights: [9, 8, 6, 4] }, now)).toBeNull();
  });
});

describe("carte météo sans les heures datées", () => {
  it("compte les heures depuis l'heure en cours, de 3 en 3", () => {
    const base = payload();
    const view = forecastView({ payload: { ...base, hourly: { ...base.hourly, time: undefined } }, snapshot, isDay: true, now: new Date(2026, 9, 24, 22, 55) });
    expect(view.hours.map((hour) => hour.label)).toEqual(["Maint.", "1 h", "4 h", "7 h", "10 h"]);
  });
});
