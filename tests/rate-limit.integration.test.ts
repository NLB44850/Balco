/**
 * Limites de débit comptées dans MySQL (server/rate-limit.ts) : valables pour toutes les instances.
 * Ignorés sans TEST_DATABASE_URL (migrations appliquées au préalable avec drizzle-kit migrate).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fingerprint, windowStartOf } from "../server/rate-limit";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const HOUR = 3_600_000;

describe("fenêtres et empreintes", () => {
  it("cale la fenêtre sur le début de l'heure", () => {
    expect(windowStartOf(Date.UTC(2026, 9, 2, 14, 37, 12), HOUR).toISOString()).toBe("2026-10-02T14:00:00.000Z");
  });

  it("ne garde pas l'adresse IP en clair", () => {
    expect(fingerprint("203.0.113.7")).toHaveLength(32);
    expect(fingerprint("203.0.113.7")).not.toContain("203");
    expect(fingerprint("203.0.113.7")).toBe(fingerprint("203.0.113.7"));
    expect(fingerprint("203.0.113.8")).not.toBe(fingerprint("203.0.113.7"));
  });
});

describe.skipIf(!TEST_DATABASE_URL)("limites de débit (MySQL)", () => {
  const prefix = `test-${Math.floor(Math.random() * 1e9)}:`;

  beforeAll(() => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
  });

  afterAll(async () => {
    const { resetRateLimits } = await import("../server/rate-limit");
    await resetRateLimits(prefix);
  });

  it("refuse au-delà de la limite, puis repart à zéro à l'heure suivante", async () => {
    const { hitRateLimit } = await import("../server/rate-limit");
    const now = Date.UTC(2026, 9, 2, 14, 10);
    const results = [];
    for (let index = 0; index < 4; index += 1) results.push(await hitRateLimit(`${prefix}a`, 3, HOUR, now + index * 1000));
    expect(results).toEqual([true, true, true, false]);
    // Une autre clé n'est pas touchée.
    expect(await hitRateLimit(`${prefix}b`, 3, HOUR, now)).toBe(true);
    expect(await hitRateLimit(`${prefix}a`, 3, HOUR, now + HOUR)).toBe(true);
  });

  it("compte juste quand plusieurs demandes arrivent en même temps", async () => {
    const { hitRateLimit } = await import("../server/rate-limit");
    const now = Date.UTC(2026, 9, 2, 16, 5);
    const results = await Promise.all(Array.from({ length: 10 }, () => hitRateLimit(`${prefix}c`, 5, HOUR, now)));
    expect(results.filter(Boolean).length).toBeLessThanOrEqual(5);
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await (await getDb())!.select({ hits: schema.rateLimits.hits }).from(schema.rateLimits).where(eq(schema.rateLimits.bucket, `${prefix}c`));
    expect(row.hits).toBe(10);
  });

  it("purge les fenêtres terminées", async () => {
    const { hitRateLimit, purgeRateLimits } = await import("../server/rate-limit");
    const old = Date.UTC(2026, 0, 1, 8);
    await hitRateLimit(`${prefix}old`, 1, HOUR, old);
    await purgeRateLimits(new Date(old + HOUR));
    // Purgée : le compteur repart de 1, donc le passage est de nouveau permis.
    expect(await hitRateLimit(`${prefix}old`, 1, HOUR, old)).toBe(true);
  });
});
