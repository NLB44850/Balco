/**
 * La prévision d'Open-Meteo mise au format du moteur de rappels. Logique pure.
 * Une prévision gardée sur le téléphone (hors connexion) se relit à l'heure de maintenant : les 12 prochaines heures
 * et le jour en cours glissent d'autant, dans la limite de ses 4 jours.
 */
import type { WeatherSnapshot } from "@/lib/reminders/reminder-engine";
import type { OpenMeteoPayload } from "@/lib/weather/forecast-client";

/** Une prévision gardée plus longtemps ne sert plus : sans réseau, pas d'alerte plutôt qu'une alerte fausse. */
export const STORED_FORECAST_MAX_MS = 48 * 60 * 60 * 1000;

function numberAt(values: number[] | undefined, index: number, fallback = 0) {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function indexAtOrAfter(times: string[] | undefined, target: string | undefined) {
  if (!times?.length || !target) return 0;
  const index = times.findIndex((time) => time >= target);
  return index === -1 ? 0 : index;
}

const pad = (value: number) => String(value).padStart(2, "0");
/** L'heure locale au format des heures d'Open-Meteo (« 2026-10-17T14:00 »). */
export const localHour = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;

function daysBetween(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

type Place = { city: string; latitude: number; longitude: number };

/** `fetchedAt` : quand la prévision a été reçue (maintenant, ou plus tôt pour une copie gardée). */
export function buildSnapshot(payload: OpenMeteoPayload, place: Place, now = new Date(), fetchedAt = now): WeatherSnapshot {
  const current = payload.current ?? {};
  const hourly = payload.hourly ?? {};
  const daily = payload.daily ?? {};
  const fresh = now.getTime() - fetchedAt.getTime() < 60 * 60 * 1000;
  const startIndex = indexAtOrAfter(hourly.time, fresh ? current.time : localHour(now));
  const nextHours = Array.from({ length: 12 }, (_, offset) => startIndex + offset);
  const day = daysBetween(fetchedAt, now);

  return {
    fetchedAt: fetchedAt.toISOString(),
    timezone: "auto",
    city: place.city,
    latitude: place.latitude,
    longitude: place.longitude,
    elevationM: typeof payload.elevation === "number" ? payload.elevation : undefined,
    current: {
      temperatureC: Number(current.temperature_2m ?? 0),
      apparentTemperatureC: Number(current.apparent_temperature ?? current.temperature_2m ?? 0),
      weatherCode: Number(current.weather_code ?? 0),
    },
    next12h: {
      precipitationMm: nextHours.reduce((sum, index) => sum + numberAt(hourly.precipitation, index), 0),
      precipitationProbabilityMax: Math.max(...nextHours.map((index) => numberAt(hourly.precipitation_probability, index)), 0),
      windGustKmhMax: Math.max(...nextHours.map((index) => numberAt(hourly.wind_gusts_10m, index)), 0),
    },
    today: {
      precipitationMm: numberAt(daily.precipitation_sum, day),
      temperatureMinC: numberAt(daily.temperature_2m_min, day),
      temperatureMaxC: numberAt(daily.temperature_2m_max, day),
      windGustKmhMax: numberAt(daily.wind_gusts_10m_max, day),
    },
    nights: (daily.temperature_2m_min ?? []).slice(day).filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  };
}

/** La copie gardée sur le téléphone est-elle utilisable ici et maintenant ? */
export function storedForecastUsable(stored: { key: string; at: number } | null | undefined, key: string, now = Date.now()) {
  return Boolean(stored && stored.key === key && now - stored.at >= 0 && now - stored.at < STORED_FORECAST_MAX_MS);
}

/** Quand la prévision affichée hors connexion a été reçue : « à 14 h », « hier à 18 h », « avant-hier ». */
export function staleSince(fetchedAt: Date, now = new Date()) {
  const hour = `${fetchedAt.getHours()} h`;
  const days = daysBetween(fetchedAt, now);
  if (days === 0) return `à ${hour}`;
  if (days === 1) return `hier à ${hour}`;
  return "avant-hier";
}

/** Le bandeau « Hors connexion » d'Aujourd'hui. */
export function staleBannerText(fetchedAt: Date, now = new Date()) {
  return `Balco utilise la météo reçue ${staleSince(fetchedAt, now)}. Tes conseils restent valables, et se mettront à jour au retour du réseau.`;
}
