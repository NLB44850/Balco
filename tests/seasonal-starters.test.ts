import { describe, expect, it } from "vitest";

import { getCatalogPlant } from "../lib/plants/catalog";
import { climateZoneFor } from "../lib/plants/climate";
import { seasonalStarters, suggestionFor } from "../lib/plants/suggestions";

const MOUNTAIN = climateZoneFor(45.92, 6.87, 1035); // Chamonix
const SUNNY_TOMATOES = { sunlight: "sunny", space: "balcony", goals: ["tomatoes"] };

/** Chaque plante proposée se sème ou se plante ce mois-ci, dans ce climat. */
function allInSeason(ids: string[], month: number, climate: Parameters<typeof suggestionFor>[2] = null) {
  return ids.every((id) => suggestionFor(getCatalogPlant(id)!, month, climate) !== null);
}

describe("seasonalStarters : plantes de saison seulement", () => {
  it("en octobre, plus de tomates ni d'œillets d'Inde, et une phrase pour patienter", () => {
    const { plants, notice } = seasonalStarters(SUNNY_TOMATOES, { month: 10 });
    const ids = plants.map((entry) => entry.id);
    expect(ids).toHaveLength(6);
    expect(ids).not.toContain("cherry-tomato");
    expect(ids).not.toContain("dwarf-tomato");
    expect(ids).not.toContain("marigold");
    expect(ids).not.toContain("tomatillo");
    expect(allInSeason(ids, 10)).toBe(true);
    expect(notice).toBe("Les tomates se plantent en mai. En attendant, voici ce qui pousse maintenant.");
  });

  it("en mai, les tomates passent en tête et aucune phrase d'attente", () => {
    const { plants, notice } = seasonalStarters(SUNNY_TOMATOES, { month: 5 });
    expect(plants[0].id).toBe("cherry-tomato");
    expect(allInSeason(plants.map((entry) => entry.id), 5)).toBe(true);
    expect(notice).toBeNull();
  });

  it("à la montagne, les plantes frileuses arrivent un mois plus tard", () => {
    // Les tomates cerises se sèment au chaud dès mars à Paris, en avril à Chamonix.
    const paris = seasonalStarters(SUNNY_TOMATOES, { month: 3 }).plants.map((entry) => entry.id);
    const mountain = seasonalStarters(SUNNY_TOMATOES, { month: 3, climate: MOUNTAIN }).plants.map((entry) => entry.id);
    expect(paris).toContain("cherry-tomato");
    expect(mountain).not.toContain("cherry-tomato");
    expect(allInSeason(mountain, 3, MOUNTAIN)).toBe(true);
    expect(seasonalStarters(SUNNY_TOMATOES, { month: 10, climate: MOUNTAIN }).notice).toBe("Les tomates se plantent en juin. En attendant, voici ce qui pousse maintenant.");
  });

  it("la phrase prend la plante phare la plus proche, et se tait si l'envie a des plantes de saison", () => {
    // Aromatiques en janvier : la menthe (mars) arrive avant le basilic (mai).
    expect(seasonalStarters({ sunlight: "partial", space: "planter", goals: ["aromatics"] }, { month: 1 }).notice).toBe("La menthe se plante en mars. En attendant, voici ce qui pousse maintenant.");
    // Aromatiques en octobre : menthe, ciboulette… se plantent maintenant.
    expect(seasonalStarters({ sunlight: "partial", space: "planter", goals: ["aromatics"] }, { month: 10 }).notice).toBeNull();
    // La lavande ne pousse pas à l'ombre : pas de promesse pour les abeilles.
    expect(seasonalStarters({ sunlight: "shade", space: "planter", goals: ["bees"] }, { month: 1 }).notice).toBeNull();
  });

  it("« Je regarderai plus tard » : les valeurs sûres de saison d'abord, jamais hors saison", () => {
    const october = seasonalStarters({ skipped: true }, { month: 10 }).plants.map((entry) => entry.id);
    expect(october.slice(0, 2)).toEqual(["mint", "chives"]);
    expect(october).not.toContain("basil");
    expect(allInSeason(october, 10)).toBe(true);
    expect(seasonalStarters(null, { month: 5 }).plants.map((entry) => entry.id)).toEqual(["basil", "mint", "radish", "nasturtium", "cut-lettuce", "chives"]);
    expect(seasonalStarters(null, { month: 10 }).notice).toBeNull();
  });

  it("respecte la limite et écarte les plantes déjà sur le balcon", () => {
    const { plants } = seasonalStarters(null, { month: 10, limit: 3, ownedCatalogIds: ["mint"] });
    expect(plants).toHaveLength(3);
    expect(plants.map((entry) => entry.id)).not.toContain("mint");
  });

  it("propose toujours au moins une plante, chaque mois, même à l'ombre sur un rebord de fenêtre", () => {
    for (let month = 1; month <= 12; month += 1) {
      const { plants } = seasonalStarters({ sunlight: "shade", space: "windowsill", goals: [] }, { month });
      expect(plants.length).toBeGreaterThan(0);
      expect(allInSeason(plants.map((entry) => entry.id), month)).toBe(true);
    }
  });
});
