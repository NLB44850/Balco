/**
 * Moteur de décision des rappels contextuels Balco.
 *
 * Pur et déterministe : aucun accès à AsyncStorage, au réseau ou aux notifications.
 * Ordre d'évaluation (cf. spec-contextual-reminders.md §6) :
 *   1. garde-fous (météo périmée, rappel déjà envoyé)
 *   2. sécurité (orage, vent, gel)
 *   3. suppression d'un geste inutile (pluie prévue)
 *   4. urgence depuis le dernier entretien (arrosage, chaleur)
 */

export type MaintenanceTaskType = "watering" | "observation" | "pruning" | "protection" | "harvest";

export type MaintenanceEvent = {
  id: string;
  plantId: string;
  type: MaintenanceTaskType;
  completedAt: string; // ISO 8601
  source: "daily_task" | "reminder" | "manual";
  note?: string;
};

export type PlantCareProfile = {
  plantId: string;
  displayName: string;
  /** Nom avec son article pour les phrases (« le basilic », « les tomates cerises ») ; à défaut, displayName. */
  label?: string;
  wateringIntervalHours: number;
  rainSkipMm: number;
  heatThresholdC: number;
  frostThresholdC: number;
  windThresholdKmh: number;
  frostSensitive?: boolean;
  preferredWateringWindows?: Array<"morning" | "evening">;
  allowedTaskTypes?: MaintenanceTaskType[];
};

export type WeatherSnapshot = {
  fetchedAt: string;
  timezone: string;
  city: string;
  latitude: number;
  longitude: number;
  current: {
    temperatureC: number;
    apparentTemperatureC: number;
    weatherCode: number;
  };
  next12h: {
    precipitationMm: number;
    precipitationProbabilityMax: number;
    windGustKmhMax: number;
  };
  today: {
    precipitationMm: number;
    temperatureMinC: number;
    temperatureMaxC: number;
    windGustKmhMax: number;
  };
};

export type ReminderSettings = {
  enabled: boolean;
  skipWateringWhenRainExpected: boolean;
  maxNormalRemindersPerDay: number;
  preferredHour?: number;
  preferredMinute?: number;
  quietStartHour?: number;
  quietEndHour?: number;
  enabledPlantIds?: string[];
};

export type ReminderPriority = "normal" | "important" | "urgent";

export type ReminderDecision = {
  plantId: string;
  taskType: MaintenanceTaskType;
  priority: ReminderPriority;
  action: "do" | "skip" | "protect" | "observe";
  title: string;
  body: string;
  reason: string;
  validUntil: string;
  weatherFetchedAt: string;
};

export type DecideReminderInput = {
  plant: PlantCareProfile;
  history: MaintenanceEvent[];
  weather: WeatherSnapshot;
  settings?: Partial<ReminderSettings>;
  lastReminderAt?: string;
  now?: Date;
};

export const MAX_WEATHER_AGE_HOURS = 6;
export const DECISION_VALIDITY_HOURS = 12;
export const REMINDER_COOLDOWN_HOURS = 24;
export const STRONG_WIND_KMH = 60;
export const HEAVY_RAIN_PROBABILITY = 60;
export const MAX_BODY_LENGTH = 120;

const HOUR_MS = 60 * 60 * 1000;
const PRIORITY_RANK: Record<ReminderPriority, number> = { urgent: 0, important: 1, normal: 2 };

function hoursBetween(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / HOUR_MS;
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function allows(plant: PlantCareProfile, type: MaintenanceTaskType) {
  return !plant.allowedTaskTypes || plant.allowedTaskTypes.includes(type);
}

function isThunderstorm(weatherCode: number) {
  return weatherCode >= 95 && weatherCode <= 99;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function clampBody(body: string) {
  return body.length <= MAX_BODY_LENGTH ? body : `${body.slice(0, MAX_BODY_LENGTH - 1).trimEnd()}…`;
}

function lastEventOfType(history: MaintenanceEvent[], plantId: string, type: MaintenanceTaskType) {
  let latest: Date | null = null;
  for (const event of history) {
    if (event.plantId !== plantId || event.type !== type) continue;
    const date = parseDate(event.completedAt);
    if (date && (!latest || date > latest)) latest = date;
  }
  return latest;
}

function formatElapsed(hours: number) {
  if (hours < 36) return `${Math.max(1, Math.round(hours))} h`;
  const days = Math.round(hours / 24);
  return `${days} jour${days > 1 ? "s" : ""}`;
}

/** « à » contracté devant l'article : « au basilic », « aux fraisiers », « à la menthe ». */
function toLabel(label: string) {
  if (label.startsWith("le ")) return `au ${label.slice(3)}`;
  if (label.startsWith("les ")) return `aux ${label.slice(4)}`;
  return `à ${label}`;
}

type DraftDecision = Omit<ReminderDecision, "plantId" | "validUntil" | "weatherFetchedAt">;

function safetyDecision(plant: PlantCareProfile, weather: WeatherSnapshot): DraftDecision | null {
  if (!allows(plant, "protection")) return null;
  const name = plant.label ?? plant.displayName;
  const gust = Math.max(weather.next12h.windGustKmhMax, weather.today.windGustKmhMax);
  const minTemp = weather.today.temperatureMinC;

  if (isThunderstorm(weather.current.weatherCode)) {
    return {
      taskType: "protection",
      priority: "urgent",
      action: "protect",
      title: `Orage : mets ${name} à l’abri`,
      body: "Un orage arrive sur ton balcon. Rentre les pots mobiles depuis l’intérieur, sans sortir sur le balcon.",
      reason: `Code météo orage (${weather.current.weatherCode}).`,
    };
  }

  if (plant.frostSensitive !== false && minTemp <= plant.frostThresholdC) {
    const hardFrost = minTemp < 0;
    return {
      taskType: "protection",
      priority: hardFrost ? "urgent" : "important",
      action: "protect",
      title: hardFrost ? `Gel cette nuit : protège ${name}` : `Nuit fraîche : protège ${name}`,
      body: `Jusqu’à ${round(minTemp)} °C cette nuit. Avant ce soir, rapproche le pot du mur ou couvre-le d’un voile d’hivernage.`,
      reason: `Minimum prévu ${round(minTemp)} °C, seuil de la plante ${plant.frostThresholdC} °C.`,
    };
  }

  if (gust >= plant.windThresholdKmh) {
    const strong = gust >= STRONG_WIND_KMH;
    return {
      taskType: "protection",
      priority: strong ? "urgent" : "important",
      action: "protect",
      title: strong ? `Vent fort : mets ${name} à l’abri` : `Coup de vent : vérifie ${name}`,
      body: strong
        ? `Rafales jusqu’à ${Math.round(gust)} km/h. Rentre les contenants mobiles ou cale-les contre le mur.`
        : `Rafales jusqu’à ${Math.round(gust)} km/h sur ton balcon. Vérifie que le tuteur et le pot tiennent bien.`,
      reason: `Rafales prévues ${Math.round(gust)} km/h, seuil ${plant.windThresholdKmh} km/h.`,
    };
  }

  return null;
}

function wateringDecision(
  plant: PlantCareProfile,
  history: MaintenanceEvent[],
  weather: WeatherSnapshot,
  settings: Partial<ReminderSettings>,
  now: Date,
): DraftDecision | null {
  if (!allows(plant, "watering")) return null;
  const lastWatering = lastEventOfType(history, plant.plantId, "watering");
  // Sans historique, Balco n'invente pas de besoin d'arrosage.
  if (!lastWatering) return null;

  const name = plant.label ?? plant.displayName;
  const elapsed = hoursBetween(lastWatering, now);
  const due = elapsed >= plant.wateringIntervalHours;
  const rainMm = weather.next12h.precipitationMm;
  const rainExpected =
    rainMm >= plant.rainSkipMm || (weather.next12h.precipitationProbabilityMax >= HEAVY_RAIN_PROBABILITY && rainMm >= 1);
  const maxTemp = Math.max(weather.today.temperatureMaxC, weather.current.temperatureC);
  const hot = maxTemp >= plant.heatThresholdC || weather.current.apparentTemperatureC >= plant.heatThresholdC + 2;

  if ((due || hot) && rainExpected && settings.skipWateringWhenRainExpected !== false && allows(plant, "observation")) {
    return {
      taskType: "observation",
      priority: "normal",
      action: "skip",
      title: `N’arrose pas ${name} aujourd’hui`,
      body: `${round(rainMm)} mm de pluie sont prévus dans les 12 prochaines heures. Pot à l’abri de la pluie ? Touche quand même la terre.`,
      reason: `Pluie prévue ${round(rainMm)} mm (seuil ${plant.rainSkipMm} mm), probabilité max ${Math.round(weather.next12h.precipitationProbabilityMax)} %.`,
    };
  }

  if (hot && elapsed >= 24) {
    return {
      taskType: "watering",
      priority: "important",
      action: "observe",
      title: `${Math.round(maxTemp)} °C aujourd’hui : pense ${toLabel(name)}`,
      body: `Dernier arrosage il y a ${formatElapsed(elapsed)}. Touche la terre ce soir ou demain tôt, et arrose au pied si elle est sèche.`,
      reason: `Maximum ${Math.round(maxTemp)} °C (seuil ${plant.heatThresholdC} °C), dernier arrosage il y a ${formatElapsed(elapsed)}.`,
    };
  }

  if (due) {
    return {
      taskType: "watering",
      priority: "normal",
      action: "observe",
      title: `Arrose ${name} si la terre est sèche`,
      body: `Dernier arrosage il y a ${formatElapsed(elapsed)} et pas de pluie prévue : arrose si la terre est sèche sur 2 cm.`,
      reason: `Délai de ${plant.wateringIntervalHours} h dépassé, ${round(rainMm)} mm prévus d’ici 12 h.`,
    };
  }

  return null;
}

export function isWeatherFresh(weather: WeatherSnapshot, now = new Date()) {
  const fetchedAt = parseDate(weather.fetchedAt);
  if (!fetchedAt) return false;
  const age = hoursBetween(fetchedAt, now);
  return age >= -1 && age <= MAX_WEATHER_AGE_HOURS;
}

export function decideReminder({ plant, history, weather, settings = {}, lastReminderAt, now = new Date() }: DecideReminderInput): ReminderDecision | null {
  if (!isWeatherFresh(weather, now)) return null;

  const draft = safetyDecision(plant, weather) ?? wateringDecision(plant, history, weather, settings, now);
  if (!draft) return null;

  // Les rappels non urgents sont soumis à la désactivation globale et au délai de 24 h.
  if (draft.priority !== "urgent") {
    if (settings.enabled === false && draft.priority === "normal") return null;
    const lastReminder = parseDate(lastReminderAt);
    if (lastReminder && hoursBetween(lastReminder, now) < REMINDER_COOLDOWN_HOURS) return null;
  }

  return {
    ...draft,
    plantId: plant.plantId,
    body: clampBody(draft.body),
    validUntil: new Date(now.getTime() + DECISION_VALIDITY_HOURS * HOUR_MS).toISOString(),
    weatherFetchedAt: weather.fetchedAt,
  };
}

/** Évalue plusieurs plantes et renvoie les décisions triées de la plus urgente à la moins urgente. */
export function decideReminders(inputs: DecideReminderInput[]): ReminderDecision[] {
  return inputs
    .map((input) => decideReminder(input))
    .filter((decision): decision is ReminderDecision => decision !== null)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
