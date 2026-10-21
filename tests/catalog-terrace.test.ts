import { describe, expect, it } from "vitest";
import { upcomingHarvests } from "../lib/garden/progress";
import { resolvePlants } from "../lib/garden/garden-logic";
import { restUntil } from "../lib/garden/off-season";
import { calendarActivities } from "../lib/plants/calendar";
import { CATEGORY_LABELS, getCatalogPlant, hasHarvest, PLANT_CATALOG, searchCatalog } from "../lib/plants/catalog";
import { bulbOf, guideModelFor, startPills } from "../lib/plants/guide";
import { canComeIndoors, isColdTender } from "../lib/plants/cold-hardiness";

/** Chantier « Catalogue balcon et terrasse », livraison 1 : bulbes, fleurs d'hiver, plantes grasses. */
const DELIVERY_1 = ["tulip", "daffodil", "muscari", "crocus", "winter-heath", "hellebore", "houseleek", "sedum"];
const BULBS = ["tulip", "daffodil", "muscari", "crocus"];

const plant = (catalogId: string) => resolvePlants([{ id: "p", catalogId, addedAt: new Date(2026, 9, 1).toISOString() }])[0];

describe("catalogue balcon et terrasse : livraison 1", () => {
  it("les 8 plantes sont au catalogue, en fleurs, vivaces", () => {
    for (const id of DELIVERY_1) {
      const entry = getCatalogPlant(id);
      expect(entry, id).toBeDefined();
      expect(entry!.category, id).toBe("flower");
      expect(entry!.perennial, id).toBe(true);
      expect(entry!.sources.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it("une plante d'ornement n'a pas de geste « Récolte » ni de récolte à venir", () => {
    for (const id of DELIVERY_1) {
      const entry = getCatalogPlant(id)!;
      expect(hasHarvest(entry), id).toBe(false);
      expect(entry.tasks.some((task) => task.type === "harvest"), id).toBe(false);
      for (const month of entry.harvestMonths) {
        const activities = calendarActivities([{ id: "p", entry, displayName: entry.name }], month);
        expect(activities.some((activity) => activity.kind === "harvest"), `${id} en ${month}`).toBe(false);
      }
      const month = entry.harvestMonths[0];
      expect(upcomingHarvests([plant(id)], new Date(2026, month - 1, 10))).toEqual([]);
    }
    // Les autres fleurs se cueillent toujours (bouquets, fleurs comestibles).
    expect(hasHarvest(getCatalogPlant("nasturtium")!)).toBe(true);
    expect(PLANT_CATALOG.filter((entry) => !hasHarvest(entry)).map((entry) => entry.id).sort()).toEqual([...DELIVERY_1].sort());
  });

  it("les bulbes se plantent à l'automne, avec le pas-à-pas des bulbes, et se reposent l'été", () => {
    for (const id of BULBS) {
      const entry = getCatalogPlant(id)!;
      expect(entry.plantMonths, id).toContain(10);
      expect(bulbOf(entry), id).not.toBeNull();
      expect(guideModelFor(entry, 10), id).toBe("plant-bulb");
      expect(restUntil(entry, 8), id).not.toBeNull();
    }
  });

  it("les fleurs d'hiver ont des gestes en hiver", () => {
    expect(getCatalogPlant("hellebore")!.harvestMonths).toContain(1);
    expect(getCatalogPlant("winter-heath")!.harvestMonths).toContain(1);
    expect(restUntil(getCatalogPlant("hellebore")!, 1)).toBeNull();
  });

  it("la fiche dit quand la mettre en terre : à planter, ou bulbe à replanter (retour du 21/10)", () => {
    expect(startPills(getCatalogPlant("tulip")!, false)).toEqual(["📅  Plantation septembre–décembre"]);
    expect(startPills(getCatalogPlant("tulip")!, true)).toEqual(["📅  Plantation septembre–décembre"]);
    expect(startPills(getCatalogPlant("basil")!, true)[0]).toMatch(/^📅  Semis /u);
    expect(startPills(getCatalogPlant("basil")!, false)).toEqual([]);
    expect(startPills(getCatalogPlant("hellebore")!, false)).toEqual([]);
  });
});

describe("catalogue balcon et terrasse : livraison 2, arbres fruitiers", () => {
  const TREES = ["olive-tree", "columnar-apple", "dwarf-peach", "dwarf-cherry", "kumquat", "pomegranate"];

  it("une catégorie « Arbres fruitiers », avec le citronnier et le figuier", () => {
    expect(CATEGORY_LABELS["fruit-tree"]).toBe("Arbres fruitiers");
    expect(searchCatalog("", "fruit-tree").map((entry) => entry.id).sort()).toEqual([...TREES, "lemon-tree", "dwarf-fig"].sort());
    for (const id of TREES) {
      const entry = getCatalogPlant(id)!;
      expect(entry.perennial, id).toBe(true);
      expect(hasHarvest(entry), id).toBe(true);
      expect(guideModelFor(entry, entry.plantMonths[0]), id).toBe("perennial-pot");
    }
  });

  it("kumquat et grenadier se rentrent l'hiver ; l'olivier reste dehors, abrité quand le froid dure", () => {
    for (const id of ["kumquat", "pomegranate"]) {
      expect(isColdTender(getCatalogPlant(id)!), id).toBe(true);
      expect(canComeIndoors(getCatalogPlant(id)!), id).toBe(true);
    }
    expect(isColdTender(getCatalogPlant("olive-tree")!)).toBe(false);
    expect(getCatalogPlant("olive-tree")!.tasks.some((task) => task.id === "shelter")).toBe(true);
  });

  it("se trouvent par le nom de leur fruit", () => {
    expect(searchCatalog("cerise").map((entry) => entry.id)).toContain("dwarf-cherry");
    expect(searchCatalog("grenade").map((entry) => entry.id)).toContain("pomegranate");
    expect(searchCatalog("pomme").map((entry) => entry.id)).toContain("columnar-apple");
  });
});
