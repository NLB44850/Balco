/**
 * Prix fondateur : qui y a droit et combien de places restent. Le prix se règle dans les stores ;
 * ici on retient seulement les comptes concernés (`users.founderSince`). Pas encore de paiement :
 * le futur webhook des achats intégrés appellera `grantFounderPrice` au premier abonnement.
 */
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { users } from "../drizzle/schema";
import { founderSeatsLeft } from "../lib/plans";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export type FounderGrant = "granted" | "already" | "full" | "unavailable";

/** Places prises, places au total et places libres. */
export async function founderOffer(seats = ENV.founderSeats) {
  const db = await getDb();
  if (!db) return { seats, taken: 0, left: seats };
  const [row] = await db.select({ taken: sql<number>`count(*)` }).from(users).where(isNotNull(users.founderSince));
  const taken = Number(row?.taken ?? 0);
  return { seats, taken, left: founderSeatsLeft(taken, seats) };
}

/**
 * Donne le prix fondateur au compte s'il reste une place ; ne fait rien s'il l'a déjà (la date du
 * premier abonnement est gardée). Une seule requête : la place est vérifiée et prise d'un coup.
 */
export async function grantFounderPrice(userId: number, now = new Date(), seats = ENV.founderSeats): Promise<FounderGrant> {
  const db = await getDb();
  if (!db) return "unavailable";
  // MySQL refuse de relire la table qu'on modifie, sauf à travers une table dérivée (le « counted »).
  const result = await db.update(users).set({ founderSince: now }).where(and(
    eq(users.id, userId),
    isNull(users.founderSince),
    sql`(select counted.taken from (select count(*) as taken from users where founderSince is not null) as counted) < ${seats}`,
  ));
  const affected = Number((result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
  if (affected > 0) return "granted";
  const [row] = await db.select({ founderSince: users.founderSince }).from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return "unavailable";
  return row.founderSince ? "already" : "full";
}
