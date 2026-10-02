/**
 * Prix fondateur (server/founder.ts) sur une vraie base MySQL : places comptées, droit gardé.
 * Ignorés sans TEST_DATABASE_URL (migrations appliquées au préalable avec drizzle-kit migrate).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FOUNDER_OFFER, founderSeatsLeft } from "../lib/plans";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe("places au prix fondateur", () => {
  it("compte les places libres sans jamais descendre sous zéro", () => {
    expect(founderSeatsLeft(0)).toBe(FOUNDER_OFFER.seats);
    expect(founderSeatsLeft(3, 10)).toBe(7);
    expect(founderSeatsLeft(12, 10)).toBe(0);
  });
});

describe.skipIf(!TEST_DATABASE_URL)("prix fondateur (MySQL)", () => {
  const firstId = 950_000 + Math.floor(Math.random() * 40_000);
  const ids = [firstId, firstId + 1, firstId + 2];

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const db = (await getDb())!;
    await db.insert(schema.users).values(ids.map((id) => ({ id, openId: `founder-test-${id}`, plan: "plus" })));
  });

  afterAll(async () => {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { inArray } = await import("drizzle-orm");
    const db = (await getDb())!;
    await db.delete(schema.users).where(inArray(schema.users.id, ids));
  });

  it("donne le prix aux premiers abonnés tant qu'il reste des places, puis refuse", async () => {
    const { founderOffer, grantFounderPrice } = await import("../server/founder");
    // D'autres comptes de la base ont peut-être déjà le prix : on laisse exactement deux places.
    const { taken } = await founderOffer();
    const seats = taken + 2;
    expect(await grantFounderPrice(ids[0], new Date(), seats)).toBe("granted");
    expect(await grantFounderPrice(ids[1], new Date(), seats)).toBe("granted");
    expect(await grantFounderPrice(ids[2], new Date(), seats)).toBe("full");
    expect(await founderOffer(seats)).toEqual({ seats, taken: taken + 2, left: 0 });
  });

  it("garde la date du premier abonnement, même après un retour au gratuit", async () => {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const { grantFounderPrice } = await import("../server/founder");
    const db = (await getDb())!;
    const [before] = await db.select({ founderSince: schema.users.founderSince }).from(schema.users).where(eq(schema.users.id, ids[0]));
    await db.update(schema.users).set({ plan: "free" }).where(eq(schema.users.id, ids[0]));
    expect(await grantFounderPrice(ids[0], new Date(Date.now() + 86_400_000), 1_000_000)).toBe("already");
    const [after] = await db.select({ founderSince: schema.users.founderSince, plan: schema.users.plan }).from(schema.users).where(eq(schema.users.id, ids[0]));
    expect(after).toEqual({ founderSince: before.founderSince, plan: "free" });
  });

  it("signale un compte inconnu", async () => {
    const { grantFounderPrice } = await import("../server/founder");
    expect(await grantFounderPrice(ids[2] + 50_000, new Date(), 1_000_000)).toBe("unavailable");
  });
});
