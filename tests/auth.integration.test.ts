/**
 * Authentification maison sur une vraie base MySQL/MariaDB (ignorée sans TEST_DATABASE_URL).
 * Les jetons Apple et Google sont signés ici avec une vraie clé RSA, et leurs clés publiques
 * (JWKS) sont servies par un fetch simulé : c'est le même chemin de vérification qu'en production.
 */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const APPLE_AUDIENCE = "fr.test.balco";
const GOOGLE_CLIENT = "google-client.apps.googleusercontent.com";
const suffix = Math.random().toString(36).slice(2, 8);
const email = (name: string) => `${name}-${suffix}@example.test`;

const sentCodes = new Map<string, string>();
vi.mock("../server/auth/mailer", () => ({
  MailNotConfiguredError: class extends Error {},
  sendLoginCode: async (to: string, code: string) => {
    sentCodes.set(to, code);
  },
}));

type Keys = Awaited<ReturnType<typeof generateKeyPair>>;
let keys: Keys;
let publicJwk: JWK;

async function idToken(issuer: string, audience: string, claims: Record<string, unknown>) {
  return new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "test-key" }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("10m").sign(keys.privateKey);
}

describe.skipIf(!TEST_DATABASE_URL)("own authentication (MySQL)", () => {
  let accounts: typeof import("../server/auth/accounts");
  let session: typeof import("../server/auth/session");
  let appRouter: typeof import("../server/routers")["appRouter"];
  let resetAuthRateLimits: () => Promise<void>;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.JWT_SECRET = "test-secret-that-is-long-enough-000000";
    process.env.APPLE_AUDIENCES = APPLE_AUDIENCE;
    process.env.APPLE_JWKS_URL = "https://apple.test/auth/keys";
    process.env.GOOGLE_CLIENT_IDS = GOOGLE_CLIENT;
    process.env.GOOGLE_JWKS_URL = "https://google.test/certs";
    keys = await generateKeyPair("RS256", { extractable: true });
    publicJwk = { ...(await exportJWK(keys.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith("https://apple.test") || url.startsWith("https://google.test")) return Promise.resolve(new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { "content-type": "application/json" } }));
      return realFetch(input, init);
    }));
    accounts = await import("../server/auth/accounts");
    session = await import("../server/auth/session");
    appRouter = (await import("../server/routers")).appRouter;
    resetAuthRateLimits = (await import("../server/auth/router")).resetAuthRateLimits;
  });

  beforeEach(() => resetAuthRateLimits?.());

  afterAll(async () => {
    const { getDb } = await import("../server/db");
    const schema = await import("../drizzle/schema");
    const { inArray, like } = await import("drizzle-orm");
    const db = (await getDb())!;
    const users = await db.select({ id: schema.users.id }).from(schema.users).where(like(schema.users.email, `%-${suffix}@example.test`));
    const ids = users.map((user) => user.id);
    if (ids.length > 0) {
      await db.delete(schema.authIdentities).where(inArray(schema.authIdentities.userId, ids));
      await db.delete(schema.users).where(inArray(schema.users.id, ids));
    }
    await db.delete(schema.loginCodes).where(like(schema.loginCodes.email, `%-${suffix}@example.test`));
    vi.unstubAllGlobals();
  });

  async function loginWithCode(address: string) {
    await accounts.requestLoginCode(address);
    const code = sentCodes.get(address.trim().toLowerCase())!;
    return accounts.verifyLoginCode(address, code);
  }

  describe("email code", () => {
    it("creates an account on first login and finds it again afterwards", async () => {
      const address = email("lea");
      createdEmails.push(address);
      const first = await loginWithCode(`  ${address.toUpperCase()} `);
      expect(first).toMatchObject({ email: address, loginMethod: "email" });
      expect(first.openId).toMatch(/^usr_[0-9a-f]{32}$/);
      const second = await loginWithCode(address);
      expect(second.id).toBe(first.id);
    });

    it("rejects a wrong code, then burns it after five attempts", async () => {
      const address = email("guess");
      await accounts.requestLoginCode(address);
      const good = sentCodes.get(address)!;
      const wrong = good === "000000" ? "111111" : "000000";
      for (let attempt = 1; attempt < 5; attempt++) await expect(accounts.verifyLoginCode(address, wrong)).rejects.toMatchObject({ code: "invalid_code", message: "Ce code n'est pas le bon." });
      await expect(accounts.verifyLoginCode(address, wrong)).rejects.toMatchObject({ message: "Trop d'essais. Demande un nouveau code." });
      // Même le bon code ne passe plus.
      await expect(accounts.verifyLoginCode(address, good)).rejects.toMatchObject({ code: "invalid_code" });
    });

    it("accepts a code only once and only the latest one", async () => {
      const address = email("once");
      await accounts.requestLoginCode(address);
      const firstCode = sentCodes.get(address)!;
      await accounts.requestLoginCode(address);
      const latest = sentCodes.get(address)!;
      if (firstCode !== latest) await expect(accounts.verifyLoginCode(address, firstCode)).rejects.toMatchObject({ code: "invalid_code" });
      await accounts.verifyLoginCode(address, latest);
      await expect(accounts.verifyLoginCode(address, latest)).rejects.toMatchObject({ code: "invalid_code" });
    });

    it("expires codes after ten minutes", async () => {
      const address = email("late");
      const sentAt = new Date();
      await accounts.requestLoginCode(address, sentAt);
      await expect(accounts.verifyLoginCode(address, sentCodes.get(address)!, new Date(sentAt.getTime() + 11 * 60_000))).rejects.toMatchObject({ message: "Ce code a expiré. Demande-en un nouveau." });
    });

    it("limits code requests per address", async () => {
      const address = email("spam");
      for (let request = 0; request < 5; request++) await accounts.requestLoginCode(address);
      await expect(accounts.requestLoginCode(address)).rejects.toMatchObject({ code: "too_many_requests" });
    });

    it("refuses malformed addresses", async () => {
      await expect(accounts.requestLoginCode("pas-une-adresse")).rejects.toMatchObject({ code: "invalid_email" });
    });

    it("recovers accounts created before own authentication, by their email", async () => {
      const { getDb } = await import("../server/db");
      const schema = await import("../drizzle/schema");
      const address = email("legacy");
      await (await getDb())!.insert(schema.users).values({ openId: `legacy-${suffix}`, email: address, name: "Ancien compte", loginMethod: "manus" });
      const user = await loginWithCode(address);
      expect(user.openId).toBe(`legacy-${suffix}`);
    });
  });

  describe("Apple and Google", () => {
    it("links Apple to the email account when Apple certifies the address", async () => {
      const address = email("apple-linked");
      const emailUser = await loginWithCode(address);
      const nonce = "raw-nonce-123";
      const token = await idToken("https://appleid.apple.com", APPLE_AUDIENCE, { sub: `apple-${suffix}-1`, email: address, email_verified: "true", nonce: createHash("sha256").update(nonce).digest("hex") });
      const appleUser = await accounts.signInWithApple(token, { nonce, fullName: "Léa" });
      expect(appleUser.id).toBe(emailUser.id);
      // Deuxième connexion Apple (sans e-mail, comme Apple le fait après la première fois).
      const again = await accounts.signInWithApple(await idToken("https://appleid.apple.com", APPLE_AUDIENCE, { sub: `apple-${suffix}-1` }));
      expect(again.id).toBe(emailUser.id);
    });

    it("never links on an unverified address", async () => {
      const address = email("victim");
      const victim = await loginWithCode(address);
      const token = await idToken("https://accounts.google.com", GOOGLE_CLIENT, { sub: `google-${suffix}-attacker`, email: address, email_verified: false });
      const attacker = await accounts.signInWithGoogle(token);
      expect(attacker.id).not.toBe(victim.id);
    });

    it("rejects tokens for another app, from another issuer or with a replayed nonce", async () => {
      await expect(accounts.signInWithApple(await idToken("https://appleid.apple.com", "com.other.app", { sub: "x" }))).rejects.toMatchObject({ code: "invalid_token" });
      await expect(accounts.signInWithGoogle(await idToken("https://evil.example", GOOGLE_CLIENT, { sub: "x" }))).rejects.toMatchObject({ code: "invalid_token" });
      const token = await idToken("https://appleid.apple.com", APPLE_AUDIENCE, { sub: "x", nonce: "not-the-hash" });
      await expect(accounts.signInWithApple(token, { nonce: "raw-nonce" })).rejects.toMatchObject({ code: "invalid_token" });
    });

    it("creates a Google account with its verified email", async () => {
      const address = email("google-new");
      const user = await accounts.signInWithGoogle(await idToken("https://accounts.google.com", GOOGLE_CLIENT, { sub: `google-${suffix}-new`, email: address, email_verified: true, name: "Sam" }));
      expect(user).toMatchObject({ email: address, name: "Sam", loginMethod: "google" });
    });
  });

  describe("sessions and API", () => {
    function context(headers: Record<string, string> = {}) {
      const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
      const res = { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }), clearCookie: vi.fn() };
      const req = { headers, protocol: "https", ip: `10.0.0.${Math.floor(Math.random() * 200)}` };
      return { cookies, ctx: { req, res, user: null } as never };
    }

    it("signs sessions that only this server can verify", async () => {
      const user = await loginWithCode(email("session"));
      const token = await session.signSession(user);
      expect(await session.verifySession(token)).toBe(user.openId);
      expect(await session.verifySession(`${token.slice(0, -4)}abcd`)).toBeNull();
      expect((await session.authenticateRequest({ headers: { authorization: `Bearer ${token}` } }))?.id).toBe(user.id);
      expect((await session.authenticateRequest({ headers: { cookie: `other=1; app_session_id=${token}` } }))?.id).toBe(user.id);
      expect(await session.authenticateRequest({ headers: {} })).toBeNull();
    });

    it("logs in through the API, returning a token and a Lax HttpOnly cookie", async () => {
      const address = email("api");
      const { ctx, cookies } = context();
      const caller = appRouter.createCaller(ctx);
      await caller.auth.requestEmailCode({ email: address });
      const result = await caller.auth.verifyEmailCode({ email: address, code: sentCodes.get(address)! });
      expect(result.user.email).toBe(address);
      expect(cookies[0]).toMatchObject({ name: "app_session_id", value: result.token, options: { httpOnly: true, sameSite: "lax", secure: true } });
      await expect(caller.auth.requestEmailCode({ email: "nope" })).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Cette adresse e-mail ne semble pas valide." });
    });

    it("limits code requests per network", async () => {
      const { ctx } = context();
      const caller = appRouter.createCaller(ctx);
      for (let request = 0; request < 20; request++) await caller.auth.requestEmailCode({ email: email(`net${request}`) });
      await expect(caller.auth.requestEmailCode({ email: email("net-over") })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    });

    it("deletes the account and every piece of data attached to it", async () => {
      const address = email("delete");
      const user = await loginWithCode(address);
      const { syncGarden } = await import("../server/reminders");
      await syncGarden(user.id, { plants: [{ id: "p1", catalogId: "basil", addedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], events: [{ id: "e1", plantId: "p1", type: "watering", completedAt: new Date().toISOString(), source: "manual" }], deletedEventIds: [] });
      const caller = appRouter.createCaller({ ...(context().ctx as object), user } as never);
      await caller.plus.notifyMe({});
      await caller.auth.deleteAccount();

      const { getDb } = await import("../server/db");
      const schema = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = (await getDb())!;
      for (const table of [schema.reminderPlants, schema.maintenanceEvents, schema.reminderProfiles, schema.authIdentities, schema.plusInterest]) {
        expect(await db.select().from(table).where(eq(table.userId, user.id))).toHaveLength(0);
      }
      expect(await db.select().from(schema.users).where(eq(schema.users.id, user.id))).toHaveLength(0);
      expect(await db.select().from(schema.loginCodes).where(eq(schema.loginCodes.email, address))).toHaveLength(0);
    });
  });
});
