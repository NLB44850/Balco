import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/** Les cartes d'événement fermées d'une croix (`sainte-catherine:2026:running`), gardées sur le téléphone. */
const STORAGE_KEY = "balco.events.dismissed.v1";
const listeners = new Set<(keys: string[]) => void>();
let current: string[] = [];
let loading: Promise<void> | null = null;

function load() {
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];
      current = Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
      listeners.forEach((listener) => listener(current));
    })
    .catch(() => undefined);
  return loading;
}

export function useEventDismissals() {
  const [dismissed, setDismissed] = useState<string[]>(current);
  useEffect(() => {
    listeners.add(setDismissed);
    void load().then(() => setDismissed(current));
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
  const restore = useCallback(async (key: string) => {
    current = current.filter((item) => item !== key);
    listeners.forEach((listener) => listener(current));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => undefined);
  }, []);
  return { dismissed, dismiss, restore };
}
