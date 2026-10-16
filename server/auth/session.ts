import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { decodeJwt, jwtVerify, SignJWT } from "jose";

import { COOKIE_NAME } from "../../shared/const";
import { revokedSessions, type User } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb, getUserByOpenId } from "../db";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 180;
const ISSUER = "balco";

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signSession(user: Pick<User, "openId">) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setSubject(user.openId)
    // Identifiant propre à chaque connexion : deux téléphones connectés la même seconde ont deux jetons distincts.
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], issuer: ISSUER });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

function readCookie(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Jeton porté par l'en-tête Authorization (applications) ou par le cookie de session (web). */
export function sessionTokenFromRequest(req: Pick<Request, "headers">) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return readCookie(req.headers.cookie, COOKIE_NAME);
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * « Se déconnecter » : le jeton de ce téléphone est refusé jusqu'à sa fin de validité (les autres appareils du compte
 * restent connectés). Un jeton déjà invalide n'est pas noté.
 */
export async function revokeSession(token: string | undefined | null) {
  if (!token || !(await verifySession(token))) return;
  const db = await getDb();
  if (!db) return;
  const exp = decodeJwt(token).exp;
  const expiresAt = new Date((exp ?? Date.now() / 1000 + SESSION_TTL_SECONDS) * 1000);
  await db.insert(revokedSessions).values({ tokenHash: tokenHash(token), expiresAt }).onDuplicateKeyUpdate({ set: { expiresAt } });
}

async function isRevoked(token: string) {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db.select({ tokenHash: revokedSessions.tokenHash }).from(revokedSessions).where(eq(revokedSessions.tokenHash, tokenHash(token))).limit(1);
  return Boolean(row);
}

export async function authenticateRequest(req: Pick<Request, "headers">): Promise<User | null> {
  const token = sessionTokenFromRequest(req);
  const openId = await verifySession(token);
  if (!openId || (await isRevoked(token!))) return null;
  return (await getUserByOpenId(openId)) ?? null;
}
