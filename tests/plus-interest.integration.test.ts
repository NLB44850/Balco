/**
 * « Me prévenir à l'ouverture » de Balco+ (server/plus-router.ts) sur une vraie base MySQL : le compte, ou
 * l'adresse e-mail et la date seulement, une seule fois. Ignorés sans TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("Balco+ : me prévenir à l'ouverture (MySQL)", () => {
  const userId = 990_000 + Math.floor(Math.random() * 9_000);
  const address = `Prevenir-${userId}@Example.com`;
  const caller = async (user: { id: number } | null, ip = `10.9.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`) => {
    const { appRouter } = await import("../server/routers");
    return appRouter.createCaller({ req: { headers: {}, protocol: "https", ip }, res: {}, user } as never);
  };

  beforeAll(() => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
  });

  afterAll(async () => {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { eq, or } = await import("drizzle-orm");
    const db = (await getDb())!;
    await db.delete(schema.plusInterest).where(or(eq(schema.plusInterest.userId, userId), eq(schema.plusInterest.email, address.toLowerCase())));
  });

  it("garde le compte, une seule fois", async () => {
    const api = await caller({ id: userId });
    expect(await api.plus.interest()).toEqual({ interested: false });
    expect(await api.plus.notifyMe({})).toEqual({ interested: true });
    await api.plus.notifyMe({});
    expect(await api.plus.interest()).toEqual({ interested: true });
  });

  it("sans compte : l'adresse e-mail (en minuscules) et la date, rien d'autre", async () => {
    const api = await caller(null);
    await expect(api.plus.notifyMe({})).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(api.plus.notifyMe({ email: "pas-une-adresse" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await api.plus.notifyMe({ email: address });
    await api.plus.notifyMe({ email: address.toLowerCase() });
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await (await getDb())!.select().from(schema.plusInterest).where(eq(schema.plusInterest.email, address.toLowerCase()));
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["createdAt", "email", "id", "userId"]);
    expect(rows[0].userId).toBeNull();
  });

  it("sans compte : 10 adresses par heure et par réseau au plus", async () => {
    const ip = `10.8.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const api = await caller(null, ip);
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { like } = await import("drizzle-orm");
    try {
      for (let index = 0; index < 10; index++) await api.plus.notifyMe({ email: `flot-${userId}-${index}@example.com` });
      await expect(api.plus.notifyMe({ email: `flot-${userId}-over@example.com` })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    } finally {
      await (await getDb())!.delete(schema.plusInterest).where(like(schema.plusInterest.email, `flot-${userId}-%`));
    }
  });
});
