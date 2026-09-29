/**
 * La scène du haut de l'accueil : le ciel au-dessus du balcon selon l'heure et la météo
 * (couleurs, soleil ou lune, nuages, pluie ou flocons, force du vent). Logique pure.
 */
import type { WeatherSnapshot } from "../reminders/reminder-engine";

export type SkyMood = "dawn" | "day" | "evening" | "night";
export type SkyWeather = "clear" | "partly" | "cloudy" | "rain" | "storm" | "snow" | "frost" | "heat";

export type SkyScene = {
  mood: SkyMood;
  weather: SkyWeather;
  /** Du haut du ciel vers le bas ; la dernière couleur rejoint le fond blanc de l'écran. */
  gradient: [string, string, string];
  body: "sun" | "moon" | null;
  stars: boolean;
  clouds: number;
  cloudTone: "white" | "grey" | "dark";
  particles: "rain" | "snow" | null;
  /** 0 = air calme, 1 = gros coup de vent : amplitude du balancement des plantes. */
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

// Des ciels pâles : le décor reste en filigrane derrière le texte, de jour comme de nuit.
const DAY: Record<SkyWeather, [string, string]> = {
  clear: ["#D6ECFA", "#EEF7FD"],
  partly: ["#DCEDF7", "#F0F7FB"],
  cloudy: ["#E1E7EC", "#F2F5F7"],
  rain: ["#D5DDE5", "#EDF1F4"],
  storm: ["#C3CBD5", "#E6EAEE"],
  snow: ["#E2EAF2", "#F3F6FA"],
  frost: ["#DDEBF8", "#F1F7FC"],
  heat: ["#FFE4C2", "#FFF4E6"],
};

function gradientFor(mood: SkyMood, weather: SkyWeather): [string, string, string] {
  const grey = weather === "rain" || weather === "storm" || weather === "cloudy";
  if (mood === "night") return grey ? ["#D3D8E2", "#EAECF1", "#FFFFFF"] : ["#D5DBEE", "#ECEEF7", "#FFFFFF"];
  if (mood === "dawn") return grey ? ["#E6E7EC", "#F4F1EF", "#FFFFFF"] : ["#FCE3D6", "#FEF1EA", "#FFFFFF"];
  if (mood === "evening") return grey ? ["#E0DCE3", "#F3EEEE", "#FFFFFF"] : ["#FFDCC2", "#FFEEE3", "#FFFFFF"];
  const [top, middle] = DAY[weather];
  return [top, middle, "#FFFFFF"];
}

export function skyScene(snapshot: WeatherSnapshot, now: Date, isFallback = false): SkyScene {
  const mood = skyMood(now);
  // Tant que la vraie météo n'est pas là, on montre un ciel neutre plutôt qu'une météo inventée.
  const weather: SkyWeather = isFallback ? "partly" : skyWeather(snapshot);
  const gusts = isFallback ? 0 : snapshot.next12h.windGustKmhMax;
  const wind = Math.min(1, Math.max(0.15, (gusts - 10) / 60));
  const covered = weather === "rain" || weather === "storm" || weather === "cloudy" || weather === "snow";
  return {
    mood,
    weather,
    gradient: gradientFor(mood, weather),
    body: covered ? null : mood === "night" ? "moon" : "sun",
    stars: mood === "night" && !covered,
    clouds: weather === "clear" || weather === "heat" || weather === "frost" ? 1 : weather === "partly" ? 2 : 3,
    cloudTone: weather === "storm" ? "dark" : covered ? "grey" : "white",
    particles: weather === "rain" || weather === "storm" ? "rain" : weather === "snow" || weather === "frost" ? "snow" : null,
    wind: weather === "storm" ? Math.max(wind, 0.7) : wind,
    flash: weather === "storm",
  };
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

/** Un pot par plante sur la rambarde (5 au plus) ; une pousse seule quand le balcon est vide. */
export function potsFor(categories: string[], max = 5): PotShape[] {
  if (categories.length === 0) return ["sprout"];
  return categories.slice(0, max).map((category) => SHAPES[category] ?? "bush");
}
