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
import { endsWithSeason, harvestEndStates, markHarvestAsked, markSeasonAsked, markSeasonFrost, potIsFree, settleLongOverSeasons } from "@/lib/garden/harvest-end";
import { dayKey, lastEventDate } from "@/lib/garden/garden-logic";
import { useBalcoPlus } from "@/hooks/use-balco-plus";
import { coachAdvice } from "@/lib/plants/watering-coach";
import { useGarden } from "@/lib/garden/garden-context";
import { careProfileFor } from "@/lib/garden/garden-logic";
import { climateZoneFor } from "@/lib/plants/climate";
import { now as clockNow, subscribeClock } from "@/lib/clock";
import { withoutSnoozed, type ReminderSnooze } from "@/lib/reminders/reminder-actions";
import { decideReminders } from "@/lib/reminders/reminder-engine";
import { groupReminders, selectGroups } from "@/lib/reminders/reminder-groups";
import { isFollowed } from "@/lib/reminders/settings-text";
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
  const { resolvedPlants, events, onboarding } = useGarden();
  const local = useLocalWeather();
  const { weather, weatherSnapshot } = local;
  const [now, setNow] = useState(clockNow);
  const [snoozes, setSnoozes] = useState<ReminderSnooze[]>([]);
  const [snoozesLoaded, setSnoozesLoaded] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [reminderSettingsLoaded, setReminderSettingsLoaded] = useState(false);

  // L'heure et les réglages se relisent à chaque retour sur l'écran.
  useFocusEffect(useCallback(() => {
    setNow(clockNow());
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
  // Version de test : un autre jour simulé se voit tout de suite.
  useEffect(() => subscribeClock(() => setNow(clockNow())), []);
  useEffect(() => {
    void loadReminderSnoozes().then((stored) => {
      setSnoozes(stored);
      setSnoozesLoaded(true);
    });
    return subscribeReminderSnoozes(setSnoozes);
  }, []);

  const climate = useMemo(() => (weather.isFallback ? null : climateZoneFor(weather.latitude, weather.longitude, weatherSnapshot.elevationM)), [weather.isFallback, weather.latitude, weather.longitude, weatherSnapshot.elevationM]);
  // Une saison finie depuis plus de 6 mois sans réponse : tenue pour finie (pot libre), plus de question.
  const harvestEnds = useMemo(() => settleLongOverSeasons(harvestEndStates(snoozes, now), resolvedPlants, events, now, climate), [climate, events, now, resolvedPlants, snoozes]);
  const reminderPlants = useMemo(
    // Une plante à planter n'est pas encore en terre, un pot libre est vide : ni soif ni alerte météo.
    () => resolvedPlants.filter((resolved) => !resolved.plant.toPlant && !potIsFree(resolved, harvestEnds.get(resolved.plant.id))),
    [harvestEnds, resolvedPlants],
  );
  // Balco+ (ou « Simuler Balco+ ») : le coach d'arrosage, plante par plante, avec la météo du jour (étape 6b).
  const { isPlus } = useBalcoPlus();
  const coach = useMemo(() => {
    if (!isPlus || weather.isFallback) return undefined;
    const balcony = onboarding?.skipped ? {} : { orientation: onboarding?.orientation, covered: onboarding?.covered, facing: onboarding?.facing };
    const coachWeather = { latitude: weather.latitude, today: weatherSnapshot.today };
    return new Map(reminderPlants.map((resolved) => [resolved.plant.id, coachAdvice({ entry: resolved.entry, potSize: resolved.plant.potSize, lastWatering: lastEventDate(events, resolved.plant.id, "watering"), weather: coachWeather, balcony, now })] as const));
  }, [events, isPlus, now, onboarding, reminderPlants, weather.isFallback, weather.latitude, weatherSnapshot.today]);
  // Tous les conseils météo du moment (« rappels activés » ne décide que des notifications).
  const allDecisions = useMemo(() => {
    if (!reminderSettingsLoaded || weather.isFallback) return [];
    const settings = { enabled: true, skipWateringWhenRainExpected: reminderSettings.skipWateringWhenRainExpected, maxNormalRemindersPerDay: reminderSettings.maxNormalRemindersPerDay };
    // Balcon couvert (accueil) : la pluie annoncée ne dispense pas d'arroser.
    return decideReminders(reminderPlants.map((resolved) => ({ plant: careProfileFor(resolved, onboarding, coach?.get(resolved.plant.id)), history: events, weather: weatherSnapshot, settings })));
  }, [coach, events, onboarding, reminderPlants, reminderSettings, reminderSettingsLoaded, weather.isFallback, weatherSnapshot]);
  // Pour les notifications : toutes les alertes importantes, puis au plus N conseils ordinaires.
  // « Plantes suivies » (Réglages) ne coupe que les notifications : gestes et alertes restent à l'écran.
  const reminderDecisions = useMemo(
    () => selectGroups(groupReminders(allDecisions.filter((decision) => isFollowed(reminderSettings.enabledPlantIds, decision.plantId))), reminderSettings.maxNormalRemindersPerDay).flatMap((group) => group.decisions),
    [allDecisions, reminderSettings.enabledPlantIds, reminderSettings.maxNormalRemindersPerDay],
  );
  const visibleDecisions = useMemo(() => withoutSnoozed(allDecisions, snoozes, clockNow()), [allDecisions, snoozes]);
  const visibleGroups = useMemo(() => groupReminders(visibleDecisions), [visibleDecisions]);
  const postponed = useMemo(() => postponedStarts(snoozes, now), [now, snoozes]);
  const repotSkips = useMemo(() => skippedRepots(snoozes, now), [now, snoozes]);
  const plan = useMemo(() => planDay({ plants: resolvedPlants, events, now, decisions: visibleDecisions, allDecisions, climate, postponed, repotSkips, harvestEnds, coach }), [allDecisions, climate, coach, events, harvestEnds, now, postponed, repotSkips, resolvedPlants, visibleDecisions]);

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
    coach,
    isPlus,
  };
}
