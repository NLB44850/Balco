import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import {
  aiRequests,
  noraMemories,
  authIdentities,
  devicePushTokens,
  loginCodes,
  maintenanceEvents,
  reminderDecisions,
  reminderPlants,
  reminderProfiles,
  users,
  type User,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { sendLoginCode } from "./mailer";
import { removePlusInterest } from "../plus-interest";

export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODES_PER_HOUR = 5;
export const MAX_CODE_ATTEMPTS = 5;

export type AuthProvider = "email" | "apple" | "google";

export type AuthErrorCode = "invalid_email" | "too_many_requests" | "invalid_code" | "invalid_token" | "not_configured";

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message: string) {
    super(message);
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  // Volontairement simple : l'envoi du code est la vraie vérification.
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError("invalid_email", "Cette adresse e-mail ne semble pas valide.");
  return email;
}

function hashCode(email: string, code: string) {
  return createHash("sha256").update(`${ENV.cookieSecret}:${email}:${code}`).digest("hex");
}

function sameHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

// --- Comptes et identités ---------------------------------------------------------

type IdentityClaim = { provider: AuthProvider; subject: string; email?: string | null; emailVerified: boolean; name?: string | null };

/**
 * Retrouve ou crée le compte correspondant à une identité.
 * Une identité Apple/Google n'est rattachée à un compte existant que si le fournisseur
 * certifie l'adresse e-mail : sinon, n'importe qui pourrait prendre le compte d'autrui.
 */
export async function findOrCreateUser(claim: IdentityClaim, now = new Date()): Promise<User> {
  const db = await requireDb();
  const [identity] = await db.select().from(authIdentities).where(and(eq(authIdentities.provider, claim.provider), eq(authIdentities.subject, claim.subject))).limit(1);
  if (identity) {
    await db.update(authIdentities).set({ lastUsedAt: now }).where(eq(authIdentities.id, identity.id));
    await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, identity.userId));
    const [user] = await db.select().from(users).where(eq(users.id, identity.userId)).limit(1);
    if (user) return user;
  }

  const email = claim.email ? claim.email.trim().toLowerCase() : null;
  let userId: number | undefined;
  if (email && claim.emailVerified) {
    const [byEmailIdentity] = await db.select().from(authIdentities).where(and(eq(authIdentities.provider, "email"), eq(authIdentities.subject, email))).limit(1);
    // Les comptes créés avant l'authentification maison n'avaient que leur adresse e-mail.
    const [byUserEmail] = byEmailIdentity ? [] : await db.select().from(users).where(eq(users.email, email)).limit(1);
    userId = byEmailIdentity?.userId ?? byUserEmail?.id;
  }

  if (!userId) {
    const openId = `usr_${randomBytes(16).toString("hex")}`;
    await db.insert(users).values({ openId, name: claim.name?.trim() || null, email, loginMethod: claim.provider, lastSignedIn: now });
    const [created] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    userId = created!.id;
  }

  try {
    await db.insert(authIdentities).values({ userId, provider: claim.provider, subject: claim.subject, email, lastUsedAt: now });
  } catch (error) {
    // Deux connexions simultanées : l'autre requête a créé l'identité, on la réutilise.
    const [existing] = await db.select().from(authIdentities).where(and(eq(authIdentities.provider, claim.provider), eq(authIdentities.subject, claim.subject))).limit(1);
    if (!existing) throw error;
    userId = existing.userId;
  }
  await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, userId));
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user!;
}

// --- Code par e-mail ----------------------------------------------------------------

export async function requestLoginCode(rawEmail: string, now = new Date()) {
  const email = normalizeEmail(rawEmail);
  const db = await requireDb();
  const recent = await db.select({ id: loginCodes.id }).from(loginCodes).where(and(eq(loginCodes.email, email), gt(loginCodes.createdAt, new Date(now.getTime() - 60 * 60 * 1000))));
  if (recent.length >= MAX_CODES_PER_HOUR) throw new AuthError("too_many_requests", "Trop de codes demandés. Réessaie dans une heure.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Un seul code valable à la fois : les précédents sont invalidés.
  await db.update(loginCodes).set({ consumedAt: now }).where(and(eq(loginCodes.email, email), isNull(loginCodes.consumedAt)));
  await db.insert(loginCodes).values({ email, codeHash: hashCode(email, code), expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MS), createdAt: now });
  await sendLoginCode(email, code);
  return { email, expiresInSeconds: LOGIN_CODE_TTL_MS / 1000 };
}

export async function verifyLoginCode(rawEmail: string, rawCode: string, now = new Date()) {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  const db = await requireDb();
  const [pending] = await db.select().from(loginCodes)
    .where(and(eq(loginCodes.email, email), isNull(loginCodes.consumedAt), gt(loginCodes.expiresAt, now)))
    .orderBy(desc(loginCodes.createdAt)).limit(1);
  if (!pending) throw new AuthError("invalid_code", "Ce code a expiré. Demande-en un nouveau.");

  if (code.length !== 6 || !sameHash(pending.codeHash, hashCode(email, code))) {
    const attempts = pending.attempts + 1;
    // Au-delà de 5 essais, le code est grillé : impossible de deviner le million de combinaisons.
    await db.update(loginCodes).set({ attempts, ...(attempts >= MAX_CODE_ATTEMPTS ? { consumedAt: now } : {}) }).where(eq(loginCodes.id, pending.id));
    throw new AuthError("invalid_code", attempts >= MAX_CODE_ATTEMPTS ? "Trop d'essais. Demande un nouveau code." : "Ce code n'est pas le bon.");
  }

  await db.update(loginCodes).set({ consumedAt: now }).where(eq(loginCodes.id, pending.id));
  return findOrCreateUser({ provider: "email", subject: email, email, emailVerified: true }, now);
}

// --- Apple et Google ----------------------------------------------------------------

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function jwks(url: string) {
  if (!jwksCache.has(url)) jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  return jwksCache.get(url)!;
}

async function verifyIdToken(token: string, options: { jwksUrl: string; issuer: string | string[]; audience: string[] }): Promise<JWTPayload> {
  if (options.audience.length === 0) throw new AuthError("not_configured", "Cette méthode de connexion n'est pas encore disponible.");
  try {
    const { payload } = await jwtVerify(token, jwks(options.jwksUrl), { issuer: options.issuer, audience: options.audience });
    return payload;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("invalid_token", "La connexion a échoué. Réessaie.");
  }
}

const isTrue = (value: unknown) => value === true || value === "true";

export async function signInWithApple(identityToken: string, options: { nonce?: string; fullName?: string | null } = {}) {
  const payload = await verifyIdToken(identityToken, { jwksUrl: ENV.appleJwksUrl, issuer: "https://appleid.apple.com", audience: ENV.appleAudiences });
  if (options.nonce) {
    // L'app envoie à Apple l'empreinte SHA-256 du nonce : un jeton intercepté ne peut pas être rejoué.
    const expected = createHash("sha256").update(options.nonce).digest("hex");
    if (payload.nonce !== expected) throw new AuthError("invalid_token", "La connexion a échoué. Réessaie.");
  }
  if (typeof payload.sub !== "string") throw new AuthError("invalid_token", "La connexion a échoué. Réessaie.");
  return findOrCreateUser({ provider: "apple", subject: payload.sub, email: typeof payload.email === "string" ? payload.email : null, emailVerified: isTrue(payload.email_verified), name: options.fullName });
}

export async function signInWithGoogle(idToken: string) {
  const payload = await verifyIdToken(idToken, { jwksUrl: ENV.googleJwksUrl, issuer: ["accounts.google.com", "https://accounts.google.com"], audience: ENV.googleClientIds });
  if (typeof payload.sub !== "string") throw new AuthError("invalid_token", "La connexion a échoué. Réessaie.");
  return findOrCreateUser({ provider: "google", subject: payload.sub, email: typeof payload.email === "string" ? payload.email : null, emailVerified: isTrue(payload.email_verified), name: typeof payload.name === "string" ? payload.name : null });
}

export function availableProviders() {
  return { email: true, apple: ENV.appleAudiences.length > 0, google: ENV.googleClientIds.length > 0 };
}

// --- Suppression de compte (exigée par l'App Store, et par le RGPD) -------------------------

export async function deleteAccount(userId: number) {
  const db = await requireDb();
  const identities = await db.select({ subject: authIdentities.subject }).from(authIdentities).where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, "email")));
  for (const table of [reminderDecisions, maintenanceEvents, reminderPlants, reminderProfiles, devicePushTokens, aiRequests, noraMemories, authIdentities]) {
    await db.delete(table).where(eq(table.userId, userId));
  }
  if (identities.length > 0) await db.delete(loginCodes).where(inArray(loginCodes.email, identities.map((identity) => identity.subject)));
  await removePlusInterest(userId);
  await db.delete(users).where(eq(users.id, userId));
  return { deleted: true };
}
