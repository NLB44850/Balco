import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { WeatherScenario } from "@/lib/weather/simulation";

/** Réservé aux versions de test (profil EAS « test ») et au développement : jamais en production. */
export const WEATHER_SIMULATION_AVAILABLE = __DEV__ || process.env.EXPO_PUBLIC_WEATHER_SIMULATION === "1";

const STORAGE_KEY = "balco.weather.simulation.v1";
const listeners = new Set<(scenario: WeatherScenario) => void>();
let current: WeatherScenario = "none";

/** Le scénario météo simulé, partagé entre l'accueil et le profil. */
export function useWeatherSimulation() {
  const [scenario, setScenarioState] = useState<WeatherScenario>(current);

  useEffect(() => {
    if (!WEATHER_SIMULATION_AVAILABLE) return;
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        current = stored as WeatherScenario;
        setScenarioState(current);
      })
      .catch(() => undefined);
    listeners.add(setScenarioState);
    return () => {
      active = false;
      listeners.delete(setScenarioState);
    };
  }, []);

  const setScenario = useCallback(async (next: WeatherScenario) => {
    current = next;
    listeners.forEach((listener) => listener(next));
    await AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  return { scenario: WEATHER_SIMULATION_AVAILABLE ? scenario : ("none" as WeatherScenario), setScenario, available: WEATHER_SIMULATION_AVAILABLE };
}
