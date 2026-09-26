import type { Request } from "express";
import { jwtVerify, SignJWT } from "jose";

import { COOKIE_NAME } from "../../shared/const";
import type { User } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getUserByOpenId } from "../db";

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

export async function authenticateRequest(req: Pick<Request, "headers">): Promise<User | null> {
  const openId = await verifySession(sessionTokenFromRequest(req));
  if (!openId) return null;
  return (await getUserByOpenId(openId)) ?? null;
}
