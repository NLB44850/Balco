import { describe, expect, it } from "vitest";

import { resolvePlants, type GardenPlant } from "../lib/garden/garden-logic";
import { fitsFreedPot, isHungry, replantIdeas, replantSoilTip, rotationNote } from "../lib/garden/replant";
import { PLANT_CATALOG, getCatalogPlant } from "../lib/plants/catalog";
import { familyOf, sameFamily } from "../lib/plants/families";
import { potFit } from "../lib/plants/pot-sheet";

const plant = (catalogId: string, extra: Partial<GardenPlant> = {}) => resolvePlants([{ id: "p", catalogId, addedAt: "2026-04-01T10:00:00.000Z", ...extra }])[0];

describe("familles des plantes", () => {
  it("rangent les légumes qui partagent leurs maladies", () => {
    expect(sameFamily("cherry-tomato", "potato")).toBe(true);
    expect(sameFamily("radish", "arugula")).toBe(true);
    expect(sameFamily("basil", "cherry-tomato")).toBe(false);
    expect(familyOf("microgreens")).toBe("other");
    expect(sameFamily("microgreens", "okra")).toBe(false);
  });

  it("chaque légume annuel a sa famille (sauf les plantes seules de leur famille)", () => {
    const alone = new Set(["microgreens", "okra", "purslane", "winter-purslane", "nz-spinach", "ice-plant", "malabar-spinach", "oca", "lambs-lettuce", "sorrel"]);
    for (const entry of PLANT_CATALOG.filter((candidate) => candidate.category !== "flower" && !candidate.perennial && !alone.has(candidate.id))) {
      expect(familyOf(entry.id), entry.id).not.toBe("other");
    }
  });
});

describe("que planter à la place ?", () => {
  it("après des tomates en septembre : rien de leur famille, des idées qui tiennent dans le pot", () => {
    const tomato = plant("cherry-tomato", { potSize: "large" });
    const ideas = replantIdeas(tomato, null, { month: 9 });
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.length).toBeLessThanOrEqual(3);
    for (const idea of ideas) {
      expect(sameFamily(idea.entry.id, "cherry-tomato")).toBe(false);
      expect(potFit(idea.entry, "large").tone).toBe("ok");
    }
    // Gourmande : les sobres d'abord.
    expect(isHungry(tomato.entry)).toBe(true);
    expect(isHungry(ideas[0].entry)).toBe(false);
  });

  it("un petit pot n'accueille que ce qui y tient", () => {
    const radish = plant("radish", { potSize: "small" });
    for (let month = 1; month <= 12; month += 1) {
      for (const idea of replantIdeas(radish, null, { month })) expect(fitsFreedPot(idea.entry, radish.entry, "small")).toBe(true);
    }
    expect(fitsFreedPot(getCatalogPlant("zucchini")!, radish.entry, "small")).toBe(false);
  });

  it("pas d'idée déjà sur le balcon, ni de semis au chaud", () => {
    const ideas = replantIdeas(plant("radish", { potSize: "medium" }), null, { month: 3, ownedCatalogIds: ["spinach", "pea"] });
    expect(ideas.map((idea) => idea.entry.id)).not.toContain("spinach");
    expect(ideas.map((idea) => idea.entry.id)).not.toContain("pea");
    expect(ideas.map((idea) => idea.entry.id)).not.toContain("radish");
  });

  it("propose le mois suivant quand ce mois-ci ne suffit pas, en le disant", () => {
    const ideas = replantIdeas(plant("basil", { potSize: "medium" }), null, { month: 11 });
    for (const idea of ideas) {
      expect([11, 12]).toContain(idea.month);
      if (idea.month === 12) expect(idea.reason.startsWith("En décembre · ")).toBe(true);
    }
  });

  it("dit pourquoi et quoi faire de la terre", () => {
    expect(rotationNote(getCatalogPlant("cherry-tomato")!)).toBe("Pas de la famille de la tomate : mêmes maladies dans la terre.");
    expect(rotationNote(getCatalogPlant("garlic")!)).toBe("Pas de la famille de l’oignon : mêmes maladies dans la terre.");
    expect(rotationNote(getCatalogPlant("okra")!)).toBeNull();
    expect(replantSoilTip(getCatalogPlant("cherry-tomato")!)).toMatch(/^Avant de replanter, remplace un tiers de la terre/);
    expect(replantSoilTip(getCatalogPlant("radish")!)).toMatch(/poignée de compost/);
  });

  it("à l'ombre, petit pot, la ciboulette déjà là : une plante du balcon plutôt que rien (retour du 14/10)", () => {
    const [radish] = resolvePlants([{ id: "r", catalogId: "radish", addedAt: "2027-04-01T10:00:00.000Z" }]);
    const ideas = replantIdeas(radish, { sunlight: "shade", space: "terrace", goals: [] }, { month: 5, ownedCatalogIds: ["radish", "chives", "mint", "basil"] });
    expect(ideas.length).toBeGreaterThan(0);
    const owned = ideas.find((idea) => idea.entry.id === "chives");
    expect(owned?.reason).toMatch(/^Déjà sur ton balcon · /u);
    for (const idea of ideas) expect(idea.entry.id).not.toBe("radish");
  });
});
