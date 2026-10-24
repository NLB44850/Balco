import { describe, expect, it } from "vitest";

import { PLANT_CATALOG } from "@/lib/plants/catalog";
import { climateZoneFor } from "@/lib/plants/climate";
import { plantYear, seasonOfMonth, yearLegend, yieldStep } from "@/lib/plants/plant-year";

const entry = (id: string) => PLANT_CATALOG.find((item) => item.id === id)!;

describe("l'année de tes plantes", () => {
  it("donne pour chaque mois au plus deux étapes, la récolte d'abord", () => {
    const basil = plantYear(entry("basil"));
    expect(basil).toHaveLength(12);
    expect(basil[0]).toEqual([]);
    expect(basil.every((steps) => steps.length <= 2)).toBe(true);
    const july = basil[6];
    expect(july[0]).toBe("harvest");
    expect(basil.some((steps) => steps.includes("sow"))).toBe(true);
  });

  it("une fleur fleurit, un feuillage a sa belle saison", () => {
    expect(yieldStep(entry("cosmos"))).toBe("bloom");
    expect(yieldStep(entry("musa-basjoo"))).toBe("foliage");
    expect(yieldStep(entry("mint"))).toBe("harvest");
    expect(yearLegend([plantYear(entry("cosmos")), plantYear(entry("mint"))])).toEqual(["sow", "plant", "harvest", "bloom"]);
  });

  it("suit le climat de la ville pour les plantes frileuses, comme le reste de Saisons", () => {
    const nice = climateZoneFor(43.7, 7.26);
    const paris = plantYear(entry("cherry-tomato"));
    const south = plantYear(entry("cherry-tomato"), nice);
    expect(south).not.toEqual(paris);
  });

  it("range chaque mois dans sa saison", () => {
    expect([12, 1, 2].map(seasonOfMonth)).toEqual(["winter", "winter", "winter"]);
    expect([3, 6, 9].map(seasonOfMonth)).toEqual(["spring", "summer", "autumn"]);
  });
});
