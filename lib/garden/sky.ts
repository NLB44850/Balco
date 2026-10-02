/**
 * La lumière sur le balcon selon l'heure et la météo : couleur du fond, force et teinte des
 * ombres, sens du soleil, pluie ou flocons, force du vent. Logique pure.
 */
import type { WeatherSnapshot } from "../reminders/reminder-engine";

export type SkyMood = "dawn" | "day" | "evening" | "night";
export type SkyWeather = "clear" | "partly" | "cloudy" | "rain" | "storm" | "snow" | "frost" | "heat";

export type SkyScene = {
  mood: SkyMood;
  weather: SkyWeather;
  /** Le fond, du haut vers le bas : la lumière qui tombe sur le balcon. */
  background: [string, string, string];
  /** La couleur des ombres (chaude le jour, bleutée au clair de lune). */
  shadowTint: string;
  /** 0 = pas d'ombre (ciel couvert), 1 = plein soleil. */
  shadow: number;
  /** Nuages de passage : les ombres s'effacent puis reviennent. */
  passingClouds: boolean;
  /** L'après-midi, le soleil vient de l'autre côté : les ombres penchent dans l'autre sens. */
  mirrored: boolean;
  /** Ombres plus longues quand le soleil est bas. */
  lowSun: boolean;
  particles: "rain" | "snow" | null;
  /** 0 = air calme, 1 = gros coup de vent : amplitude du balancement des feuillages. */
  wind: number;
  flash: boolean;
};

export function skyMood(now: Date): SkyMood {
  const hour = now.getHours();
  if (hour < 7 || hour >= 21) return "night";
  if (hour < 9) return "dawn";
  if (hour < 18) return "day";
  return "evening";
}

/** Codes météo WMO (Open-Meteo) et chiffres du jour → le temps qu'on voit par la fenêtre. */
export function skyWeather(snapshot: WeatherSnapshot): SkyWeather {
  const code = snapshot.current.weatherCode;
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (snapshot.today.temperatureMinC <= 0) return "frost";
  if (snapshot.today.temperatureMaxC >= 30 || snapshot.current.temperatureC >= 30) return "heat";
  if (code === 45 || code === 48 || code === 3) return "cloudy";
  if (code === 1 || code === 2) return "partly";
  return "clear";
}

type Light = { background: [string, string, string]; shadowTint: string; shadow: number };

const DAYLIGHT: Record<SkyWeather, Light> = {
  clear: { background: ["#FFF6E6", "#FBF8F2", "#F5F3EE"], shadowTint: "#2E3A2C", shadow: 1 },
  partly: { background: ["#FDF6EA", "#FAF8F3", "#F4F3EF"], shadowTint: "#2E3A2C", shadow: 0.9 },
  heat: { background: ["#FFEBCF", "#FFF4E6", "#F8F1E6"], shadowTint: "#3A3222", shadow: 1.15 },
  frost: { background: ["#F1F6FB", "#F7F9FB", "#F1F3F5"], shadowTint: "#26364A", shadow: 0.85 },
  cloudy: { background: ["#F0F1F2", "#F5F5F4", "#EFEFED"], shadowTint: "#2E3A2C", shadow: 0.18 },
  rain: { background: ["#E7EBEF", "#F0F2F4", "#ECEEF0"], shadowTint: "#2A3440", shadow: 0.1 },
  storm: { background: ["#DDE2E8", "#EBEEF1", "#E8EAED"], shadowTint: "#2A3440", shadow: 0.06 },
  snow: { background: ["#EDF1F6", "#F5F7FA", "#F0F2F5"], shadowTint: "#2A3440", shadow: 0.12 },
};

function lightFor(mood: SkyMood, weather: SkyWeather): Light {
  const day = DAYLIGHT[weather];
  const covered = day.shadow < 0.5;
  if (mood === "night") return { background: ["#E6E9F3", "#EEF0F6", "#ECEEF3"], shadowTint: "#1E2A4A", shadow: covered ? 0.05 : 0.5 };
  if (mood === "dawn") return covered ? day : { background: ["#FCE8DA", "#FBF4EE", "#F5F2EE"], shadowTint: "#46322A", shadow: day.shadow * 0.8 };
  if (mood === "evening") return covered ? day : { background: ["#FFE0C7", "#FBF0E6", "#F4EFEA"], shadowTint: "#4A2F22", shadow: day.shadow * 0.9 };
  return day;
}

export function skyScene(snapshot: WeatherSnapshot, now: Date, isFallback = false): SkyScene {
  const mood = skyMood(now);
  // Tant que la vraie météo n'est pas là, on montre un temps doux plutôt qu'une météo inventée.
  const weather: SkyWeather = isFallback ? "partly" : skyWeather(snapshot);
  const gusts = isFallback ? 0 : snapshot.next12h.windGustKmhMax;
  const wind = Math.min(1, Math.max(0.15, (gusts - 10) / 60));
  const light = lightFor(mood, weather);
  return {
    mood,
    weather,
    ...light,
    passingClouds: weather === "partly" && light.shadow > 0.3,
    mirrored: now.getHours() >= 13,
    lowSun: mood === "dawn" || mood === "evening",
    particles: weather === "rain" || weather === "storm" ? "rain" : weather === "snow" ? "snow" : null,
    wind: weather === "storm" ? Math.max(wind, 0.7) : wind,
    flash: weather === "storm",
  };
}

// Une météo neutre pour les écrans qui n'ont pas encore la vraie : seule l'heure compte.
const NEUTRAL: WeatherSnapshot = {
  fetchedAt: new Date(0).toISOString(),
  timezone: "Europe/Paris",
  city: "",
  latitude: 0,
  longitude: 0,
  current: { temperatureC: 15, apparentTemperatureC: 15, weatherCode: 2 },
  next12h: { precipitationMm: 0, precipitationProbabilityMax: 0, windGustKmhMax: 0 },
  today: { precipitationMm: 0, temperatureMinC: 10, temperatureMaxC: 20, windGustKmhMax: 0 },
};

/** La lumière du moment quand la météo n'est pas (encore) connue. */
export function defaultSkyScene(now: Date) {
  return skyScene(NEUTRAL, now, true);
}

export type PotShape = "bush" | "flower" | "tall" | "leafy" | "berry" | "sprout";

const SHAPES: Record<string, PotShape> = {
  aromatic: "bush",
  flower: "flower",
  "fruiting-vegetable": "tall",
  "leafy-vegetable": "leafy",
  root: "leafy",
  "small-fruit": "berry",
};

/** La silhouette peinte qui correspond à une famille de plantes. */
export function potShapeFor(category: string): PotShape {
  return SHAPES[category] ?? "bush";
}

/** Un pot par plante sur la rambarde (5 au plus) ; une pousse seule quand le balcon est vide. */
export function potsFor(categories: string[], max = 5): PotShape[] {
  if (categories.length === 0) return ["sprout"];
  return categories.slice(0, max).map(potShapeFor);
}
