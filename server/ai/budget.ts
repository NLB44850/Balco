/**
 * Budget mensuel de l'IA : la dépense du mois est calculée à partir des jetons enregistrés dans
 * `ai_requests` et d'une grille de prix par modèle. À 80 % du budget (AI_MONTHLY_BUDGET_USD), l'IA se
 * met en pause pour les comptes gratuits ; à 100 %, pour tous, jusqu'au 1er du mois suivant.
 * Sans budget configuré, rien n'est coupé.
 */
import { and, desc, gte, inArray, isNotNull, sql } from "drizzle-orm";

import { aiRequests, users } from "../../drizzle/schema";
import type { AiKind, Plan } from "../../lib/plans";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { monthStart } from "./quotas";

/** Prix en dollars par million de jetons. */
export type ModelPrice = { input: number; output: number; cacheRead: number; cacheWrite: number };

/**
 * Tarifs publics de l'API Anthropic (relevés le 25/09/2026). L'écriture en cache (5 minutes) coûte
 * 1,25 fois l'entrée. AI_PRICES_JSON permet de corriger ou compléter la grille sans redéployer de code :
 * {"claude-opus-5": {"input": 5, "output": 25, "cacheRead": 0.5, "cacheWrite": 6.25}}.
 */
export const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

/** Un modèle absent de la grille est compté au prix le plus élevé : mieux vaut couper trop tôt que trop tard. */
const UNKNOWN_MODEL_PRICE = DEFAULT_PRICES["claude-fable-5-1"];

export function priceGrid(): Record<string, ModelPrice> {
  if (!process.env.AI_PRICES_JSON) return DEFAULT_PRICES;
  try {
    return { ...DEFAULT_PRICES, ...(JSON.parse(process.env.AI_PRICES_JSON) as Record<string, ModelPrice>) };
  } catch {
    console.warn("[ai] AI_PRICES_JSON is not valid JSON, default prices used");
    return DEFAULT_PRICES;
  }
}

/** La réponse renvoie parfois un identifiant daté (« claude-opus-5-20260401 ») : on retrouve le modèle de la grille. */
export function priceFor(model: string | null | undefined, grid = priceGrid()): ModelPrice {
  if (!model) return UNKNOWN_MODEL_PRICE;
  if (grid[model]) return grid[model];
  const known = Object.keys(grid).sort((a, b) => b.length - a.length).find((id) => model.startsWith(id));
  return known ? grid[known] : UNKNOWN_MODEL_PRICE;
}

export type TokenCounts = { inputTokens: number | null; outputTokens: number | null; cacheReadTokens: number | null; cacheWriteTokens: number | null };

export function costUsd(model: string | null | undefined, tokens: TokenCounts, grid = priceGrid()) {
  const price = priceFor(model, grid);
  return ((tokens.inputTokens ?? 0) * price.input + (tokens.outputTokens ?? 0) * price.output + (tokens.cacheReadTokens ?? 0) * price.cacheRead + (tokens.cacheWriteTokens ?? 0) * price.cacheWrite) / 1_000_000;
}

/** Les appels facturés par Anthropic : réussis, ou en erreur avec des jetons consommés (réponse coupée…). */
const BILLED = inArray(aiRequests.status, ["ok", "error"]);

/** Dépense du mois en dollars, tous comptes confondus. */
export async function monthSpendUsd(now = new Date()) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({
      model: aiRequests.model,
      inputTokens: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`,
      cacheReadTokens: sql<number>`coalesce(sum(${aiRequests.cacheReadTokens}), 0)`,
      cacheWriteTokens: sql<number>`coalesce(sum(${aiRequests.cacheWriteTokens}), 0)`,
    })
    .from(aiRequests)
    .where(and(gte(aiRequests.createdAt, monthStart(now)), BILLED, isNotNull(aiRequests.outputTokens)))
    .groupBy(aiRequests.model);
  const grid = priceGrid();
  return rows.reduce((total, row) => total + costUsd(row.model, { inputTokens: Number(row.inputTokens), outputTokens: Number(row.outputTokens), cacheReadTokens: Number(row.cacheReadTokens), cacheWriteTokens: Number(row.cacheWriteTokens) }, grid), 0);
}

export type BudgetLevel = "ok" | "free-paused" | "all-paused";
export type BudgetState = { level: BudgetLevel; spentUsd: number; budgetUsd: number | null };

/** Seuils : à 80 % les comptes gratuits s'arrêtent, à 100 % tout le monde. */
export const FREE_PAUSE_RATIO = 0.8;

export function budgetLevel(spentUsd: number, budgetUsd: number | null): BudgetLevel {
  if (budgetUsd === null) return "ok";
  if (spentUsd >= budgetUsd) return "all-paused";
  if (spentUsd >= budgetUsd * FREE_PAUSE_RATIO) return "free-paused";
  return "ok";
}

export function pausedFor(level: BudgetLevel, plan: Plan) {
  return level === "all-paused" || (level === "free-paused" && plan === "free");
}

/** La dépense est relue au plus une fois par minute : pas de calcul sur toute la table à chaque question. */
const CACHE_MS = 60_000;
let cached: { at: number; month: number; spentUsd: number } | null = null;
/** Seuils déjà signalés ce mois-ci, pour une seule ligne de journal par seuil. */
const logged = new Set<string>();

export function resetBudgetCache() {
  cached = null;
  logged.clear();
}

export async function budgetState(now = new Date()): Promise<BudgetState> {
  const budgetUsd = ENV.aiMonthlyBudgetUsd;
  if (budgetUsd === null) return { level: "ok", spentUsd: 0, budgetUsd };
  const month = monthStart(now).getTime();
  if (!cached || cached.month !== month || now.getTime() - cached.at > CACHE_MS) {
    cached = { at: now.getTime(), month, spentUsd: await monthSpendUsd(now) };
  }
  const level = budgetLevel(cached.spentUsd, budgetUsd);
  const key = `${month}:${level}`;
  if (level !== "ok" && !logged.has(key)) {
    logged.add(key);
    const who = level === "all-paused" ? "tous les comptes" : "les comptes gratuits";
    console.warn(`[ai] budget ${level === "all-paused" ? "100" : "80"} % atteint : ${cached.spentUsd.toFixed(2)} $ sur ${budgetUsd} $ ce mois-ci, IA en pause pour ${who}`);
  }
  return { level, spentUsd: cached.spentUsd, budgetUsd };
}

/** Le message affiché dans l'app quand l'IA est en pause pour ce compte. */
export function pauseMessage(level: BudgetLevel, plan: Plan, now = new Date()) {
  if (!pausedFor(level, plan)) return null;
  const reset = monthStart(now);
  reset.setUTCMonth(reset.getUTCMonth() + 1);
  const date = reset.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).replace(/^1 /, "1er ");
  return level === "all-paused"
    ? `Nora et l’analyse des photos font une pause jusqu’au ${date} : la limite du mois est atteinte. Tout le reste de Balco fonctionne.`
    : `Nora et l’analyse des photos font une pause pour les comptes gratuits jusqu’au ${date}. Avec Balco+, elles restent disponibles.`;
}

// --- Rapport des coûts (script et route admin) ----------------------------------------------

export type CostReport = {
  from: string;
  spentUsd: number;
  budgetUsd: number | null;
  level: BudgetLevel;
  byKind: Array<{ kind: AiKind; calls: number; totalUsd: number; averageUsd: number }>;
  byModel: Array<{ model: string; calls: number; totalUsd: number }>;
  topAccounts: Array<{ userId: number; email: string | null; plan: string; calls: number; totalUsd: number }>;
  accounts: { count: number; averageUsd: number };
};

/** Coût réel moyen par diagnostic, par question et par compte, depuis `from` (début du mois par défaut). */
export async function costReport(from = monthStart(new Date()), top = 20): Promise<CostReport> {
  const db = await getDb();
  const empty: CostReport = { from: from.toISOString(), spentUsd: 0, budgetUsd: ENV.aiMonthlyBudgetUsd, level: "ok", byKind: [], byModel: [], topAccounts: [], accounts: { count: 0, averageUsd: 0 } };
  if (!db) return empty;
  const rows = await db
    .select({ userId: aiRequests.userId, kind: aiRequests.kind, model: aiRequests.model, inputTokens: aiRequests.inputTokens, outputTokens: aiRequests.outputTokens, cacheReadTokens: aiRequests.cacheReadTokens, cacheWriteTokens: aiRequests.cacheWriteTokens })
    .from(aiRequests)
    .where(and(gte(aiRequests.createdAt, from), BILLED, isNotNull(aiRequests.outputTokens)))
    .orderBy(desc(aiRequests.createdAt));
  const grid = priceGrid();
  const kinds = new Map<AiKind, { calls: number; totalUsd: number }>();
  const models = new Map<string, { calls: number; totalUsd: number }>();
  const accounts = new Map<number, { calls: number; totalUsd: number }>();
  let spentUsd = 0;
  for (const row of rows) {
    const cost = costUsd(row.model, row, grid);
    spentUsd += cost;
    const kind = row.kind as AiKind;
    for (const [map, key] of [[kinds, kind], [models, row.model ?? "inconnu"], [accounts, row.userId]] as const) {
      const current = (map as Map<typeof key, { calls: number; totalUsd: number }>).get(key) ?? { calls: 0, totalUsd: 0 };
      (map as Map<typeof key, { calls: number; totalUsd: number }>).set(key, { calls: current.calls + 1, totalUsd: current.totalUsd + cost });
    }
  }
  const ranked = [...accounts].sort((a, b) => b[1].totalUsd - a[1].totalUsd).slice(0, top);
  const people = ranked.length > 0 ? await db.select({ id: users.id, email: users.email, plan: users.plan }).from(users).where(inArray(users.id, ranked.map(([id]) => id))) : [];
  const personOf = new Map(people.map((person) => [person.id, person]));
  return {
    from: from.toISOString(),
    spentUsd,
    budgetUsd: ENV.aiMonthlyBudgetUsd,
    level: budgetLevel(spentUsd, ENV.aiMonthlyBudgetUsd),
    byKind: [...kinds].map(([kind, value]) => ({ kind, ...value, averageUsd: value.totalUsd / value.calls })),
    byModel: [...models].map(([model, value]) => ({ model, ...value })),
    topAccounts: ranked.map(([userId, value]) => ({ userId, email: personOf.get(userId)?.email ?? null, plan: personOf.get(userId)?.plan ?? "free", ...value })),
    accounts: { count: accounts.size, averageUsd: accounts.size > 0 ? spentUsd / accounts.size : 0 },
  };
}

/** Le rapport en texte lisible, pour le script et la route admin. */
export function formatCostReport(report: CostReport) {
  const usd = (value: number) => `${value.toFixed(value < 1 ? 4 : 2)} $`;
  const kindName: Record<AiKind, string> = { scan: "Diagnostic photo", chat: "Question à Nora" };
  const lines = [
    `Coûts de l'IA depuis le ${report.from.slice(0, 10)}`,
    `Dépense : ${usd(report.spentUsd)}${report.budgetUsd === null ? " (pas de budget configuré)" : ` sur ${report.budgetUsd} $ de budget (${Math.round((report.spentUsd / report.budgetUsd) * 100)} %)`}`,
    report.level === "ok" ? "État : IA disponible pour tous" : report.level === "free-paused" ? "État : IA en pause pour les comptes gratuits (80 % atteints)" : "État : IA en pause pour tous (100 % atteints)",
    "",
    "Par usage :",
    ...report.byKind.map((row) => `- ${kindName[row.kind] ?? row.kind} : ${row.calls} appels, ${usd(row.totalUsd)} au total, ${usd(row.averageUsd)} en moyenne`),
    "",
    "Par modèle :",
    ...report.byModel.map((row) => `- ${row.model} : ${row.calls} appels, ${usd(row.totalUsd)}`),
    "",
    `Comptes : ${report.accounts.count}, ${usd(report.accounts.averageUsd)} en moyenne par compte`,
    ...report.topAccounts.map((row) => `- ${row.userId === 0 ? "visiteurs sans compte" : `n° ${row.userId} ${row.email ?? ""} (${row.plan})`} : ${row.calls} appels, ${usd(row.totalUsd)}`),
  ];
  return lines.join("\n");
}
