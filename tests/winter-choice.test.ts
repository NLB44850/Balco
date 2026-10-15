import { describe, expect, it } from "vitest";
import { planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants, type GardenPlant } from "../lib/garden/garden-logic";
import { harvestEndStates, markSeasonFrost, markWinterAsked } from "../lib/garden/harvest-end";
import { buildTodayList, layoutTodayList } from "../lib/garden/today";
import {
  asksWinter,
  coldNightAhead,
  winterChoiceSummary,
  winterChoiceToast,
  winterDecideSubtitle,
  winterDecideTitle,
  winterOptions,
  winterPlanOf,
  winterQuestion,
  winterWhy,
} from "../lib/garden/winter-choice";
import { isWinterPlan, parseWinterPlan } from "../lib/garden/winter-plan";
import { getCatalogPlant } from "../lib/plants/catalog";
import type { ReminderSnooze } from "../lib/reminders/reminder-actions";

const entry = (id: string) => getCatalogPlant(id)!;
const OCT_15 = new Date(2026, 9, 15, 9);
const OCT_16 = new Date(2026, 9, 16, 9);
const plant = (catalogId: string, extra: Partial<GardenPlant> = {}) => resolvePlants([{ id: catalogId, catalogId, addedAt: OCT_15.toISOString(), ...extra }])[0];
const asked = (ids: string[], on: Date): ReminderSnooze[] => ids.reduce((snoozes, id) => markWinterAsked(snoozes, id, on), [] as ReminderSnooze[]);
const titles = (days: ReturnType<typeof planDay>) => days.map((day) => day.first?.title ?? null);

describe("le choix pour l'hiver (chantier « Plante hors saison », étape 3)", () => {
  it("concerne les frileuses en fin de saison, pas les rustiques ni les plantes de saison", () => {
    expect(asksWinter(plant("basil"), OCT_15)).toBe(true);
    expect(asksWinter(plant("lemon-tree"), new Date(2026, 10, 15))).toBe(true);
    expect(asksWinter(plant("thyme"), OCT_15)).toBe(false);
    expect(asksWinter(plant("basil"), new Date(2026, 6, 15))).toBe(false);
    expect(asksWinter(plant("basil", { toPlant: true }), OCT_15)).toBe(false);
  });

  it("les textes s'accordent, la question et ses réponses selon la plante", () => {
    expect(winterQuestion(entry("basil"))).toBe("Ton basilic n’aime pas le froid. Que veux-tu faire ?");
    expect(winterQuestion(entry("cherry-tomato"))).toBe("Tes tomates cerises n’aiment pas le froid. Que veux-tu faire ?");
    expect(winterWhy(entry("basil"))).toBe("Il souffre quand les nuits passent sous 10 °C.");
    expect(winterWhy(entry("shiso"))).toBe("Il souffre quand les nuits passent sous 5 °C (estimation Balco).");
    expect(winterDecideTitle(entry("basil"))).toBe("Décide pour ton basilic avant le froid");
    expect(winterOptions(entry("basil")).map((option) => [option.label, option.detail])).toEqual([
      ["Tout récolter", "Hache-le sous l’huile d’olive, en bac à glaçons, au congélateur."],
      ["Le rentrer à l’intérieur", "À l’intérieur, il tiendra souvent quelques semaines de plus (estimation Balco)."],
      ["Le laisser dehors", "Balco te prévient le soir du gel."],
    ]);
    expect(winterOptions(entry("chili"))[1]).toMatchObject({ label: "Le rentrer à l’intérieur", detail: "Il passe l’hiver près d’une fenêtre lumineuse." });
    // « Non » à l'étape 1 : pas de « rentrer » ; une vivace : pas de « tout récolter ».
    expect(winterOptions(entry("zucchini")).map((option) => option.label)).toEqual(["Tout récolter", "La laisser dehors"]);
    expect(winterOptions(entry("lemon-tree")).map((option) => option.label)).toEqual(["Le rentrer à l’intérieur", "Le laisser dehors"]);
    expect(winterDecideSubtitle(entry("basil"))).toBe("Tout récolter, le rentrer à l’intérieur ou le laisser dehors");
    expect(winterDecideSubtitle(entry("cosmos"))).toBe("Tout récolter ou les laisser dehors");
    expect(winterChoiceSummary(entry("basil"), winterPlanOf("indoors", OCT_15))).toBe("Pour l’hiver : le rentrer à l’intérieur");
    expect(winterChoiceToast(entry("cherry-tomato"), "indoors")).toBe("Noté : Balco te dira quand les rentrer");
    // Chaque ligne d'Aujourd'hui fait moins de 12 mots.
    for (const id of ["basil", "cherry-tomato", "lemon-tree", "cosmos"]) expect(winterDecideTitle(entry(id)).split(" ").length, id).toBeLessThan(12);
  });

  it("une nuit sous le seuil de la plante, dans les jours qui viennent", () => {
    expect(coldNightAhead(entry("basil"), [12, 11, 9])).toBe(true);
    expect(coldNightAhead(entry("basil"), [12, 11, 10])).toBe(false);
    expect(coldNightAhead(entry("basil"), [12, 12, 12, 12, 2])).toBe(false); // au-delà de 3 jours
    expect(coldNightAhead(entry("thyme"), [-5])).toBe(false);
  });

  it("Aujourd'hui : le premier jour, puis seulement quand une nuit froide est annoncée", () => {
    const basil = plant("basil");
    expect(titles(planDay({ plants: [basil], events: [], now: OCT_15, nights: [12, 12] }))).toEqual(["Décide pour ton basilic avant le froid"]);
    const states = harvestEndStates(asked(["basil"], OCT_15), OCT_16);
    // Le lendemain, nuits douces : la ligne attend ; « Ta saison … est finie ? » aussi (pas deux questions).
    const mild = planDay({ plants: [basil], events: [], now: OCT_16, harvestEnds: states, nights: [12, 13, 12] })[0];
    expect(mild.gestures.some((gesture) => gesture.source.type === "harvest-end")).toBe(false);
    expect(mild.status.label).toBe("Fin de saison");
    // Une nuit à 9 °C annoncée : elle revient.
    expect(titles(planDay({ plants: [basil], events: [], now: OCT_16, harvestEnds: states, nights: [12, 9] }))).toEqual(["Décide pour ton basilic avant le froid"]);
  });

  it("dès deux plantes : « Prépare 2 plantes pour le froid »", () => {
    const plan = planDay({ plants: [plant("basil"), plant("cherry-tomato"), plant("thyme")], events: [], now: OCT_15, nights: [12] });
    const lines = layoutTodayList(buildTodayList({ groups: [], plan }));
    const group = lines.find((line) => line.type === "group" && line.gesture === "winter");
    expect(group).toMatchObject({ title: "Prépare 2 plantes pour le froid" });
  });

  it("« Tout récolter » : « Ton basilic est-il tout récolté ? » avec l'astuce de conservation", () => {
    const basil = plant("basil", { winter: winterPlanOf("harvest", OCT_15) });
    const day = planDay({ plants: [basil], events: [], now: OCT_16, nights: [12] })[0];
    expect([day.first?.title, day.first?.instruction]).toEqual(["Ton basilic est-il tout récolté ?", "Hache-le sous l’huile d’olive, en bac à glaçons, au congélateur."]);
  });

  it("« Le laisser dehors » : rien jusqu'au soir de gel, puis « Ta saison … est finie ? » le lendemain", () => {
    const basil = plant("basil", { winter: winterPlanOf("outside", OCT_15) });
    expect(planDay({ plants: [basil], events: [], now: OCT_16, nights: [2] })[0].gestures.some((gesture) => gesture.source.type === "harvest-end")).toBe(false);
    const frost = harvestEndStates(markSeasonFrost([], "basil", OCT_16), new Date(2026, 9, 17, 9));
    expect(titles(planDay({ plants: [basil], events: [], now: new Date(2026, 9, 17, 9), harvestEnds: frost }))).toEqual(["Ta saison de basilic est finie ?"]);
    // Le soir de gel, l'alerte dit toujours de tout récolter.
    expect(careProfileFor(basil).seasonFrost?.title).toBe("Récolte tout ton basilic avant cette nuit");
  });

  it("« Le rentrer » : plus de question ni de « récolte tout » le soir de gel", () => {
    const basil = plant("basil", { winter: winterPlanOf("indoors", OCT_15) });
    expect(planDay({ plants: [basil], events: [], now: OCT_16, nights: [2] })[0].gestures.some((gesture) => gesture.source.type === "harvest-end")).toBe(false);
    expect(careProfileFor(basil).seasonFrost).toBeUndefined();
  });

  it("le choix se lit depuis la sauvegarde, un contenu illisible est ignoré", () => {
    expect(parseWinterPlan(JSON.stringify(winterPlanOf("outside", OCT_15)))).toEqual({ choice: "outside", decidedAt: OCT_15.toISOString() });
    expect(parseWinterPlan("{")).toBeUndefined();
    expect(isWinterPlan({ choice: "away", decidedAt: OCT_15.toISOString() })).toBe(false);
  });
});
