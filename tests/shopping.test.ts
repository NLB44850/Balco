import { describe, expect, it } from "vitest";

import { resolvePlants } from "../lib/garden/garden-logic";
import { feedFamily, sackText, shoppingList, shoppingShareText } from "../lib/garden/shopping";
import { activeChecks } from "../lib/garden/shopping-checks";
import { getCatalogPlant } from "../lib/plants/catalog";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const plants = (list: Array<{ id: string; catalogId: string; addedAt: Date; toPlant?: boolean; potSize?: string }>) => resolvePlants(list.map((plant) => ({ ...plant, addedAt: plant.addedAt.toISOString() })) as never);

describe("liste de courses pour la jardinerie", () => {
  it("le sac à prendre selon les litres", () => {
    expect(sackText(7)).toBe("un sac de 10 L");
    expect(sackText(35)).toBe("un sac de 40 L");
    expect(sackText(48)).toBe("un sac de 50 L");
    expect(sackText(120)).toBe("3 sacs de 50 L");
  });

  it("une plante à planter ce mois-ci : son pot et sa terre, selon la taille notée", () => {
    const may = new Date(2027, 4, 10, 10);
    const items = shoppingList({ plants: plants([{ id: "t", catalogId: "cherry-tomato", addedAt: may, toPlant: true, potSize: "large" }]), events: [], now: may });
    expect(items.find((item) => item.section === "pots")).toMatchObject({ title: "Grand pot (30 à 40 cm)", plantIds: ["t"] });
    const soil = items.filter((item) => item.section === "soil");
    expect(soil.length).toBeGreaterThan(0);
    expect(soil[0].title).toMatch(/^Terreau · \d+ L, un sac de \d+ L$/u);
  });

  it("pot noté « Je ne sais pas » : la largeur de la fiche, et « choisir la taille »", () => {
    const may = new Date(2027, 4, 10, 10);
    const [pot] = shoppingList({ plants: plants([{ id: "t", catalogId: "cherry-tomato", addedAt: may, toPlant: true }]), events: [], now: may });
    expect(pot.title).toMatch(/^Pot d’au moins \d+ cm de large$/u);
    expect(pot.chooseSizeOf).toBe("t");
  });

  it("deux plantes dans le même pot : une ligne « 2 × … »", () => {
    const may = new Date(2027, 4, 10, 10);
    const items = shoppingList({ plants: plants([{ id: "a", catalogId: "cherry-tomato", addedAt: may, toPlant: true, potSize: "large" }, { id: "b", catalogId: "eggplant", addedAt: may, toPlant: true, potSize: "large" }]), events: [], now: may });
    expect(items.filter((item) => item.section === "pots")).toHaveLength(1);
    expect(items[0].title).toBe("2 × Grand pot (30 à 40 cm)");
  });

  it("un semis au chaud qui arrive : godets et terreau de semis, pas encore de pot", () => {
    const february = new Date(2027, 1, 20, 10);
    const items = shoppingList({ plants: [], events: [], springWishes: ["cherry-tomato"], now: february });
    expect(items.map((item) => item.id)).toEqual(expect.arrayContaining(["seed-pots", "seed-soil"]));
    expect(items.some((item) => item.section === "pots")).toBe(false);
    // Fin avril : semis au chaud, et la plantation de mai tombe dans les 6 semaines : son pot aussi.
    const april = shoppingList({ plants: [], events: [], springWishes: ["cherry-tomato"], now: new Date(2027, 3, 20) });
    expect(april.map((item) => item.section)).toEqual(expect.arrayContaining(["seeds", "pots", "soil"]));
  });

  it("l'engrais des fiches, seulement pendant ses mois, un par famille", () => {
    const list = plants([
      { id: "t", catalogId: "cherry-tomato", addedAt: new Date(2027, 4, 1) },
      { id: "p", catalogId: "sweet-pepper", addedAt: new Date(2027, 4, 1) },
      { id: "th", catalogId: "thyme", addedAt: new Date(2027, 4, 1) },
    ]);
    const june = shoppingList({ plants: list, events: [], now: new Date(2027, 5, 10) }).filter((item) => item.section === "feed");
    expect(june).toHaveLength(1);
    expect(june[0]).toMatchObject({ id: "feed:tomato", title: "Engrais organique pour tomates (riche en potasse)", plantIds: ["t", "p"] });
    expect(shoppingList({ plants: list, events: [], now: new Date(2027, 11, 1) }).some((item) => item.section === "feed")).toBe(false);
    // Pot libre (saison finie) : plus d'engrais.
    expect(shoppingList({ plants: list, events: [], now: new Date(2027, 5, 10), freePots: new Set(["t", "p"]) }).some((item) => item.section === "feed")).toBe(false);
    expect(feedFamily(getCatalogPlant("okra")!, "engrais organique équilibré, pas trop azoté")).toBe("general");
    expect(feedFamily(getCatalogPlant("kiwiberry")!, "compost en surface")).toBe("compost");
    expect(feedFamily(getCatalogPlant("redcurrant")!, "compost en surface et engrais organique pour petits fruits")).toBe("berries");
  });

  it("un rempotage annoncé : un pot plus grand et sa terre ; déjà rempoté ce mois-ci : rien", () => {
    const march = new Date(2027, 2, 10, 10);
    const mint = plants([{ id: "m", catalogId: "mint", addedAt: new Date(2025, 3, 1), potSize: "medium" }]);
    const pot = shoppingList({ plants: mint, events: [], now: march }).find((item) => item.section === "pots");
    expect(pot?.title).toBe("Pot d’environ 35 cm de large");
    const repotted: MaintenanceEvent = { id: "r", plantId: "m", type: "repotting", completedAt: new Date(2027, 2, 5).toISOString(), source: "daily_task" };
    // Rempotée ce mois-ci : seul le mois prochain compte encore (avril, si la menthe s'y rempote).
    const after = shoppingList({ plants: mint, events: [repotted], now: march }).filter((item) => item.section === "pots");
    expect(after).toHaveLength(0);
  });

  it("le texte à partager, par rubrique, avec ce qui est déjà pris", () => {
    const may = new Date(2027, 4, 10, 10);
    const items = shoppingList({ plants: plants([{ id: "t", catalogId: "cherry-tomato", addedAt: may, toPlant: true, potSize: "large" }]), events: [], now: may });
    const text = shoppingShareText(items, new Set([items[0].id]));
    expect(text).toContain("Ma liste pour la jardinerie");
    expect(text).toContain("Pots\n✓ Grand pot (30 à 40 cm)");
    expect(text).toContain("Terre et terreau\n☐ Terreau");
    expect(text.endsWith("Préparé avec Balco")).toBe(true);
  });

  it("les coches s'effacent après 45 jours", () => {
    const now = new Date(2027, 4, 10);
    expect([...activeChecks({ a: new Date(2027, 4, 1).toISOString(), b: new Date(2027, 1, 1).toISOString() }, now)]).toEqual(["a"]);
  });
});
