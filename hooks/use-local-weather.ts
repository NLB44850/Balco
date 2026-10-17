import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

import {
  decideReminder,
  type MaintenanceEvent,
  type PlantCareProfile,
  type ReminderDecision,
  type ReminderSettings,
  type WeatherSnapshot,
} from "@/lib/reminders/reminder-engine";
import { forecastKey, loadForecastPayload, type OpenMeteoPayload } from "@/lib/weather/forecast-client";
import { buildSnapshot, storedForecastUsable } from "@/lib/weather/snapshot";
import { applyWeatherScenario, scenarioLabel } from "@/lib/weather/simulation";

import { useWeatherSimulation } from "./use-weather-simulation";

export type LocalWeather = {
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  isDay: boolean;
  summary: string;
  /** Ville inconnue : météo de Paris par défaut. */
  isFallback: boolean;
  /** Aucune prévision (pas de réseau, rien de gardé) : le relevé affiché n'est pas une vraie météo. */
  offline: boolean;
  /** Prévision gardée sur le téléphone, reçue à cette date (hors connexion). */
  staleAt: string | null;
  /** Une vraie prévision de la ville de la personne : les conseils et alertes météo peuvent s'en servir. */
  usable: boolean;
  snapshot: WeatherSnapshot;
};

export type CityResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

type LocationPreference =
  | { mode: "device"; city: string; latitude: number; longitude: number }
  | { mode: "manual"; city: string; latitude: number; longitude: number }
  | { mode: "denied" };

type UseLocalWeatherOptions = {
  plant?: PlantCareProfile;
  history?: MaintenanceEvent[];
  reminderSettings?: ReminderSettings;
  lastReminderAt?: string;
};

const STORAGE_KEY = "balco.location.preference.v1";
/** La dernière vraie prévision reçue, relue hors connexion (48 h au plus). */
const LAST_FORECAST_KEY = "balco.weather.last-forecast.v1";
type StoredForecast = { key: string; at: number; payload: OpenMeteoPayload };

async function readStoredForecast(): Promise<StoredForecast | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_FORECAST_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredForecast) : null;
    return parsed && typeof parsed.key === "string" && typeof parsed.at === "number" && parsed.payload ? parsed : null;
  } catch {
    return null;
  }
}
const PARIS_COORDINATES = { city: "Paris", latitude: 48.8566, longitude: 2.3522 };

function describeWeather(code: number, isDay: boolean) {
  if (code === 0) return isDay ? "Soleil doux sur ton balcon" : "Nuit claire sur ton balcon";
  if ([1, 2].includes(code)) return "Éclaircies, parfait pour observer";
  if (code === 3) return "Ciel couvert, lumière douce";
  if ([45, 48].includes(code)) return "Brume légère, arrose peu";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Averses : laisse la pluie aider";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Froid vif : protège tes pousses";
  if ([95, 96, 99].includes(code)) return "Orage : mets les plantes à l'abri";
  return "Regarde ton balcon, il te dira quoi faire";
}

function fallbackSnapshot(city: string, latitude: number, longitude: number): WeatherSnapshot {
  return {
    fetchedAt: new Date(0).toISOString(),
    timezone: "Europe/Paris",
    city,
    latitude,
    longitude,
    current: { temperatureC: 22, apparentTemperatureC: 22, weatherCode: 0 },
    next12h: { precipitationMm: 0, precipitationProbabilityMax: 0, windGustKmhMax: 0 },
    today: { precipitationMm: 0, temperatureMinC: 14, temperatureMaxC: 22, windGustKmhMax: 0 },
  };
}

// Tous les écrans (Aujourd'hui, Saisons…) partagent la même ville : un changement fait dans l'un
// prévient les autres, sinon un écran resté ouvert renverrait l'ancienne ville au serveur.
const preferenceListeners = new Set<(preference: LocationPreference) => void>();

async function savePreference(preference: LocationPreference) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  preferenceListeners.forEach((listener) => listener(preference));
}

/** Nom de la ville d'après la position, quand le téléphone ne le donne pas (navigateur web). */
async function cityFromCoordinates(latitude: number, longitude: number) {
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`);
    if (!response.ok) return null;
    const place = (await response.json()) as { city?: string; locality?: string };
    return place.city?.trim() || place.locality?.trim() || null;
  } catch {
    return null;
  }
}

export function useLocalWeather(options: UseLocalWeatherOptions = {}) {
  const [weather, setWeather] = useState<LocalWeather>(() => {
    const snapshot = fallbackSnapshot(PARIS_COORDINATES.city, PARIS_COORDINATES.latitude, PARIS_COORDINATES.longitude);
    return {
      city: snapshot.city,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      temperature: snapshot.current.temperatureC,
      apparentTemperature: snapshot.current.apparentTemperatureC,
      weatherCode: snapshot.current.weatherCode,
      isDay: true,
      summary: "Soleil doux sur ton balcon",
      isFallback: true,
      offline: false,
      staleAt: null,
      usable: false,
      snapshot,
    };
  });
  const [preference, setPreference] = useState<LocationPreference | null>(null);
  const [isPreferenceLoaded, setIsPreferenceLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = useCallback(async (latitude: number, longitude: number, city: string, isFallback = false, force = false) => {
    setIsLoading(true);
    try {
      // Partagée entre les écrans et mise en cache par le serveur (lib/weather/forecast-client.ts).
      const payload = await loadForecastPayload(latitude, longitude, { force }).catch(() => {
        throw new Error("Le service météo est indisponible.");
      });
      const current = payload.current ?? {};
      const isDay = Boolean(current.is_day);
      const snapshot = buildSnapshot(payload, { city, latitude, longitude });
      setWeather({
        city,
        latitude,
        longitude,
        temperature: snapshot.current.temperatureC,
        apparentTemperature: snapshot.current.apparentTemperatureC,
        weatherCode: snapshot.current.weatherCode,
        isDay,
        summary: describeWeather(snapshot.current.weatherCode, isDay),
        isFallback,
        offline: false,
        staleAt: null,
        usable: !isFallback,
        snapshot,
      });
      setError(null);
      void AsyncStorage.setItem(LAST_FORECAST_KEY, JSON.stringify({ key: forecastKey(latitude, longitude), at: Date.now(), payload } satisfies StoredForecast)).catch(() => undefined);
    } catch (weatherError) {
      setError(weatherError instanceof Error ? weatherError.message : "Météo indisponible, affichage du dernier relevé.");
      // Hors connexion : la dernière vraie prévision de cette ville (48 h au plus), relue à l'heure de maintenant.
      // Sans elle, aucune alerte : mieux vaut se taire qu'annoncer un temps inventé.
      const stored = await readStoredForecast();
      if (stored && storedForecastUsable(stored, forecastKey(latitude, longitude))) {
        const isDay = Boolean(stored.payload.current?.is_day);
        const snapshot = buildSnapshot(stored.payload, { city, latitude, longitude }, new Date(), new Date(stored.at));
        setWeather({ city, latitude, longitude, temperature: snapshot.current.temperatureC, apparentTemperature: snapshot.current.apparentTemperatureC, weatherCode: snapshot.current.weatherCode, isDay, summary: describeWeather(snapshot.current.weatherCode, isDay), isFallback, offline: false, staleAt: snapshot.fetchedAt, usable: !isFallback, snapshot });
      } else {
        setWeather((previous) => {
          // Une prévision déjà reçue pour cette ville pendant que l'app était ouverte reste valable.
          const sameZone = !previous.offline && previous.snapshot.fetchedAt !== new Date(0).toISOString() && forecastKey(previous.latitude, previous.longitude) === forecastKey(latitude, longitude);
          if (sameZone) return { ...previous, city, isFallback, staleAt: previous.staleAt ?? previous.snapshot.fetchedAt, usable: !isFallback };
          return { ...previous, city, latitude, longitude, isFallback, offline: true, staleAt: null, usable: false };
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Demande la position du téléphone (sa fenêtre n'arrive qu'à ce moment-là) ; true si elle est obtenue. */
  const requestDeviceLocation = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && !window.navigator.geolocation) {
        throw new Error("La géolocalisation n'est pas disponible dans ce navigateur.");
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) throw new Error("Les services de localisation sont désactivés.");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        await savePreference({ mode: "denied" });
        setPreference({ mode: "denied" });
        throw new Error("Permission de localisation refusée. Tu peux choisir une ville manuellement.");
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      let city = "Ma position";
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        city = places[0]?.city || places[0]?.district || places[0]?.region || city;
      } catch {
        // Le nom de ville est optionnel : les coordonnées suffisent pour la météo.
      }
      if (city === "Ma position") city = (await cityFromCoordinates(latitude, longitude)) ?? city;
      const nextPreference: LocationPreference = { mode: "device", city, latitude, longitude };
      await savePreference(nextPreference);
      setPreference(nextPreference);
      await loadForecast(latitude, longitude, city);
      return true;
    } catch (locationError) {
      const message = locationError instanceof Error ? locationError.message : "Position indisponible, affichage de Paris.";
      setError(message);
      if (!preference || preference.mode === "denied") await loadForecast(PARIS_COORDINATES.latitude, PARIS_COORDINATES.longitude, PARIS_COORDINATES.city, true);
      else setIsLoading(false);
      return false;
    }
  }, [loadForecast, preference]);

  const selectCity = useCallback(async (city: CityResult) => {
    const nextPreference: LocationPreference = { mode: "manual", city: city.name, latitude: city.latitude, longitude: city.longitude };
    await savePreference(nextPreference);
    setPreference(nextPreference);
    await loadForecast(city.latitude, city.longitude, city.name);
  }, [loadForecast]);

  const searchCities = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [] as CityResult[];
    const endpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=fr&format=json`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("La recherche de ville est indisponible.");
    const payload = await response.json();
    return (payload.results ?? []) as CityResult[];
  }, []);

  const refresh = useCallback(async () => {
    if (preference?.mode === "device" || preference?.mode === "manual") {
      await loadForecast(preference.latitude, preference.longitude, preference.city, false, true);
      return;
    }
    // Pas de ville choisie (refusée ou « Plus tard ») : Paris par défaut, sans redemander la position.
    await loadForecast(PARIS_COORDINATES.latitude, PARIS_COORDINATES.longitude, PARIS_COORDINATES.city, true, true);
  }, [loadForecast, preference]);

  useEffect(() => {
    const listener = (next: LocationPreference) => setPreference(next);
    preferenceListeners.add(listener);
    return () => {
      preferenceListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          try {
            setPreference(JSON.parse(stored) as LocationPreference);
          } catch {
            setPreference({ mode: "denied" });
          }
        }
        setIsPreferenceLoaded(true);
      })
      .catch(() => {
        if (active) {
          setPreference({ mode: "denied" });
          setIsPreferenceLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isPreferenceLoaded) return;
    // La position n'est jamais demandée d'office : seulement par « Utiliser ma position » (accueil, choix de
    // la ville). Sans ville, Paris par défaut et le bandeau « Choisir ma ville » d'Aujourd'hui.
    if (preference?.mode === "device" || preference?.mode === "manual") {
      void loadForecast(preference.latitude, preference.longitude, preference.city);
    } else {
      void loadForecast(PARIS_COORDINATES.latitude, PARIS_COORDINATES.longitude, PARIS_COORDINATES.city, true);
    }
  }, [isPreferenceLoaded, loadForecast, preference]);

  // Version de test : la météo réelle est remplacée par le scénario choisi dans le profil.
  const { scenario } = useWeatherSimulation();
  const realWeather = weather;
  const simulated = useMemo<LocalWeather>(() => {
    if (scenario === "none" || !realWeather.usable) return realWeather;
    const snapshot = applyWeatherScenario(realWeather.snapshot, scenario);
    return { ...realWeather, snapshot, weatherCode: snapshot.current.weatherCode, temperature: snapshot.current.temperatureC, apparentTemperature: snapshot.current.apparentTemperatureC, summary: `Simulation : ${scenarioLabel(scenario).toLowerCase()}` };
  }, [realWeather, scenario]);

  const reminderDecision = useMemo<ReminderDecision | null>(() => {
    if (!options.plant || !simulated.usable) return null;
    return decideReminder({
      plant: options.plant,
      history: options.history ?? [],
      weather: simulated.snapshot,
      settings: options.reminderSettings,
      lastReminderAt: options.lastReminderAt,
    });
  }, [options.history, options.lastReminderAt, options.plant, options.reminderSettings, simulated.usable, simulated.snapshot]);

  return {
    weather: simulated,
    weatherSnapshot: simulated.snapshot,
    reminderDecision,
    isLoading,
    error,
    refresh,
    requestDeviceLocation,
    searchCities,
    selectCity,
    preference,
  };
}
