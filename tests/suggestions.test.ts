import { describe, expect, it } from "vitest";

import { getCatalogPlant, PLANT_CATALOG } from "../lib/plants/catalog";
import { climateZoneFor } from "../lib/plants/climate";
import { nextSuggestionMonth, seasonalSuggestions, suggestionFor, suggestionsHeading } from "../lib/plants/suggestions";

describe("suggestions de saison", () => {
  it("ne propose que ce qui se sème ou se plante le mois choisi", () => {
    for (const month of [3, 7, 10]) {
      const suggestions = seasonalSuggestions(null, { month, limit: 99 });
      expect(suggestions.length).toBeGreaterThan(0);
      for (const { entry } of suggestions) expect([...entry.sowMonths, ...entry.plantMonths]).toContain(month);
    }
  });

  it("écarte les plantes déjà sur le balcon et respecte la limite", () => {
    const all = seasonalSuggestions(null, { month: 4, limit: 99 });
    const first = all[0].entry.id;
    const without = seasonalSuggestions(null, { month: 4, ownedCatalogIds: [first], limit: 3 });
    expect(without).toHaveLength(3);
    expect(without.map((suggestion) => suggestion.entry.id)).not.toContain(first);
  });

  it("garde seulement ce qui pousse à l'ombre sur un rebord de fenêtre", () => {
    const suggestions = seasonalSuggestions({ sunlight: "shade", space: "windowsill" }, { month: 4, limit: 99 });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const { entry } of suggestions) {
      expect(entry.sunlight).toContain("shade");
      expect(entry.minSpace).toBe("windowsill");
    }
  });

  it("écrit le geste, la récolte et le dernier mois", () => {
    const tomato = suggestionFor(getCatalogPlant("cherry-tomato")!, 3)!;
    expect(tomato).toMatchObject({ action: "sow", title: "Sème les tomates cerises" });
    expect(tomato.reason).toMatch(/^Récolte /u);
    expect(suggestionFor(getCatalogPlant("cherry-tomato")!, 12)).toBeNull();

    const lastSow = PLANT_CATALOG.map((entry) => suggestionFor(entry, 10)).find((suggestion) => suggestion?.lastChance);
    expect(lastSow?.reason).toContain("dernier mois");

    const flower = PLANT_CATALOG.find((entry) => entry.category === "flower" && entry.sowMonths.includes(4))!;
    expect(suggestionFor(flower, 4)!.reason).toMatch(/^Fleurit /u);
  });

  it("suit le climat : les tomates se sèment plus tard en montagne", () => {
    const mountain = climateZoneFor(45.9, 6.9, 1000);
    const tomato = getCatalogPlant("cherry-tomato")!;
    const firstSow = Math.min(...tomato.sowMonths);
    expect(suggestionFor(tomato, firstSow)).not.toBeNull();
    expect(suggestionFor(tomato, firstSow, mountain)).toBeNull();
  });

  it("indique le prochain mois actif quand celui-ci est calme", () => {
    const next = nextSuggestionMonth({ sunlight: "shade", space: "windowsill" }, { month: 12 });
    expect(next).not.toBeNull();
    expect(seasonalSuggestions({ sunlight: "shade", space: "windowsill" }, { month: next! }).length).toBeGreaterThan(0);
    expect(suggestionsHeading(10)).toBe("À semer ou planter en octobre");
  });

  it("tourne chaque jour parmi les mieux adaptées, sans changer dans la journée", () => {
    const answers = { experience: "beginner", sunlight: "sunny", space: "balcony", goals: ["aromatics"] };
    const ids = (seed: string, limit = 4) => seasonalSuggestions(answers, { month: 4, limit, seed }).map((suggestion) => suggestion.entry.id);
    expect(ids("2026-04-02")).toEqual(ids("2026-04-02"));
    expect(ids("2026-04-02")).toHaveLength(4);
    // Sur une semaine, on ne voit pas toujours les mêmes.
    const week = new Set(Array.from({ length: 7 }, (_, day) => ids(`2026-04-0${day + 1}`).join(",")));
    expect(week.size).toBeGreaterThan(1);
    // Toujours tirées parmi les 12 mieux adaptées.
    const best = seasonalSuggestions(answers, { month: 4, limit: 12 }).map((suggestion) => suggestion.entry.id);
    for (const id of ids("2026-04-05")) expect(best).toContain(id);
    // L'idée du mois d'Aujourd'hui est la première des suggestions de Saisons.
    expect(ids("2026-04-05", 1)[0]).toBe(ids("2026-04-05")[0]);
  });
});
