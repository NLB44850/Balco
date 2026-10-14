import { describe, expect, it } from "vitest";

import { BALCONY_LOAD_NOTE, balconyWeight, guessedNote, potWeight, weightIntro, weightValue } from "../lib/garden/balcony-weight";
import { getCatalogPlant } from "../lib/plants/catalog";
import { potNeedFor, smallestFit } from "../lib/plants/pot-sheet";

const plant = (catalogId: string, potSize?: string, extra: { toPlant?: boolean } = {}) => ({ plant: { id: `${catalogId}-1`, potSize, ...extra }, entry: getCatalogPlant(catalogId)! });

describe("poids des pots (étape 9)", () => {
  it("terreau mouillé à 1 kg par litre + pot en terre cuite", () => {
    expect(potWeight(plant("basil", "small")).kg).toBe(5);
    expect(potWeight(plant("basil", "medium")).kg).toBe(13);
    expect(potWeight(plant("cherry-tomato", "large")).kg).toBe(28);
    expect(potWeight(plant("chives", "planter")).kg).toBe(25);
  });

  it("taille pas notée : la taille conseillée par sa fiche, signalée", () => {
    const tomato = potWeight(plant("cherry-tomato"));
    expect(tomato.guessed).toBe(true);
    expect(tomato.size).toBe(smallestFit(potNeedFor(getCatalogPlant("cherry-tomato")!)));
    expect(tomato.kg).toBeGreaterThan(potWeight(plant("basil", "small")).kg);
  });

  it("total arrondi aux 5 kg, plantes « à planter » exclues, le plus lourd d'abord", () => {
    const weight = balconyWeight([plant("basil", "medium"), plant("cherry-tomato", "large"), plant("mint", "medium", { toPlant: true })]);
    expect(weight.pots.map((pot) => pot.kg)).toEqual([28, 13]);
    expect(weight.totalKg).toBe(40);
    expect(weightValue(weight)).toBe("≈ 40 kg");
    expect(weightIntro(weight)).toMatch(/^Tes 2 pots, terre bien arrosée/u);
  });

  it("balcon vide et textes", () => {
    const empty = balconyWeight([]);
    expect(empty.totalKg).toBe(0);
    expect(weightValue(empty)).toBe("Aucun pot");
    expect(balconyWeight([plant("basil", "small")]).totalKg).toBe(5);
    expect(BALCONY_LOAD_NOTE).toContain("350 kg par m²");
    expect(BALCONY_LOAD_NOTE).toContain("syndic");
    expect(guessedNote(1)).toMatch(/^Un pot sans taille notée/u);
    expect(guessedNote(3)).toMatch(/^3 pots sans taille notée/u);
  });
});
