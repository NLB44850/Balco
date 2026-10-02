import { useCallback, useEffect, useState } from "react";

import type { Vacation } from "@/lib/garden/vacation";
import { loadLocalReminderSettings, saveLocalReminderSettings, scheduleVacationReturn, subscribeReminderSettings } from "@/lib/reminders/local-notifications";

/** Les vacances enregistrées (dans les réglages des rappels, synchronisés avec le serveur). */
export function useVacation() {
  const [vacation, setState] = useState<Vacation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void loadLocalReminderSettings().then((settings) => {
      if (!active) return;
      setState(settings.vacation ?? null);
      setLoaded(true);
    });
    const unsubscribe = subscribeReminderSettings((settings) => setState(settings.vacation ?? null));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const setVacation = useCallback(async (next: Vacation | null) => {
    setState(next);
    const settings = await loadLocalReminderSettings();
    const updated = { ...settings, vacation: next };
    await saveLocalReminderSettings(updated);
    await scheduleVacationReturn(next, updated).catch((error) => console.warn("[vacation] return notification", error));
  }, []);

  return { vacation, loaded, setVacation };
}
