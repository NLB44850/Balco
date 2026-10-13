import { describe, expect, it } from "vitest";

import { planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants, wateringIntervalOf } from "../lib/garden/garden-logic";
import { litersPerWatering } from "../lib/garden/progress";
import { buildTodayList, rainSavingsToLog, splitTodayList } from "../lib/garden/today";
import { getCatalogPlant } from "../lib/plants/catalog";
import { bottlesText, litersText, wateringIntervalHours, wateringLiters } from "../lib/plants/watering";
import { decideReminder, decideReminders, type MaintenanceEvent, type WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { groupReminders } from "../lib/reminders/reminder-groups";

const NOW = new Date(2026, 6, 15, 18);
const basil = getCatalogPlant("basil")!;
const plant = (potSize?: string, id = "b") => resolvePlants([{ id, catalogId: "basil", addedAt: new Date(2026, 5, 1).toISOString(), ...(potSize ? { potSize } : {}) }] as never)[0];
// Le plan du jour compte depuis minuit : « il y a N heures » est compté depuis le début de la journée.
const MIDNIGHT = new Date(2026, 6, 15);
// Nourri il y a 3 jours : l'engrais ne se mêle pas à la ligne d'arrosage.
const fed: MaintenanceEvent = { id: "f", plantId: "b", type: "fertilizing", completedAt: new Date(2026, 6, 12).toISOString(), source: "daily_task" };
const wateredHoursAgo = (hours: number, id = "b"): MaintenanceEvent => ({ id: `w-${id}`, plantId: id, type: "watering", completedAt: new Date(MIDNIGHT.getTime() - hours * 3_600_000).toISOString(), source: "daily_task" });

function weather(rainMm = 0): WeatherSnapshot {
  return {
    fetchedAt: NOW.toISOString(), timezone: "Europe/Paris", city: "Nantes", latitude: 47.2, longitude: -1.55,
    current: { temperatureC: 22, apparentTemperatureC: 22, weatherCode: 1 },
    next12h: { precipitationMm: rainMm, precipitationProbabilityMax: rainMm ? 90 : 5, windGustKmhMax: 10 },
    today: { precipitationMm: 0, temperatureMinC: 15, temperatureMaxC: 24, windGustKmhMax: 10 },
  };
}

describe("arrosage selon le pot et la météo (étape 6a)", () => {
  it("la taille du pot change le rythme : petit plus souvent, grand moins souvent", () => {
    expect(wateringIntervalHours(basil, "small")).toBe(25);
    expect(wateringIntervalHours(basil, "medium")).toBe(36);
    expect(wateringIntervalHours(basil, "large")).toBe(47);
    expect(wateringIntervalHours(basil, "planter")).toBe(31);
    expect(wateringIntervalHours(basil, "unknown")).toBe(36);
    expect(wateringIntervalOf(plant("small"))).toBe(25);
    // Arrosé 26 h avant minuit : dû en petit pot (25 h), pas en pot moyen (36 h).
    const due = (potSize: string) => planDay({ plants: [plant(potSize)], events: [wateredHoursAgo(26)], now: NOW })[0].gestures.some((gesture) => gesture.kind === "watering" && !gesture.done);
    expect(due("small")).toBe(true);
    expect(due("medium")).toBe(false);
  });

  it("la quantité : 20 % du pot, arrondie au demi-litre", () => {
    expect(wateringLiters(basil, "small")).toBe(1);
    expect(wateringLiters(basil, "medium")).toBe(2);
    expect(wateringLiters(basil, "large")).toBe(4.5);
    expect(wateringLiters(basil, "planter")).toBe(4);
    expect(litersText(4.5)).toBe("4,5 L");
    // Le repère dessiné : des grandes bouteilles de 1,5 L.
    expect([0.5, 1, 2, 3, 4, 4.5].map(bottlesText)).toEqual(["⅓ de grande bouteille", "⅔ de grande bouteille", "1 grande bouteille et ⅓", "2 grandes bouteilles", "2 grandes bouteilles et ⅔", "3 grandes bouteilles"]);
    expect(litersPerWatering(plant("large"))).toBe(4.5);
    const day = planDay({ plants: [plant("medium")], events: [wateredHoursAgo(40), fed], now: NOW })[0];
    const water = day.gestures.find((gesture) => gesture.kind === "watering")!;
    expect(water.instruction).toMatch(/Arrose environ 2 L, jusqu’à ce que ça coule\.$/u);
    const [row] = buildTodayList({ groups: [], plan: [day] });
    expect(row).toMatchObject({ subtitle: "Sèche sur 2 cm ? Arrose au pied", liters: 2, checkCm: 2 });
    const decision = decideReminder({ plant: careProfileFor(plant("medium")), history: [wateredHoursAgo(40)], weather: weather(), now: NOW });
    expect(decision?.body).toContain("Arrose environ 2 L, jusqu’à ce que ça coule.");
    expect(decision!.body.length).toBeLessThanOrEqual(120);
  });

  it("balcon couvert : pas de « N'arrose pas » ni d'eau économisée, l'arrosage continue", () => {
    const open = decideReminder({ plant: careProfileFor(plant("medium")), history: [wateredHoursAgo(40)], weather: weather(8), now: NOW });
    expect(open).toMatchObject({ cause: "rain", action: "skip" });
    const covered = decideReminder({ plant: careProfileFor(plant("medium"), { covered: true }), history: [wateredHoursAgo(40)], weather: weather(8), now: NOW });
    expect(covered).toMatchObject({ cause: "thirst", title: "Arrose le basilic" });
    expect(covered?.body).toMatch(/^Balcon couvert : la pluie n’arrive pas à tes pots\./u);
    expect(covered!.body.length).toBeLessThanOrEqual(120);
    // Rien à compter comme eau économisée : pas de bandeau pluie.
    const decisions = decideReminders([{ plant: careProfileFor(plant("medium"), { covered: true }), history: [wateredHoursAgo(40)], weather: weather(8), now: NOW }]);
    const items = buildTodayList({ groups: groupReminders(decisions), plan: planDay({ plants: [plant("medium")], events: [wateredHoursAgo(40), fed], now: NOW, decisions }) });
    expect(rainSavingsToLog(splitTodayList(items).banners, [], NOW)).toEqual([]);
    expect(items.some((item) => item.title === "Arrose le basilic")).toBe(true);
  });
});
