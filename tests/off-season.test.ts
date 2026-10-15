import { describe, expect, it } from "vitest";
import { addOptions, installedText } from "../lib/garden/catalog-add";
import { planDay } from "../lib/garden/day-plan";
import { resolvePlants } from "../lib/garden/garden-logic";
import { offSeasonOf } from "../lib/garden/off-season";
import { getCatalogPlant } from "../lib/plants/catalog";
import { climateZoneFor } from "../lib/plants/climate";

const plant = (id: string) => getCatalogPlant(id)!;
const on = (month: number, day = 15) => new Date(2026, month - 1, day, 9);
const marseille = climateZoneFor(43.3, 5.4);
const mountain = climateZoneFor(45.9, 6.9, 1000);

describe("état hors saison (chantier « Plante hors saison », étape 2)", () => {
  it("frileuse après sa saison : « Fin de saison » ; rustique en saison : rien", () => {
    expect(offSeasonOf(plant("basil"), on(10))).toEqual({ kind: "season-end", label: "Fin de saison" });
    expect(offSeasonOf(plant("basil"), on(7))).toBeNull();
    expect(offSeasonOf(plant("thyme"), on(10))).toBeNull();
    // Une frileuse dès son dernier mois de récolte, à partir de septembre : l'aubergine en octobre, pas en septembre.
    expect(offSeasonOf(plant("eggplant"), on(10))?.label).toBe("Fin de saison");
    expect(offSeasonOf(plant("eggplant"), on(9))).toBeNull();
    // Une rustique annuelle, après ses fleurs seulement.
    expect(offSeasonOf(plant("cornflower"), on(9))?.label).toBe("Fin de saison");
    expect(offSeasonOf(plant("cornflower"), on(7))).toBeNull();
  });

  it("vivace frileuse d'octobre à février : « À rentrer avant l'hiver »", () => {
    expect(offSeasonOf(plant("lemon-tree"), on(11))).toEqual({ kind: "before-winter", label: "À rentrer avant l’hiver" });
    expect(offSeasonOf(plant("lemongrass"), on(1))?.kind).toBe("before-winter");
    expect(offSeasonOf(plant("lemon-tree"), on(6))).toBeNull();
  });

  it("rustique sans geste ce mois-ci : « Au repos jusqu'en … », selon la plante et le climat", () => {
    expect(offSeasonOf(plant("mint"), on(11))).toEqual({ kind: "resting", label: "Au repos jusqu’en mars", month: 3 });
    expect(offSeasonOf(plant("lavender"), on(12))?.label).toBe("Au repos jusqu’en avril");
    expect(offSeasonOf(plant("lavender"), on(12), marseille)?.label).toBe("Au repos jusqu’en mars");
    expect(offSeasonOf(plant("lavender"), on(12), mountain)?.label).toBe("Au repos jusqu’en mai");
  });

  it("pas d'état hors saison quand la plante a encore à faire, ou pour les cas à part", () => {
    expect(offSeasonOf(plant("kale"), on(11))).toBeNull(); // récolté tout l'hiver
    expect(offSeasonOf(plant("lambs-lettuce"), on(12))).toBeNull();
    expect(offSeasonOf(plant("oca"), on(10))).toBeNull(); // récoltée après le premier gel
    expect(offSeasonOf(plant("radish"), on(12))).toBeNull(); // récolté en une fois : sa propre question
    expect(offSeasonOf(plant("microgreens"), on(12))).toBeNull();
  });

  it("Balcon, fiche et Aujourd'hui : un basilic ajouté le 15 octobre n'est plus « Nouvelle », un thym oui", () => {
    const now = on(10);
    const plants = resolvePlants([
      { id: "b", catalogId: "basil", addedAt: now.toISOString() },
      { id: "t", catalogId: "thyme", addedAt: now.toISOString() },
      { id: "m", catalogId: "mint", addedAt: on(11).toISOString() },
    ]);
    const [basil, thyme] = planDay({ plants: plants.slice(0, 2), events: [], now });
    expect(basil.status).toEqual({ tone: "rest", label: "Fin de saison" });
    expect(basil.first?.title).toBe("Ta saison de basilic est finie ?");
    expect(thyme.status).toEqual({ tone: "new", label: "Nouvelle" });
    const [mint] = planDay({ plants: plants.slice(2), events: [], now: on(11) });
    expect(mint.status).toEqual({ tone: "rest", label: "Au repos jusqu’en mars" });
    expect(mint.first).toBeNull();
    // Jamais en orange : rien n'est compté « à surveiller ».
    expect([basil, mint].some((day) => day.status.worry)).toBe(false);
  });

  it("au catalogue, « Déjà sur mon balcon » le dit avant d'ajouter, en neutre", () => {
    expect(addOptions(plant("basil"), 10)[0].detail).toBe("Fin de saison : récolte avant les premières gelées.");
    expect(addOptions(plant("cornflower"), 9)[0].detail).toBe("Fin de saison.");
    expect(addOptions(plant("mint"), 11)[0].detail).toBe("Au repos jusqu’en mars : rien à faire d’ici là.");
    expect(addOptions(plant("lemon-tree"), 11)[0].detail).toBe("À rentrer avant l’hiver, à l’abri du gel.");
    expect(addOptions(plant("thyme"), 10)[0].detail).toBe("Balco te dit quand l’arroser dès aujourd’hui.");
    expect(installedText(plant("mint"), 11, "")).toBe("Ajouté : menthe · Au repos jusqu’en mars : rien à faire d’ici là");
  });
});
