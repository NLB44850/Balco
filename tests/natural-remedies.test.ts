import { describe, expect, it } from "vitest";

import { isUnsafeRemedyText, NATURAL_REMEDIES, PROBLEM_IDS, problemGuide, REMEDY_EDIBLE_NOTE, REMEDY_EXPERT_NOTE, REMEDY_PRECAUTIONS, remedyFor } from "../lib/plants/natural-remedies";

const allTexts = PROBLEM_IDS.flatMap((id) => {
  const remedy = NATURAL_REMEDIES[id];
  return [remedy.name, ...remedy.steps, remedy.recipe ?? "", remedy.caution ?? ""];
}).concat(REMEDY_PRECAUTIONS, REMEDY_EDIBLE_NOTE, REMEDY_EXPERT_NOTE);

describe("traitements naturels d'Observer (étape 8b)", () => {
  it("chaque problème a un nom, des signes et des gestes à la main d'abord", () => {
    expect(PROBLEM_IDS).toHaveLength(9);
    for (const id of PROBLEM_IDS) {
      const remedy = NATURAL_REMEDIES[id];
      expect(remedy.id).toBe(id);
      expect(remedy.name).toBe(remedy.name.toLowerCase());
      expect(remedy.signs.length).toBeGreaterThan(20);
      expect(remedy.steps.length).toBeGreaterThanOrEqual(2);
      expect(remedy.steps.length).toBeLessThanOrEqual(4);
    }
  });

  it("jamais de produit chimique ni de produit écarté dans nos propres textes", () => {
    for (const text of allTexts) expect(isUnsafeRemedyText(text), text).toBe(false);
  });

  it("savon noir : 1 cuillère à soupe par litre au plus ; bicarbonate : 5 g par litre", () => {
    const recipes = PROBLEM_IDS.map((id) => NATURAL_REMEDIES[id].recipe).filter((recipe): recipe is string => !!recipe);
    for (const recipe of recipes.filter((text) => text.includes("savon noir"))) expect(recipe).toContain("1 cuillère à soupe de savon noir liquide dans 1 litre d'eau, pas plus");
    expect(NATURAL_REMEDIES["powdery-mildew"].recipe).toContain("5 g de bicarbonate de soude");
    // Pas de recette pour le mildiou : rien ne le guérit naturellement.
    expect(NATURAL_REMEDIES["late-blight"].recipe).toBeUndefined();
  });

  it("écarte un texte libre risqué, garde un geste simple", () => {
    for (const risky of ["Un insecticide bio", "De la bouillie bordelaise", "Huile de neem diluée", "Granulés anti-limaces", "Un fongicide", "Saupoudre du soufre", "Un peu d'eau de Javel"]) {
      expect(isUnsafeRemedyText(risky), risky).toBe(true);
    }
    expect(isUnsafeRemedyText("Paille la terre et arrose au pied.")).toBe(false);
  });

  it("remedyFor ne connaît que la liste ; la liste pour l'IA nomme chaque problème", () => {
    expect(remedyFor("aphids")?.name).toBe("pucerons");
    expect(remedyFor("none")).toBeNull();
    expect(remedyFor(null)).toBeNull();
    expect(remedyFor("toString")).toBeNull();
    for (const id of PROBLEM_IDS) expect(problemGuide()).toContain(`${id} : ${NATURAL_REMEDIES[id].name}`);
  });
});
