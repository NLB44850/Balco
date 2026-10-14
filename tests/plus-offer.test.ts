import { describe, expect, it } from "vitest";

import { frostHintShows } from "../hooks/use-first-frost-hint";
import { euros, freeForAllText, isPlusTrigger, PLUS_NOT_YET, PLUS_PRICES, plusPromises, plusScreenBenefits, plusTriggerText, yearlyPerMonthText, yearlySavingText } from "../lib/plans";

describe("écran Balco+ (étape 10)", () => {
  it("l'annuel mis en avant : 29 € par an contre 4,99 € par mois", () => {
    expect(PLUS_PRICES).toEqual({ yearlyEuros: 29, monthlyEuros: 4.99, trialDays: 7 });
    expect(euros(29)).toBe("29 €");
    expect(euros(4.99)).toBe("4,99 €");
    expect(yearlyPerMonthText()).toBe("soit 2,42 € par mois");
    expect(yearlySavingText()).toBe("51 % de moins qu’au mois");
  });

  it("essai, pause, prix fondateur ; gratuit sans limite de plantes ; rien n'est prélevé", () => {
    expect(plusPromises()).toEqual(["7 jours d’essai gratuit", "Pause ou arrêt à tout moment : ton balcon reste", "Prix fondateur pour les 500 premiers, gardé même après une pause"]);
    expect(freeForAllText()).toMatch(/^Gratuit pour tous, sans limite de plantes : /u);
    expect(PLUS_NOT_YET).toContain("rien n’est prélevé");
    expect(plusScreenBenefits().map((benefit) => benefit.title)).toContain("Le coach d’arrosage");
  });

  it("une phrase par déclencheur", () => {
    expect(plusTriggerText("photo")).toBe("Ta photo du mois est analysée. Avec Balco+, 20 photos chaque mois.");
    expect(plusTriggerText("nora")).toBe("Tes 5 questions du mois sont posées. Avec Balco+, 100 questions à Nora chaque mois.");
    expect(plusTriggerText("frost")).toMatch(/^Gel annoncé ce soir/u);
    expect(plusTriggerText("coach")).toMatch(/^Le coach d’arrosage/u);
    expect(plusTriggerText(undefined)).toBeNull();
    expect(isPlusTrigger("frost")).toBe(true);
    expect(isPlusTrigger("autre")).toBe(false);
  });

  it("le premier soir de gel seulement", () => {
    expect(frostHintShows(null, "2026-11-20")).toBe(true);
    expect(frostHintShows("2026-11-20", "2026-11-20")).toBe(true);
    expect(frostHintShows("2026-11-20", "2026-11-28")).toBe(false);
  });
});
