import { describe, expect, it } from "vitest";

import type { PlantDay } from "@/lib/garden/day-plan";
import { openingCard, openingDate, openingGreeting, openingPlants, openingPlantsLabel, openingWeather } from "@/lib/garden/opening";
import type { TodayAlert, TodayItem } from "@/lib/garden/today";
import type { WeatherSnapshot } from "@/lib/reminders/reminder-engine";

const at = (hour: number) => new Date(2026, 9, 17, hour, 30);
const item = (title: string, done = false) => ({ title, done }) as TodayItem;
const banner = (title: string, cause: string, action = "do", plantIds: string[] = []) =>
  ({ title, group: { cause, action, decisions: plantIds.map((plantId) => ({ plantId, title: `Gel cette nuit : protège le ${plantId}` })) } }) as unknown as TodayAlert;
const snapshot = (code: number, temp: number, min: number) =>
  ({ current: { temperatureC: temp, apparentTemperatureC: temp, weatherCode: code }, today: { temperatureMinC: min, temperatureMaxC: temp + 4, precipitationMm: 0, windGustKmhMax: 0 }, next12h: { precipitationMm: 0, precipitationProbabilityMax: 0, windGustKmhMax: 0 } }) as WeatherSnapshot;
const day = (id: string, kinds: [string, boolean][]) => ({ resolved: { plant: { id } }, gestures: kinds.map(([kind, done]) => ({ kind, done })) }) as unknown as PlantDay;
const base = { plantCount: 3, banners: [], rest: [], minutes: 0, remaining: 0, doneToday: 0, streak: 0, now: at(9) };

describe("accueil à l'ouverture", () => {
  it("dit bonjour le jour, bonsoir le soir, le prénom à part", () => {
    expect(openingGreeting(" Léa ", at(9))).toEqual({ hello: "Bonjour", name: "Léa" });
    expect(openingGreeting("Léa", at(19))).toEqual({ hello: "Bonsoir", name: "Léa" });
    expect(openingGreeting("", at(2))).toEqual({ hello: "Bonsoir", name: undefined });
    expect(openingDate(at(9))).toBe("Samedi 17 octobre");
  });

  it("met la météo du moment en pastille", () => {
    expect(openingWeather(snapshot(0, 14.4, 8), at(10))).toBe("☀️ 14° · Grand soleil");
    expect(openingWeather(snapshot(0, 9, 5), at(22))).toBe("🌙 9° · Nuit claire");
    expect(openingWeather(snapshot(0, 3, -2), at(10))).toBe("❄️ -2° cette nuit");
    expect(openingWeather(snapshot(61, 12, 8), at(10))).toBe("🌧️ 12° · Pluie");
  });

  it("montre d'abord les plantes qui ont besoin de toi, avec leur signe", () => {
    const plan = [day("thyme", [["watering", true]]), day("basil", [["watering", false]]), day("tomato", [["harvest", false]]), day("mint", [])];
    const plants = openingPlants(plan, [banner("Gel cette nuit : protège le basilic", "frost", "do", ["basil"])]);
    expect(plants.shown.map((plant) => [plant.id, plant.mark])).toEqual([["basil", "frost"], ["tomato", "harvest"], ["thyme", "ok"], ["mint", "ok"]]);
    expect(openingPlantsLabel(plants)).toBe("1 plante craint le froid");
    expect(openingPlantsLabel({ total: 5, needing: 2, frost: 0 })).toBe("5 plantes · 2 ont besoin de toi");
    expect(openingPlantsLabel({ total: 1, needing: 1, frost: 0 })).toBe("1 plante · 1 a besoin de toi");
    expect(openingPlantsLabel({ total: 3, needing: 0, frost: 0 })).toBe("3 plantes · tout va bien");
  });

  it("une alerte météo passe avant tout, en carte à part", () => {
    const card = openingCard({ ...base, banners: [banner("Gel cette nuit : protège 2 plantes", "frost", "do", ["basilic", "thym"])], rest: [item("Arrose le basilic")] });
    expect(card).toMatchObject({ tone: "alert", title: "Gel cette nuit", sub: "Protège 2 plantes avant ce soir.", action: "Je m’en occupe" });
    expect(card.tasks).toEqual([{ title: "Protège le basilic", done: false }, { title: "Protège le thym", done: false }]);
  });

  it("compte les gestes et leur durée, et encourage la série", () => {
    const card = openingCard({ ...base, rest: [item("Arrose le basilic"), item("Pince la menthe"), item("Récolte le thym"), item("Nourris la tomate"), item("Arrose le thym", true)], minutes: 5, remaining: 4, streak: 6 });
    expect(card).toMatchObject({ tone: "todo", title: "Aujourd’hui sur ton balcon", sub: "4 gestes · environ 5 minutes", cheer: "🔥 6 jours de suite : continue !", action: "C’est parti" });
    expect(card.tasks).toHaveLength(3);
    expect(openingCard({ ...base, rest: [item("Arrose le basilic"), item("Arrose le thym")], minutes: 40, remaining: 2 }).sub).toBe("2 gestes");
    expect(openingCard({ ...base, rest: [item("Arrose le basilic")], minutes: 1, remaining: 1, banners: [banner("N’arrose pas : la pluie s’en charge", "rain", "skip")] })).toMatchObject({ sub: "1 geste · environ 1 minute", cheer: "🌧️ La pluie arrose pour toi aujourd’hui." });
  });

  it("dit bravo quand tout est fait, et prêt pour la nuit le soir", () => {
    const rest = [item("Arrose le basilic", true), item("Pince la menthe", true)];
    expect(openingCard({ ...base, rest, doneToday: 2 })).toMatchObject({ tone: "done", title: "Ton balcon est à jour", sub: "2 gestes faits aujourd’hui, bravo.", cheer: "🌱 Tes plantes te disent merci.", action: "Voir mon balcon" });
    expect(openingCard({ ...base, rest, doneToday: 1, now: at(20) })).toMatchObject({ title: "Ton balcon est prêt pour la nuit", sub: "1 geste fait aujourd’hui, bravo." });
    expect(openingCard(base)).toMatchObject({ tone: "rest", title: "Rien à faire aujourd’hui" });
  });

  it("vacances et balcon vide", () => {
    expect(openingCard({ ...base, away: true, rest: [item("Arrose le basilic")] })).toMatchObject({ tone: "away", title: "Bonnes vacances", tasks: [] });
    expect(openingCard({ ...base, plantCount: 0 })).toMatchObject({ tone: "empty", title: "Ton balcon t’attend" });
  });
});
