/**
 * La prévision météo de l'app, partagée par tous les écrans : demandée au serveur Balco
 * (`/api/weather`, en cache par zone), sinon directement à Open-Meteo si le serveur ne répond pas.
 * Gardée 10 minutes sur le téléphone : Aujourd'hui et Saisons ne la demandent qu'une fois.
 */
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/api";

export type OpenMeteoPayload = {
  elevation?: number;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  hourly?: {
    time?: string[];
    precipitation?: number[];
    precipitation_probability?: number[];
    wind_gusts_10m?: number[];
  };
  daily?: {
    precipitation_sum?: number[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    wind_gusts_10m_max?: number[];
  };
};

const CLIENT_TTL_MS = 10 * 60 * 1000;
const SERVER_TIMEOUT_MS = 6000;

const QUERY = {
  current: "temperature_2m,apparent_temperature,weather_code,is_day",
  hourly: "precipitation,precipitation_probability,wind_gusts_10m",
  daily: "precipitation_sum,temperature_2m_min,temperature_2m_max,wind_gusts_10m_max",
  forecast_days: "2",
  timezone: "auto",
};

/** Zone d'environ 1 km, comme sur le serveur. */
export function forecastKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

async function fetchJson(url: string, timeoutMs?: number) {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("json")) throw new Error(`weather ${response.status}`);
    return (await response.json()) as OpenMeteoPayload;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function fromServer(latitude: number, longitude: number) {
  const base = getApiBaseUrl();
  // Sans adresse d'API, seul le web peut joindre le serveur (même origine).
  if (!base && Platform.OS !== "web") return Promise.reject(new Error("no api"));
  return fetchJson(`${base}/api/weather?latitude=${latitude}&longitude=${longitude}`, SERVER_TIMEOUT_MS);
}

function fromOpenMeteo(latitude: number, longitude: number) {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), ...QUERY });
  return fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
}

const shared = new Map<string, { at: number; promise: Promise<OpenMeteoPayload> }>();

/** `force` (tirer pour rafraîchir) ignore la copie du téléphone ; le cache du serveur reste utilisé. */
export function loadForecastPayload(latitude: number, longitude: number, options: { force?: boolean; now?: number } = {}) {
  const key = forecastKey(latitude, longitude);
  const now = options.now ?? Date.now();
  const entry = shared.get(key);
  if (!options.force && entry && now - entry.at < CLIENT_TTL_MS) return entry.promise;
  const promise = fromServer(latitude, longitude).catch(() => fromOpenMeteo(latitude, longitude));
  shared.set(key, { at: now, promise });
  // Un échec n'est pas gardé : le prochain écran réessaie.
  promise.catch(() => {
    if (shared.get(key)?.promise === promise) shared.delete(key);
  });
  return promise;
}

export function clearForecastCache() {
  shared.clear();
}
