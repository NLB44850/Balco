import { and, desc, eq, gt, inArray, lt, lte, notInArray, sql } from "drizzle-orm";

import { careProfileFor, resolvePlants, type GardenPlant } from "../lib/garden/garden-logic";
import type { OnboardingAnswers } from "../lib/plants/catalog";
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

// Surchargeables pour les tests de bout en bout (serveurs simulés).
const OPEN_METEO_URL = process.env.OPEN_METEO_URL || "https://api.open-meteo.com/v1/forecast";
const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || "https://exp.host/--/api/v2/push/send";
const MAX_HISTORY_DAYS = 60;
export const MAX_SNAPSHOT_EVENTS = 1000;

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

export type SyncLocation = { city: string; latitude: number; longitude: number; timezone: string };

/** Plante telle qu'échangée entre l'appareil et le serveur. */
export type SyncPlant = GardenPlant & { updatedAt: string };

/**
 * Ce que l'appareil envoie : uniquement ses changements depuis la dernière synchro.
 * Les champs absents ne sont pas modifiés côté serveur.
 */
export type SyncPush = {
  profile?: { firstName?: string | null; balcony?: OnboardingAnswers | null };
  settings?: ReminderSettingsInput;
  location?: SyncLocation;
  plants: SyncPlant[];
  events: MaintenanceEvent[];
  deletedEventIds: string[];
};

/** Ce que le serveur renvoie : l'état complet, qui fait foi. */
export type SyncSnapshot = {
  profile: { firstName: string | null; balcony: OnboardingAnswers | null };
  settings: ReminderSettingsInput | null;
  plants: SyncPlant[];
  events: MaintenanceEvent[];
  serverTime: string;
};

type OpenMeteoResponse = {
  timezone?: string;
  current?: { temperature_2m?: number; apparent_temperature?: number; weather_code?: number };
  hourly?: { time?: number[]; precipitation?: number[]; precipitation_probability?: number[]; wind_gusts_10m?: number[] };
  daily?: { precipitation_sum?: number[]; temperature_2m_min?: number[]; temperature_2m_max?: number[]; wind_gusts_10m_max?: number[] };
};

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

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

export function nextScheduledDate(now: Date, settings: Pick<ReminderSettingsInput, "preferredHour" | "preferredMinute" | "quietStartHour" | "quietEndHour">, timezone: string) {
  const current = timezoneParts(now, timezone);
  const date = new Date(Date.UTC(current.year, current.month - 1, current.day));
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

// --- Météo ----------------------------------------------------------------------

export async function fetchWeather(location: SyncLocation, now = new Date()): Promise<WeatherSnapshot> {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("timezone", "auto");
  // Heures en timestamps Unix : pas d'ambiguïté de fuseau entre Open-Meteo et le serveur.
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code");
  url.searchParams.set("hourly", "precipitation,precipitation_probability,wind_gusts_10m");
  url.searchParams.set("daily", "precipitation_sum,temperature_2m_min,temperature_2m_max,wind_gusts_10m_max");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo failed with ${response.status}`);
  const data = (await response.json()) as OpenMeteoResponse;
  const hourly = data.hourly ?? {};
  const times = hourly.time ?? [];
  const nowSeconds = Math.floor(now.getTime() / 1000);
  // Heure en cours incluse : on cherche le premier créneau qui se termine après maintenant.
  const found = times.findIndex((time) => time + 3600 > nowSeconds);
  const currentIndex = found === -1 ? 0 : found;
  const next = (values: number[] | undefined) => (values ?? []).slice(currentIndex, currentIndex + 12).map((value) => value ?? 0);
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
      precipitationMm: next(hourly.precipitation).reduce((sum, value) => sum + value, 0),
      precipitationProbabilityMax: Math.max(...next(hourly.precipitation_probability), 0),
      windGustKmhMax: Math.max(...next(hourly.wind_gusts_10m), 0),
    },
    today: {
      precipitationMm: data.daily?.precipitation_sum?.[0] ?? 0,
      temperatureMinC: data.daily?.temperature_2m_min?.[0] ?? 0,
      temperatureMaxC: data.daily?.temperature_2m_max?.[0] ?? 0,
      windGustKmhMax: data.daily?.wind_gusts_10m_max?.[0] ?? 0,
    },
  };
}

// --- Synchronisation ---------------------------------------------------------------

function toSyncPlant(row: typeof reminderPlants.$inferSelect): SyncPlant | null {
  if (!row.catalogId) return null; // lignes antérieures au catalogue : non restaurables sur un appareil
  return {
    id: row.plantId,
    catalogId: row.catalogId,
    nickname: row.nickname ?? undefined,
    varietyId: row.varietyId ?? undefined,
    addedAt: (row.addedAt ?? row.createdAt).toISOString(),
    updatedAt: (row.clientUpdatedAt ?? row.updatedAt).toISOString(),
    removedAt: row.removedAt?.toISOString(),
  };
}

function settingsFromProfile(profile: typeof reminderProfiles.$inferSelect): ReminderSettingsInput {
  return {
    enabled: profile.enabled === 1,
    preferredHour: profile.preferredHour,
    preferredMinute: profile.preferredMinute,
    quietStartHour: profile.quietStartHour,
    quietEndHour: profile.quietEndHour,
    skipWateringWhenRainExpected: profile.skipWateringWhenRainExpected === 1,
    maxNormalRemindersPerDay: Math.max(1, profile.maxNormalRemindersPerDay),
    enabledPlantIds: parseJson<string[]>(profile.enabledPlantIds, []),
  };
}

async function applyPush(db: Db, userId: number, push: SyncPush) {
  const profileSet: Partial<typeof reminderProfiles.$inferInsert> = {};
  if (push.settings) {
    Object.assign(profileSet, {
      enabled: push.settings.enabled ? 1 : 0,
      preferredHour: push.settings.preferredHour,
      preferredMinute: push.settings.preferredMinute,
      quietStartHour: push.settings.quietStartHour,
      quietEndHour: push.settings.quietEndHour,
      skipWateringWhenRainExpected: push.settings.skipWateringWhenRainExpected ? 1 : 0,
      maxNormalRemindersPerDay: push.settings.maxNormalRemindersPerDay,
      enabledPlantIds: JSON.stringify(push.settings.enabledPlantIds),
    });
  }
  if (push.location) Object.assign(profileSet, push.location, { locationUpdatedAt: new Date() });
  if (push.profile) {
    if ("firstName" in push.profile) profileSet.firstName = push.profile.firstName?.trim() || null;
    if ("balcony" in push.profile) profileSet.balconyJson = push.profile.balcony ? JSON.stringify(push.profile.balcony) : null;
  }
  // La ligne de profil existe toujours après une synchro : le recalcul serveur en a besoin.
  await db.insert(reminderProfiles).values({ userId, ...profileSet }).onDuplicateKeyUpdate({ set: Object.keys(profileSet).length > 0 ? profileSet : { userId } });

  for (const plant of push.plants) {
    const resolved = resolvePlants([plant])[0];
    if (!resolved) continue; // id de catalogue inconnu : ignoré plutôt que stocké sans profil de soin
    const incomingUpdatedAt = new Date(plant.updatedAt);
    const values = {
      displayName: resolved.plant.nickname?.trim() || resolved.entry.name,
      profileJson: JSON.stringify(careProfileFor(resolved)),
      catalogId: plant.catalogId,
      nickname: plant.nickname?.trim() || null,
      varietyId: plant.varietyId && resolved.entry.varieties.some((variety) => variety.id === plant.varietyId) ? plant.varietyId : null,
      addedAt: new Date(plant.addedAt),
      removedAt: plant.removedAt ? new Date(plant.removedAt) : null,
      active: plant.removedAt ? 0 : 1,
      clientUpdatedAt: incomingUpdatedAt,
    };
    const existing = (await db.select({ clientUpdatedAt: reminderPlants.clientUpdatedAt }).from(reminderPlants).where(and(eq(reminderPlants.userId, userId), eq(reminderPlants.plantId, plant.id))).limit(1))[0];
    if (!existing) {
      await db.insert(reminderPlants).values({ userId, plantId: plant.id, ...values });
    } else if (!existing.clientUpdatedAt || existing.clientUpdatedAt.getTime() <= incomingUpdatedAt.getTime()) {
      // La modification la plus récente gagne : un vieux téléphone ne ressuscite pas une plante retirée ailleurs.
      await db.update(reminderPlants).set(values).where(and(eq(reminderPlants.userId, userId), eq(reminderPlants.plantId, plant.id)));
    }
  }

  for (const event of push.events) {
    const completedAt = new Date(event.completedAt);
    await db.insert(maintenanceEvents).values({ userId, eventId: event.id, plantId: event.plantId, type: event.type, completedAt, source: event.source, note: event.note ?? null })
      .onDuplicateKeyUpdate({ set: { completedAt, type: event.type, note: event.note ?? null } });
  }
  if (push.deletedEventIds.length > 0) {
    await db.delete(maintenanceEvents).where(and(eq(maintenanceEvents.userId, userId), inArray(maintenanceEvents.eventId, push.deletedEventIds)));
  }
}

export async function loadSnapshot(userId: number, now = new Date()): Promise<SyncSnapshot> {
  const db = await requireDb();
  const [profile] = await db.select().from(reminderProfiles).where(eq(reminderProfiles.userId, userId)).limit(1);
  const plants = await db.select().from(reminderPlants).where(eq(reminderPlants.userId, userId));
  const events = await db.select().from(maintenanceEvents).where(eq(maintenanceEvents.userId, userId)).orderBy(desc(maintenanceEvents.completedAt)).limit(MAX_SNAPSHOT_EVENTS);
  return {
    profile: { firstName: profile?.firstName ?? null, balcony: parseJson<OnboardingAnswers | null>(profile?.balconyJson, null) },
    settings: profile ? settingsFromProfile(profile) : null,
    // Les plantes retirées restent dans la réponse : l'appareil en déduit qu'il doit les masquer.
    plants: plants.map(toSyncPlant).filter((plant): plant is SyncPlant => plant !== null),
    events: events.map((event) => ({ id: event.eventId, plantId: event.plantId, type: event.type as MaintenanceEvent["type"], completedAt: event.completedAt.toISOString(), source: event.source as MaintenanceEvent["source"], note: event.note ?? undefined })),
    serverTime: now.toISOString(),
  };
}

export async function syncGarden(userId: number, push: SyncPush) {
  const db = await requireDb();
  await applyPush(db, userId, push);
  return loadSnapshot(userId);
}

// --- Recalcul et envoi ---------------------------------------------------------------

function decisionKey(decision: ReminderDecision, timezone: string, now: Date) {
  return `${localDateKey(now, timezone)}:${decision.plantId}:${decision.taskType}:${decision.action}`;
}

type WeatherCache = Map<string, Promise<WeatherSnapshot>>;

function cachedWeather(cache: WeatherCache | undefined, location: SyncLocation, now: Date) {
  if (!cache) return fetchWeather(location, now);
  // ~1 km : les voisins partagent la même prévision, ce qui ménage le quota Open-Meteo.
  const key = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
  if (!cache.has(key)) cache.set(key, fetchWeather(location, now));
  return cache.get(key)!;
}

export async function recalculateUserReminders(userId: number, now = new Date(), weatherCache?: WeatherCache) {
  const db = await getDb();
  if (!db) return { userId, status: "skipped", reason: "database_unavailable" } as const;
  const profile = (await db.select().from(reminderProfiles).where(eq(reminderProfiles.userId, userId)).limit(1))[0];
  if (!profile || profile.enabled !== 1) {
    // Rappels désactivés : rien d'ancien ne doit partir.
    await db.update(reminderDecisions).set({ status: "obsolete" }).where(and(eq(reminderDecisions.userId, userId), eq(reminderDecisions.status, "pending")));
    return { userId, status: "skipped", reason: "disabled" } as const;
  }
  if (!profile.locationUpdatedAt) return { userId, status: "skipped", reason: "no_location" } as const;
  const settings = settingsFromProfile(profile);
  const location: SyncLocation = { city: profile.city, latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone };
  const [plants, events] = await Promise.all([
    db.select().from(reminderPlants).where(and(eq(reminderPlants.userId, userId), eq(reminderPlants.active, 1))),
    db.select().from(maintenanceEvents).where(and(eq(maintenanceEvents.userId, userId), gt(maintenanceEvents.completedAt, new Date(now.getTime() - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000)))),
  ]);
  const weather = await cachedWeather(weatherCache, location, now);
  const history = events.map((event) => ({ id: event.eventId, plantId: event.plantId, type: event.type as MaintenanceEvent["type"], completedAt: event.completedAt.toISOString(), source: event.source as MaintenanceEvent["source"], note: event.note ?? undefined }));
  const enabled = settings.enabledPlantIds.length > 0 ? new Set(settings.enabledPlantIds) : null;
  const profiles = plants
    .filter((plant) => !enabled || enabled.has(plant.plantId))
    .map((plant) => {
      // Le catalogue fait foi pour les seuils ; le JSON stocké ne sert qu'aux anciennes lignes.
      const resolved = plant.catalogId ? resolvePlants([{ id: plant.plantId, catalogId: plant.catalogId, nickname: plant.nickname ?? undefined, addedAt: (plant.addedAt ?? plant.createdAt).toISOString() }])[0] : undefined;
      return resolved ? careProfileFor(resolved) : parseJson<PlantCareProfile>(plant.profileJson, { plantId: plant.plantId, displayName: plant.displayName, wateringIntervalHours: 48, rainSkipMm: 2, heatThresholdC: 28, frostThresholdC: 3, windThresholdKmh: 35 });
    });
  const decisions = decideReminders(profiles.map((plant) => ({ plant, history, weather, settings, now })));
  const normal = decisions.filter((decision) => decision.priority === "normal").slice(0, settings.maxNormalRemindersPerDay);
  const selected = [...decisions.filter((decision) => decision.priority !== "normal"), ...normal];
  const scheduledFor = nextScheduledDate(now, settings, location.timezone);
  const keys = selected.map((decision) => decisionKey(decision, location.timezone, now));

  for (const [index, decision] of selected.entries()) {
    // Une alerte urgente (gel, orage) part tout de suite, sauf pendant la plage calme.
    const urgentNow = decision.priority === "urgent" && !isQuietHour(timezoneParts(now, location.timezone).hour, settings.quietStartHour, settings.quietEndHour);
    const values = {
      payload: JSON.stringify(decision),
      validUntil: new Date(decision.validUntil),
      weatherFetchedAt: new Date(decision.weatherFetchedAt),
      scheduledFor: urgentNow ? now : scheduledFor,
    };
    await db.insert(reminderDecisions).values({ userId, decisionKey: keys[index], plantId: decision.plantId, taskType: decision.taskType, action: decision.action, priority: decision.priority, status: "pending", ...values })
      .onDuplicateKeyUpdate({
        // Une décision redevenue d'actualité repasse en attente ; une décision déjà envoyée le reste.
        set: { ...values, status: sql`IF(${reminderDecisions.status} = 'obsolete', 'pending', ${reminderDecisions.status})` },
      });
  }

  // Tout ce qui attendait mais n'est plus justifié (geste fait, pluie annoncée, plante retirée) ne partira pas.
  await db.update(reminderDecisions).set({ status: "obsolete" }).where(and(
    eq(reminderDecisions.userId, userId),
    eq(reminderDecisions.status, "pending"),
    ...(keys.length > 0 ? [notInArray(reminderDecisions.decisionKey, keys)] : []),
  ));
  await db.update(reminderDecisions).set({ status: "expired" }).where(and(eq(reminderDecisions.userId, userId), eq(reminderDecisions.status, "pending"), lt(reminderDecisions.validUntil, now)));
  return { userId, status: "recalculated", decisions: selected.length, weatherFetchedAt: weather.fetchedAt } as const;
}

export async function recalculateAllReminders(now = new Date()) {
  const db = await getDb();
  if (!db) return { status: "skipped", reason: "database_unavailable", users: 0, decisions: 0, failures: 0 } as const;
  const profiles = await db.select({ userId: reminderProfiles.userId }).from(reminderProfiles).where(eq(reminderProfiles.enabled, 1));
  const cache: WeatherCache = new Map();
  let decisions = 0;
  let failures = 0;
  for (const profile of profiles) {
    try {
      const result = await recalculateUserReminders(profile.userId, now, cache);
      if (result.status === "recalculated") decisions += result.decisions;
    } catch (error) {
      // Une météo indisponible pour un utilisateur ne doit pas bloquer les autres.
      failures += 1;
      console.error(`[reminders] recalculation failed for user ${profile.userId}`, error);
    }
  }
  return { status: "recalculated", users: profiles.length, decisions, failures } as const;
}

export async function registerPushToken(userId: number, token: string, platform: string) {
  const db = await requireDb();
  await db.insert(devicePushTokens).values({ userId, token, platform, active: 1 }).onDuplicateKeyUpdate({ set: { userId, platform, active: 1, lastSeenAt: new Date() } });
  return { registered: true };
}

export async function unregisterPushToken(userId: number, token: string) {
  const db = await requireDb();
  await db.update(devicePushTokens).set({ active: 0 }).where(and(eq(devicePushTokens.userId, userId), eq(devicePushTokens.token, token)));
  return { unregistered: true };
}

type ExpoPushTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

export async function dispatchDueReminderNotifications(now = new Date()) {
  const db = await getDb();
  if (!db) return { sent: 0, skipped: 0, deactivatedTokens: 0 };
  const due = await db.select().from(reminderDecisions).where(and(eq(reminderDecisions.status, "pending"), lte(reminderDecisions.scheduledFor, now), gt(reminderDecisions.validUntil, now)));
  let sent = 0;
  let skipped = 0;
  let deactivatedTokens = 0;
  for (const decision of due) {
    const tokens = await db.select().from(devicePushTokens).where(and(eq(devicePushTokens.userId, decision.userId), eq(devicePushTokens.active, 1)));
    const parsed = parseJson<ReminderDecision | null>(decision.payload, null);
    if (!parsed || tokens.length === 0) {
      skipped += 1;
      continue;
    }
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(tokens.map((token) => ({ to: token.token, title: parsed.title, body: parsed.body.slice(0, 120), data: { source: "balco-reminder", url: "/", plantId: parsed.plantId, taskType: parsed.taskType, action: parsed.action, title: parsed.title, decisionId: decision.decisionKey, validUntil: parsed.validUntil }, sound: "default", channelId: "balco-reminders", categoryId: parsed.action === "skip" ? "balco-reminder-info" : "balco-reminder" }))),
    });
    if (!response.ok) {
      skipped += 1;
      continue;
    }
    // Les tickets arrivent dans l'ordre des messages : un token désinstallé est désactivé pour ne plus être sollicité.
    const tickets = ((await response.json().catch(() => ({}))) as { data?: ExpoPushTicket[] }).data ?? [];
    const deadTokens = tokens.filter((_, index) => tickets[index]?.details?.error === "DeviceNotRegistered").map((token) => token.token);
    if (deadTokens.length > 0) {
      await db.update(devicePushTokens).set({ active: 0 }).where(inArray(devicePushTokens.token, deadTokens));
      deactivatedTokens += deadTokens.length;
    }
    if (tickets.some((ticket) => ticket?.status === "ok")) {
      await db.update(reminderDecisions).set({ status: "sent", sentAt: now }).where(eq(reminderDecisions.id, decision.id));
      sent += 1;
    } else skipped += 1;
  }
  return { sent, skipped, deactivatedTokens };
}
