import { describe, expect, it } from "vitest";

import { getCatalogPlant, PLANT_CATALOG } from "../lib/plants/catalog";
import { delayText, guideModelFor, ofName, supplies, whatsNext } from "../lib/plants/guide";
import { PLANTING } from "../lib/plants/planting";

const plant = (id: string) => getCatalogPlant(id)!;

describe("données de plantation (P3)", () => {
  it("les 100 plantes ont leurs données, cohérentes avec le calendrier, et au moins 2 sources", () => {
    expect(Object.keys(PLANTING).sort()).toEqual(PLANT_CATALOG.map((entry) => entry.id).sort());
    for (const entry of PLANT_CATALOG) {
      const data = PLANTING[entry.id];
      expect(data.sources.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(data.sources.every((url) => url.startsWith("https://") || url.startsWith("http://")), entry.id).toBe(true);
      if (entry.sowMonths.length > 0) {
        expect(data.sowDepthCm, entry.id).not.toBeNull();
        expect(data.germinationDays, entry.id).not.toBeNull();
        expect(data.harvestWeeksFromSowing, entry.id).not.toBeNull();
        expect(data.sowDepthCm!, entry.id).toBeLessThanOrEqual(5);
      }
      if (entry.plantMonths.length > 0) expect(data.harvestWeeksFromPlanting, entry.id).not.toBeNull();
      for (const range of [data.germinationDays, data.harvestWeeksFromSowing, data.harvestWeeksFromPlanting]) {
        if (range) expect(range[0], entry.id).toBeLessThanOrEqual(range[1]);
      }
    }
  });
});

describe("modèles de guide et « Ce qu'il te faut »", () => {
  it("le modèle suit le premier geste du mois", () => {
    expect(guideModelFor(plant("basil"), 3)).toBe("sow-indoor");
    expect(guideModelFor(plant("lambs-lettuce"), 10)).toBe("sow-pot");
    expect(guideModelFor(plant("lavender"), 10)).toBe("plant-seedling");
    expect(guideModelFor(plant("redcurrant"), 10)).toBe("perennial-pot");
    expect(guideModelFor(plant("garlic"), 10)).toBe("plant-bulb");
    expect(guideModelFor(plant("microgreens"), 10)).toBe("sow-pot");
    expect(guideModelFor(plant("parsley"), 1)).toBe("sow-indoor");
  });

  it("la liste dit quoi acheter, avec des mesures concrètes", () => {
    const lettuce = supplies(plant("lambs-lettuce"), "sow-pot");
    expect(lettuce.map((item) => item.label)).toEqual(["Un sachet de graines de mâche", "Un pot percé d’au moins 4 L", "Une poignée de billes d’argile", "Du terreau", "Un vaporisateur ou un arrosoir à pomme fine"]);
    // Terreau, billes, arrosoir : communs à toutes les plantes (« J'ai déjà » vaut partout).
    expect(lettuce.filter((item) => item.shared).map((item) => item.id)).toEqual(["clay-balls", "soil", "spray"]);
    expect(supplies(plant("blueberry"), "perennial-pot").map((item) => item.label)).toContain("De la terre de bruyère");
    expect(supplies(plant("basil"), "sow-indoor").map((item) => item.id)).toEqual(["seeds", "cells", "soil", "cover", "spray", "pot-later"]);
    expect(supplies(plant("microgreens"), "sow-pot").map((item) => item.id)).toEqual(["seeds", "tray", "soil", "spray"]);
    expect(supplies(plant("garlic"), "plant-bulb")[0].label).toBe("Des gousses d’ail à planter");
    expect(ofName("Agastache")).toBe("d’agastache");
    expect(ofName("Tomates cerises")).toBe("de tomates cerises");
  });

  it("« Et après ? » : la levée et la première récolte, en mots simples", () => {
    expect(whatsNext(plant("radish"), "sow-pot")).toEqual(["Les pousses sortent dans 3 à 7 jours. Garde la terre humide.", "Première récolte dans 3 à 6 semaines."]);
    expect(whatsNext(plant("lavender"), "plant-seedling")[0]).toMatch(/^Premières fleurs dans /);
    expect(delayText([8, 12], "weeks")).toBe("8 à 12 semaines");
    expect(delayText([13, 26], "weeks")).toBe("3 à 6 mois");
    expect(delayText([60, 160], "weeks")).toBe("l’an prochain, parfois plus tard");
  });
});
