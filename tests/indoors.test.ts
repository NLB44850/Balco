import { describe, expect, it } from "vitest";
import { planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants, wateringIntervalOf, type GardenPlant } from "../lib/garden/garden-logic";
import { backOutside, bringInSubtitle, bringInTitle, broughtIn, indoorCareText, indoorWatering, indoorWeeksNote, isIndoors, waitsToComeIn } from "../lib/garden/indoors";
import { buildTodayList, layoutTodayList } from "../lib/garden/today";
import { getCatalogPlant } from "../lib/plants/catalog";
import { guideLinkText, guideSteps, guideTitle, nextGestures, supplies, whatsNext } from "../lib/plants/guide";
import { wateringIntervalHours } from "../lib/plants/watering";
import { decideReminder, type MaintenanceEvent, type WeatherSnapshot } from "../lib/reminders/reminder-engine";

const entry = (id: string) => getCatalogPlant(id)!;
const NOV_2 = new Date(2026, 10, 2, 9);
const chosen = { choice: "indoors" as const, decidedAt: new Date(2026, 9, 15).toISOString() };
const inside = { ...chosen, indoorsAt: new Date(2026, 9, 20).toISOString() };
const plant = (catalogId: string, extra: Partial<GardenPlant> = {}) => resolvePlants([{ id: catalogId, catalogId, addedAt: new Date(2026, 4, 1).toISOString(), ...extra }])[0];
const watered = (id: string, daysAgo: number): MaintenanceEvent => ({ id: `w-${id}-${daysAgo}`, plantId: id, type: "watering", completedAt: new Date(NOV_2.getTime() - daysAgo * 86_400_000).toISOString(), source: "manual" });

function weather(min: number, extra: Partial<WeatherSnapshot["today"]> = {}, rainMm = 0): WeatherSnapshot {
  return {
    fetchedAt: NOV_2.toISOString(), timezone: "Europe/Paris", city: "Lyon", latitude: 45.76, longitude: 4.84,
    current: { temperatureC: 8, apparentTemperatureC: 6, weatherCode: 0 },
    next12h: { precipitationMm: rainMm, precipitationProbabilityMax: rainMm ? 90 : 5, windGustKmhMax: 80 },
    today: { precipitationMm: rainMm, temperatureMinC: min, temperatureMaxC: 12, windGustKmhMax: 80, ...extra },
  };
}

describe("rentrer une plante à l'intérieur (chantier « Plante hors saison », étape 4)", () => {
  it("les états et les textes", () => {
    expect(waitsToComeIn({ winter: chosen })).toBe(true);
    expect(isIndoors({ winter: broughtIn(chosen, NOV_2) })).toBe(true);
    expect(backOutside(inside)).toEqual(chosen);
    expect(bringInTitle(entry("basil"))).toBe("Rentre ton basilic");
    expect(bringInTitle(entry("cherry-tomato"))).toBe("Rentre tes tomates cerises");
    expect(bringInSubtitle(entry("chili"))).toBe("Nuit sous 13 °C annoncée · pas-à-pas");
    expect(indoorWeeksNote(entry("basil"))).toBe("À l’intérieur, il tiendra souvent quelques semaines de plus.");
    expect(indoorWeeksNote(entry("chili"))).toBeNull();
  });

  it("« Rentre ton basilic » seulement quand une nuit froide est annoncée ; pas d'aller-retour", () => {
    const basil = plant("basil", { winter: chosen });
    const titles = (nights: number[]) => planDay({ plants: [basil], events: [watered("basil", 1)], now: NOV_2, nights })[0].gestures.map((gesture) => gesture.title);
    expect(titles([12, 13, 12])).not.toContain("Rentre ton basilic");
    expect(titles([12, 9, 12])).toEqual(["Rentre ton basilic"]);
    // Rentrée : plus de « Rentre », même si le froid continue.
    const indoorBasil = plant("basil", { winter: inside });
    expect(planDay({ plants: [indoorBasil], events: [watered("basil", 1)], now: NOV_2, nights: [2, 2] })[0].gestures.map((gesture) => gesture.title)).not.toContain("Rentre ton basilic");
  });

  it("dès deux plantes : « Rentre 2 plantes »", () => {
    const plan = planDay({ plants: [plant("basil", { winter: chosen }), plant("chili", { winter: chosen })], events: [], now: NOV_2, nights: [6] });
    const group = layoutTodayList(buildTodayList({ groups: [], plan })).find((line) => line.type === "group" && line.gesture === "indoors");
    expect(group).toMatchObject({ title: "Rentre 2 plantes" });
  });

  it("à l'intérieur : « 🏠 À l'intérieur », ni gel, ni vent, ni pluie ; l'arrosage continue, plus espacé, sans engrais", () => {
    const chili = plant("chili", { winter: inside });
    const day = planDay({ plants: [chili], events: [watered("chili", 5)], now: NOV_2, nights: [-4] })[0];
    expect(day.status).toEqual({ tone: "rest", label: "🏠 À l’intérieur" });
    expect(day.gestures.map((gesture) => gesture.kind)).toEqual(["watering"]);
    const profile = careProfileFor(chili);
    expect(profile.indoors).toBe(true);
    // Gel, vent à 80 km/h et pluie : seule la soif compte.
    expect(decideReminder({ plant: profile, history: [watered("chili", 5)], weather: weather(-4, {}, 9), now: NOV_2 })?.cause).toBe("thirst");
    expect(decideReminder({ plant: profile, history: [watered("chili", 1)], weather: weather(-4, {}, 9), now: NOV_2 })).toBeNull();
    // Deux fois moins souvent que dehors, au frais tous les 14 jours, le dahlia au sec.
    expect(wateringIntervalOf(chili)).toBe(2 * wateringIntervalHours(entry("chili"), undefined));
    expect(indoorWatering(entry("lemon-tree"), 48)).toEqual({ kind: "every", hours: 14 * 24, estimate: false });
    expect(indoorWatering(entry("physalis"), 48)).toMatchObject({ kind: "every", hours: 14 * 24, estimate: true });
    expect(indoorWatering(entry("dahlia"), 48)).toEqual({ kind: "dry" });
    expect(indoorCareText(entry("dahlia"), 48)).toBe("Garde-les au sec, sans arroser, jusqu’au printemps.");
    expect(indoorCareText(entry("lemon-tree"), 48)).toBe("Arrose environ tous les 14 jours, si la terre est sèche sur 2 cm. Pas d’engrais jusqu’au printemps.");
    const dahlia = planDay({ plants: [plant("dahlia", { winter: inside })], events: [watered("dahlia", 60)], now: NOV_2 })[0];
    expect(dahlia.gestures.filter((gesture) => gesture.kind === "watering")).toHaveLength(0);
  });

  it("choisie pour rentrer, pas encore rentrée : pas d'alerte « protège-le », la ligne « Rentre » à la place", () => {
    const basil = plant("basil", { winter: chosen });
    expect(careProfileFor(basil).frostSensitive).toBe(false);
    expect(decideReminder({ plant: careProfileFor(basil), history: [watered("basil", 1)], weather: { ...weather(6), next12h: { precipitationMm: 0, precipitationProbabilityMax: 0, windGustKmhMax: 10 }, today: { precipitationMm: 0, temperatureMinC: 6, temperatureMaxC: 12, windGustKmhMax: 10 } }, now: NOV_2 })?.cause).not.toBe("frost");
  });

  it("le pas-à-pas « Rentrer » : 4 écrans au plus, une action par écran, moins de 12 mots", () => {
    expect(guideTitle(entry("basil"), "indoors")).toBe("Rentrer le basilic");
    expect(guideLinkText(entry("cherry-tomato"), "indoors")).toBe("Comment les rentrer, pas à pas ›");
    expect(supplies(entry("basil"), "indoors")).toEqual([]);
    expect(guideSteps(entry("basil"), "indoors").map((step) => step.text)).toEqual(["Vérifie les pucerons sous les feuilles.", "Vide la soucoupe.", "Choisis la fenêtre la plus lumineuse.", "Éloigne-le du radiateur."]);
    expect(guideSteps(entry("lemon-tree"), "indoors")[2].text).toBe("Choisis une pièce fraîche et lumineuse, hors gel.");
    expect(guideSteps(entry("dahlia"), "indoors").map((step) => step.text)).toEqual(["Coupe les tiges à 15 cm du sol.", "Vide la soucoupe.", "Range le pot au sec, hors gel."]);
    for (const id of ["basil", "cherry-tomato", "lemon-tree", "dahlia", "physalis"]) {
      const steps = guideSteps(entry(id), "indoors");
      expect(steps.length, id).toBeLessThanOrEqual(4);
      for (const step of steps) expect(step.text.split(" ").length, step.text).toBeLessThan(12);
    }
    expect(whatsNext(entry("basil"), "indoors")[1]).toBe("À l’intérieur, il tiendra souvent quelques semaines de plus.");
    expect(nextGestures(entry("basil"), "indoors")).toEqual(["Au printemps, Balco te dira quand le ressortir."]);
  });
});
