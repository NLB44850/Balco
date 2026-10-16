import { describe, expect, it } from "vitest";
import { planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants, type GardenPlant } from "../lib/garden/garden-logic";
import { bringOutDue, bringOutSubtitle, bringOutTitle, broughtOutToast, springOutDate } from "../lib/garden/spring-out";
import { buildTodayList, layoutTodayList } from "../lib/garden/today";
import { currentWinterPlan } from "../lib/garden/winter-plan";
import { getCatalogPlant } from "../lib/plants/catalog";
import { climateZoneFor } from "../lib/plants/climate";
import { applyWeatherScenario } from "../lib/weather/simulation";
import type { WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { guideLinkText, guideSteps, guideTitle, supplies, whatsNext } from "../lib/plants/guide";

const entry = (id: string) => getCatalogPlant(id)!;
const MAY_20 = new Date(2027, 4, 20, 9);
const inside = { choice: "indoors" as const, decidedAt: new Date(2026, 9, 15).toISOString(), indoorsAt: new Date(2026, 9, 20).toISOString() };
const plant = (catalogId: string, extra: Partial<GardenPlant> = {}, now = MAY_20) => resolvePlants([{ id: catalogId, catalogId, addedAt: new Date(2026, 4, 1).toISOString(), ...extra }], now)[0];
const LYON = climateZoneFor(45.76, 4.84);
const MARSEILLE = climateZoneFor(43.3, 5.37);

describe("ressortir au printemps (chantier « Plante hors saison », étape 5)", () => {
  it("le feu vert : lendemain des Saints de glace ; Midi et montagne en estimation", () => {
    expect(springOutDate(2027, LYON)).toEqual({ date: new Date(2027, 4, 14), estimate: false });
    expect(springOutDate(2027, null).date).toEqual(new Date(2027, 4, 14));
    expect(springOutDate(2027, MARSEILLE)).toEqual({ date: new Date(2027, 3, 15), estimate: true });
    expect(springOutDate(2027, { zone: "mountain" })).toEqual({ date: new Date(2027, 5, 15), estimate: true });
    expect(bringOutSubtitle(LYON)).toBe("Feu vert des Saints de glace · pas-à-pas");
    expect(bringOutSubtitle(MARSEILLE)).toBe("Les nuits se radoucissent · pas-à-pas");
  });

  it("les textes, accordés", () => {
    expect(bringOutTitle(entry("basil"))).toBe("Ressors ton basilic");
    expect(bringOutTitle(entry("cherry-tomato"))).toBe("Ressors tes tomates cerises");
    expect(broughtOutToast(entry("lemon-tree"))).toBe("Ton citronnier : de retour dehors, Balco reprend ses rappels");
  });

  it("due après le feu vert, nuits douces ; pas avant, ni par nuit froide, ni l'automne de sa rentrée", () => {
    const basil = plant("basil", { winter: inside });
    expect(bringOutDue(basil, MAY_20, LYON, [14, 13, 15])).toBe(true);
    expect(bringOutDue(basil, new Date(2027, 4, 10), LYON, [14])).toBe(false);
    // Basilic : pas sous 10 °C la nuit.
    expect(bringOutDue(basil, MAY_20, LYON, [14, 8, 15])).toBe(false);
    // Midi : dès le 15 avril.
    expect(bringOutDue(basil, new Date(2027, 3, 20), MARSEILLE, [12])).toBe(true);
    // Rentrée en octobre 2026 : rien en novembre 2026.
    expect(bringOutDue(plant("basil", { winter: inside }, new Date(2026, 10, 2)), new Date(2026, 10, 2), LYON, [14])).toBe(false);
    // Pas rentrée : rien à ressortir.
    expect(bringOutDue(plant("basil"), MAY_20, LYON, [14])).toBe(false);
  });

  it("sur Aujourd'hui : une seule ligne « Ressors ton basilic », puis « Ressors 2 plantes » dès deux", () => {
    const day = planDay({ plants: [plant("basil", { winter: inside })], events: [], now: MAY_20, climate: LYON, nights: [14, 13] })[0];
    expect(day.gestures.map((gesture) => gesture.title)).toEqual(["Ressors ton basilic"]);
    expect(day.status.label).toBe("🏠 À l’intérieur");
    const plan = planDay({ plants: [plant("basil", { winter: inside }), plant("lemon-tree", { winter: inside })], events: [], now: MAY_20, climate: LYON, nights: [14, 13] });
    const group = layoutTodayList(buildTodayList({ groups: [], plan })).find((line) => line.type === "group" && line.gesture === "outdoors");
    expect(group).toMatchObject({ title: "Ressors 2 plantes" });
  });

  it("une fois ressortie (choix effacé) : son état et ses rappels normaux", () => {
    const basil = plant("basil");
    const day = planDay({ plants: [basil], events: [], now: MAY_20, climate: LYON, nights: [14, 13] })[0];
    expect(day.gestures.map((gesture) => gesture.title)).not.toContain("Ressors ton basilic");
    expect(careProfileFor(basil)).not.toHaveProperty("indoors");
    expect(careProfileFor(basil).frostSensitive).toBe(true);
  });

  it("un choix sans rentrée ne vaut que jusqu'au 1er mars ; une plante rentrée garde le sien", () => {
    const outside = { choice: "outside" as const, decidedAt: new Date(2026, 9, 15).toISOString() };
    expect(currentWinterPlan(outside, new Date(2027, 1, 28))).toEqual(outside);
    expect(currentWinterPlan(outside, new Date(2027, 2, 1))).toBeUndefined();
    expect(currentWinterPlan(inside, new Date(2027, 6, 1))).toEqual(inside);
    // Choisie pour rentrer mais jamais rentrée : au printemps, plus de « Rentre ton basilic » par nuit fraîche.
    const waiting = plant("basil", { winter: { choice: "indoors", decidedAt: new Date(2026, 9, 15).toISOString() } }, new Date(2027, 3, 10));
    expect(waiting.plant.winter).toBeUndefined();
    expect(planDay({ plants: [waiting], events: [], now: new Date(2027, 3, 10), nights: [4] })[0].gestures.map((gesture) => gesture.title)).not.toContain("Rentre ton basilic");
  });

  it("le pas-à-pas : 3 écrans, rien à acheter ; le dahlia en 2", () => {
    expect(guideTitle(entry("basil"), "spring")).toBe("Ressortir le basilic");
    expect(guideLinkText(entry("lemon-tree"), "spring")).toBe("Comment le ressortir, pas à pas ›");
    expect(supplies(entry("basil"), "spring")).toEqual([]);
    const steps = guideSteps(entry("basil"), "spring");
    expect(steps.map((step) => step.text)).toEqual(["Sors-le quelques heures, à l’ombre et à l’abri du vent.", "Laisse-le dehors un peu plus longtemps chaque jour.", "Installe-le à sa place au soleil, puis arrose bien."]);
    expect(guideSteps(entry("cherry-tomato"), "spring")[0].text).toBe("Sors-les quelques heures, à l’ombre et à l’abri du vent.");
    expect(guideSteps(entry("dahlia"), "spring")).toHaveLength(2);
    for (const step of [...steps, ...guideSteps(entry("dahlia"), "spring")]) expect(step.text.split(/\s+/u).length).toBeLessThan(12);
    expect(whatsNext(entry("chili"), "spring")).toContain("Un coup de froid annoncé ? Rentre-le quelques nuits.");
  });

  it("simulation « Nuits douces » : la vraie météo d'octobre (vent, nuits fraîches) ne cache plus la sortie", () => {
    const october: WeatherSnapshot = {
      fetchedAt: MAY_20.toISOString(), timezone: "Europe/Paris", city: "Lyon", latitude: 45.76, longitude: 4.84,
      current: { temperatureC: 9, apparentTemperatureC: 6, weatherCode: 3 },
      next12h: { precipitationMm: 2, precipitationProbabilityMax: 60, windGustKmhMax: 70 },
      today: { precipitationMm: 3, temperatureMinC: 5, temperatureMaxC: 12, windGustKmhMax: 70 },
      nights: [5, 6, 4, 5],
    };
    const mild = applyWeatherScenario(october, "mild", MAY_20);
    expect(mild.today).toMatchObject({ temperatureMinC: 14, windGustKmhMax: 15, precipitationMm: 0 });
    expect(mild.next12h.windGustKmhMax).toBe(15);
    expect(bringOutDue(plant("chili", { winter: inside }), MAY_20, LYON, mild.nights)).toBe(true);
    expect(bringOutDue(plant("chili", { winter: inside }), MAY_20, LYON, october.nights)).toBe(false);
  });
});
