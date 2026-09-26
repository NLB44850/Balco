import { and, eq, gt, lte, lt } from "drizzle-orm";

import {
  decideReminders,
  type MaintenanceEvent,
  type PlantCareProfile,
  type ReminderDecision,
  type WeatherSnapshot,
} from "../lib/reminders/reminder-engine";
import {
  devicePushTokens,
  maintenanceEvents,
  reminderDecisions,
  reminderPlants,
  reminderProfiles,
} from "../drizzle/schema";
import { getDb } from "./db";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const MAX_HISTORY_DAYS = 60;

export type ReminderSettingsInput = {
  enabled: boolean;
  preferredHour: number;
  preferredMinute: number;
  quietStartHour: number;
  quietEndHour: number;
  skipWateringWhenRainExpected: boolean;
  maxNormalRemindersPerDay: number;
  enabledPlantIds: string[];
};

export type ReminderSyncPayload = {
  settings: ReminderSettingsInput;
  location: { city: string; latitude: number; longitude: number; timezone: string };
  plants: Array<{ plantId: string; displayName: string; profile: PlantCareProfile; active?: boolean }>;
  events: Array<MaintenanceEvent>;
};

type OpenMeteoResponse = {
  timezone?: string;
  current?: { temperature_2m?: number; apparent_temperature?: number; weather_code?: number };
  hourly?: { time?: string[]; precipitation?: number[]; precipitation_probability?: number[]; wind_gusts_10m?: number[] };
  daily?: { precipitation_sum?: number[]; temperature_2m_min?: number[]; temperature_2m_max?: number[]; wind_gusts_10m_max?: number[] };
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function localDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function timezoneParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute) };
}

function zonedDateToUtc(parts: { year: number; month: number; day: number; hour: number; minute: number }, timezone: string) {
  const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0));
  const formatted = timezoneParts(guess, timezone);
  const asLocalUtc = Date.UTC(formatted.year, formatted.month - 1, formatted.day, formatted.hour, formatted.minute, 0);
  return new Date(guess.getTime() - (asLocalUtc - guess.getTime()));
}

function isQuietHour(hour: number, start: number, end: number) {
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

function nextScheduledDate(now: Date, settings: ReminderSettingsInput, timezone: string) {
  const current = timezoneParts(now, timezone);
  let date = new Date(Date.UTC(current.year, current.month - 1, current.day));
  let target = zonedDateToUtc({ year: current.year, month: current.month, day: current.day, hour: settings.preferredHour, minute: settings.preferredMinute }, timezone);
  if (target.getTime() <= now.getTime()) date.setUTCDate(date.getUTCDate() + 1);
  const targetParts = date.toISOString().slice(0, 10).split("-").map(Number);
  target = zonedDateToUtc({ year: targetParts[0], month: targetParts[1], day: targetParts[2], hour: settings.preferredHour, minute: settings.preferredMinute }, timezone);
  if (isQuietHour(settings.preferredHour, settings.quietStartHour, settings.quietEndHour)) {
    date.setUTCDate(date.getUTCDate() + 1);
    const nextParts = date.toISOString().slice(0, 10).split("-").map(Number);
    target = zonedDateToUtc({ year: nextParts[0], month: nextParts[1], day: nextParts[2], hour: settings.preferredHour, minute: settings.preferredMinute }, timezone);
  }
  return target;
}

async function fetchWeather(location: ReminderSyncPayload["location"], now = new Date()): Promise<WeatherSnapshot> {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code");
  url.searchParams.set("hourly", "precipitation,precipitation_probability,wind_gusts_10m");
  url.searchParams.set("daily", "precipitation_sum,temperature_2m_min,temperature_2m_max,wind_gusts_10m_max");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo failed with ${response.status}`);
  const data = (await response.json()) as OpenMeteoResponse;
  const hourly = data.hourly ?? {};
  const times = hourly.time ?? [];
  const currentIndex = Math.max(0, times.findIndex((time) => new Date(time).getTime() >= now.getTime()));
  const next = (values: number[] | undefined) => (values ?? []).slice(currentIndex, currentIndex + 12);
  const precipitation = next(hourly.precipitation);
  const precipitationProbability = next(hourly.precipitation_probability);
  const wind = next(hourly.wind_gusts_10m);
  return {
    fetchedAt: now.toISOString(),
    timezone: data.timezone ?? location.timezone,
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude,
    current: {
      temperatureC: data.current?.temperature_2m ?? 0,
      apparentTemperatureC: data.current?.apparent_temperature ?? data.current?.temperature_2m ?? 0,
      weatherCode: data.current?.weather_code ?? 0,
    },
    next12h: {
      precipitationMm: precipitation.reduce((sum, value) => sum + (value ?? 0), 0),
      precipitationProbabilityMax: Math.max(...precipitationProbability, 0),
      windGustKmhMax: Math.max(...wind, 0),
    },
    today: {
      precipitationMm: data.daily?.precipitation_sum?.[0] ?? 0,
      temperatureMinC: data.daily?.temperature_2m_min?.[0] ?? 0,
      temperatureMaxC: data.daily?.temperature_2m_max?.[0] ?? 0,
      windGustKmhMax: data.daily?.wind_gusts_10m_max?.[0] ?? 0,
    },
  };
}

function decisionKey(decision: ReminderDecision, profile: ReminderSyncPayload["location"], now: Date) {
  return `${localDateKey(now, profile.timezone)}:${decision.plantId}:${decision.taskType}:${decision.action}`;
}

async function persistDecision(userId: number, decision: ReminderDecision, settings: ReminderSettingsInput, location: ReminderSyncPayload["location"], now: Date) {
  const db = await getDb();
  if (!db) return;
  const key = decisionKey(decision, location, now);
  const scheduledFor = nextScheduledDate(now, settings, location.timezone);
  await db.insert(reminderDecisions).values({
    userId,
    decisionKey: key,
    plantId: decision.plantId,
    taskType: decision.taskType,
    action: decision.action,
    priority: decision.priority,
    payload: JSON.stringify(decision),
    validUntil: new Date(decision.validUntil),
    weatherFetchedAt: new Date(decision.weatherFetchedAt),
    scheduledFor,
    status: "pending",
  }).onDuplicateKeyUpdate({
    set: {
      payload: JSON.stringify(decision),
      validUntil: new Date(decision.validUntil),
      weatherFetchedAt: new Date(decision.weatherFetchedAt),
      scheduledFor,
    },
  });
}

export async function syncReminderSnapshot(userId: number, payload: ReminderSyncPayload) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(reminderProfiles).values({
    userId,
    enabled: payload.settings.enabled ? 1 : 0,
    city: payload.location.city,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    timezone: payload.location.timezone,
    preferredHour: payload.settings.preferredHour,
    preferredMinute: payload.settings.preferredMinute,
    quietStartHour: payload.settings.quietStartHour,
    quietEndHour: payload.settings.quietEndHour,
    skipWateringWhenRainExpected: payload.settings.skipWateringWhenRainExpected ? 1 : 0,
    maxNormalRemindersPerDay: payload.settings.maxNormalRemindersPerDay,
    enabledPlantIds: JSON.stringify(payload.settings.enabledPlantIds),
  }).onDuplicateKeyUpdate({ set: {
    enabled: payload.settings.enabled ? 1 : 0,
    city: payload.location.city,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    timezone: payload.location.timezone,
    preferredHour: payload.settings.preferredHour,
    preferredMinute: payload.settings.preferredMinute,
    quietStartHour: payload.settings.quietStartHour,
    quietEndHour: payload.settings.quietEndHour,
    skipWateringWhenRainExpected: payload.settings.skipWateringWhenRainExpected ? 1 : 0,
    maxNormalRemindersPerDay: payload.settings.maxNormalRemindersPerDay,
    enabledPlantIds: JSON.stringify(payload.settings.enabledPlantIds),
  } });

  for (const plant of payload.plants) {
    await db.insert(reminderPlants).values({ userId, plantId: plant.plantId, displayName: plant.displayName, profileJson: JSON.stringify(plant.profile), active: plant.active === false ? 0 : 1 }).onDuplicateKeyUpdate({ set: { displayName: plant.displayName, profileJson: JSON.stringify(plant.profile), active: plant.active === false ? 0 : 1 } });
  }
  for (const event of payload.events) {
    await db.insert(maintenanceEvents).values({ userId, eventId: event.id, plantId: event.plantId, type: event.type, completedAt: new Date(event.completedAt), source: event.source, note: event.note }).onDuplicateKeyUpdate({ set: { completedAt: new Date(event.completedAt), note: event.note } });
  }
  return { synced: true, plants: payload.plants.length, events: payload.events.length };
}

export async function recalculateUserReminders(userId: number, now = new Date()) {
  const db = await getDb();
  if (!db) return { userId, status: "skipped", reason: "database_unavailable" } as const;
  const profile = (await db.select().from(reminderProfiles).where(and(eq(reminderProfiles.userId, userId), eq(reminderProfiles.enabled, 1))).limit(1))[0];
  if (!profile) return { userId, status: "skipped", reason: "disabled" } as const;
  const settings: ReminderSettingsInput = {
    enabled: true,
    preferredHour: profile.preferredHour,
    preferredMinute: profile.preferredMinute,
    quietStartHour: profile.quietStartHour,
    quietEndHour: profile.quietEndHour,
    skipWateringWhenRainExpected: profile.skipWateringWhenRainExpected === 1,
    maxNormalRemindersPerDay: Math.max(1, profile.maxNormalRemindersPerDay),
    enabledPlantIds: parseJson<string[]>(profile.enabledPlantIds, []),
  };
  const location = { city: profile.city, latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone };
  const [plants, events] = await Promise.all([
    db.select().from(reminderPlants).where(and(eq(reminderPlants.userId, userId), eq(reminderPlants.active, 1))),
    db.select().from(maintenanceEvents).where(eq(maintenanceEvents.userId, userId)),
  ]);
  const weather = await fetchWeather(location, now);
  const history = events.filter((event) => now.getTime() - new Date(event.completedAt).getTime() <= MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000).map((event) => ({ id: event.eventId, plantId: event.plantId, type: event.type as MaintenanceEvent["type"], completedAt: new Date(event.completedAt).toISOString(), source: event.source as MaintenanceEvent["source"], note: event.note ?? undefined }));
  const enabled = settings.enabledPlantIds.length > 0 ? new Set(settings.enabledPlantIds) : null;
  const profiles = plants.map((plant) => ({ row: plant, profile: parseJson<PlantCareProfile>(plant.profileJson, { plantId: plant.plantId, displayName: plant.displayName, wateringIntervalHours: 48, rainSkipMm: 2, heatThresholdC: 28, frostThresholdC: 3, windThresholdKmh: 35 }) })).filter(({ row }) => !enabled || enabled.has(row.plantId));
  const decisions = decideReminders(profiles.map(({ profile }) => ({ plant: profile, history, weather, settings, now })));
  const normal = decisions.filter((decision) => decision.priority === "normal").slice(0, settings.maxNormalRemindersPerDay);
  const selected = [...decisions.filter((decision) => decision.priority !== "normal"), ...normal];
  await Promise.all(selected.map((decision) => persistDecision(userId, decision, settings, location, now)));
  await db.update(reminderDecisions).set({ status: "expired" }).where(and(eq(reminderDecisions.userId, userId), eq(reminderDecisions.status, "pending"), lt(reminderDecisions.validUntil, now)));
  return { userId, status: "recalculated", decisions: selected.length, weatherFetchedAt: weather.fetchedAt } as const;
}

export async function recalculateAllReminders(now = new Date()) {
  const db = await getDb();
  if (!db) return { status: "skipped", reason: "database_unavailable", users: 0, decisions: 0 } as const;
  const profiles = await db.select({ userId: reminderProfiles.userId }).from(reminderProfiles).where(eq(reminderProfiles.enabled, 1));
  const results = [];
  for (const profile of profiles) results.push(await recalculateUserReminders(profile.userId, now));
  return { status: "recalculated", users: results.length, decisions: results.reduce((total, result) => total + (result.status === "recalculated" ? result.decisions : 0), 0), results } as const;
}

export async function registerPushToken(userId: number, token: string, platform: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(devicePushTokens).values({ userId, token, platform, active: 1 }).onDuplicateKeyUpdate({ set: { userId, platform, active: 1, lastSeenAt: new Date() } });
  return { registered: true };
}

export async function dispatchDueReminderNotifications(now = new Date()) {
  const db = await getDb();
  if (!db) return { sent: 0, skipped: 0 };
  const due = await db.select().from(reminderDecisions).where(and(eq(reminderDecisions.status, "pending"), lte(reminderDecisions.scheduledFor, now), gt(reminderDecisions.validUntil, now)));
  let sent = 0;
  let skipped = 0;
  for (const decision of due) {
    const tokens = await db.select().from(devicePushTokens).where(and(eq(devicePushTokens.userId, decision.userId), eq(devicePushTokens.active, 1)));
    const parsed = parseJson<ReminderDecision>(decision.payload, null as unknown as ReminderDecision);
    if (!parsed || tokens.length === 0) { skipped += 1; continue; }
    const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(tokens.map((token) => ({ to: token.token, title: parsed.title, body: parsed.body.slice(0, 120), data: { source: "balco-reminder", plantId: parsed.plantId, taskType: parsed.taskType, decisionId: decision.decisionKey }, sound: "default" }))) });
    if (response.ok) {
      await db.update(reminderDecisions).set({ status: "sent", sentAt: now }).where(eq(reminderDecisions.id, decision.id));
      sent += 1;
    } else skipped += 1;
  }
  return { sent, skipped };
}

