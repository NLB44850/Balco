import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClimateInfo } from "@/lib/plants/climate";
import type { ReminderCause } from "@/lib/reminders/reminder-engine";
import { emptyTipState, tipHidden, tipOfTheWeek, weekKey, type TipState } from "@/lib/tips/tips";

/** L'astuce de la semaine, celles déjà montrées et la croix, gardées sur le téléphone. */
const STORAGE_KEY = "balco.tips.v1";

export function useTipOfTheWeek({ now, climate, owned, weather, enabled }: { now: Date; climate: ClimateInfo | null; owned: string[]; weather: ReminderCause[]; enabled: boolean }) {
  const [state, setState] = useState<TipState | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => setState(stored ? { ...emptyTipState(), ...(JSON.parse(stored) as TipState) } : emptyTipState()))
      .catch(() => setState(emptyTipState()));
  }, []);
  const ownedKey = owned.join(",");
  const weatherKey = weather.join(",");
  const result = useMemo(
    () => (state && enabled ? tipOfTheWeek({ now, climate, owned: ownedKey ? ownedKey.split(",") : [], weather: weatherKey ? (weatherKey.split(",") as ReminderCause[]) : [], state }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, enabled, weekKey(now), now.getMonth(), climate?.zone, ownedKey, weatherKey],
  );
  // La semaine choisit son astuce une fois : elle est notée pour ne pas revenir dans l'année.
  useEffect(() => {
    if (!result || !state || result.state === state) return;
    setState(result.state);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result.state)).catch(() => undefined);
  }, [result, state]);
  const dismiss = useCallback(() => {
    setState((current) => {
      const next = { ...(current ?? emptyTipState()), dismissedWeek: weekKey(now) };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, [now]);
  const tip = result?.tip && state && !tipHidden(state, now) ? result.tip : null;
  return { tip, dismiss };
}
