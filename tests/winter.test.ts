import { describe, expect, it } from "vitest";

import { nextSpringReminder, springCard, wishNames } from "../lib/garden/spring";
import { startActivity } from "../lib/plants/calendar";
import { getCatalogPlant } from "../lib/plants/catalog";
import { sowsOnWindowsill } from "../lib/plants/indoor";
import { seasonalStarters } from "../lib/plants/suggestions";

const ANSWERS = { sunlight: "sunny", space: "balcony", goals: ["tomatoes", "aromatics"] };

describe("l'accueil en hiver", () => {
  it("de novembre à février : plantes de saison, rebord intérieur et envies pour le printemps", () => {
    for (const month of [11, 12, 1, 2]) {
      const { plants, indoor, spring } = seasonalStarters(ANSWERS, { month });
      expect(plants.length).toBeGreaterThan(0);
      expect(indoor.length).toBeGreaterThan(0);
      expect(indoor.every((entry) => sowsOnWindowsill(entry, month))).toBe(true);
      // Ce qu'on a envie de faire au printemps : basilic, tomates…, jamais en double avec les autres blocs.
      expect(spring.map((entry) => entry.id)).toEqual(expect.arrayContaining(["basil", "cherry-tomato"]));
      const all = [...plants, ...indoor, ...spring].map((entry) => entry.id);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it("le reste de l'année : rien de plus", () => {
    for (const month of [3, 5, 7, 10]) {
      const { indoor, spring } = seasonalStarters(ANSWERS, { month });
      expect(indoor).toEqual([]);
      expect(spring).toEqual([]);
    }
  });

  it("au rebord intérieur, le premier geste dit « à l'intérieur »", () => {
    const parsley = getCatalogPlant("parsley")!;
    expect(sowsOnWindowsill(parsley, 1)).toBe(true);
    expect(sowsOnWindowsill(parsley, 5)).toBe(false);
    const start = startActivity({ id: "p", entry: parsley, displayName: "Persil" }, 1);
    expect(start.title).toBe("Sème le persil à l’intérieur");
    expect(start.description).toContain("Il fait trop froid dehors");
  });
});

describe("les envies du printemps", () => {
  it("un rappel le 1er mars à 9 h, cette année ou la suivante", () => {
    expect(nextSpringReminder(new Date(2026, 9, 6))).toEqual(new Date(2027, 2, 1, 9, 0));
    expect(nextSpringReminder(new Date(2027, 0, 15))).toEqual(new Date(2027, 2, 1, 9, 0));
    expect(nextSpringReminder(new Date(2027, 2, 1, 10))).toEqual(new Date(2028, 2, 1, 9, 0));
  });

  it("une carte en mars et avril, sans les plantes déjà sur le balcon", () => {
    expect(springCard(["basil", "cherry-tomato"], ["basil"], new Date(2027, 2, 3)).map((entry) => entry.id)).toEqual(["cherry-tomato"]);
    expect(springCard(["basil"], [], new Date(2027, 4, 3))).toEqual([]);
    expect(springCard(["basil"], [], new Date(2027, 1, 3))).toEqual([]);
    expect(springCard(undefined, [], new Date(2027, 2, 3))).toEqual([]);
  });

  it("« Basilic, tomates cerises et menthe »", () => {
    expect(wishNames(["basil", "cherry-tomato", "mint"].map((id) => getCatalogPlant(id)!))).toBe("Basilic, tomates cerises et menthe");
    expect(wishNames([getCatalogPlant("basil")!])).toBe("Basilic");
  });
});
