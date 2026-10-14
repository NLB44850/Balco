import { describe, expect, it } from "vitest";

import { defaultAddChoice, installedText, lateSeasonNote, nextStartMonth, switchLabel, toPlantPlan, toPlantText } from "../lib/garden/catalog-add";
import { getCatalogPlant } from "../lib/plants/catalog";

const plant = (id: string) => getCatalogPlant(id)!;

describe("ajouter depuis le catalogue en un « + »", () => {
  it("à planter si c'est sa saison, sinon déjà sur le balcon", () => {
    expect(defaultAddChoice(plant("lavender"), 10)).toBe("toPlant");
    expect(defaultAddChoice(plant("garlic"), 10)).toBe("toPlant");
    expect(defaultAddChoice(plant("eggplant"), 10)).toBe("installed");
    expect(defaultAddChoice(plant("cherry-tomato"), 5)).toBe("toPlant");
  });

  it("prévient en fin de saison pour une annuelle frileuse", () => {
    expect(installedText(plant("eggplant"), 10, " en pot moyen")).toBe("Ajouté : Aubergine en pot moyen · Fin de saison : récolte avant les premières gelées");
    expect(lateSeasonNote(plant("eggplant"), 7)).toBeNull();
    expect(lateSeasonNote(plant("thyme"), 10)).toBeNull();
    expect(installedText(plant("thyme"), 10, "")).toBe("Ajouté : Thym");
  });

  it("à planter hors saison : au printemps, elle rejoint les envies du printemps", () => {
    expect(nextStartMonth(plant("cherry-tomato"), 10)).toBe(3);
    expect(toPlantPlan(plant("cherry-tomato"), 10)).toEqual({ kind: "spring", month: 3 });
    expect(toPlantText(plant("cherry-tomato"), { kind: "spring", month: 3 }, "")).toBe("Tomates cerises : à semer au chaud dès mars. Balco te les reproposera au printemps");
    expect(toPlantText(plant("eggplant"), toPlantPlan(plant("eggplant"), 10), "")).toBe("Aubergine : à semer au chaud dès février. Balco te la reproposera au printemps");
    expect(toPlantPlan(plant("lavender"), 10)).toEqual({ kind: "now" });
    expect(toPlantText(plant("lavender"), { kind: "now" }, " en pot moyen")).toBe("À planter : Lavande en pot moyen");
  });

  it("plus tard dans l'année : elle attend sur le balcon", () => {
    const plan = toPlantPlan(plant("lambs-lettuce"), 4);
    expect(plan.kind).toBe("later");
    if (plan.kind === "later") expect(toPlantText(plant("lambs-lettuce"), plan, "")).toMatch(/^À planter en (juillet|août|juin) : Mâche$/u);
  });

  it("le bouton de l'autre choix s'accorde", () => {
    expect(switchLabel(plant("eggplant"), "installed")).toBe("Pas encore plantée ?");
    expect(switchLabel(plant("cherry-tomato"), "toPlant")).toBe("Déjà plantées ?");
    expect(switchLabel(plant("basil"), "installed")).toBe("Pas encore planté ?");
  });
});
