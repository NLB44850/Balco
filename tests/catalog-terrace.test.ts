import { describe, expect, it } from "vitest";
import { upcomingHarvests } from "../lib/garden/progress";
import { resolvePlants } from "../lib/garden/garden-logic";
import { restUntil } from "../lib/garden/off-season";
import { calendarActivities } from "../lib/plants/calendar";
import { CATEGORY_LABELS, getCatalogPlant, hasHarvest, isFlower, PLANT_CATALOG, searchCatalog } from "../lib/plants/catalog";
import { bulbOf, guideModelFor, startPills } from "../lib/plants/guide";
import { canComeIndoors, isColdTender } from "../lib/plants/cold-hardiness";
import { familyOf } from "../lib/plants/families";
import { endsWithSeason, isHarvestedOnce, seasonFrostText } from "../lib/plants/season-end";
import { canMarkBloom } from "../lib/garden/herbarium";

/** Chantier « Catalogue balcon et terrasse », livraison 1 : bulbes, fleurs d'hiver, plantes grasses. */
const DELIVERY_1 = ["tulip", "daffodil", "muscari", "crocus", "winter-heath", "hellebore", "houseleek", "sedum"];
const BULBS = ["tulip", "daffodil", "muscari", "crocus"];
/** Livraison 3 : les grimpantes qu'on ne cueille pas (la vigne, elle, se récolte). */
const FLOWERING_CLIMBERS = ["star-jasmine", "clematis", "passionflower", "honeysuckle", "morning-glory"];

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
    expect(PLANT_CATALOG.filter((entry) => !hasHarvest(entry)).map((entry) => entry.id).sort()).toEqual([...DELIVERY_1, ...FLOWERING_CLIMBERS].sort());
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

describe("catalogue balcon et terrasse : livraison 3, grimpantes et légumes", () => {
  const CLIMBERS = [...FLOWERING_CLIMBERS, "grapevine"];
  const VEGETABLES = ["fava-bean", "sweet-potato", "kuri-squash", "artichoke", "rhubarb", "florence-fennel"];

  it("une catégorie « Grimpantes » : 5 à fleurs et la vigne, qui se récolte", () => {
    expect(CATEGORY_LABELS.climber).toBe("Grimpantes");
    expect(searchCatalog("", "climber").map((entry) => entry.id).sort()).toEqual([...CLIMBERS].sort());
    for (const id of FLOWERING_CLIMBERS) expect(isFlower(getCatalogPlant(id)!), id).toBe(true);
    expect(isFlower(getCatalogPlant("grapevine")!)).toBe(false);
    expect(hasHarvest(getCatalogPlant("grapevine")!)).toBe(true);
    expect(searchCatalog("grimpante").length).toBeGreaterThanOrEqual(6);
  });

  it("chaque grimpante se guide sur son support, au printemps ou en été", () => {
    for (const id of FLOWERING_CLIMBERS) {
      expect(getCatalogPlant(id)!.tasks.some((task) => task.id === "guide"), id).toBe(true);
    }
  });

  it("une grimpante en fleurs se note « Elle a fleuri » dans l'herbier, pas en récolte", () => {
    const clematis = plant("clematis");
    expect(canMarkBloom(clematis, [], new Date(2026, 5, 10))).toBe(true);
    expect(canMarkBloom(clematis, [], new Date(2026, 0, 10))).toBe(false);
  });

  it("les 6 légumes : sources vérifiées, famille connue pour la rotation", () => {
    for (const id of VEGETABLES) {
      const entry = getCatalogPlant(id)!;
      expect(entry.sources.length, id).toBeGreaterThanOrEqual(3);
      expect(familyOf(id), id).not.toBe("other");
    }
    expect(familyOf("sweet-potato")).toBe(familyOf("morning-glory"));
    expect(familyOf("rhubarb")).toBe(familyOf("sorrel"));
  });

  it("patate douce et fenouil se récoltent en une fois ; fèves, potimarron et ipomées finissent avec la saison", () => {
    expect(isHarvestedOnce(getCatalogPlant("sweet-potato")!)).toBe(true);
    expect(isHarvestedOnce(getCatalogPlant("florence-fennel")!)).toBe(true);
    for (const id of ["fava-bean", "kuri-squash", "morning-glory"]) expect(endsWithSeason(getCatalogPlant(id)!), id).toBe(true);
    for (const id of ["artichoke", "rhubarb"]) expect(endsWithSeason(getCatalogPlant(id)!), id).toBe(false);
  });

  it("le soir de gel, on ne dit pas de cueillir les ipomées", () => {
    expect(seasonFrostText(getCatalogPlant("morning-glory")!)).toEqual({
      title: "Dernière nuit pour tes ipomées",
      body: "Jusqu’à {min} °C cette nuit : elles n’y résisteront pas. Leur saison se termine.",
    });
    expect(seasonFrostText(getCatalogPlant("kuri-squash")!).title).toBe("Récolte tout ton potimarron avant cette nuit");
  });

  it("patate douce, potimarron, ipomées craignent le froid ; jasmin, passiflore, artichaut restent dehors", () => {
    for (const id of ["sweet-potato", "kuri-squash", "morning-glory"]) {
      expect(isColdTender(getCatalogPlant(id)!), id).toBe(true);
      expect(canComeIndoors(getCatalogPlant(id)!), id).toBe(false);
    }
    for (const id of ["star-jasmine", "passionflower", "artichoke"]) expect(isColdTender(getCatalogPlant(id)!), id).toBe(false);
  });

  it("se trouvent par les mots de tous les jours", () => {
    expect(searchCatalog("raisin").map((entry) => entry.id)).toContain("grapevine");
    expect(searchCatalog("volubilis").map((entry) => entry.id)).toContain("morning-glory");
    expect(searchCatalog("courge").map((entry) => entry.id)).toContain("kuri-squash");
    expect(searchCatalog("feve").map((entry) => entry.id)).toContain("fava-bean");
  });

  it("le pas-à-pas : semis au chaud pour les ipomées en mars, grand pot pour la vigne", () => {
    expect(guideModelFor(getCatalogPlant("morning-glory")!, 3)).toBe("sow-indoor");
    expect(guideModelFor(getCatalogPlant("grapevine")!, 3)).toBe("perennial-pot");
    expect(guideModelFor(getCatalogPlant("fava-bean")!, 3)).toBe("sow-pot");
  });
});
