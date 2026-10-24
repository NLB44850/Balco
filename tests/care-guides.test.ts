import { describe, expect, it } from "vitest";

import { getCatalogPlant, PLANT_CATALOG } from "../lib/plants/catalog";
import { CARE_GUIDE_TASKS, careGuideFor, careGuidesNow, careTaskOf, frostGuideFor, plantCareGuides } from "../lib/plants/care-guides";
import { guideLinkText, guideSteps, guideTaskOf, guideTitle, isGuideTask, supplies, whatsNext } from "../lib/plants/guide";
import { calendarActivities } from "../lib/plants/calendar";
import { WARNINGS, warningOf } from "../lib/plants/warnings";

const plant = (id: string) => getCatalogPlant(id)!;

/** Retour du 23/10 : « illustre les nouveaux gestes dans le pas-à-pas ». */
describe("pas-à-pas des gestes d'entretien", () => {
  it("chaque pas-à-pas sert au moins à une plante, avec ce qu'il te faut, des étapes et une suite", () => {
    for (const task of CARE_GUIDE_TASKS) {
      const entries = PLANT_CATALOG.filter((entry) => entry.tasks.some((candidate) => careGuideFor(entry, candidate.id) === task));
      expect(entries.length, task).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(isGuideTask(task)).toBe(true);
        expect(careTaskOf(entry, task), `${entry.id} ${task}`).not.toBeNull();
        expect(supplies(entry, task).length, `${entry.id} ${task}`).toBeGreaterThan(0);
        expect(whatsNext(entry, task).length, `${entry.id} ${task}`).toBeGreaterThan(0);
        expect(guideLinkText(entry, task), `${entry.id} ${task}`).toMatch(/pas à pas ›$/u);
      }
    }
  });

  it("guider : les grimpantes, le potimarron (avec son filet) et les pois de senteur", () => {
    for (const id of ["star-jasmine", "clematis", "passionflower", "honeysuckle", "morning-glory", "kuri-squash", "sweet-pea"]) expect(careGuideFor(plant(id), "guide"), id).toBe("train");
    expect(guideSteps(plant("kuri-squash"), "train").some((step) => step.illustration === "fruit-sling")).toBe(true);
    expect(guideSteps(plant("clematis"), "train").some((step) => step.illustration === "fruit-sling")).toBe(false);
    expect(guideTitle(plant("morning-glory"), "train")).toBe("Guider les ipomées");
    expect(guideLinkText(plant("clematis"), "train")).toBe("Comment la guider, pas à pas ›");
  });

  it("tailler : la vigne a son pas-à-pas (deux bourgeons), les grimpantes à fleurs le leur, pas les arbres", () => {
    expect(careGuideFor(plant("grapevine"), "prune")).toBe("prune-vine");
    expect(careGuideFor(plant("clematis"), "prune")).toBe("prune");
    expect(careGuideFor(plant("dwarf-peach"), "prune")).toBeNull();
    // La consigne propre à la clématite (selon sa floraison) est reprise à l'étape de la coupe.
    expect(guideSteps(plant("clematis"), "prune").some((step) => step.why?.includes("30 cm"))).toBe(true);
  });

  it("protéger du froid : seulement les plantes qui restent dehors ; les frileuses se rentrent", () => {
    expect(careGuideFor(plant("artichoke"), "shelter")).toBe("wrap");
    expect(careGuideFor(plant("olive-tree"), "shelter")).toBe("wrap");
    expect(careGuideFor(plant("kumquat"), "shelter")).toBeNull();
    expect(guideSteps(plant("artichoke"), "wrap")[0].text).toBe("Coupe les grandes feuilles à 20 cm du sol.");
    expect(guideTitle(plant("olive-tree"), "wrap")).toBe("Protéger l’olivier du froid");
  });

  it("le geste du calendrier ouvre son pas-à-pas ; la fiche le propose pendant ses mois et le mois d'avant", () => {
    const vine = plant("grapevine");
    const [activity] = calendarActivities([{ id: "p", entry: vine, displayName: vine.name }], 6).filter((candidate) => candidate.taskId === "thin-bunches");
    expect(guideTaskOf(activity)).toBe("thin-bunches");
    expect(careGuidesNow(vine, 6)).toEqual(["thin-bunches"]);
    expect(careGuidesNow(vine, 2)).toEqual(["prune-vine"]);
    expect(careGuidesNow(vine, 1)).toEqual(["prune-vine"]);
    expect(careGuidesNow(vine, 10)).toEqual([]);
    expect(careGuidesNow(plant("florence-fennel"), 8)).toEqual(["earth-up"]);
    expect(careGuidesNow(plant("potato"), 5)).toEqual(["earth-up"]);
  });

  it("protéger du froid : dès octobre (avant novembre), et toute l'année quand un gel est annoncé (retour du 23/10)", () => {
    expect(careGuidesNow(plant("artichoke"), 10)).toEqual(["wrap"]);
    expect(careGuidesNow(plant("artichoke"), 6)).toEqual([]);
    expect(careGuidesNow(plant("artichoke"), 6, true)).toEqual(["wrap"]);
    expect(careGuidesNow(plant("olive-tree"), 10, true)).toEqual(["wrap"]);
    expect(frostGuideFor(plant("kumquat"))).toBeNull();
    // Toutes les plantes qui restent dehors et reçoivent les alertes gel : pas seulement l'artichaut.
    const outdoor = PLANT_CATALOG.filter((entry) => frostGuideFor(entry)).map((entry) => entry.id).sort();
    expect(outdoor).toEqual(["artichoke", "olive-tree", "passionflower", "rosemary", "star-jasmine"]);
    expect(careGuidesNow(plant("rosemary"), 1, true)).toEqual(["wrap"]);
    expect(careGuidesNow(plant("rosemary"), 1)).toEqual([]);
    expect(careGuidesNow(plant("basil"), 10, true)).toEqual([]);
  });
});

describe("la fiche montre tous les pas-à-pas d'entretien (retour du 23/10, potimarron en octobre)", () => {
  it("ceux du moment d'abord, les autres avec leurs mois", () => {
    expect(plantCareGuides(plant("kuri-squash"), 10)).toEqual([{ task: "train", months: [6, 7, 8] }]);
    expect(plantCareGuides(plant("kuri-squash"), 6)).toEqual([{ task: "train", months: null }]);
    expect(plantCareGuides(plant("grapevine"), 2)).toEqual([{ task: "prune-vine", months: null }, { task: "thin-bunches", months: [6, 7] }]);
  });
});

describe("avertissements des plantes toxiques", () => {
  it("ne parlent que de plantes du catalogue, avec un titre court et deux sources", () => {
    for (const [id, warning] of Object.entries(WARNINGS)) {
      expect(getCatalogPlant(id), id).toBeDefined();
      expect(warning.title.split(" ").length, id).toBeLessThanOrEqual(5);
      expect(warning.text.endsWith("."), id).toBe(true);
      expect(warning.sources.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it("rhubarbe, ipomées, pois de senteur, tulipes, narcisses, hellébore, clématite, chèvrefeuille", () => {
    expect(warningOf(plant("rhubarb"))?.title).toBe("Feuilles toxiques");
    expect(warningOf(plant("morning-glory"))?.title).toBe("Graines toxiques");
    for (const id of ["sweet-pea", "tulip", "daffodil", "hellebore", "clematis", "honeysuckle"]) expect(warningOf(plant(id)), id).not.toBeNull();
    expect(warningOf(plant("basil"))).toBeNull();
  });

  it("n'est plus caché au bout du texte de présentation", () => {
    for (const entry of PLANT_CATALOG) expect(entry.pitch, entry.id).not.toMatch(/Attention/u);
  });
});
