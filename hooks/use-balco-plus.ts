/**
 * Balco+ pour l'app : le forfait du compte, ou l'interrupteur « Simuler Balco+ » de la version de test (choix du 13/10 :
 * un seul interrupteur pour tous les avantages à venir, sur ce téléphone seulement). Il ne change rien au compte ni au
 * serveur : les limites du serveur (questions à Nora, rappels du serveur) restent celles du vrai forfait.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import { WEATHER_SIMULATION_AVAILABLE } from "@/hooks/use-weather-simulation";
import { useGarden } from "@/lib/garden/garden-context";

const STORAGE_KEY = "balco.test.simulate-plus.v1";
const listeners = new Set<(value: boolean) => void>();

export function useBalcoPlus() {
  const { account } = useGarden();
  const [simulated, setSimulatedState] = useState(false);
  useEffect(() => {
    if (!WEATHER_SIMULATION_AVAILABLE) return;
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => setSimulatedState(value === "1")).catch(() => undefined);
    listeners.add(setSimulatedState);
    return () => {
      listeners.delete(setSimulatedState);
    };
  }, []);
  const setSimulated = useCallback(async (value: boolean) => {
    await AsyncStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    listeners.forEach((listener) => listener(value));
  }, []);
  const isSimulated = WEATHER_SIMULATION_AVAILABLE && simulated;
  return { isPlus: account.plan === "plus" || isSimulated, simulated: isSimulated, canSimulate: WEATHER_SIMULATION_AVAILABLE, setSimulated };
}
