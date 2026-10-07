import { describe, expect, it } from "vitest";

import { backupStatus, cityValue, goalsValue, shortList, spaceValue, springWishesValue, sunlightChoice, sunlightPatch, sunlightValue } from "../lib/garden/settings-summary";

describe("Réglages : valeurs courtes", () => {
  it("soleil : quelques mots, et « Je ne sais pas » gardé à part", () => {
    expect(sunlightValue({ sunlight: "sunny" })).toBe("Toute la journée");
    expect(sunlightValue({ sunlight: "partial" })).toBe("Matin ou après-midi");
    expect(sunlightValue({ sunlight: "shade" })).toBe("Presque jamais");
    expect(sunlightValue({ sunlight: "partial", sunlightUnknown: true })).toBe("Je ne sais pas");
    expect(sunlightValue(null)).toBe("Pas encore");
    expect(sunlightChoice({ sunlight: "partial", sunlightUnknown: true })).toBe("unknown");
  });

  it("soleil : « Je ne sais pas » vaut mi-ombre, un vrai choix efface le doute", () => {
    expect(sunlightPatch("unknown")).toEqual({ sunlight: "partial", sunlightUnknown: true });
    expect(sunlightPatch("sunny")).toEqual({ sunlight: "sunny", sunlightUnknown: false });
  });

  it("espace : le choix de l'accueil", () => {
    expect(spaceValue("windowsill")).toBe("Un rebord de fenêtre");
    expect(spaceValue("terrace")).toBe("Une terrasse");
    expect(spaceValue(undefined)).toBe("Pas encore");
  });

  it("envies : deux noms au plus, sinon « et N autres »", () => {
    expect(goalsValue(["salads", "tomatoes"])).toBe("Tomates cerises, salades");
    expect(goalsValue(["tomatoes", "aromatics", "salads"])).toBe("Tomates cerises et 2 autres");
    expect(goalsValue([])).toBe("Aucune");
    expect(goalsValue(undefined)).toBe("Aucune");
    expect(shortList(["Basilic"], "Aucune")).toBe("Basilic");
  });

  it("envies du printemps : les noms du catalogue", () => {
    expect(springWishesValue(["basil", "cherry-tomato"])).toBe("Basilic, tomates cerises");
    expect(springWishesValue(["basil", "cherry-tomato", "mint"])).toBe("Basilic et 2 autres");
    expect(springWishesValue(["plante-disparue"])).toBe("Aucune pour l’instant");
    expect(springWishesValue(undefined)).toBe("Aucune pour l’instant");
  });

  it("ville : « Paris, par défaut » tant qu'aucune n'est choisie", () => {
    expect(cityValue({ city: "Lyon" })).toBe("Lyon");
    expect(cityValue({ city: "Paris", isFallback: true })).toBe("Paris, par défaut");
  });

  it("sauvegarde : l'heure de la dernière, ou ce qu'il faut faire", () => {
    const now = new Date(2026, 9, 8, 16, 0);
    expect(backupStatus({ status: "idle", lastSyncedAt: new Date(2026, 9, 8, 14, 5).toISOString() }, now)).toEqual({ label: "Sauvegardé aujourd’hui à 14 h 05", action: null });
    expect(backupStatus({ status: "offline" }, now)).toEqual({ label: "Pas encore sauvegardé", action: "retry" });
    expect(backupStatus({ status: "other-device" }, now).action).toBe("claim");
    expect(backupStatus({ status: "syncing" }, now).label).toBe("Sauvegarde en cours…");
  });
});
