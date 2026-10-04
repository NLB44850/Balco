/**
 * Verrou des tâches planifiées (server/job-lock.ts) et traitement par lots (server/concurrency.ts).
 * Les tests du verrou sont ignorés sans TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { mapWithConcurrency } from "../server/concurrency";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe("traitement par lots", () => {
  it("ne dépasse jamais la limite et garde l'ordre des résultats", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapWithConcurrency([5, 1, 4, 2, 3, 0, 6], 3, async (value) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, value * 3));
      running -= 1;
      return value * 10;
    });
    expect(peak).toBe(3);
    expect(results).toEqual([50, 10, 40, 20, 30, 0, 60]);
  });

  it("accepte une liste vide", async () => {
    expect(await mapWithConcurrency([], 20, async () => 1)).toEqual([]);
  });
});

describe.skipIf(!TEST_DATABASE_URL)("verrou des tâches planifiées (MySQL)", () => {
  const name = `test-${Math.floor(Math.random() * 1e9)}`;
  const NOW = new Date("2026-10-02T10:00:00.000Z");
  const MINUTE = 60_000;

  beforeAll(() => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
  });

  afterAll(async () => {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { like } = await import("drizzle-orm");
    await (await getDb())!.delete(schema.jobLocks).where(like(schema.jobLocks.name, `${name}%`));
  });

  it("un seul détenteur à la fois, puis libéré", async () => {
    const { acquireJobLock, releaseJobLock } = await import("../server/job-lock");
    const first = await acquireJobLock(name, 30 * MINUTE, NOW);
    expect(first).toBeTruthy();
    expect(await acquireJobLock(name, 30 * MINUTE, new Date(NOW.getTime() + 5 * MINUTE))).toBeNull();
    await releaseJobLock(name, first!);
    expect(await acquireJobLock(name, 30 * MINUTE, new Date(NOW.getTime() + 6 * MINUTE))).toBeTruthy();
  });

  it("reprend un verrou expiré (instance arrêtée en plein passage)", async () => {
    const { acquireJobLock } = await import("../server/job-lock");
    const stuck = await acquireJobLock(`${name}-stuck`, 30 * MINUTE, NOW);
    expect(stuck).toBeTruthy();
    expect(await acquireJobLock(`${name}-stuck`, 30 * MINUTE, new Date(NOW.getTime() + 29 * MINUTE))).toBeNull();
    const next = await acquireJobLock(`${name}-stuck`, 30 * MINUTE, new Date(NOW.getTime() + 31 * MINUTE));
    expect(next).toBeTruthy();
    expect(next).not.toBe(stuck);
  });

  it("ne laisse passer qu'un passage quand deux démarrent en même temps", async () => {
    const { withJobLock } = await import("../server/job-lock");
    let runs = 0;
    const task = async () => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return runs;
    };
    const results = await Promise.all([withJobLock(`${name}-race`, 30 * MINUTE, task, NOW), withJobLock(`${name}-race`, 30 * MINUTE, task, NOW)]);
    expect(results.filter((result) => result.ran)).toHaveLength(1);
    expect(runs).toBe(1);
    // Libéré à la fin : le passage suivant peut tourner.
    expect((await withJobLock(`${name}-race`, 30 * MINUTE, task, NOW)).ran).toBe(true);
  });
});
