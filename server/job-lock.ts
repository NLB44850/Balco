/**
 * Verrou en base pour les tâches planifiées : un seul passage à la fois, même avec plusieurs instances
 * du serveur. Le verrou a une durée de vie : si une instance s'arrête en plein passage, il se libère seul.
 */
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { jobLocks } from "../drizzle/schema";
import { getDb } from "./db";

/** Prend le verrou s'il est libre ou expiré ; renvoie l'identifiant du détenteur, ou `null` s'il est pris. */
export async function acquireJobLock(name: string, ttlMs: number, now = new Date()) {
  const owner = randomUUID();
  const db = await getDb();
  if (!db) return owner;
  const until = new Date(now.getTime() + ttlMs);
  // MySQL applique les affectations dans l'ordre : le détenteur change d'abord (si le verrou a expiré),
  // puis l'échéance n'est repoussée que si c'est bien nous qui le tenons.
  await db.insert(jobLocks).values({ name, owner, lockedUntil: until }).onDuplicateKeyUpdate({
    set: {
      owner: sql`IF(${jobLocks.lockedUntil} < ${sql.param(now, jobLocks.lockedUntil)}, ${owner}, ${jobLocks.owner})`,
      lockedUntil: sql`IF(${jobLocks.owner} = ${owner}, ${sql.param(until, jobLocks.lockedUntil)}, ${jobLocks.lockedUntil})`,
    },
  });
  const [row] = await db.select({ owner: jobLocks.owner }).from(jobLocks).where(eq(jobLocks.name, name)).limit(1);
  return row?.owner === owner ? owner : null;
}

export async function releaseJobLock(name: string, owner: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(jobLocks).where(and(eq(jobLocks.name, name), eq(jobLocks.owner, owner)));
}

/** Lance `task` sous le verrou ; `{ ran: false }` si un autre passage est en cours. */
export async function withJobLock<T>(name: string, ttlMs: number, task: () => Promise<T>, now = new Date()): Promise<{ ran: true; value: T } | { ran: false }> {
  const owner = await acquireJobLock(name, ttlMs, now);
  if (!owner) return { ran: false };
  try {
    return { ran: true, value: await task() };
  } finally {
    await releaseJobLock(name, owner);
  }
}
