import { describe, expect, it } from "vitest";

import { PLANT_CATALOG, getCatalogPlant } from "../lib/plants/catalog";
import { ESTIMATE_TEXT, feedingDetail, feedingValue, potFit, potSheetFor, type PotSheet } from "../lib/plants/pot-sheet";

describe("fiches Spécial Pot", () => {
  it("couvrent les 101 plantes, avec des valeurs plausibles et leurs sources", () => {
    for (const entry of PLANT_CATALOG) {
      const sheet = potSheetFor(entry.id);
      expect(sheet, entry.id).toBeDefined();
      expect(sheet!.depthCm).toBeGreaterThan(0);
      expect(sheet!.liters).toBeGreaterThan(0);
      // Le « pot conseillé » du catalogue est le volume vérifié de la fiche.
      expect(entry.potLiters, entry.id).toBe(sheet!.liters);
      // Vérifiée : 2 sources au moins ; sinon, affichée comme une estimation.
      if (sheet!.confidence !== "low") expect(sheet!.sources.length, entry.id).toBeGreaterThanOrEqual(2);
      if (sheet!.feeding.need === "regular") expect(sheet!.feeding.everyDays, entry.id).toBeGreaterThan(0);
      if (sheet!.feeding.need === "none") expect(sheet!.feeding.months, entry.id).toEqual([]);
    }
  });

  it("donnent des conseils courts, au tutoiement, sans apostrophe droite", () => {
    for (const entry of PLANT_CATALOG) {
      const tip = potSheetFor(entry.id)!.soilTip;
      if (!tip) continue;
      expect(tip.split(/\s+/).length, `${entry.id} : ${tip}`).toBeLessThan(12);
      expect(tip, entry.id).not.toContain("'");
      expect(tip.endsWith("."), entry.id).toBe(true);
    }
  });

  it("disent l'engrais en une valeur courte et une phrase", () => {
    const tomato = getCatalogPlant("cherry-tomato")!;
    const sheet = potSheetFor("cherry-tomato")!;
    expect(feedingValue(sheet.feeding)).toBe("Tous les 14 jours");
    expect(feedingDetail(tomato, sheet.feeding)).toBe("Engrais liquide organique pour tomates, dès les premières fleurs, de juin à septembre.");
    expect(feedingValue(potSheetFor("thyme")!.feeding)).toBe("Pas besoin");
    expect(feedingDetail(getCatalogPlant("thyme")!, potSheetFor("thyme")!.feeding)).toBe("Il s’en passe très bien.");
    expect(feedingDetail(getCatalogPlant("radish")!, potSheetFor("radish")!.feeding)).toBe("Ils s’en passent très bien.");
    // « au printemps » n'est pas répété devant les mois, et « d’avril » s'élide.
    const light: PotSheet["feeding"] = { need: "light", everyDays: null, from: "au printemps", months: [4, 5], kind: "compost en surface" };
    expect(feedingValue(light)).toBe("Un peu");
    expect(feedingDetail(getCatalogPlant("sage")!, light)).toBe("Compost en surface, d’avril à mai.");
    expect(feedingDetail(getCatalogPlant("sage")!, { ...light, months: [4] })).toBe("Compost en surface, en avril.");
  });

  it("disent si le pot choisi suffit", () => {
    const tomato = potSheetFor("cherry-tomato")!;
    expect(potFit(tomato, "unknown")).toEqual({ tone: "unknown", text: "Choisis sa taille pour vérifier qu’il suffit." });
    expect(potFit(tomato, "small").tone).toBe("small");
    expect(potFit(tomato, "small").text).toBe(`Un peu juste : vise au moins ${tomato.liters} L.`);
    expect(potFit(tomato, "large").tone).toBe("ok");
    expect(ESTIMATE_TEXT).toContain("Estimation");
  });
});
