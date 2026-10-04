/**
 * Météo de l'app servie par le serveur (`GET /api/weather`), avec un cache par zone d'environ 1 km :
 * les voisins et les écrans rouverts partagent la même prévision, Open-Meteo n'est appelé qu'une fois
 * par zone toutes les 30 minutes (WEATHER_CACHE_MINUTES). La réponse garde le format d'Open-Meteo,
 * que l'app sait déjà lire ; sans serveur joignable, l'app appelle Open-Meteo elle-même.
 */
const OPEN_METEO_URL = process.env.OPEN_METEO_URL || "https://api.open-meteo.com/v1/forecast";

/** Zones gardées au plus : au-delà, les plus anciennes partent (une zone ≈ quelques Ko). */
const MAX_ZONES = 5000;

export function weatherCacheMinutes() {
  const value = Number.parseInt(process.env.WEATHER_CACHE_MINUTES ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

type Entry = { expiresAt: number; payload: Promise<unknown> };
const cache = new Map<string, Entry>();

/** Coordonnées arrondies au centième de degré (~1 km) : la clé de la zone et ce qu'on demande à Open-Meteo. */
export function forecastZone(latitude: number, longitude: number) {
  return { latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100 };
}

export function isValidCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

async function fetchForecast(latitude: number, longitude: number) {
  const url = new URL(OPEN_METEO_URL);
  // Mêmes champs que ceux que l'app demandait directement (hooks/use-local-weather.ts).
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    hourly: "precipitation,precipitation_probability,wind_gusts_10m",
    daily: "precipitation_sum,temperature_2m_min,temperature_2m_max,wind_gusts_10m_max",
    forecast_days: "2",
    timezone: "auto",
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Open-Meteo failed with ${response.status}`);
  return response.json() as Promise<unknown>;
}

/** La zone a-t-elle une prévision fraîche en cache ? (Seuls les appels qui iront jusqu'à Open-Meteo sont limités.) */
export function isForecastCached(latitude: number, longitude: number, now = Date.now()) {
  const zone = forecastZone(latitude, longitude);
  return (cache.get(`${zone.latitude.toFixed(2)},${zone.longitude.toFixed(2)}`)?.expiresAt ?? 0) > now;
}

export type ForecastResult = { payload: unknown; cached: boolean; zone: string };

/** La prévision de la zone, depuis le cache s'il est encore frais ; deux demandes simultanées partagent l'appel. */
export async function forecastFor(latitude: number, longitude: number, now = Date.now()): Promise<ForecastResult> {
  const zone = forecastZone(latitude, longitude);
  const key = `${zone.latitude.toFixed(2)},${zone.longitude.toFixed(2)}`;
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) return { payload: await entry.payload, cached: true, zone: key };
  const payload = fetchForecast(zone.latitude, zone.longitude);
  cache.delete(key);
  cache.set(key, { expiresAt: now + weatherCacheMinutes() * 60_000, payload });
  if (cache.size > MAX_ZONES) cache.delete(cache.keys().next().value!);
  try {
    return { payload: await payload, cached: false, zone: key };
  } catch (error) {
    // Un échec n'est pas gardé : la demande suivante réessaie.
    if (cache.get(key)?.payload === payload) cache.delete(key);
    throw error;
  }
}

export function clearWeatherCache() {
  cache.clear();
}
