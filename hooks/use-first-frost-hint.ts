/**
 * Étape 10 : le premier soir de gel, sous l'alerte gel d'Aujourd'hui, une ligne « Avec Balco+, l'alerte arrive même
 * app fermée › » (compte gratuit seulement). Le jour de cette première alerte est gardé sur le téléphone : la ligne ne
 * revient pas les soirs de gel suivants.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const STORAGE_KEY = "balco.plus.frost-hint.v1";

/** La ligne se montre le jour gardé, ou le premier jour d'alerte gel si rien n'est gardé encore. */
export function frostHintShows(storedDay: string | null, today: string) {
  return storedDay === null || storedDay === today;
}

export function useFirstFrostHint(frostToday: boolean, today: string, enabled: boolean) {
  const [storedDay, setStoredDay] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => setStoredDay(value)).catch(() => setStoredDay(null));
  }, []);
  const show = enabled && frostToday && storedDay !== undefined && frostHintShows(storedDay, today);
  useEffect(() => {
    if (show && storedDay === null) {
      setStoredDay(today);
      void AsyncStorage.setItem(STORAGE_KEY, today).catch(() => undefined);
    }
  }, [show, storedDay, today]);
  return show;
}
