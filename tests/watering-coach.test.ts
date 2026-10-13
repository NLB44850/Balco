import { describe, expect, it } from "vitest";

import { planDay } from "../lib/garden/day-plan";
import { resolvePlants } from "../lib/garden/garden-logic";
import { buildTodayList } from "../lib/garden/today";
import { getCatalogPlant } from "../lib/plants/catalog";
import { coachAdvice, coachSummary, extraterrestrialMm, referenceEvaporationMm } from "../lib/plants/watering-coach";

const NOW = new Date(2026, 6, 15, 18);
const basil = getCatalogPlant("basil")!;
const weather = (min: number, max: number, rain = 0, gust = 15) => ({ latitude: 48.85, today: { temperatureMinC: min, temperatureMaxC: max, precipitationMm: rain, windGustKmhMax: gust } });
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
const advice = (extra: Partial<Parameters<typeof coachAdvice>[0]> = {}) => coachAdvice({ entry: basil, potSize: "medium", lastWatering: daysAgo(1.5), weather: weather(15, 26), balcony: { orientation: "S" }, now: NOW, ...extra });

describe("coach d'arrosage Balco+ (étape 6b)", () => {
  it("estime l'évaporation du jour (Hargreaves) : plus forte l'été et par forte chaleur", () => {
    expect(extraterrestrialMm(48.85, NOW)).toBeGreaterThan(15);
    expect(referenceEvaporationMm(weather(15, 26), NOW)).toBeCloseTo(4.8, 0);
    expect(referenceEvaporationMm(weather(22, 35), NOW)).toBeGreaterThan(referenceEvaporationMm(weather(15, 26), NOW));
    expect(referenceEvaporationMm(weather(8, 16), new Date(2026, 9, 13))).toBeLessThan(2);
  });

  it("retrouve la version gratuite un jour d'été ordinaire, plein sud (basilic : 27 h, 36 h, 51 h)", () => {
    expect(advice({ potSize: "small" }).intervalHours).toBe(27);
    expect(advice().intervalHours).toBe(36);
    expect(advice({ potSize: "large" }).intervalHours).toBe(51);
  });

  it("s'adapte : chaleur plus tôt, balcon au nord plus tard, plante sobre plus tard", () => {
    expect(advice({ weather: weather(22, 35) }).intervalHours).toBeLessThan(36);
    expect(advice({ balcony: { orientation: "N" } }).intervalHours).toBeGreaterThan(60);
    expect(advice({ entry: getCatalogPlant("thyme")! }).intervalHours).toBeGreaterThan(80);
  });

  it("dit s'il faut arroser et combien, arrondi au demi-litre ; la pluie compte, sauf balcon couvert", () => {
    const due = advice();
    expect(due).toMatchObject({ due: true, liters: 1.5 });
    expect(coachSummary(due).title).toBe("Arrose environ 1,5 L ce soir");
    const fresh = advice({ lastWatering: daysAgo(0.5) });
    expect(fresh.due).toBe(false);
    expect(coachSummary(fresh)).toMatchObject({ title: "Pas besoin aujourd’hui", detail: "Ta terre a encore de l’eau · prochain arrosage demain" });
    // Arrosé il y a 3 jours, 30 mm de pluie : la pluie a rempli le pot, sauf sous un balcon couvert (qui voit aussi moins de soleil).
    expect(advice({ lastWatering: daysAgo(3), weather: weather(15, 26, 30) }).due).toBe(false);
    expect(advice({ lastWatering: daysAgo(3), weather: weather(15, 26, 30), balcony: { orientation: "S", covered: true } }).due).toBe(true);
  });

  it("Aujourd'hui suit le coach : pas d'arrosage quand la terre a encore de l'eau, sa quantité sinon", () => {
    const [plant] = resolvePlants([{ id: "b", catalogId: "basil", addedAt: daysAgo(30).toISOString(), potSize: "medium" }] as never);
    const watered = { id: "w", plantId: "b", type: "watering" as const, completedAt: daysAgo(2).toISOString(), source: "daily_task" as const };
    const fed = { id: "f", plantId: "b", type: "fertilizing" as const, completedAt: daysAgo(3).toISOString(), source: "daily_task" as const };
    const coachOf = (dueNow: boolean) => new Map([["b", { ...advice(), due: dueNow, liters: 1.5 }]]);
    const rows = (dueNow: boolean) => buildTodayList({ groups: [], plan: planDay({ plants: [plant], events: [watered, fed], now: NOW, coach: coachOf(dueNow) }) });
    expect(rows(false).some((item) => item.gesture === "watering")).toBe(false);
    expect(rows(true).find((item) => item.gesture === "watering")).toMatchObject({ liters: 1.5, coached: true });
  });
});
