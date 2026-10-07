/**
 * Tests d'intégration de la synchro et des rappels serveur, sur une vraie base MySQL/MariaDB.
 * Ignorés sans TEST_DATABASE_URL (migrations appliquées au préalable avec drizzle-kit migrate).
 *
 *   TEST_DATABASE_URL=mysql://user:pass@localhost:3306/balco_test pnpm test
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type * as RemindersModule from "../server/reminders";
import type { SyncPush } from "../server/reminders";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 26 septembre 2026, 14:00 à Paris (UTC+2) : le rappel de 18 h 30 est encore à venir.
const NOW = new Date("2026-09-26T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3600_000).toISOString();
const PARIS = { city: "Paris", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" };
const SETTINGS = { enabled: true, preferredHour: 18, preferredMinute: 30, quietStartHour: 21, quietEndHour: 9, skipWateringWhenRainExpected: true, maxNormalRemindersPerDay: 1, enabledPlantIds: [] };

type ForecastOptions = { rainMmPerHour?: number; minTemp?: number };
let forecast: ForecastOptions = {};
const pushRequests: Array<Array<{ to: string; title: string }>> = [];
let deadTokens = new Set<string>();

function fakeFetch(input: string | URL | Request, init?: RequestInit) {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("open-meteo")) {
    const start = Math.floor(NOW.getTime() / 1000 / 3600) * 3600;
    const hours = Array.from({ length: 48 }, (_, index) => start + index * 3600);
    return Promise.resolve(new Response(JSON.stringify({
      timezone: "Europe/Paris",
      current: { temperature_2m: 20, apparent_temperature: 20, weather_code: 1 },
      hourly: { time: hours, precipitation: hours.map(() => forecast.rainMmPerHour ?? 0), precipitation_probability: hours.map(() => (forecast.rainMmPerHour ? 90 : 5)), wind_gusts_10m: hours.map(() => 10) },
      daily: { precipitation_sum: [(forecast.rainMmPerHour ?? 0) * 24], temperature_2m_min: [forecast.minTemp ?? 12], temperature_2m_max: [22], wind_gusts_10m_max: [15] },
    })));
  }
  if (url.includes("push/send")) {
    const messages = JSON.parse(String(init?.body)) as Array<{ to: string; title: string }>;
    pushRequests.push(messages);
    const data = messages.map((message) => (deadTokens.has(message.to) ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok", id: `ticket-${message.to}` }));
    return Promise.resolve(new Response(JSON.stringify({ data })));
  }
  return Promise.reject(new Error(`Unexpected fetch ${url}`));
}

const emptyPush = (): SyncPush => ({ plants: [], events: [], deletedEventIds: [] });

describe.skipIf(!TEST_DATABASE_URL)("garden sync and server reminders (MySQL)", () => {
  let reminders: typeof RemindersModule;
  const userId = 900_000 + Math.floor(Math.random() * 90_000);
  const otherUserId = userId + 1;
  const freeUserId = userId + 2;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    vi.stubGlobal("fetch", vi.fn(fakeFetch));
    reminders = await import("../server/reminders");
    // Les rappels serveur sont réservés à Balco+ (lib/plans.ts) : les comptes de ces scénarios y sont abonnés.
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const db = (await getDb())!;
    await db.insert(schema.users).values([
      { id: userId, openId: `sync-test-${userId}`, plan: "plus" },
      { id: otherUserId, openId: `sync-test-${otherUserId}`, plan: "plus" },
      { id: freeUserId, openId: `sync-test-${freeUserId}`, plan: "free" },
    ]);
  });

  afterEach(() => {
    forecast = {};
    pushRequests.length = 0;
    deadTokens = new Set();
  });

  afterAll(async () => {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { inArray } = await import("drizzle-orm");
    const db = (await getDb())!;
    for (const table of [schema.reminderProfiles, schema.reminderPlants, schema.maintenanceEvents, schema.reminderDecisions, schema.devicePushTokens]) {
      await db.delete(table).where(inArray(table.userId, [userId, otherUserId, freeUserId]));
    }
    await db.delete(schema.users).where(inArray(schema.users.id, [userId, otherUserId, freeUserId]));
    vi.unstubAllGlobals();
  });

  async function decisions(forUser = userId) {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;
    return db.select().from(schema.reminderDecisions).where(eq(schema.reminderDecisions.userId, forUser));
  }

  it("stores a device's garden and returns it to a second device", async () => {
    const pushed = await reminders.syncGarden(userId, {
      profile: { firstName: "Nicolas", balcony: { sunlight: "sunny", space: "balcony", goals: ["tomatoes"] } },
      settings: SETTINGS,
      location: PARIS,
      plants: [
        { id: "basil-a", catalogId: "basil", nickname: "Basilic cuisine", varietyId: "thai", addedAt: hoursAgo(240), updatedAt: hoursAgo(240) },
        { id: "tomato-a", catalogId: "cherry-tomato", varietyId: "variete-inventee", addedAt: hoursAgo(240), updatedAt: hoursAgo(240) },
        { id: "ghost", catalogId: "not-in-catalog", addedAt: hoursAgo(1), updatedAt: hoursAgo(1) },
      ],
      events: [{ id: "basil-a:check-soil:2026-09-23", plantId: "basil-a", type: "watering", completedAt: hoursAgo(72), source: "daily_task", note: "Arrosé" }],
      deletedEventIds: [],
    });
    expect(pushed.plants.map((plant) => plant.id).sort()).toEqual(["basil-a", "tomato-a"]);

    const secondDevice = await reminders.syncGarden(userId, emptyPush());
    expect(secondDevice.profile).toEqual({ firstName: "Nicolas", balcony: { sunlight: "sunny", space: "balcony", goals: ["tomatoes"] } });
    expect(secondDevice.settings).toMatchObject({ enabled: true, preferredHour: 18 });
    expect(secondDevice.plants.find((plant) => plant.id === "basil-a")).toMatchObject({ catalogId: "basil", nickname: "Basilic cuisine", varietyId: "thai" });
    // Une variété absente du catalogue n'est pas conservée.
    expect(secondDevice.plants.find((plant) => plant.id === "tomato-a")?.varietyId).toBeUndefined();
    expect(secondDevice.events).toHaveLength(1);
    expect(secondDevice.events[0]).toMatchObject({ id: "basil-a:check-soil:2026-09-23", type: "watering", source: "daily_task" });
  });

  it("schedules a watering check at the preferred local time", async () => {
    const result = await reminders.recalculateUserReminders(userId, NOW);
    expect(result).toMatchObject({ status: "recalculated", decisions: 1 });
    const [decision] = (await decisions()).filter((row) => row.status === "pending");
    expect(decision).toMatchObject({ plantId: "basil-a", taskType: "watering", action: "observe" });
    // 18 h 30 à Paris le 26 septembre = 16 h 30 UTC.
    expect(decision.scheduledFor?.toISOString()).toBe("2026-09-26T16:30:00.000Z");
  });

  it("cancels the pending reminder once the task is done, instead of sending it", async () => {
    await reminders.syncGarden(userId, { ...emptyPush(), events: [{ id: "basil-a:check-soil:2026-09-26", plantId: "basil-a", type: "watering", completedAt: NOW.toISOString(), source: "daily_task" }] });
    await reminders.recalculateUserReminders(userId, NOW);
    const rows = await decisions();
    expect(rows.filter((row) => row.status === "pending")).toHaveLength(0);
    expect(rows.find((row) => row.plantId === "basil-a")?.status).toBe("obsolete");
  });

  it("brings a reminder back to pending when it becomes relevant again", async () => {
    await reminders.syncGarden(userId, { ...emptyPush(), deletedEventIds: ["basil-a:check-soil:2026-09-26"] });
    const snapshot = await reminders.loadSnapshot(userId);
    expect(snapshot.events.map((event) => event.id)).not.toContain("basil-a:check-soil:2026-09-26");
    await reminders.recalculateUserReminders(userId, NOW);
    expect((await decisions()).find((row) => row.plantId === "basil-a")?.status).toBe("pending");
  });

  it("replaces a watering reminder by « pas besoin d'arroser » when rain is coming", async () => {
    forecast = { rainMmPerHour: 1 };
    await reminders.recalculateUserReminders(userId, NOW);
    const pending = (await decisions()).filter((row) => row.status === "pending");
    // La tomate, jamais arrosée dans l'app, reçoit aussi le « n'arrose pas » (une seule alerte pluie).
    expect(pending.map((row) => row.plantId).sort()).toEqual(["basil-a", "tomato-a"]);
    expect(pending.every((row) => row.action === "skip")).toBe(true);
  });

  it("sends a frost alert immediately outside quiet hours", async () => {
    forecast = { minTemp: -3 };
    await reminders.recalculateUserReminders(userId, NOW);
    const urgent = (await decisions()).filter((row) => row.status === "pending" && row.priority === "urgent");
    expect(urgent.length).toBeGreaterThan(0);
    expect(urgent.every((row) => row.scheduledFor!.getTime() === NOW.getTime())).toBe(true);
  });

  it("does not let an outdated device resurrect a removed plant", async () => {
    await reminders.syncGarden(userId, { ...emptyPush(), plants: [{ id: "tomato-a", catalogId: "cherry-tomato", addedAt: hoursAgo(240), updatedAt: hoursAgo(1), removedAt: hoursAgo(1) }] });
    // Un vieux téléphone renvoie sa version de la plante, antérieure au retrait.
    const snapshot = await reminders.syncGarden(userId, { ...emptyPush(), plants: [{ id: "tomato-a", catalogId: "cherry-tomato", nickname: "Vieux nom", addedAt: hoursAgo(240), updatedAt: hoursAgo(5) }] });
    const tomato = snapshot.plants.find((plant) => plant.id === "tomato-a");
    expect(tomato?.removedAt).toBeDefined();
    expect(tomato?.nickname).toBeUndefined();
    // Une plante retirée ne génère plus de rappel.
    forecast = { minTemp: -3 };
    await reminders.recalculateUserReminders(userId, NOW);
    expect((await decisions()).filter((row) => row.status === "pending" && row.plantId === "tomato-a")).toHaveLength(0);
  });

  it("dispatches due reminders once and disables uninstalled devices", async () => {
    await reminders.registerPushToken(userId, "ExponentPushToken[alive]", "ios");
    await reminders.registerPushToken(userId, "ExponentPushToken[dead]", "android");
    deadTokens.add("ExponentPushToken[dead]");
    forecast = { minTemp: -3 };
    await reminders.recalculateUserReminders(userId, NOW);

    const first = await reminders.dispatchDueReminderNotifications(new Date(NOW.getTime() + 60_000));
    expect(first.sent).toBeGreaterThan(0);
    expect(first.deactivatedTokens).toBe(1);
    expect(pushRequests[0].map((message) => message.to).sort()).toEqual(["ExponentPushToken[alive]", "ExponentPushToken[dead]"]);

    pushRequests.length = 0;
    const second = await reminders.dispatchDueReminderNotifications(new Date(NOW.getTime() + 120_000));
    expect(second.sent).toBe(0);
    expect(pushRequests).toHaveLength(0);
  });

  it("groups the same weather alert for several plants into a single notification", async () => {
    const nextDay = new Date(NOW.getTime() + 24 * 3600_000);
    await reminders.syncGarden(userId, { ...emptyPush(), plants: [{ id: "pepper-a", catalogId: "sweet-pepper", addedAt: hoursAgo(48), updatedAt: hoursAgo(1) }] });
    forecast = { minTemp: -3 };
    await reminders.recalculateUserReminders(userId, nextDay);
    const frost = (await decisions()).filter((row) => row.status === "pending" && row.priority === "urgent");
    expect(frost.map((row) => row.plantId).sort()).toEqual(["basil-a", "pepper-a"]);

    pushRequests.length = 0;
    const result = await reminders.dispatchDueReminderNotifications(new Date(nextDay.getTime() + 60_000));
    expect(result.sent).toBe(1);
    expect(pushRequests).toHaveLength(1);
    const message = pushRequests[0][0] as unknown as { title: string; body: string; data: { plantIds: string[] }; categoryId: string };
    // Fin septembre, deux annuelles frileuses : le gel finit leur saison, on récolte tout avant la nuit.
    expect(message.title).toBe("Gel cette nuit : récolte tout avant ce soir");
    // basil-a porte le surnom « Basilic cuisine » donné plus haut.
    expect(message.body).toContain("Basilic cuisine et le poivron");
    expect(message.data.plantIds.sort()).toEqual(["basil-a", "pepper-a"]);
    expect(message.categoryId).toBe("balco-reminder");
    expect((await decisions()).filter((row) => row.plantId !== "tomato-a" && row.priority === "urgent" && row.status === "pending")).toHaveLength(0);
  });

  it("stays silent for users who never shared a real location or disabled reminders", async () => {
    await reminders.syncGarden(otherUserId, { ...emptyPush(), settings: SETTINGS, plants: [{ id: "basil-b", catalogId: "basil", addedAt: hoursAgo(240), updatedAt: hoursAgo(240) }], events: [{ id: "b-1", plantId: "basil-b", type: "watering", completedAt: hoursAgo(72), source: "manual" }] });
    expect(await reminders.recalculateUserReminders(otherUserId, NOW)).toMatchObject({ status: "skipped", reason: "no_location" });

    await reminders.syncGarden(otherUserId, { ...emptyPush(), location: PARIS, settings: { ...SETTINGS, enabled: false } });
    expect(await reminders.recalculateUserReminders(otherUserId, NOW)).toMatchObject({ status: "skipped", reason: "disabled" });
    expect(await decisions(otherUserId)).toHaveLength(0);
  });

  it("stays silent during the holidays and resumes on its own after the return", async () => {
    const vacation = { start: "2026-09-25", end: "2026-09-30", helper: false, done: ["water"] };
    const snapshot = await reminders.syncGarden(otherUserId, { ...emptyPush(), location: PARIS, settings: { ...SETTINGS, vacation } });
    expect(snapshot.settings?.vacation).toEqual(vacation);
    expect(await reminders.recalculateUserReminders(otherUserId, NOW)).toMatchObject({ status: "skipped", reason: "vacation" });
    expect((await decisions(otherUserId)).filter((row) => row.status === "pending")).toHaveLength(0);

    const back = new Date("2026-10-01T08:00:00.000Z");
    expect(await reminders.recalculateUserReminders(otherUserId, back)).toMatchObject({ status: "recalculated" });

    await reminders.syncGarden(otherUserId, { ...emptyPush(), settings: { ...SETTINGS, vacation: null } });
    expect((await reminders.loadSnapshot(otherUserId)).settings?.vacation).toBeNull();
  });

  it("cron : une prévision par zone d'environ 1 km, puis les comptes par lots, sous un verrou", async () => {
    // Deux comptes Balco+ voisins (moins de 1 km) : une seule prévision pour les deux.
    await reminders.syncGarden(userId, { ...emptyPush(), location: PARIS, settings: SETTINGS });
    await reminders.syncGarden(otherUserId, { ...emptyPush(), location: { ...PARIS, latitude: 48.8561, longitude: 2.3519 }, settings: { ...SETTINGS, vacation: null } });
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockClear();
    const all = await reminders.recalculateAllReminders(NOW, { concurrency: 2 });
    const weatherCalls = fetchMock.mock.calls.filter(([input]) => String(input instanceof Request ? input.url : input).includes("open-meteo"));
    expect(all.failures).toBe(0);
    expect(weatherCalls).toHaveLength(all.zones);
    expect(all.zones).toBeLessThan(all.users);

    const run = await reminders.runScheduledReminders(NOW);
    expect(run).toMatchObject({ status: "done", recalculated: { status: "recalculated" } });

    // Pendant qu'un passage tourne, un second appel du cron ne fait rien.
    const { acquireJobLock, releaseJobLock } = await import("../server/job-lock");
    const owner = (await acquireJobLock("reminders", 60_000, NOW))!;
    expect(await reminders.runScheduledReminders(NOW)).toEqual({ status: "locked" });
    await releaseJobLock("reminders", owner);
  });

  describe("forfait gratuit", () => {
    it("ne calcule ni n'envoie de rappels serveur : le téléphone programme les siens", async () => {
      await reminders.syncGarden(freeUserId, { ...emptyPush(), location: PARIS, settings: SETTINGS, plants: [{ id: "basil-f", catalogId: "basil", addedAt: hoursAgo(240), updatedAt: hoursAgo(240) }], events: [{ id: "f-1", plantId: "basil-f", type: "watering", completedAt: hoursAgo(72), source: "manual" }] });
      expect(await reminders.recalculateUserReminders(freeUserId, NOW)).toMatchObject({ status: "skipped", reason: "plan" });
      const all = await reminders.recalculateAllReminders(NOW);
      expect(all.status).toBe("recalculated");
      expect((await decisions(freeUserId)).filter((row) => row.status === "pending")).toHaveLength(0);
    });

    it("n'envoie plus rien à un compte repassé en gratuit après le calcul", async () => {
      const { getDb } = await import("../server/db");
      const schema = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = (await getDb())!;
      await db.update(schema.users).set({ plan: "plus" }).where(eq(schema.users.id, freeUserId));
      await reminders.registerPushToken(freeUserId, "ExponentPushToken[free-user]", "android");
      await reminders.recalculateUserReminders(freeUserId, NOW);
      expect((await decisions(freeUserId)).filter((row) => row.status === "pending").length).toBeGreaterThan(0);
      await db.update(schema.users).set({ plan: "free" }).where(eq(schema.users.id, freeUserId));
      // 19 h à Paris : le rappel de 18 h 30 est dû.
      await reminders.dispatchDueReminderNotifications(new Date(NOW.getTime() + 5 * 3600_000));
      expect(pushRequests.flat().some((message) => message.to === "ExponentPushToken[free-user]")).toBe(false);
      expect((await decisions(freeUserId)).filter((row) => row.status === "pending")).toHaveLength(0);
    });

    it("sauvegarde le jardin depuis un seul téléphone, qui change quand on se connecte ailleurs", async () => {
      await reminders.checkSyncDevice(freeUserId, "free", "telephone-a-0001", false);
      // Le même téléphone continue de synchroniser.
      await expect(reminders.checkSyncDevice(freeUserId, "free", "telephone-a-0001", false)).resolves.toBeUndefined();
      // Un autre téléphone est refusé tant qu'il ne prend pas la place…
      await expect(reminders.checkSyncDevice(freeUserId, "free", "telephone-b-0002", false)).rejects.toBeInstanceOf(reminders.OtherDeviceError);
      // … puis il la prend (connexion sur ce téléphone, ou « Sauvegarder depuis ce téléphone »).
      await reminders.checkSyncDevice(freeUserId, "free", "telephone-b-0002", true);
      await expect(reminders.checkSyncDevice(freeUserId, "free", "telephone-a-0001", false)).rejects.toBeInstanceOf(reminders.OtherDeviceError);
      // Une ancienne version de l'app, sans identifiant d'appareil, n'est pas bloquée.
      await expect(reminders.checkSyncDevice(freeUserId, "free", undefined, false)).resolves.toBeUndefined();
    });

    it("prévient l'app d'un compte gratuit sur un deuxième téléphone, et dit ce que permet le forfait", async () => {
      const { appRouter } = await import("../server/routers");
      const caller = appRouter.createCaller({
        req: { headers: {}, ip: "127.0.0.1" },
        res: { cookie: () => undefined, clearCookie: () => undefined },
        user: { id: freeUserId, openId: `sync-test-${freeUserId}`, name: null, email: null, loginMethod: "email", role: "user", plan: "free", syncDeviceId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      } as never);
      const first = await caller.reminders.sync({ ...emptyPush(), deviceId: "telephone-c-0003", claimDevice: true });
      expect(first.access).toEqual({ plan: "free", serverReminders: false, multiDeviceSync: false, founder: false });
      await expect(caller.reminders.sync({ ...emptyPush(), deviceId: "telephone-d-0004" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("sauvegardé depuis un autre téléphone") });
    });

    it("laisse Balco+ synchroniser depuis plusieurs téléphones", async () => {
      await reminders.checkSyncDevice(userId, "plus", "telephone-a-0001", false);
      await expect(reminders.checkSyncDevice(userId, "plus", "telephone-b-0002", false)).resolves.toBeUndefined();
    });
  });

  it("garde l'état « à planter » d'une plante et ne lui envoie aucun rappel tant qu'elle n'est pas en terre", async () => {
    const plants = [
      { id: "lavender-p", catalogId: "lavender", toPlant: true, addedAt: hoursAgo(240), updatedAt: hoursAgo(240) },
      { id: "mint-p", catalogId: "mint", addedAt: hoursAgo(240), updatedAt: hoursAgo(240) },
    ];
    await reminders.syncGarden(otherUserId, { ...emptyPush(), location: PARIS, settings: SETTINGS, plants });
    const back = await reminders.syncGarden(otherUserId, emptyPush());
    expect(back.plants.find((plant) => plant.id === "lavender-p")?.toPlant).toBe(true);
    expect(back.plants.find((plant) => plant.id === "mint-p")?.toPlant).toBeUndefined();
    await reminders.recalculateUserReminders(otherUserId, NOW);
    const pending = (await decisions(otherUserId)).filter((row) => row.status === "pending");
    expect(pending.some((row) => row.plantId === "lavender-p")).toBe(false);
    // Plantée sur le téléphone : elle repart installée.
    await reminders.syncGarden(otherUserId, { ...emptyPush(), plants: [{ ...plants[0], toPlant: false, updatedAt: hoursAgo(1) }] });
    expect((await reminders.syncGarden(otherUserId, emptyPush())).plants.find((plant) => plant.id === "lavender-p")?.toPlant).toBeUndefined();
  });
});
