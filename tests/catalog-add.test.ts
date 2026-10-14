import { describe, expect, it } from "vitest";

import { addOptions, addQuestion, installedText, lateSeasonNote, nextStartMonth, toPlantPlan, toPlantText } from "../lib/garden/catalog-add";
import { getCatalogPlant } from "../lib/plants/catalog";

const plant = (id: string) => getCatalogPlant(id)!;

describe("ajouter depuis le catalogue : une question, deux cartes", () => {
  it("la question s'accorde, les cartes disent ce qui va se passer", () => {
    expect(addQuestion(plant("eggplant"))).toBe("Où en est ton aubergine ?");
    expect(addQuestion(plant("cherry-tomato"))).toBe("Où en sont tes tomates cerises ?");
    const [installed, toPlant] = addOptions(plant("eggplant"), 10);
    expect(installed).toMatchObject({ choice: "installed", title: "Déjà sur mon balcon", detail: "Fin de saison : récolte avant les premières gelées.", watch: true });
    expect(toPlant).toMatchObject({ choice: "toPlant", title: "Pas encore plantée", detail: "À semer au chaud dès février : Balco te la reproposera au printemps.", badge: null });
    const [, lavender] = addOptions(plant("lavender"), 10);
    expect(lavender).toMatchObject({ title: "Pas encore plantée", badge: "C’est le moment", detail: "Le pas-à-pas t’attend sur Aujourd’hui, étape par étape." });
    expect(addOptions(plant("thyme"), 7)[0]).toMatchObject({ detail: "Balco te dit quand l’arroser dès aujourd’hui.", watch: false });
    expect(addOptions(plant("basil"), 10)[1].title).toBe("Pas encore planté");
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

});
