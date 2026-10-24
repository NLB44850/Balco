import { describe, expect, it } from "vitest";
import { upcomingHarvests } from "../lib/garden/progress";
import { resolvePlants } from "../lib/garden/garden-logic";
import { restUntil } from "../lib/garden/off-season";
import { calendarActivities } from "../lib/plants/calendar";
import { CATEGORY_LABELS, getCatalogPlant, hasHarvest, isFlower, PLANT_CATALOG, searchCatalog, seasonFact } from "../lib/plants/catalog";
import { bulbOf, guideModelFor, startPills } from "../lib/plants/guide";
import { canComeIndoors, isColdTender } from "../lib/plants/cold-hardiness";
import { canMarkBloom } from "../lib/garden/herbarium";
import { familyOf } from "../lib/plants/families";
import { endsWithSeason, isHarvestedOnce, seasonFrostText } from "../lib/plants/season-end";

/** Chantier « Catalogue balcon et terrasse », livraison 1 : bulbes, fleurs d'hiver, plantes grasses. */
const DELIVERY_1 = ["tulip", "daffodil", "muscari", "crocus", "winter-heath", "hellebore", "houseleek", "sedum"];
const BULBS = ["tulip", "daffodil", "muscari", "crocus"];
/** Livraison 3 : les grimpantes qu'on ne cueille pas (la vigne, elle, se récolte). */
const FLOWERING_CLIMBERS = ["star-jasmine", "clematis", "passionflower", "honeysuckle", "morning-glory"];
/** Livraison 4 : arbustes à fleurs, puis feuillages (belle saison). */
const SHRUBS = ["hydrangea", "rose-bush", "oleander", "japanese-maple", "fargesia", "stipa", "musa-basjoo"];
const FOLIAGE = ["japanese-maple", "fargesia", "stipa", "musa-basjoo"];

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
    expect(PLANT_CATALOG.filter((entry) => !hasHarvest(entry)).map((entry) => entry.id).sort()).toEqual([...DELIVERY_1, ...FLOWERING_CLIMBERS, ...SHRUBS].sort());
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
  const MORE_TREES = ["dwarf-apricot", "dwarf-plum", "columnar-pear", "calamondin", "mandarin", "lime", "feijoa", "loquat", "dwarf-mulberry"];

  it("une catégorie « Arbres fruitiers », avec le citronnier et le figuier", () => {
    expect(CATEGORY_LABELS["fruit-tree"]).toBe("Arbres fruitiers");
    expect(searchCatalog("", "fruit-tree").map((entry) => entry.id).sort()).toEqual([...TREES, ...MORE_TREES, "lemon-tree", "dwarf-fig"].sort());
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

describe("catalogue balcon et terrasse : livraison 4, arbustes et graminées", () => {
  it("une catégorie « Arbustes et feuillages » : 3 arbustes à fleurs, 4 feuillages (avec le bananier, livraison 5)", () => {
    expect(CATEGORY_LABELS.shrub).toBe("Arbustes et feuillages");
    expect(searchCatalog("", "shrub").map((entry) => entry.id).sort()).toEqual([...SHRUBS].sort());
    for (const id of SHRUBS) {
      const entry = getCatalogPlant(id)!;
      expect(entry.perennial, id).toBe(true);
      expect(hasHarvest(entry), id).toBe(false);
      expect(entry.sources.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("les feuillages ont une belle saison, ni récolte ni floraison, et pas de carte d'herbier", async () => {
    const { herbariumTotal } = await import("../lib/garden/herbarium");
    for (const id of FOLIAGE) {
      expect(isFlower(getCatalogPlant(id)!), id).toBe(false);
      expect(seasonFact(getCatalogPlant(id)!), id).toBe("🍁  Belle saison");
    }
    expect(seasonFact(getCatalogPlant("hydrangea")!)).toBe("🌸  Floraison");
    expect(seasonFact(getCatalogPlant("basil")!)).toBe("🧺  Récolte");
    expect(herbariumTotal).toBe(PLANT_CATALOG.length - FOLIAGE.length);
    expect(canMarkBloom(plant("japanese-maple"), [], new Date(2026, 9, 10))).toBe(false);
  });

  it("le laurier-rose reste dehors avec son abri ; il est très toxique", async () => {
    const { warningOf } = await import("../lib/plants/warnings");
    const oleander = getCatalogPlant("oleander")!;
    expect(isColdTender(oleander)).toBe(false);
    expect(oleander.tasks.some((task) => task.id === "shelter")).toBe(true);
    expect(warningOf(oleander)?.title).toBe("Très toxique");
    expect(warningOf(getCatalogPlant("hydrangea")!)?.title).toBe("Toxique pour les animaux");
  });

  it("chaque geste d'entretien a son pas-à-pas en images", async () => {
    const { careGuideFor } = await import("../lib/plants/care-guides");
    expect(careGuideFor(getCatalogPlant("hydrangea")!, "prune")).toBe("prune-shrub");
    expect(careGuideFor(getCatalogPlant("fargesia")!, "thin-canes")).toBe("prune-shrub");
    expect(careGuideFor(getCatalogPlant("rose-bush")!, "deadhead")).toBe("deadhead");
    expect(careGuideFor(getCatalogPlant("tulip")!, "deadhead")).toBeNull();
    expect(careGuideFor(getCatalogPlant("stipa")!, "comb")).toBe("comb-grass");
    for (const id of SHRUBS) {
      const entry = getCatalogPlant(id)!;
      expect(entry.tasks.filter((task) => task.type === "pruning").every((task) => careGuideFor(entry, task.id) !== null), id).toBe(true);
    }
  });

  it("se trouvent par les mots de tous les jours", () => {
    expect(searchCatalog("rose").map((entry) => entry.id)).toContain("rose-bush");
    expect(searchCatalog("bambou").map((entry) => entry.id)).toContain("fargesia");
    expect(searchCatalog("graminée").map((entry) => entry.id)).toContain("stipa");
    expect(searchCatalog("feuillage").length).toBeGreaterThanOrEqual(3);
  });
});

describe("catalogue balcon et terrasse : livraison 5, fruitiers et bananier (retour du 24/10)", () => {
  it("les agrumes se rentrent l'hiver ; feijoa, néflier et bananier restent dehors avec leur abri", () => {
    for (const id of ["calamondin", "mandarin", "lime"]) expect(canComeIndoors(getCatalogPlant(id)!), id).toBe(true);
    for (const id of ["feijoa", "loquat", "musa-basjoo"]) {
      expect(isColdTender(getCatalogPlant(id)!), id).toBe(false);
      expect(getCatalogPlant(id)!.tasks.some((task) => task.id === "shelter"), id).toBe(true);
    }
  });

  it("le bananier du Japon est un feuillage : pas de récolte, et la fiche dit que ses bananes ne se mangent pas", () => {
    const banana = getCatalogPlant("musa-basjoo")!;
    expect(hasHarvest(banana)).toBe(false);
    expect(seasonFact(banana)).toBe("🍁  Belle saison");
    expect(banana.pitch).toMatch(/pas bonnes à manger/u);
  });

  it("se trouvent par le nom du fruit", () => {
    expect(searchCatalog("banane").map((entry) => entry.id)).toContain("musa-basjoo");
    expect(searchCatalog("mirabelle").map((entry) => entry.id)).toContain("dwarf-plum");
    expect(searchCatalog("mandarine").map((entry) => entry.id)).toContain("mandarin");
    expect(searchCatalog("nèfle").map((entry) => entry.id)).toContain("loquat");
  });
});

describe("familles du catalogue en tuiles (retour du 24/10 : « la liste commence à être longue »)", () => {
  it("chaque plante est dans une seule famille, et chaque tuile a sa photo", async () => {
    const { CATALOG_FAMILIES, familyOfCategory, plantsOfFamily } = await import("../lib/plants/catalog-families");
    const total = CATALOG_FAMILIES.reduce((sum, family) => sum + plantsOfFamily(family.id).length, 0);
    expect(total).toBe(PLANT_CATALOG.length);
    for (const entry of PLANT_CATALOG) expect(familyOfCategory(entry.category), entry.id).toBeDefined();
    for (const family of CATALOG_FAMILIES) expect(familyOfCategory(getCatalogPlant(family.cover)!.category).id, family.id).toBe(family.id);
    expect(plantsOfFamily("fruit").map((entry) => entry.id)).toContain("dwarf-apricot");
  });
});
