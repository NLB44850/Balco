/**
 * Purge quotidienne des données qui ne servent plus, lancée par le cron des rappels (une fois par jour,
 * toutes instances confondues) : la base ne grossit pas sans fin. Les suppressions se font par paquets
 * pour ne pas bloquer les tables longtemps.
 */
import { lt } from "drizzle-orm";

import { aiRequests, loginCodes, reminderDecisions } from "../drizzle/schema";
import { getDb } from "./db";
import { acquireJobLock, releaseJobLock } from "./job-lock";
import { purgeRateLimits } from "./rate-limit";

/** Ce qu'on garde. Les appels à l'IA restent 13 mois : le rapport de coûts compare d'une année sur l'autre. */
export const RETENTION = { reminderDecisionsDays: 30, loginCodesHours: 24, aiRequestsMonths: 13, rateLimitsHours: 24 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const BATCH = 5000;

export function purgeCutoffs(now: Date) {
  const aiRequestsBefore = new Date(now);
  aiRequestsBefore.setUTCMonth(aiRequestsBefore.getUTCMonth() - RETENTION.aiRequestsMonths);
  return {
    reminderDecisionsBefore: new Date(now.getTime() - RETENTION.reminderDecisionsDays * DAY_MS),
    loginCodesBefore: new Date(now.getTime() - RETENTION.loginCodesHours * HOUR_MS),
    aiRequestsBefore,
    rateLimitsBefore: new Date(now.getTime() - RETENTION.rateLimitsHours * HOUR_MS),
  };
}

function affectedRows(result: unknown) {
  return Number((result as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
}

/** Supprime par paquets jusqu'à ce qu'il ne reste rien à supprimer ; renvoie le nombre de lignes. */
async function deleteInBatches(run: () => Promise<unknown>) {
  let total = 0;
  for (;;) {
    const deleted = affectedRows(await run());
    total += deleted;
    if (deleted < BATCH) return total;
  }
}

export async function purgeOldData(now = new Date()) {
  const db = await getDb();
  if (!db) return null;
  const cutoffs = purgeCutoffs(now);
  // Rappels : une décision ne vaut que pour son jour ; au-delà de 30 jours, plus rien ne la lit.
  const reminderDecisionsDeleted = await deleteInBatches(() => db.delete(reminderDecisions).where(lt(reminderDecisions.validUntil, cutoffs.reminderDecisionsBefore)).limit(BATCH));
  // Codes de connexion : valables 10 minutes, gardés un jour pour la limite d'envoi par e-mail.
  const loginCodesDeleted = await deleteInBatches(() => db.delete(loginCodes).where(lt(loginCodes.createdAt, cutoffs.loginCodesBefore)).limit(BATCH));
  const aiRequestsDeleted = await deleteInBatches(() => db.delete(aiRequests).where(lt(aiRequests.createdAt, cutoffs.aiRequestsBefore)).limit(BATCH));
  await purgeRateLimits(cutoffs.rateLimitsBefore);
  return { reminderDecisions: reminderDecisionsDeleted, loginCodes: loginCodesDeleted, aiRequests: aiRequestsDeleted };
}

/** Un verrou de 23 h jamais relâché sert de « déjà fait aujourd'hui » : le cron horaire purge une fois par jour. */
const PURGE_EVERY_MS = 23 * HOUR_MS;

export async function runDailyPurge(now = new Date(), lockName = "daily-purge") {
  const owner = await acquireJobLock(lockName, PURGE_EVERY_MS, now);
  if (!owner) return { status: "not_due" } as const;
  const started = Date.now();
  try {
    const deleted = await purgeOldData(now);
    const durationMs = Date.now() - started;
    if (deleted) console.log(`[purge] en ${durationMs} ms : ${deleted.reminderDecisions} rappels, ${deleted.loginCodes} codes de connexion, ${deleted.aiRequests} appels à l'IA supprimés`);
    return { status: "done", durationMs, deleted } as const;
  } catch (error) {
    // Échec : on relâche pour réessayer au passage suivant plutôt que d'attendre un jour.
    await releaseJobLock(lockName, owner);
    throw error;
  }
}
