import { describe, expect, it } from "vitest";

import { PLANT_CATALOG, getCatalogPlant } from "../lib/plants/catalog";
import { ESTIMATE_TEXT, feedingDetail, feedingValue, potFit, potNeedFor, potNeedShort, potSheetFor, potSizePhrase, recommendedPotSize, smallestFit, type PotSheet } from "../lib/plants/pot-sheet";

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

  it("disent en centimètres si le pot choisi suffit, avec un conseil pour la jardinière", () => {
    const tomato = getCatalogPlant("cherry-tomato")!;
    expect(potNeedFor(tomato)).toMatchObject({ widthCm: 35, depthCm: 30, planter: false });
    expect(potFit(tomato, "unknown")).toEqual({ tone: "unknown", title: "Quel est ton pot ?", detail: "Il lui faut un pot de 35 cm de large, 30 cm de profondeur." });
    expect(potFit(tomato, "medium")).toEqual({ tone: "small", title: "Pot trop petit", detail: "Il lui faut un pot de 35 cm de large, 30 cm de profondeur. Prends un grand pot." });
    expect(potFit(tomato, "large").tone).toBe("ok");
    // Jardinière : trop peu profonde pour une tomate, place pour 4 basilics, et la culture conseillée pour la salade à couper.
    expect(potFit(tomato, "planter")).toEqual({ tone: "small", title: "Jardinière trop peu profonde", detail: "Il lui faut 30 cm de terre. Prends un grand pot." });
    expect(potFit(getCatalogPlant("basil")!, "planter")).toEqual({ tone: "ok", title: "Ta jardinière lui convient", detail: "Place pour 4 pieds dans 60 cm." });
    expect(potFit(getCatalogPlant("cut-lettuce")!, "planter")).toEqual({ tone: "ok", title: "Ta jardinière lui convient", detail: "C’est la culture conseillée en pot." });
    expect(potFit(getCatalogPlant("cut-lettuce")!, "unknown").detail).toBe("Il lui faut une jardinière de 60 cm, 20 cm de profondeur.");
    // Plus grand qu'un grand pot : un bac.
    expect(potFit(getCatalogPlant("zucchini")!, "large")).toMatchObject({ tone: "small", detail: expect.stringContaining("Prends un bac de 45 cm ou plus.") });
    expect(potNeedShort(tomato, { pierced: true })).toBe("un pot percé d’au moins 35 cm de large");
    expect(ESTIMATE_TEXT).toContain("Estimation");
  });

  it("ont un pot conseillé atteignable pour chaque plante (ou un bac au-delà d'un grand pot)", () => {
    for (const entry of PLANT_CATALOG) {
      const fit = smallestFit(potNeedFor(entry));
      if (fit) expect(potFit(entry, fit).tone, entry.id).toBe("ok");
    }
  });

  it("donnent à l'ajout la taille conseillée, dite dans le message du bas", () => {
    expect(recommendedPotSize(getCatalogPlant("cherry-tomato")!)).toBe("large");
    expect(recommendedPotSize(getCatalogPlant("mint")!)).toBe("medium");
    expect(recommendedPotSize(getCatalogPlant("thyme")!)).toBe("small");
    expect(recommendedPotSize(getCatalogPlant("cut-lettuce")!)).toBe("planter");
    // Plus grand qu'un grand pot (courgette) : un grand pot, et sa fiche dira de prendre un bac.
    expect(recommendedPotSize(getCatalogPlant("zucchini")!)).toBe("large");
    expect(potSizePhrase("large")).toBe("en grand pot (30 à 40 cm)");
    expect(potSizePhrase("planter")).toBe("en jardinière");
  });
});
