import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * Les cartes d'événement fermées d'une croix (`sainte-catherine:2026:running`) et les grandes cartes d'arrivée déjà vues
 * (`sainte-catherine:2026:intro`), gardées sur le téléphone.
 */
const STORAGE_KEY = "balco.events.dismissed.v1";
const listeners = new Set<(keys: string[]) => void>();
let current: string[] = [];
let loading: Promise<void> | null = null;
let loaded = false;

function load() {
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];
      current = Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
      loaded = true;
      listeners.forEach((listener) => listener(current));
    })
    .catch(() => {
      loaded = true;
    });
  return loading;
}

export function useEventDismissals() {
  const [dismissed, setDismissed] = useState<string[]>(current);
  const [ready, setReady] = useState(loaded);
  useEffect(() => {
    listeners.add(setDismissed);
    void load().then(() => {
      setDismissed(current);
      setReady(true);
    });
    return () => {
      listeners.delete(setDismissed);
    };
  }, []);
  const dismiss = useCallback(async (key: string) => {
    if (current.includes(key)) return;
    current = [...current, key].slice(-50);
    listeners.forEach((listener) => listener(current));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => undefined);
  }, []);
  /** Remet une carte, ou toutes celles qui finissent par ce suffixe (« :intro » : revoir les grandes cartes). */
  const restore = useCallback(async (key: string, { suffix = false } = {}) => {
    current = current.filter((item) => (suffix ? !item.endsWith(key) : item !== key));
    listeners.forEach((listener) => listener(current));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => undefined);
  }, []);
  return { dismissed, loaded: ready, dismiss, restore };
}
