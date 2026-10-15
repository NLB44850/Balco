import { describe, expect, it } from "vitest";

import { firstPotsCard, firstPotsKey } from "../lib/garden/first-pots";
import { createGardenPlant, resolvePlants } from "../lib/garden/garden-logic";
import { pickTodayCards } from "../lib/garden/today-cards";

const done = new Date(2026, 4, 10, 9).toISOString();
const now = new Date(2026, 4, 11, 9);
const answers = { completedAt: done };

describe("première tâche liée au pot (étape 3c)", () => {
  it("prépare les pots des plantes à planter : pot et terreau de leur fiche", () => {
    const plants = resolvePlants([{ ...createGardenPlant("mint", now, { toPlant: true }), id: "mint-1" }, { ...createGardenPlant("thyme", now, { toPlant: true }), id: "thyme-1" }]);
    const card = firstPotsCard({ answers, plants, dismissed: [], now })!;
    expect(card.title).toBe("Prépare le pot de 2 plantes");
    expect(card.summary).toBe("2 à préparer");
    expect(card.lines[0].detail).toMatch(/^Un pot percé d’au moins \d+ cm de large, du terreau/u);
  });

  it("une seule ligne : le résumé compte ce qui est à corriger, la feuille le met en premier", () => {
    const plants = resolvePlants([
      { ...createGardenPlant("basil", now), id: "basil-1", potSize: "medium" },
      { ...createGardenPlant("thyme", now), id: "thyme-1" },
      { ...createGardenPlant("cherry-tomato", now), id: "tomato-1", potSize: "small" },
      { ...createGardenPlant("chives", now), id: "chives-1" },
    ]);
    const card = firstPotsCard({ answers, plants, dismissed: [], now })!;
    expect(card.title).toBe("Vérifie le pot de 4 plantes");
    expect(card.summary).toBe("1 trop petit · 2 à choisir");
    expect(card.lines.map((line) => line.plantId)).toEqual(["tomato-1", "thyme-1", "chives-1", "basil-1"]);
    expect(card.lines[0].detail).toMatch(/^Pot trop petit : prends un [^.]+$/u);
    expect(card.lines[1].detail).toBe("Taille à choisir");
    expect(card.lines[3].detail).toBe("Moyen (21 à 30 cm)");
  });

  it("une plante seule : son nom dans le titre, son pot en résumé ; tous bons : à confirmer", () => {
    const one = resolvePlants([{ ...createGardenPlant("basil", now), id: "basil-1", potSize: "medium" }]);
    expect(firstPotsCard({ answers, plants: one, dismissed: [], now })).toMatchObject({ title: "Vérifie le pot : basilic", summary: "Moyen (21 à 30 cm)" });
    const two = resolvePlants([{ ...createGardenPlant("basil", now), id: "basil-1", potSize: "medium" }, { ...createGardenPlant("mint", now), id: "mint-1", potSize: "large" }]);
    expect(firstPotsCard({ answers, plants: two, dismissed: [], now })?.summary).toBe("Pots notés par Balco : c’est bien ça ?");
  });

  it("disparaît une fois fermée, après deux semaines, sans accueil fini ou sans plante", () => {
    const plants = resolvePlants([{ ...createGardenPlant("basil", now), id: "basil-1", potSize: "medium" }]);
    expect(firstPotsCard({ answers, plants, dismissed: [firstPotsKey(done)], now })).toBeNull();
    expect(firstPotsCard({ answers, plants, dismissed: [], now: new Date(2026, 4, 25, 10) })).toBeNull();
    expect(firstPotsCard({ answers: { skipped: true, completedAt: done }, plants, dismissed: [], now })).toBeNull();
    expect(firstPotsCard({ answers, plants: [], dismissed: [], now })).toBeNull();
  });

  it("passe avant les autres cartes d'Aujourd'hui", () => {
    expect(pickTodayCards({ pots: true, event: true, tip: true })).toEqual(["pots", "event"]);
  });
});
