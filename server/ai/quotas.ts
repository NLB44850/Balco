import { and, eq, gte, lte, or, sql } from "drizzle-orm";

import { aiRequests } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";

import type { AiKind, Plan } from "../../lib/plans";

// Le forfait et ses quotas viennent de lib/plans.ts, partagé avec l'app.
export { planOf, type AiKind, type Plan } from "../../lib/plans";

/** Une réservation plus vieille que ça n'a jamais abouti (serveur redémarré) : elle ne compte plus. */
const PENDING_TTL_MS = 10 * 60 * 1000;

export function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function quotaLimit(plan: Plan, kind: AiKind) {
  return ENV.aiQuotas[plan][kind];
}

export type QuotaStatus = { kind: AiKind; used: number; limit: number; remaining: number; resetsAt: string };

export function toQuotaStatus(kind: AiKind, used: number, limit: number, now = new Date()): QuotaStatus {
  const reset = monthStart(now);
  reset.setUTCMonth(reset.getUTCMonth() + 1);
  return { kind, used, limit, remaining: Math.max(0, limit - used), resetsAt: reset.toISOString() };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

/** Ce qui compte : les appels réussis du mois, plus les réservations en cours. Refus et erreurs sont offerts. */
export async function usedThisMonth(userId: number, kind: AiKind, now = new Date(), upToId?: number) {
  const db = await requireDb();
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(aiRequests).where(and(
    eq(aiRequests.userId, userId),
    ...(upToId !== undefined ? [lte(aiRequests.id, upToId)] : []),
    eq(aiRequests.kind, kind),
    gte(aiRequests.createdAt, monthStart(now)),
    or(eq(aiRequests.status, "ok"), and(eq(aiRequests.status, "pending"), gte(aiRequests.createdAt, new Date(now.getTime() - PENDING_TTL_MS)))),
  ));
  return Number(row?.count ?? 0);
}

export async function quotaStatus(userId: number, plan: Plan, kind: AiKind, now = new Date()) {
  return toQuotaStatus(kind, await usedThisMonth(userId, kind, now), quotaLimit(plan, kind), now);
}

export class QuotaExceededError extends Error {
  constructor(public status: QuotaStatus) {
    super("quota exceeded");
  }
}

/**
 * Réserve une place dans le quota avant d'appeler le modèle. Avec des requêtes simultanées,
 * chacune ne compte que les réservations arrivées avant elle (identifiants croissants) :
 * exactement les premières jusqu'à la limite passent, jamais plus, jamais moins.
 */
export async function reserve(userId: number, plan: Plan, kind: AiKind, now = new Date()) {
  const db = await requireDb();
  const limit = quotaLimit(plan, kind);
  if ((await usedThisMonth(userId, kind, now)) >= limit) throw new QuotaExceededError(toQuotaStatus(kind, limit, limit, now));
  const [result] = await db.insert(aiRequests).values({ userId, kind, status: "pending", createdAt: now }).$returningId();
  const rank = await usedThisMonth(userId, kind, now, result.id);
  if (rank > limit) {
    await db.delete(aiRequests).where(eq(aiRequests.id, result.id));
    throw new QuotaExceededError(toQuotaStatus(kind, limit, limit, now));
  }
  return result.id;
}

export type Usage = { model: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };

export async function settle(requestId: number, status: "ok" | "refused" | "error", usage?: Usage) {
  const db = await requireDb();
  await db.update(aiRequests).set({ status, ...(usage ?? {}) }).where(eq(aiRequests.id, requestId));
}

