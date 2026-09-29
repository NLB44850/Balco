import { describe, expect, it } from "vitest";

import { potsFor, skyMood, skyScene, skyWeather } from "../lib/garden/sky";
import type { WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { applyWeatherScenario } from "../lib/weather/simulation";

const at = (hour: number) => new Date(2026, 8, 29, hour, 0);
const base: WeatherSnapshot = {
  fetchedAt: at(12).toISOString(), timezone: "Europe/Paris", city: "Nantes", latitude: 47.2, longitude: -1.55,
  current: { temperatureC: 16, apparentTemperatureC: 15, weatherCode: 0 },
  next12h: { precipitationMm: 0, precipitationProbabilityMax: 5, windGustKmhMax: 12 },
  today: { precipitationMm: 0, temperatureMinC: 9, temperatureMaxC: 19, windGustKmhMax: 12 },
};

describe("sky scene", () => {
  it("follows the time of day", () => {
    expect(skyMood(at(6))).toBe("night");
    expect(skyMood(at(8))).toBe("dawn");
    expect(skyMood(at(13))).toBe("day");
    expect(skyMood(at(19))).toBe("evening");
    expect(skyMood(at(22))).toBe("night");
  });

  it("reads the weather each simulation shows", () => {
    expect(skyWeather(base)).toBe("clear");
    expect(skyWeather(applyWeatherScenario(base, "rain", at(12)))).toBe("rain");
    expect(skyWeather(applyWeatherScenario(base, "frost", at(12)))).toBe("frost");
    expect(skyWeather(applyWeatherScenario(base, "storm", at(12)))).toBe("storm");
    expect(skyWeather(applyWeatherScenario(base, "heat", at(12)))).toBe("heat");
    expect(skyWeather({ ...base, current: { ...base.current, weatherCode: 73 } })).toBe("snow");
    expect(skyWeather({ ...base, current: { ...base.current, weatherCode: 3 } })).toBe("cloudy");
  });

  it("draws rain, snowflakes, the moon and stronger sway when it should", () => {
    const rain = skyScene(applyWeatherScenario(base, "rain", at(12)), at(12));
    expect(rain.particles).toBe("rain");
    expect(rain.body).toBeNull();
    expect(skyScene(applyWeatherScenario(base, "frost", at(12)), at(12)).particles).toBe("snow");
    const night = skyScene(base, at(23));
    expect(night).toMatchObject({ body: "moon", stars: true, ink: "light" });
    expect(skyScene(base, at(13))).toMatchObject({ body: "sun", stars: false, ink: "dark" });
    const windy = skyScene(applyWeatherScenario(base, "wind", at(12)), at(12));
    expect(windy.wind).toBeGreaterThan(skyScene(base, at(12)).wind);
    expect(skyScene(applyWeatherScenario(base, "storm", at(12)), at(12)).flash).toBe(true);
  });

  it("stays neutral until the real weather has loaded", () => {
    const scene = skyScene(applyWeatherScenario(base, "storm", at(12)), at(12), true);
    expect(scene).toMatchObject({ weather: "partly", particles: null, flash: false });
  });

  it("puts one pot per plant on the railing", () => {
    expect(potsFor([])).toEqual(["sprout"]);
    expect(potsFor(["aromatic", "fruiting-vegetable", "flower"])).toEqual(["bush", "tall", "flower"]);
    expect(potsFor(Array(8).fill("root"))).toHaveLength(5);
  });
});
