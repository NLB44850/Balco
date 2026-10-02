import { describe, expect, it } from "vitest";

import { budgetLevel, costUsd, DEFAULT_PRICES, formatCostReport, pausedFor, pauseMessage, priceFor } from "../server/ai/budget";

describe("budget IA", () => {
  it("compte chaque type de jeton à son prix, modèle par modèle", () => {
    // 1 M de jetons de chaque sorte sur Claude Opus 5 : 5 + 25 + 0,5 + 6,25 $.
    expect(costUsd("claude-opus-5", { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000 })).toBeCloseTo(36.75);
    // Une question à Nora typique sur Claude Sonnet 5 : environ un centime.
    expect(costUsd("claude-sonnet-5", { inputTokens: 1500, outputTokens: 600, cacheReadTokens: 3000, cacheWriteTokens: 0 })).toBeCloseTo(0.0096, 4);
    expect(costUsd("claude-opus-5", { inputTokens: null, outputTokens: null, cacheReadTokens: null, cacheWriteTokens: null })).toBe(0);
  });

  it("retrouve un modèle daté et compte un modèle inconnu au prix fort", () => {
    expect(priceFor("claude-opus-5-20260401")).toEqual(DEFAULT_PRICES["claude-opus-5"]);
    expect(priceFor("claude-opus-5-5")).toEqual(DEFAULT_PRICES["claude-opus-5-5"]);
    expect(priceFor("claude-nouveau")).toEqual(DEFAULT_PRICES["claude-fable-5-1"]);
    expect(priceFor(null)).toEqual(DEFAULT_PRICES["claude-fable-5-1"]);
  });

  it("met en pause les gratuits à 80 %, tout le monde à 100 %, personne sans budget", () => {
    expect(budgetLevel(10, null)).toBe("ok");
    expect(budgetLevel(23.9, 30)).toBe("ok");
    expect(budgetLevel(24, 30)).toBe("free-paused");
    expect(budgetLevel(30, 30)).toBe("all-paused");
    expect(pausedFor("free-paused", "free")).toBe(true);
    expect(pausedFor("free-paused", "plus")).toBe(false);
    expect(pausedFor("all-paused", "plus")).toBe(true);
  });

  it("explique la pause clairement, avec la date de reprise", () => {
    const now = new Date("2026-10-15T10:00:00Z");
    expect(pauseMessage("ok", "free", now)).toBeNull();
    expect(pauseMessage("free-paused", "plus", now)).toBeNull();
    expect(pauseMessage("free-paused", "free", now)).toBe("Nora et l’analyse des photos font une pause pour les comptes gratuits jusqu’au 1er novembre. Avec Balco+, elles restent disponibles.");
    expect(pauseMessage("all-paused", "plus", now)).toContain("jusqu’au 1er novembre : la limite du mois est atteinte");
  });

  it("met en forme le rapport des coûts", () => {
    const text = formatCostReport({
      from: "2026-10-01T00:00:00.000Z", spentUsd: 12.5, budgetUsd: 30, level: "ok",
      byKind: [{ kind: "scan", calls: 100, totalUsd: 5, averageUsd: 0.05 }, { kind: "chat", calls: 600, totalUsd: 7.5, averageUsd: 0.0125 }],
      byModel: [{ model: "claude-opus-5", calls: 100, totalUsd: 5 }],
      topAccounts: [{ userId: 7, email: "lea@example.fr", plan: "plus", calls: 40, totalUsd: 1.2 }],
      accounts: { count: 50, averageUsd: 0.25 },
    });
    expect(text).toContain("Dépense : 12.50 $ sur 30 $ de budget (42 %)");
    expect(text).toContain("- Diagnostic photo : 100 appels, 5.00 $ au total, 0.0500 $ en moyenne");
    expect(text).toContain("- Question à Nora : 600 appels, 7.50 $ au total, 0.0125 $ en moyenne");
    expect(text).toContain("Comptes : 50, 0.2500 $ en moyenne par compte");
    expect(text).toContain("n° 7 lea@example.fr (plus) : 40 appels, 1.20 $");
  });
});
