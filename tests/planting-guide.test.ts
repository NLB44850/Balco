import { describe, expect, it } from "vitest";

import { getCatalogPlant, PLANT_CATALOG } from "../lib/plants/catalog";
import { delayText, guideModelFor, ofName, supplies, whatsNext } from "../lib/plants/guide";
import { PLANTING } from "../lib/plants/planting";

const plant = (id: string) => getCatalogPlant(id)!;

describe("données de plantation (P3)", () => {
  it("les 100 plantes ont leurs données, cohérentes avec le calendrier, et au moins 2 sources", () => {
    expect(Object.keys(PLANTING).sort()).toEqual(PLANT_CATALOG.map((entry) => entry.id).sort());
    for (const entry of PLANT_CATALOG) {
      const data = PLANTING[entry.id];
      expect(data.sources.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(data.sources.every((url) => url.startsWith("https://") || url.startsWith("http://")), entry.id).toBe(true);
      if (entry.sowMonths.length > 0) {
        expect(data.sowDepthCm, entry.id).not.toBeNull();
        expect(data.germinationDays, entry.id).not.toBeNull();
        expect(data.harvestWeeksFromSowing, entry.id).not.toBeNull();
        expect(data.sowDepthCm!, entry.id).toBeLessThanOrEqual(5);
      }
      if (entry.plantMonths.length > 0) expect(data.harvestWeeksFromPlanting, entry.id).not.toBeNull();
      for (const range of [data.germinationDays, data.harvestWeeksFromSowing, data.harvestWeeksFromPlanting]) {
        if (range) expect(range[0], entry.id).toBeLessThanOrEqual(range[1]);
      }
    }
  });
});

describe("modèles de guide et « Ce qu'il te faut »", () => {
  it("le modèle suit le premier geste du mois", () => {
    expect(guideModelFor(plant("basil"), 3)).toBe("sow-indoor");
    expect(guideModelFor(plant("lambs-lettuce"), 10)).toBe("sow-pot");
    expect(guideModelFor(plant("lavender"), 10)).toBe("plant-seedling");
    expect(guideModelFor(plant("redcurrant"), 10)).toBe("perennial-pot");
    expect(guideModelFor(plant("garlic"), 10)).toBe("plant-bulb");
    expect(guideModelFor(plant("microgreens"), 10)).toBe("sow-pot");
    expect(guideModelFor(plant("parsley"), 1)).toBe("sow-indoor");
  });

  it("la liste dit quoi acheter, avec des mesures concrètes", () => {
    const lettuce = supplies(plant("lambs-lettuce"), "sow-pot");
    expect(lettuce.map((item) => item.label)).toEqual(["Un sachet de graines de mâche", "Un pot percé d’au moins 4 L", "Une poignée de billes d’argile", "Du terreau", "Un vaporisateur ou un arrosoir à pomme fine"]);
    // Terreau, billes, arrosoir : communs à toutes les plantes (« J'ai déjà » vaut partout).
    expect(lettuce.filter((item) => item.shared).map((item) => item.id)).toEqual(["clay-balls", "soil", "spray"]);
    expect(supplies(plant("blueberry"), "perennial-pot").map((item) => item.label)).toContain("De la terre de bruyère");
    expect(supplies(plant("basil"), "sow-indoor").map((item) => item.id)).toEqual(["seeds", "cells", "soil", "cover", "spray", "pot-later"]);
    expect(supplies(plant("microgreens"), "sow-pot").map((item) => item.id)).toEqual(["seeds", "tray", "soil", "spray"]);
    expect(supplies(plant("garlic"), "plant-bulb")[0].label).toBe("Des gousses d’ail à planter");
    expect(ofName("Agastache")).toBe("d’agastache");
    expect(ofName("Tomates cerises")).toBe("de tomates cerises");
  });

  it("« Et après ? » : la levée et la première récolte, en mots simples", () => {
    expect(whatsNext(plant("radish"), "sow-pot")).toEqual(["Les pousses sortent dans 3 à 7 jours. Garde la terre humide.", "Première récolte dans 3 à 6 semaines."]);
    expect(whatsNext(plant("lavender"), "plant-seedling")[0]).toMatch(/^Premières fleurs dans /);
    expect(delayText([8, 12], "weeks")).toBe("8 à 12 semaines");
    expect(delayText([13, 26], "weeks")).toBe("3 à 6 mois");
    expect(delayText([60, 160], "weeks")).toBe("l’an prochain, parfois plus tard");
  });
});

describe("les étapes du pas-à-pas (P7) : règles d'écriture", () => {
  const VERBS = ["Mets", "Remplis", "Fais", "Pose", "Sème", "Recouvre", "Rebouche", "Laisse", "Arrose", "Couvre", "Pose-les", "Sors", "Ajoute", "Enfonce-les", "Regarde", "Démêle", "Gratte", "Remets", "Tasse", "Repère", "Coupe", "Coupe-le", "Pince-le", "Sors-les", "Laisse-la"];
  const words = (text: string) => text.split(/\s+/u).filter(Boolean).length;
  const models = ["sow-pot", "sow-indoor", "plant-seedling", "plant-bulb", "perennial-pot", "repot", "topdress", "thin", "pinch", "outdoors"] as const;

  it("pour chaque plante et chaque mois : une action par écran, verbe en tête, moins de 12 mots, une seule erreur à éviter", async () => {
    const { ILLUSTRATION_IDS } = await import("../lib/plants/illustration-names");
    const { guideSteps } = await import("../lib/plants/guide");
    const { REPOTTING } = await import("../lib/plants/repotting");
    for (const entry of PLANT_CATALOG) {
      const { PLANTING } = await import("../lib/plants/planting");
      const months = Array.from({ length: 12 }, (_, month) => guideModelFor(entry, month + 1));
      const tasks = [
        ...(REPOTTING[entry.id] ? (["repot", "topdress"] as const) : []),
        ...(PLANTING[entry.id].thinning ? (["thin"] as const) : []),
        ...(PLANTING[entry.id].pinching ? (["pinch"] as const) : []),
        ...(months.includes("sow-indoor") && entry.plantMonths.length > 0 ? (["outdoors"] as const) : []),
      ];
      for (const model of [...months, ...tasks]) {
        const steps = guideSteps(entry, model, { repots: 1 });
        expect(steps.length, `${entry.id} ${model}`).toBeGreaterThanOrEqual(4);
        expect(steps.length, `${entry.id} ${model}`).toBeLessThanOrEqual(7);
        expect(steps.filter((step) => step.mistake).length, `${entry.id} ${model}`).toBe(1);
        for (const step of steps) {
          expect(VERBS, `« ${step.text} »`).toContain(step.text.split(" ")[0].replace(/,$/, ""));
          expect(words(step.text), `« ${step.text} »`).toBeLessThan(12);
          expect(step.text.endsWith("."), `« ${step.text} »`).toBe(true);
          expect(ILLUSTRATION_IDS).toContain(step.illustration);
          expect(/\b(collet|substrat|poquet|semis direct|repiquer)\b/iu.test(step.text), `mot technique : « ${step.text} »`).toBe(false);
        }
      }
    }
    expect(models.length).toBe(10);
  });

  it("rempoter et changer la terre du dessus : le pot suivant, l'erreur à éviter, la suite", async () => {
    const { guideSteps, guideTitle, nextGestures, shareText, supplies, whatsNext } = await import("../lib/plants/guide");
    const { potSizes } = await import("../lib/plants/calendar");
    const thyme = plant("thyme");
    const next = potSizes(thyme, 1);
    expect(guideTitle(thyme, "repot")).toBe("Rempoter le thym");
    expect(guideTitle(thyme, "topdress")).toBe("Changer la terre du thym");
    const repot = guideSteps(thyme, "repot", { repots: 1 });
    expect(repot[0].text).toBe("Regarde sous le pot si des racines sortent.");
    expect(repot.find((step) => step.mistake)?.why).toBe(`Environ ${next.next} L, ${next.nextWidthCm} cm de large.`);
    expect(supplies(thyme, "repot", { repots: 1 })[0]).toMatchObject({ id: "next-pot", label: `Un pot percé d’environ ${next.next} L` });
    expect(supplies(thyme, "topdress").map((item) => item.id)).toEqual(["fork", "soil", "watering-can"]);
    expect(supplies(plant("blueberry"), "repot").map((item) => item.id)).toContain("heath-soil");
    expect(guideSteps(thyme, "topdress")[0].mistake).toBe("Erreur à éviter : gratter trop profond. Tu abîmerais les racines.");
    expect(whatsNext(thyme, "repot")[0]).toContain("ombre légère");
    expect(nextGestures(thyme, "repot")).toEqual(["Prochain rempotage dans 2 à 4 ans : Balco te le dira.", "Entre-temps, tu changeras la terre du dessus."]);
    expect(nextGestures(plant("mint"), "repot")).toEqual(["Prochain rempotage l’an prochain : Balco te le dira."]);
    expect(shareText(thyme, "topdress", supplies(thyme, "topdress").slice(0, 1))).toBe("Pour changer la terre du thym, il me faut :\n• Une vieille fourchette ou une petite griffe");
  });

  it("éclaircir, pincer, sortir les plants : un pas-à-pas pour chaque geste de suite", async () => {
    const { guideSteps, guideTitle, guideTaskOf, pinchesTip, supplies, whatsNext, nextGestures } = await import("../lib/plants/guide");
    const { PLANTING } = await import("../lib/plants/planting");
    const lettuce = plant("lambs-lettuce");
    expect(guideTitle(lettuce, "thin")).toBe("Éclaircir la mâche");
    expect(guideSteps(lettuce, "thin")[0].text).toBe("Repère une belle pousse tous les 8 cm.");
    expect(guideSteps(lettuce, "thin")[1].mistake).toBe("Erreur à éviter : les arracher. Tu déracinerais les pousses gardées.");
    expect(supplies(lettuce, "thin").map((item) => item.id)).toEqual(["scissors", "spray"]);
    const basil = plant("basil");
    expect(guideTitle(basil, "pinch")).toBe("Pincer le basilic");
    expect(guideSteps(basil, "pinch")[0].why).toBe(PLANTING.basil.pinching!.replace(/'/gu, "’"));
    expect(whatsNext(basil, "pinch")).toContain("Les bouts pincés se mangent : ne les jette pas.");
    // Une plante qui ne se pince pas au bout des tiges (fraisier : les stolons) : la variante aux ciseaux.
    const cutters = Object.entries(PLANTING).filter(([, data]) => data.pinching && !pinchesTip(data));
    expect(cutters.length).toBeGreaterThan(3);
    expect(guideSteps(plant(cutters[0][0]), "pinch")[0].text).toBe("Repère ce qu’il faut couper chez elle.");
    expect(guideTitle(basil, "outdoors")).toBe("Sortir tes plants de basilic");
    expect(guideSteps(basil, "outdoors")[0].mistake).toBe("Erreur à éviter : les sortir d’un coup en plein soleil. Ils brûleraient.");
    expect(nextGestures(basil, "outdoors")).toEqual(["Dans deux semaines, tu la pinceras pour qu’elle soit plus touffue."]);
    expect(guideTaskOf({ kind: "care", followUp: "pinch" })).toBe("pinch");
    expect(guideTaskOf({ kind: "repot", topdress: true })).toBe("topdress");
    expect(guideTaskOf({ kind: "harvest" })).toBeNull();
  });

  it("des exemples concrets", async () => {
    const { guideSteps, guideTitle } = await import("../lib/plants/guide");
    const lettuce = guideSteps(plant("lambs-lettuce"), "sow-pot");
    expect(lettuce[0]).toEqual({ illustration: "clay-balls", text: "Mets une poignée de billes d’argile au fond.", why: "Les racines ne baigneront pas dans l’eau." });
    expect(guideSteps(plant("basil"), "sow-indoor").at(-1)?.mistake).toBe("Erreur à éviter : loin de la fenêtre, les pousses filent et tombent.");
    expect(guideSteps(plant("lavender"), "plant-seedling").map((step) => step.text)).toContain("Pose la motte au centre, au même niveau qu’avant.");
    expect(guideSteps(plant("garlic"), "plant-bulb").map((step) => step.text)).toContain("Enfonce-les à 3 cm, pointe vers le haut.");
    expect(guideTitle(plant("lavender"), "plant-seedling")).toBe("Planter la lavande");
    expect(guideTitle(plant("lambs-lettuce"), "sow-pot")).toBe("Semer la mâche");
  });

  it("« J'ai déjà » : commun pour le terreau, par plante pour le reste ; le partage n'envoie que ce qui manque", async () => {
    const { emptyHave, hasItem, shareText, toggleHave } = await import("../lib/plants/guide");
    const lettuce = supplies(plant("lambs-lettuce"), "sow-pot");
    const soil = lettuce.find((item) => item.id === "soil")!;
    const seeds = lettuce.find((item) => item.id === "seeds")!;
    let have = toggleHave(emptyHave(), "lambs-lettuce", soil);
    have = toggleHave(have, "lambs-lettuce", seeds);
    // Le terreau vaut pour toutes les plantes ; les graines de mâche, pour la mâche seulement.
    expect(hasItem(have, "basil", supplies(plant("basil"), "sow-pot").find((item) => item.id === "soil")!)).toBe(true);
    expect(hasItem(have, "basil", supplies(plant("basil"), "sow-pot").find((item) => item.id === "seeds")!)).toBe(false);
    const missing = lettuce.filter((item) => !hasItem(have, "lambs-lettuce", item));
    expect(shareText(plant("lambs-lettuce"), "sow-pot", missing)).toBe("Pour semer la mâche, il me faut :\n• Un pot percé d’au moins 4 L\n• Une poignée de billes d’argile\n• Un vaporisateur ou un arrosoir à pomme fine");
  });
});
