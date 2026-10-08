/**
 * « Me prévenir à l'ouverture » de Balco+ : on garde le compte, ou sans compte l'adresse e-mail et la date,
 * rien d'autre (pas d'appareil, pas d'IP en clair). La liste sert une seule fois, à l'ouverture, puis s'efface
 * (`clearPlusInterest`, à lancer après l'envoi).
 */
import { eq, sql } from "drizzle-orm";

import { plusInterest } from "../drizzle/schema";
import { getDb } from "./db";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Le compte est-il déjà sur la liste ? */
export async function hasPlusInterest(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db.select({ id: plusInterest.id }).from(plusInterest).where(eq(plusInterest.userId, userId)).limit(1);
  return Boolean(row);
}

/** Inscrit le compte ou l'adresse, une seule fois (une seconde demande ne change rien). */
export async function addPlusInterest(who: { userId: number } | { email: string }) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const values = "userId" in who ? { userId: who.userId } : { email: normalizeEmail(who.email) };
  await db.insert(plusInterest).values(values).onDuplicateKeyUpdate({ set: { id: sql`${plusInterest.id}` } });
}

/** Un compte supprimé quitte la liste. */
export async function removePlusInterest(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(plusInterest).where(eq(plusInterest.userId, userId));
}

/** Après l'envoi qui annonce l'ouverture : la liste n'a plus de raison d'exister. */
export async function clearPlusInterest() {
  const db = await getDb();
  if (!db) return;
  await db.delete(plusInterest);
}
