/**
 * Limites de débit (par exemple : demandes de code de connexion par adresse IP), comptées dans MySQL
 * pour valoir sur toutes les instances du serveur. Fenêtres fixes : un compteur par clé et par tranche
 * de temps (l'heure en cours), incrémenté d'un coup. Sans base (outils locaux), repli en mémoire.
 */
import { createHash } from "node:crypto";
import { and, eq, like, lt, sql } from "drizzle-orm";

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

/** Efface les fenêtres terminées avant `before` (appelé par la purge quotidienne). */
export async function purgeRateLimits(before: Date) {
  const db = await getDb();
  if (!db) return;
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, before));
}

/** Pour les tests : remet à zéro les compteurs dont la clé commence par `prefix`. */
export async function resetRateLimits(prefix: string) {
  for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key);
  const db = await getDb();
  if (db) await db.delete(rateLimits).where(like(rateLimits.bucket, `${prefix}%`));
}
