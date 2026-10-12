import { describe, expect, it } from "vitest";

import { firstPotsCard, firstPotsKey } from "../lib/garden/first-pots";
import { createGardenPlant, resolvePlants } from "../lib/garden/garden-logic";
import { pickTodayCards } from "../lib/garden/today-cards";

const done = new Date(2026, 4, 10, 9).toISOString();
const now = new Date(2026, 4, 11, 9);
const answers = { completedAt: done };

describe("première tâche liée au pot (étape 3c)", () => {
  it("prépare les pots des plantes à planter : pot et terreau de leur fiche", () => {
    const plants = resolvePlants([{ ...createGardenPlant("mint", now, { toPlant: true }), id: "mint-1" }]);
    const card = firstPotsCard({ answers, plants, dismissed: [], now })!;
    expect(card.title).toBe("Prépare tes pots");
    expect(card.lines[0].detail).toMatch(/^Un pot percé d’au moins \d+ cm de large, du terreau/u);
  });

  it("fait vérifier la taille notée d'office, en orange quand elle est trop petite", () => {
    const plants = resolvePlants([
      { ...createGardenPlant("basil", now), id: "basil-1", potSize: "medium" },
      { ...createGardenPlant("cherry-tomato", now), id: "tomato-1", potSize: "small" },
      { ...createGardenPlant("thyme", now), id: "thyme-1" },
    ]);
    const card = firstPotsCard({ answers, plants, dismissed: [], now })!;
    expect(card.title).toBe("Vérifie tes pots");
    expect(card.lines.map((line) => line.tone)).toEqual(["ok", "small", "todo"]);
    expect(card.lines[0].detail).toBe("Noté : moyen (20 à 30 cm). C’est bien ça ?");
    expect(card.lines[1].detail).toMatch(/^Pot trop petit : prends un/u);
    expect(card.lines[2].detail).toBe("Choisis la taille de son pot.");
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
