/**
 * Le plan du jour partagé par Aujourd'hui, Balcon et la fiche plante : la même météo, les mêmes
 * réglages de rappels et les mêmes « Pas aujourd'hui », donc le même geste et la même couleur partout.
 */
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocalWeather } from "@/hooks/use-local-weather";
import { planDay } from "@/lib/garden/day-plan";
import { postponedStarts } from "@/lib/garden/postpone";
import { skippedRepots } from "@/lib/garden/repot-skip";
import { endsWithSeason, harvestEndStates, markHarvestAsked, markSeasonAsked, markSeasonFrost, potIsFree } from "@/lib/garden/harvest-end";
import { dayKey } from "@/lib/garden/garden-logic";
import { useGarden } from "@/lib/garden/garden-context";
import { careProfileFor } from "@/lib/garden/garden-logic";
import { climateZoneFor } from "@/lib/plants/climate";
import { withoutSnoozed, type ReminderSnooze } from "@/lib/reminders/reminder-actions";
import { decideReminders } from "@/lib/reminders/reminder-engine";
import { groupReminders, selectGroups } from "@/lib/reminders/reminder-groups";
import {
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  loadReminderSnoozes,
  saveReminderSnoozes,
  subscribeReminderSettings,
  subscribeReminderSnoozes,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";

export function useDayPlan() {
  const { resolvedPlants, events } = useGarden();
  const local = useLocalWeather();
  const { weather, weatherSnapshot } = local;
  const [now, setNow] = useState(() => new Date());
  const [snoozes, setSnoozes] = useState<ReminderSnooze[]>([]);
  const [snoozesLoaded, setSnoozesLoaded] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [reminderSettingsLoaded, setReminderSettingsLoaded] = useState(false);

  // L'heure et les réglages se relisent à chaque retour sur l'écran.
  useFocusEffect(useCallback(() => {
    setNow(new Date());
    let active = true;
    loadLocalReminderSettings().then((settings) => {
      if (!active) return;
      setReminderSettings(settings);
      setReminderSettingsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []));
  useEffect(() => subscribeReminderSettings((settings) => setReminderSettings(settings)), []);
  useEffect(() => {
    void loadReminderSnoozes().then((stored) => {
      setSnoozes(stored);
      setSnoozesLoaded(true);
    });
    return subscribeReminderSnoozes(setSnoozes);
  }, []);

  const climate = useMemo(() => (weather.isFallback ? null : climateZoneFor(weather.latitude, weather.longitude, weatherSnapshot.elevationM)), [weather.isFallback, weather.latitude, weather.longitude, weatherSnapshot.elevationM]);
  const harvestEnds = useMemo(() => harvestEndStates(snoozes, now), [now, snoozes]);
  const reminderPlants = useMemo(
    // Une plante à planter n'est pas encore en terre, un pot libre est vide : ni soif ni alerte météo.
    () => resolvedPlants.filter((resolved) => !resolved.plant.toPlant && !potIsFree(resolved, harvestEnds.get(resolved.plant.id)) && (reminderSettings.enabledPlantIds.length === 0 || reminderSettings.enabledPlantIds.includes(resolved.plant.id))),
    [harvestEnds, reminderSettings.enabledPlantIds, resolvedPlants],
  );
  // Tous les conseils météo du moment (« rappels activés » ne décide que des notifications).
  const allDecisions = useMemo(() => {
    if (!reminderSettingsLoaded || weather.isFallback) return [];
    const settings = { enabled: true, skipWateringWhenRainExpected: reminderSettings.skipWateringWhenRainExpected, maxNormalRemindersPerDay: reminderSettings.maxNormalRemindersPerDay };
    return decideReminders(reminderPlants.map((resolved) => ({ plant: careProfileFor(resolved), history: events, weather: weatherSnapshot, settings })));
  }, [events, reminderPlants, reminderSettings, reminderSettingsLoaded, weather.isFallback, weatherSnapshot]);
  // Pour les notifications : toutes les alertes importantes, puis au plus N conseils ordinaires.
  const reminderDecisions = useMemo(() => selectGroups(groupReminders(allDecisions), reminderSettings.maxNormalRemindersPerDay).flatMap((group) => group.decisions), [allDecisions, reminderSettings.maxNormalRemindersPerDay]);
  const visibleDecisions = useMemo(() => withoutSnoozed(allDecisions, snoozes, new Date()), [allDecisions, snoozes]);
  const visibleGroups = useMemo(() => groupReminders(visibleDecisions), [visibleDecisions]);
  const postponed = useMemo(() => postponedStarts(snoozes, now), [now, snoozes]);
  const repotSkips = useMemo(() => skippedRepots(snoozes, now), [now, snoozes]);
  const plan = useMemo(() => planDay({ plants: resolvedPlants, events, now, decisions: visibleDecisions, allDecisions, climate, postponed, repotSkips, harvestEnds }), [allDecisions, climate, events, harvestEnds, now, postponed, repotSkips, resolvedPlants, visibleDecisions]);

  // « Tes radis sont-ils tous récoltés ? » ne se pose qu'un jour, « Ta saison de basilic est finie ? » un jour puis
  // une relance : on note le jour où elle s'affiche. Et le soir de gel qui finit la saison d'une annuelle frileuse.
  useEffect(() => {
    if (!snoozesLoaded) return;
    const today = dayKey(now);
    const asked = plan.filter((day) => {
      if (day.first?.source.type !== "harvest-end" || day.first.source.stage !== "question") return false;
      const state = harvestEnds.get(day.resolved.plant.id);
      return endsWithSeason(day.resolved.entry) ? !state?.seasonAsked?.includes(today) : !state?.askedOn;
    });
    const frosts = allDecisions.filter((decision) => decision.cause === "frost" && decision.taskType === "harvest" && !harvestEnds.get(decision.plantId)?.frostOn);
    if (asked.length === 0 && frosts.length === 0) return;
    void loadReminderSnoozes().then((stored) => {
      let next = asked.reduce((current, day) => (endsWithSeason(day.resolved.entry) ? markSeasonAsked : markHarvestAsked)(current, day.resolved.plant.id, now), stored);
      next = frosts.reduce((current, decision) => markSeasonFrost(current, decision.plantId, now), next);
      return saveReminderSnoozes(next);
    });
  }, [allDecisions, harvestEnds, now, plan, snoozesLoaded]);

  // Prêt quand la météo (ou son repli) et les réglages sont là : avant, l'état d'une plante changerait
  // sous les yeux (« En forme », puis « À surveiller » une fois la soif connue).
  const ready = !local.isLoading && reminderSettingsLoaded && snoozesLoaded;

  return {
    ...local,
    ready,
    now,
    setNow,
    climate,
    snoozes,
    snoozesLoaded,
    reminderSettings,
    setReminderSettings,
    reminderSettingsLoaded,
    allDecisions,
    reminderDecisions,
    visibleGroups,
    plan,
  };
}
