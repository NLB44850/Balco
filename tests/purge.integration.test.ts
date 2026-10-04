/**
 * Purge quotidienne (server/purge.ts) : ce qui part, ce qui reste, une fois par jour.
 * Les tests sur la base sont ignorés sans TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { purgeCutoffs, RETENTION } from "../server/purge";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
// Dans le passé : la purge de test ne touche pas les lignes créées par les autres tests, qui tournent en même temps.
const NOW = new Date("2026-03-15T03:31:00.000Z");
const DAY = 86_400_000;

describe("dates limites de la purge", () => {
  it("garde 30 jours de rappels, 24 h de codes et 13 mois d'appels à l'IA", () => {
    const cutoffs = purgeCutoffs(NOW);
    expect(cutoffs.reminderDecisionsBefore.toISOString()).toBe("2026-02-13T03:31:00.000Z");
    expect(cutoffs.loginCodesBefore.toISOString()).toBe("2026-03-14T03:31:00.000Z");
    expect(cutoffs.aiRequestsBefore.toISOString()).toBe("2025-02-15T03:31:00.000Z");
    expect(RETENTION.aiRequestsMonths).toBe(13);
  });
});

describe.skipIf(!TEST_DATABASE_URL)("purge des vieilles données (MySQL)", () => {
  const userId = 980_000 + Math.floor(Math.random() * 9_000);
  const email = `purge-${userId}@example.test`;
  const lockName = `test-purge-${userId}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const db = (await getDb())!;
    const decision = (key: string, validUntil: Date) => ({ userId, decisionKey: key, plantId: "basil", taskType: "watering", action: "water", priority: "normal", payload: "{}", validUntil, weatherFetchedAt: validUntil, status: "sent" });
    await db.insert(schema.reminderDecisions).values([decision("old", new Date(NOW.getTime() - 31 * DAY)), decision("recent", new Date(NOW.getTime() - 29 * DAY))]);
    const code = (hash: string, createdAt: Date) => ({ email, codeHash: hash, expiresAt: new Date(createdAt.getTime() + 600_000), createdAt });
    await db.insert(schema.loginCodes).values([code("old", new Date(NOW.getTime() - 25 * 3_600_000)), code("recent", new Date(NOW.getTime() - 23 * 3_600_000))]);
    const call = (createdAt: Date) => ({ userId, kind: "chat", status: "ok", createdAt });
    await db.insert(schema.aiRequests).values([call(new Date("2025-02-01T10:00:00.000Z")), call(new Date("2025-03-01T10:00:00.000Z"))]);
  });

  afterAll(async () => {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;
    await db.delete(schema.reminderDecisions).where(eq(schema.reminderDecisions.userId, userId));
    await db.delete(schema.loginCodes).where(eq(schema.loginCodes.email, email));
    await db.delete(schema.aiRequests).where(eq(schema.aiRequests.userId, userId));
    await db.delete(schema.jobLocks).where(eq(schema.jobLocks.name, lockName));
  });

  it("supprime seulement ce qui a dépassé sa durée de conservation", async () => {
    const { purgeOldData } = await import("../server/purge");
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;
    const deleted = await purgeOldData(NOW);
    expect(deleted!.reminderDecisions).toBeGreaterThanOrEqual(1);
    expect((await db.select({ key: schema.reminderDecisions.decisionKey }).from(schema.reminderDecisions).where(eq(schema.reminderDecisions.userId, userId))).map((row) => row.key)).toEqual(["recent"]);
    expect((await db.select({ hash: schema.loginCodes.codeHash }).from(schema.loginCodes).where(eq(schema.loginCodes.email, email))).map((row) => row.hash)).toEqual(["recent"]);
    const calls = await db.select({ createdAt: schema.aiRequests.createdAt }).from(schema.aiRequests).where(eq(schema.aiRequests.userId, userId));
    expect(calls.map((row) => row.createdAt.toISOString().slice(0, 7))).toEqual(["2025-03"]);
  });

  it("ne tourne qu'une fois par jour, même si le cron passe toutes les heures", async () => {
    const { runDailyPurge } = await import("../server/purge");
    expect((await runDailyPurge(NOW, lockName)).status).toBe("done");
    expect((await runDailyPurge(new Date(NOW.getTime() + 3_600_000), lockName)).status).toBe("not_due");
    expect((await runDailyPurge(new Date(NOW.getTime() + DAY), lockName)).status).toBe("done");
  });
});
