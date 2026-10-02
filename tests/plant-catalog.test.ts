import { describe, expect, it } from "vitest";

import { PLANT_CATALOG, fitsSpace, formatMonthRange, getCatalogPlant, recommendPlants, searchCatalog, tasksForMonth } from "../lib/plants/catalog";

describe("plant catalog integrity", () => {
  it("has a meaningful number of plants with unique ids", () => {
    expect(PLANT_CATALOG.length).toBeGreaterThanOrEqual(30);
    const ids = PLANT_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PLANT_CATALOG.map((entry) => [entry.id, entry] as const))("%s has consistent data", (_id, entry) => {
    const months = [...entry.sowMonths, ...entry.plantMonths, ...entry.harvestMonths];
    months.forEach((month) => expect(month).toBeGreaterThanOrEqual(1));
    months.forEach((month) => expect(month).toBeLessThanOrEqual(12));
    expect(entry.sowMonths.length + entry.plantMonths.length).toBeGreaterThan(0);
    expect(entry.harvestMonths.length).toBeGreaterThan(0);
    expect(entry.sunlight.length).toBeGreaterThan(0);
    expect(entry.label.toLowerCase()).toContain(entry.name.split(" ")[0].toLowerCase().slice(0, 4));

    expect(entry.care.wateringIntervalHours).toBeGreaterThanOrEqual(24);
    expect(entry.care.heatThresholdC).toBeGreaterThan(entry.care.frostThresholdC + 15);
    expect(entry.care.rainSkipMm).toBeGreaterThan(0);

    const taskIds = entry.tasks.map((task) => task.id);
    expect(new Set(taskIds).size).toBe(taskIds.length);
    expect(entry.tasks.some((task) => task.type === "watering")).toBe(true);
    const harvest = entry.tasks.find((task) => task.type === "harvest");
    expect(harvest?.months).toEqual(entry.harvestMonths);

    expect(entry.varieties.length).toBeGreaterThan(0);
    const varietyIds = entry.varieties.map((variety) => variety.id);
    expect(new Set(varietyIds).size).toBe(varietyIds.length);
    entry.varieties.forEach((variety) => {
      expect(variety.id).toMatch(/^[a-z0-9-]+$/);
      expect(variety.name.trim()).not.toBe("");
      expect(variety.note.length).toBeGreaterThan(20);
      expect(variety.note.length).toBeLessThanOrEqual(130);
    });
  });

  it("shows the plant itself, or a plain plant or flower when no emoji exists (never an unrelated object)", () => {
    const generic = ["🌿", "🍃", "🌱", "🌾", "🥬", "🌸", "🌼", "🏵️", "🌺", "🌻", "🪴"];
    const exact: Record<string, string> = { "cherry-tomato": "🍅", "dwarf-tomato": "🍅", chili: "🌶️", strawberry: "🍓", eggplant: "🍆", "sweet-pepper": "🫑", "mini-melon": "🍈", "round-carrot": "🥕", "spring-onion": "🧅", garlic: "🧄", potato: "🥔", blueberry: "🫐", zucchini: "🥒", "mini-cucumber": "🥒", cucamelon: "🥒", "dwarf-bean": "🫘", "pole-bean": "🫘", physalis: "🏮", "lemon-tree": "🍋", tomatillo: "🏮", "yardlong-bean": "🫘", "west-indian-gherkin": "🥒", "woodland-strawberry": "🍓", kiwiberry: "🥝", blackcurrant: "🫐" };
    for (const entry of PLANT_CATALOG) {
      expect(exact[entry.id] ?? generic, entry.id).toContain(entry.emoji);
    }
  });

  it("offers 100 balcony plants, found by their common names", () => {
    expect(PLANT_CATALOG.length).toBeGreaterThanOrEqual(100);
    expect(searchCatalog("cassis").map((entry) => entry.id)).toEqual(["blackcurrant"]);
    expect(searchCatalog("gueule de loup").map((entry) => entry.id)).toEqual(["snapdragon"]);
  });

  it("marks tender plants as frost sensitive", () => {
    ["basil", "cherry-tomato", "zucchini", "nasturtium"].forEach((id) => expect(getCatalogPlant(id)?.care.frostSensitive).toBe(true));
    ["mint", "thyme", "lambs-lettuce"].forEach((id) => expect(getCatalogPlant(id)?.care.frostSensitive).toBe(false));
  });
});

describe("balcony context", () => {
  it("offers real choices on a shaded balcony, in every main category", () => {
    const shaded = recommendPlants({ sunlight: "shade", space: "balcony" });
    expect(shaded.length).toBeGreaterThanOrEqual(12);
    expect(new Set(shaded.map((entry) => entry.category)).size).toBeGreaterThanOrEqual(4);
    shaded.forEach((entry) => expect(entry.sunlight).toContain("shade"));
  });

  it("keeps a windowsill selection for tiny spaces", () => {
    const windowsill = recommendPlants({ sunlight: "sunny", space: "windowsill" });
    expect(windowsill.length).toBeGreaterThanOrEqual(15);
    windowsill.forEach((entry) => expect(entry.minSpace).toBe("windowsill"));
    expect(windowsill.map((entry) => entry.id)).toContain("dwarf-tomato");
  });

  it("finds a plant from one of its varieties or a common word", () => {
    expect(searchCatalog("mara des bois").map((entry) => entry.id)).toEqual(["strawberry"]);
    expect(searchCatalog("micro tom").map((entry) => entry.id)).toEqual(["dwarf-tomato"]);
    expect(searchCatalog("myrtille").map((entry) => entry.id)).toContain("blueberry");
    expect(searchCatalog("tomate").map((entry) => entry.id)).toEqual(expect.arrayContaining(["cherry-tomato", "dwarf-tomato"]));
  });
});

describe("catalog helpers", () => {
  it("only proposes harvest tasks during harvest months", () => {
    const tomato = getCatalogPlant("cherry-tomato")!;
    expect(tasksForMonth(tomato, 1).some((task) => task.type === "harvest")).toBe(false);
    expect(tasksForMonth(tomato, 8).some((task) => task.type === "harvest")).toBe(true);
  });

  it("filters by available space", () => {
    expect(fitsSpace(getCatalogPlant("zucchini")!, "windowsill")).toBe(false);
    expect(fitsSpace(getCatalogPlant("zucchini")!, "terrace")).toBe(true);
    expect(fitsSpace(getCatalogPlant("basil")!, "windowsill")).toBe(true);
  });

  it("recommends shade-tolerant plants for a shaded windowsill", () => {
    const picks = recommendPlants({ sunlight: "shade", space: "windowsill", goals: [] });
    expect(picks.length).toBeGreaterThan(0);
    picks.forEach((entry) => {
      expect(entry.sunlight).toContain("shade");
      expect(fitsSpace(entry, "windowsill")).toBe(true);
    });
    expect(picks.map((entry) => entry.id)).not.toContain("cherry-tomato");
  });

  it("puts the plant the user asked for first, even against multi-goal plants", () => {
    const picks = recommendPlants({ sunlight: "sunny", space: "balcony", goals: ["tomatoes", "bees"] });
    expect(picks.slice(0, 2).map((entry) => entry.id)).toEqual(expect.arrayContaining(["cherry-tomato", "lavender"]));
  });

  it("puts goal plants first", () => {
    const picks = recommendPlants({ sunlight: "sunny", space: "balcony", goals: ["tomatoes"] });
    expect(picks[0].goals).toContain("tomatoes");
  });

  it("excludes plants the user already grows", () => {
    const picks = recommendPlants(null, { exclude: ["basil"] });
    expect(picks.map((entry) => entry.id)).not.toContain("basil");
  });

  it("searches without accents or case", () => {
    expect(searchCatalog("epinard").map((entry) => entry.id)).toContain("spinach");
    expect(searchCatalog("TOMATE").map((entry) => entry.id)).toContain("cherry-tomato");
    expect(searchCatalog("fraise").map((entry) => entry.id)).toContain("strawberry");
    expect(searchCatalog("oeillet").map((entry) => entry.id)).toContain("marigold");
    expect(searchCatalog("", "flower").every((entry) => entry.category === "flower")).toBe(true);
  });

  it("formats month ranges, including ranges across the new year", () => {
    expect(formatMonthRange([3, 4, 5])).toBe("mars–mai");
    expect(formatMonthRange([4, 5, 6, 9])).toBe("avril–juin, septembre");
    expect(formatMonthRange([10, 11, 12, 1, 2, 3])).toBe("octobre–mars");
    expect(formatMonthRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe("toute l’année");
    expect(formatMonthRange([])).toBe("");
  });
});
