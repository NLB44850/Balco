import { describe, expect, it } from "vitest";
import { followUpsFor } from "../lib/garden/follow-ups";
import { startEventId, type ResolvedPlant } from "../lib/garden/garden-logic";
import { plantProgress, plantStage } from "../lib/garden/progress";
import { genericRepotSign, startActivity } from "../lib/plants/calendar";
import { getCatalogPlant, PLANT_CATALOG, type CatalogPlant } from "../lib/plants/catalog";
import { agree, bareName, objectBefore, possessive } from "../lib/plants/grammar";
import { guideLinkText, guideSteps, guideTitle, nextGestures, whatsNext, type GuideModel } from "../lib/plants/guide";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const DAY = 86_400_000;
const catalog = (id: string) => getCatalogPlant(id)!;

/** Les quatre formes : masculin, féminin, masculin pluriel, féminin pluriel. */
const FORMS = [
  { name: "masculin", gender: "m", plural: undefined },
  { name: "féminin", gender: "f", plural: undefined },
  { name: "masculin pluriel", gender: "m", plural: true },
  { name: "féminin pluriel", gender: "f", plural: true },
] as const;

/**
 * Les phrases qui parlent de la plante, sous leurs quatre formes. Pour une forme donnée, aucun texte ne doit
 * contenir l'une des trois autres, et chacune doit apparaître au moins une fois (le modèle est bien testé).
 */
const PHRASES: [string, string, string, string][] = [
  ["Garde-le quelques jours", "Garde-la quelques jours", "Garde-les quelques jours", "Garde-les quelques jours"],
  ["ses racines s’installent", "ses racines s’installent", "leurs racines s’installent", "leurs racines s’installent"],
  ["Le terreau neuf le nourrit", "Le terreau neuf la nourrit", "Le terreau neuf les nourrit", "Le terreau neuf les nourrit"],
  ["il repart plus dense.", "elle repart plus dense.", "ils repartent plus denses.", "elles repartent plus denses."],
  ["il manque de place", "elle manque de place", "ils manquent de place", "elles manquent de place"],
  ["Il manque de place", "Elle manque de place", "Ils manquent de place", "Elles manquent de place"],
  ["couper chez lui.", "couper chez elle.", "couper chez eux.", "couper chez elles."],
  ["Laisse-le repartir", "Laisse-la repartir", "Laisse-les repartir", "Laisse-les repartir"],
  ["Il reste dense et produit plus longtemps.", "Elle reste dense et produit plus longtemps.", "Ils restent denses et produisent plus longtemps.", "Elles restent denses et produisent plus longtemps."],
  ["C’est ce qui le rend touffu.", "C’est ce qui la rend touffue.", "C’est ce qui les rend touffus.", "C’est ce qui les rend touffues."],
  ["tu le pinceras pour qu’il soit plus touffu.", "tu la pinceras pour qu’elle soit plus touffue.", "tu les pinceras pour qu’ils soient plus touffus.", "tu les pinceras pour qu’elles soient plus touffues."],
  ["Installe-le dans un pot", "Installe-la dans un pot", "Installe-les dans un pot", "Installe-les dans un pot"],
  ["Il devient plus touffu et produit plus.", "Elle devient plus touffue et produit plus.", "Ils deviennent plus touffus et produisent plus.", "Elles deviennent plus touffues et produisent plus."],
  ["Comment le pincer", "Comment la pincer", "Comment les pincer", "Comment les pincer"],
  ["Comment le rempoter", "Comment la rempoter", "Comment les rempoter", "Comment les rempoter"],
  ["pour le planter ›", "pour la planter ›", "pour les planter ›", "pour les planter ›"],
  ["Il s’installe", "Elle s’installe", "Ils s’installent", "Elles s’installent"],
  ["Il passe l’hiver au ralenti : peu d’eau, et il repartira", "Elle passe l’hiver au ralenti : peu d’eau, et elle repartira", "Ils passent l’hiver au ralenti : peu d’eau, et ils repartiront", "Elles passent l’hiver au ralenti : peu d’eau, et elles repartiront"],
  ["Sa saison touche à sa fin : tu pourras le remplacer", "Sa saison touche à sa fin : tu pourras la remplacer", "Leur saison touche à sa fin : tu pourras les remplacer", "Leur saison touche à sa fin : tu pourras les remplacer"],
  ["Il pousse :", "Elle pousse :", "Ils poussent :", "Elles poussent :"],
  ["il produira davantage", "elle produira davantage", "ils produiront davantage", "elles produiront davantage"],
  ["10 gestes pour lui", "10 gestes pour elle", "10 gestes pour eux", "10 gestes pour elles"],
];

const MODELS: GuideModel[] = ["sow-pot", "sow-indoor", "plant-seedling", "plant-bulb", "perennial-pot", "repot", "topdress", "thin", "pinch", "outdoors"];

/** Tous les textes générés pour une plante : pas-à-pas, « Et après ? », liens, gestes, étapes de progression. */
function textsFor(entry: CatalogPlant): string[] {
  const texts: string[] = [];
  for (const model of MODELS) {
    texts.push(guideTitle(entry, model), ...whatsNext(entry, model), ...nextGestures(entry, model));
    for (const step of guideSteps(entry, model)) texts.push(step.text, step.why ?? "", step.mistake ?? "");
  }
  for (const task of ["thin", "pinch", "outdoors", "repot", "topdress", "need"] as const) texts.push(guideLinkText(entry, task));
  texts.push(genericRepotSign(entry));
  const plantMonth = entry.plantMonths[0] ?? 5;
  texts.push(startActivity({ id: "p", entry: { ...entry, plantMonths: [plantMonth] }, displayName: entry.name }, plantMonth).description);

  const addedAt = new Date(2026, 0, 1);
  const resolved = { plant: { id: "p", catalogId: entry.id, addedAt: addedAt.toISOString() }, entry } as ResolvedPlant;
  const start: MaintenanceEvent = { id: startEventId("p"), plantId: "p", type: "observation", completedAt: addedAt.toISOString(), source: "manual", note: `Plante ${entry.label}` };
  texts.push(...followUpsFor(resolved, [start], new Date(addedAt.getTime() + 15 * DAY)).map((activity) => activity.description));

  // Les étapes de la carte « Sa progression » : en récolte, s'installe, au repos, en croissance, fin de saison.
  const july = { ...resolved, entry: { ...entry, harvestMonths: [7] } } as ResolvedPlant;
  for (const [days, date] of [[100, new Date(2026, 6, 10)], [5, new Date(2026, 2, 10)], [100, new Date(2026, 2, 10)], [100, new Date(2026, 10, 10)]] as const) {
    texts.push(plantStage(july, days, date).label, plantStage(july, days, date).detail);
  }
  const perennial = { ...july, entry: { ...july.entry, perennial: true } } as ResolvedPlant;
  texts.push(plantStage(perennial, 100, new Date(2026, 0, 10)).detail);
  const events = Array.from({ length: 10 }, (_, index): MaintenanceEvent => ({ id: `e${index}`, plantId: "p", type: "watering", completedAt: new Date(2026, 1, index + 1).toISOString(), source: "manual" }));
  texts.push(...plantProgress(resolved, events, [], new Date(2026, 1, 20)).milestones.map((milestone) => milestone.label));
  return texts.filter(Boolean);
}

describe("genre et nombre du catalogue", () => {
  it("chaque plante a un genre, accordé à l'article de son nom", () => {
    for (const entry of PLANT_CATALOG) {
      expect(["m", "f"]).toContain(entry.gender);
      if (entry.label.startsWith("le ")) expect([entry.id, entry.gender, entry.plural]).toEqual([entry.id, "m", undefined]);
      if (entry.label.startsWith("la ")) expect([entry.id, entry.gender, entry.plural]).toEqual([entry.id, "f", undefined]);
      expect([entry.id, Boolean(entry.plural)]).toEqual([entry.id, entry.label.startsWith("les ")]);
    }
  });

  it("le thym est masculin, la menthe féminine, les radis masculins pluriels, les tomates cerises féminines plurielles", () => {
    expect([catalog("thyme").gender, catalog("thyme").plural]).toEqual(["m", undefined]);
    expect([catalog("mint").gender, catalog("mint").plural]).toEqual(["f", undefined]);
    expect([catalog("radish").gender, catalog("radish").plural]).toEqual(["m", true]);
    expect([catalog("cherry-tomato").gender, catalog("cherry-tomato").plural]).toEqual(["f", true]);
    expect(catalog("garlic").gender).toBe("m");
  });
});

describe("l'outil d'accord", () => {
  it("accorde adjectifs et participes", () => {
    expect([agree(catalog("garlic"), "récolté"), agree(catalog("round-carrot"), "récolté"), agree(catalog("radish"), "récolté"), agree(catalog("mint"), "récolté")]).toEqual(["récolté", "récoltées", "récoltés", "récoltée"]);
    expect(agree(catalog("radish"), "dense")).toBe("denses");
    expect(agree(catalog("mint"), "dense")).toBe("dense");
  });

  it("élide devant une voyelle, au singulier seulement", () => {
    expect(objectBefore(catalog("thyme"), "arroser")).toBe("l’arroser");
    expect(objectBefore(catalog("radish"), "arroser")).toBe("les arroser");
    expect(objectBefore(catalog("mint"), "pincer")).toBe("la pincer");
  });

  it("nomme la plante sans article ou avec un possessif", () => {
    expect([bareName(catalog("radish")), bareName(catalog("garlic")), bareName(catalog("round-carrot"))]).toEqual(["Radis", "Ail", "Carottes"]);
    expect([possessive(catalog("radish")), possessive(catalog("thyme")), possessive(catalog("mint")), possessive(catalog("garlic")), possessive(catalog("sweet-alyssum"))]).toEqual(["tes radis", "ton thym", "ta menthe", "ton ail", "ton alysse"]);
  });
});

describe("chaque modèle de texte, accordé", () => {
  // Le basilic pince le bout des tiges, le thym demande une autre coupe et se rempote, l'ail se plante en bulbe :
  // à eux trois ils passent par tous les modèles. On les décline aux quatre formes.
  const bases = ["basil", "thyme", "garlic"].map(catalog);

  FORMS.forEach((form, index) => {
    it(`au ${form.name}`, () => {
      const texts = bases.flatMap((base) => textsFor({ ...base, gender: form.gender, plural: form.plural } as CatalogPlant));
      for (const row of PHRASES) {
        const own = row[index];
        expect(texts.some((text) => text.includes(own)), `« ${own} » n'apparaît dans aucun texte`).toBe(true);
        for (const other of row) {
          if (other === own || own.includes(other)) continue;
          const wrong = texts.find((text) => text.includes(other));
          expect(wrong, `« ${other} » au ${form.name}`).toBeUndefined();
        }
      }
    });
  });

  it("le thym, la menthe et les radis, tels qu'au catalogue", () => {
    expect(whatsNext(catalog("thyme"), "repot")[0]).toBe("Garde-le quelques jours à l’ombre légère : ses racines s’installent.");
    expect(whatsNext(catalog("mint"), "repot")[0]).toBe("Garde-la quelques jours à l’ombre légère : ses racines s’installent.");
    expect(whatsNext(catalog("radish"), "repot")[0]).toBe("Garde-les quelques jours à l’ombre légère : leurs racines s’installent.");
    expect(guideSteps(catalog("basil"), "pinch").map((step) => step.why)).toContain("C’est ce qui le rend touffu.");
    expect(nextGestures(catalog("basil"), "sow-pot")).toContain("Plus tard, tu le pinceras pour qu’il soit plus touffu.");
    expect(nextGestures(catalog("mint"), "plant-seedling")).toContain("Plus tard, tu la pinceras pour qu’elle soit plus touffue.");
    expect(whatsNext(catalog("thyme"), "pinch")).toEqual(["En quelques semaines, il repart plus dense."]);
  });
});
