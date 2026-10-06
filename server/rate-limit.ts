/**
 * Limites de débit (par exemple : demandes de code de connexion par adresse IP), comptées dans MySQL
 * pour valoir sur toutes les instances du serveur. Fenêtres fixes : un compteur par clé et par tranche
 * de temps (l'heure en cours), incrémenté d'un coup. Sans base (outils locaux), repli en mémoire.
 */
import { createHash } from "node:crypto";
import { and, eq, like, lt, notLike, sql } from "drizzle-orm";

import { rateLimits } from "../drizzle/schema";
import { getDb } from "./db";

/** Repli sans base : un compteur par clé et par fenêtre, dans ce seul processus. */
const memory = new Map<string, number>();

/** Empreinte courte d'une donnée personnelle (adresse IP) : on compte sans la garder en clair. */
export function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function windowStartOf(now: number, windowMs: number) {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

/** Compte un passage ; renvoie `false` si la limite est dépassée dans la fenêtre en cours. */
export async function hitRateLimit(bucket: string, limit: number, windowMs: number, now = Date.now()) {
  const windowStart = windowStartOf(now, windowMs);
  const db = await getDb();
  if (!db) {
    const key = `${bucket}@${windowStart.getTime()}`;
    const hits = (memory.get(key) ?? 0) + 1;
    if (memory.size > 10_000) memory.clear();
    memory.set(key, hits);
    return hits <= limit;
  }
  await db.insert(rateLimits).values({ bucket, windowStart, hits: 1 }).onDuplicateKeyUpdate({ set: { hits: sql`${rateLimits.hits} + 1` } });
  const [row] = await db.select({ hits: rateLimits.hits }).from(rateLimits).where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.windowStart, windowStart))).limit(1);
  return (row?.hits ?? 1) <= limit;
}

/** Combien de passages déjà comptés dans la fenêtre en cours (sans en ajouter). */
export async function peekRateLimit(bucket: string, windowMs: number, now = Date.now()) {
  const windowStart = windowStartOf(now, windowMs);
  const db = await getDb();
  if (!db) return memory.get(`${bucket}@${windowStart.getTime()}`) ?? 0;
  const [row] = await db.select({ hits: rateLimits.hits }).from(rateLimits).where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.windowStart, windowStart))).limit(1);
  return row?.hits ?? 0;
}

/** Rend un passage (une analyse qui a échoué ne doit pas compter). */
export async function refundRateLimit(bucket: string, windowMs: number, now = Date.now()) {
  const windowStart = windowStartOf(now, windowMs);
  const db = await getDb();
  if (!db) {
    const key = `${bucket}@${windowStart.getTime()}`;
    memory.set(key, Math.max(0, (memory.get(key) ?? 0) - 1));
    return;
  }
  await db.update(rateLimits).set({ hits: sql`GREATEST(${rateLimits.hits} - 1, 0)` }).where(and(eq(rateLimits.bucket, bucket), eq(rateLimits.windowStart, windowStart)));
}

/** Les compteurs longs (une analyse sans compte par appareil, sur un an) sont gardés plus longtemps. */
export const LONG_BUCKET_PREFIX = "guest-device:";
const LONG_KEEP_MS = 400 * 24 * 60 * 60 * 1000;

/** Efface les fenêtres terminées avant `before` (appelé par la purge quotidienne). */
export async function purgeRateLimits(before: Date) {
  const db = await getDb();
  if (!db) return;
  await db.delete(rateLimits).where(and(lt(rateLimits.windowStart, before), notLike(rateLimits.bucket, `${LONG_BUCKET_PREFIX}%`)));
  await db.delete(rateLimits).where(and(lt(rateLimits.windowStart, new Date(before.getTime() - LONG_KEEP_MS)), like(rateLimits.bucket, `${LONG_BUCKET_PREFIX}%`)));
}

/** Pour les tests : remet à zéro les compteurs dont la clé commence par `prefix`. */
export async function resetRateLimits(prefix: string) {
  for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key);
  const db = await getDb();
  if (db) await db.delete(rateLimits).where(like(rateLimits.bucket, `${prefix}%`));
}
