import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { WEATHER_SIMULATION_AVAILABLE } from "@/hooks/use-weather-simulation";
import { now, setSimulatedClockDay, simulatedClockDay, subscribeClock } from "@/lib/clock";

/** Comme la simulation météo : versions de test et développement seulement, jamais dans l'app publiée. */
export const DATE_SIMULATION_AVAILABLE = WEATHER_SIMULATION_AVAILABLE;

const STORAGE_KEY = "balco.clock.simulation.v1";
let loading: Promise<void> | null = null;

/** Relit le jour simulé une seule fois au lancement (sans effet dans l'app publiée). */
export function loadDateSimulation() {
  if (!DATE_SIMULATION_AVAILABLE) return Promise.resolve();
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => setSimulatedClockDay(stored || null))
    .catch(() => undefined);
  return loading;
}

/** Le jour simulé, partagé par tous les écrans ; null = le vrai jour. */
export function useDateSimulation() {
  const [day, setDayState] = useState<string | null>(simulatedClockDay());

  useEffect(() => {
    if (!DATE_SIMULATION_AVAILABLE) return;
    void loadDateSimulation().then(() => setDayState(simulatedClockDay()));
    return subscribeClock(setDayState);
  }, []);

  const setDay = useCallback(async (next: string | null) => {
    if (!DATE_SIMULATION_AVAILABLE) return;
    setSimulatedClockDay(next);
    await (next ? AsyncStorage.setItem(STORAGE_KEY, next) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => undefined);
  }, []);

  return { day: DATE_SIMULATION_AVAILABLE ? day : null, setDay, available: DATE_SIMULATION_AVAILABLE };
}

/** « Maintenant » pour un écran : relu à chaque retour sur l'écran et à chaque changement du jour simulé. */
export function useNow() {
  const [current, setCurrent] = useState(now);
  useFocusEffect(useCallback(() => setCurrent(now()), []));
  useEffect(() => subscribeClock(() => setCurrent(now())), []);
  return current;
}
