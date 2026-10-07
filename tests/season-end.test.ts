import { describe, expect, it } from "vitest";
import { planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants, startEventId, type GardenPlant } from "../lib/garden/garden-logic";
import {
  answerAllHarvested,
  clearHarvestEnd,
  endsWithSeason,
  freePotChoices,
  harvestEndStates,
  isSeasonRetry,
  markSeasonAsked,
  markSeasonFrost,
  seasonQuestionDate,
  seasonQuestionDue,
} from "../lib/garden/harvest-end";
import { addSpringWish } from "../lib/garden/spring";
import { PLANT_CATALOG } from "../lib/plants/catalog";
import { decideReminder, type MaintenanceEvent, type WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { groupReminders } from "../lib/reminders/reminder-groups";

const plant = (catalogId: string, extra: Partial<GardenPlant> = {}) => resolvePlants([{ id: "p", catalogId, addedAt: new Date(2026, 2, 1).toISOString(), ...extra }])[0];
const started = (at: Date): MaintenanceEvent => ({ id: startEventId("p"), plantId: "p", type: "observation", completedAt: at.toISOString(), source: "manual", note: "Sème" });
const states = (snoozes: ReturnType<typeof markSeasonAsked>, now: Date) => harvestEndStates(snoozes, now);

function frostNight(now: Date, min: number): WeatherSnapshot {
  return {
    fetchedAt: now.toISOString(),
    timezone: "Europe/Paris",
    city: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    current: { temperatureC: 10, apparentTemperatureC: 9, weatherCode: 0 },
    next12h: { precipitationMm: 0, precipitationProbabilityMax: 0, windGustKmhMax: 10 },
    today: { precipitationMm: 0, temperatureMinC: min, temperatureMaxC: 14, windGustKmhMax: 10 },
  } as WeatherSnapshot;
}

describe("quelles plantes ont une fin de saison", () => {
  it("les 53 annuelles qui produisent au fil des cueillettes, sauf les micro-pousses", () => {
    const seasonal = PLANT_CATALOG.filter(endsWithSeason).map((entry) => entry.id);
    expect(seasonal).toHaveLength(52);
    expect(seasonal).toContain("basil");
    expect(seasonal).toContain("cosmos");
    expect(seasonal).not.toContain("microgreens");
    expect(seasonal).not.toContain("radish"); // récolté en une fois : sa propre question
    expect(seasonal).not.toContain("mint"); // vivace
  });
});

describe("quand demander « Ta saison … est finie ? »", () => {
  it("sans gel, à la fin de ses mois de récolte : le basilic semé en avril, le 1ᵉʳ octobre", () => {
    const basil = plant("basil");
    const events = [started(new Date(2026, 3, 10))];
    expect(seasonQuestionDate(basil, events, undefined)).toEqual(new Date(2026, 9, 1));
    expect(seasonQuestionDue(basil, events, new Date(2026, 8, 30, 12), undefined)).toBe(false);
    const day = planDay({ plants: [basil], events, now: new Date(2026, 9, 1, 9) })[0];
    expect(day.gestures.map((gesture) => [gesture.title, gesture.instruction])).toEqual([["Ta saison de basilic est finie ?", "Si oui, Balco te propose quoi mettre dans le pot. Pas encore ? Balco te le redemandera dans deux semaines."]]);
  });

  it("« Pas encore » : une seule relance deux semaines plus tard, puis plus jamais", () => {
    const basil = plant("basil");
    const events = [started(new Date(2026, 3, 10))];
    const first = new Date(2026, 9, 1, 9);
    let snoozes = markSeasonAsked([], "p", first);
    expect(seasonQuestionDue(basil, events, new Date(2026, 9, 1, 20), states(snoozes, first).get("p"))).toBe(true);
    expect(seasonQuestionDue(basil, events, new Date(2026, 9, 2, 9), states(snoozes, first).get("p"))).toBe(false);
    expect(seasonQuestionDue(basil, events, new Date(2026, 9, 14, 9), states(snoozes, first).get("p"))).toBe(false);
    const retry = new Date(2026, 9, 15, 9);
    expect(seasonQuestionDue(basil, events, retry, states(snoozes, retry).get("p"))).toBe(true);
    expect(isSeasonRetry(states(snoozes, retry).get("p"), retry)).toBe(true);
    const day = planDay({ plants: [basil], events, now: retry, harvestEnds: states(snoozes, retry) })[0];
    expect(day.first?.instruction).toBe("Si oui, Balco te propose quoi mettre dans le pot. Sinon, Balco ne te le redemandera plus.");
    snoozes = markSeasonAsked(snoozes, "p", retry);
    expect(seasonQuestionDue(basil, events, new Date(2026, 9, 15, 20), states(snoozes, retry).get("p"))).toBe(true);
    expect(seasonQuestionDue(basil, events, new Date(2026, 10, 1, 9), states(snoozes, retry).get("p"))).toBe(false);
  });

  it("gel annoncé en septembre : la question arrive le lendemain, avant la fin des mois de récolte", () => {
    const basil = plant("basil");
    const events = [started(new Date(2026, 3, 10))];
    const frost = new Date(2026, 8, 20, 18);
    const state = states(markSeasonFrost([], "p", frost), frost).get("p");
    expect(state?.frostOn).toBe("2026-09-20");
    expect(seasonQuestionDate(basil, events, state)).toEqual(new Date(2026, 8, 21));
    expect(seasonQuestionDue(basil, events, new Date(2026, 8, 20, 22), state)).toBe(false);
    expect(seasonQuestionDue(basil, events, new Date(2026, 8, 21, 8), state)).toBe(true);
  });

  it("un gel noté avant la plantation de cette saison ne compte pas", () => {
    const basil = plant("basil");
    const frost = new Date(2026, 3, 2);
    const state = states(markSeasonFrost([], "p", frost), frost).get("p");
    expect(seasonQuestionDate(basil, [started(new Date(2026, 4, 10))], state)).toEqual(new Date(2026, 9, 1));
  });

  it("plantes à deux périodes et cultures d'hiver : la fin de la période en cours", () => {
    expect(seasonQuestionDate(plant("coriander"), [started(new Date(2026, 2, 15))], undefined)).toEqual(new Date(2026, 7, 1));
    expect(seasonQuestionDate(plant("coriander"), [started(new Date(2026, 7, 15))], undefined)).toEqual(new Date(2026, 10, 1));
    expect(seasonQuestionDate(plant("lambs-lettuce"), [started(new Date(2026, 8, 1))], undefined)).toEqual(new Date(2027, 3, 1));
  });

  it("ajoutée « déjà sur mon balcon » après la fin de sa saison (basilic en octobre) : la question vient tout de suite", () => {
    const addedAt = new Date(2026, 9, 8, 10);
    const basil = plant("basil", { addedAt: addedAt.toISOString() });
    expect(seasonQuestionDate(basil, [], undefined)).toEqual(addedAt);
    expect(seasonQuestionDue(basil, [], new Date(2026, 9, 8, 11), undefined)).toBe(true);
    // En pleine saison, elle attend la fin de ses mois de récolte ; semée dans l'app, la règle habituelle s'applique.
    expect(seasonQuestionDate(plant("basil", { addedAt: new Date(2026, 6, 8).toISOString() }), [], undefined)).toEqual(new Date(2026, 9, 1));
    expect(seasonQuestionDate(plant("coriander", { addedAt: new Date(2026, 7, 10).toISOString() }), [started(new Date(2026, 7, 15))], undefined)).toEqual(new Date(2026, 10, 1));
  });

  it("jamais pour une plante récoltée en une fois, une vivace, les micro-pousses ou une plante à planter", () => {
    expect(seasonQuestionDate(plant("radish"), [started(new Date(2026, 3, 1))], undefined)).toBeNull();
    expect(seasonQuestionDate(plant("mint"), [], undefined)).toBeNull();
    expect(seasonQuestionDate(plant("microgreens"), [], undefined)).toBeNull();
    expect(seasonQuestionDate(plant("basil", { toPlant: true }), [], undefined)).toBeNull();
  });
});

describe("le soir de gel : « Récolte tout ton basilic avant cette nuit »", () => {
  const october = new Date(2026, 9, 12, 17);

  it("une annuelle frileuse en automne : récolter, pas protéger", () => {
    const decision = decideReminder({ plant: careProfileFor(plant("basil")), history: [], weather: frostNight(october, 5), now: october });
    expect(decision).toMatchObject({ cause: "frost", action: "do", taskType: "harvest", title: "Récolte tout ton basilic avant cette nuit" });
    expect(decision?.body).toBe("Jusqu’à 5 °C cette nuit : il n’y résistera pas. Cueille tout ce qui peut l’être avant ce soir.");
    expect(decideReminder({ plant: careProfileFor(plant("cherry-tomato")), history: [], weather: frostNight(october, 3), now: october })?.title).toBe("Récolte toutes tes tomates cerises avant cette nuit");
    expect(decideReminder({ plant: careProfileFor(plant("dwarf-bean")), history: [], weather: frostNight(october, 3), now: october })?.title).toBe("Récolte tous tes haricots avant cette nuit");
    expect(decideReminder({ plant: careProfileFor(plant("cosmos")), history: [], weather: frostNight(october, 1), now: october })?.title).toBe("Cueille tes derniers cosmos avant cette nuit");
    expect(decideReminder({ plant: careProfileFor(plant("cosmos")), history: [], weather: frostNight(october, 1), now: october })?.body).toBe("Jusqu’à 1 °C cette nuit : ils n’y résisteront pas. Coupe les plus belles fleurs pour un bouquet avant ce soir.");
  });

  it("au printemps, une jeune plante frileuse se protège toujours ; une vivace aussi", () => {
    const may = new Date(2026, 4, 5, 17);
    expect(decideReminder({ plant: careProfileFor(plant("basil")), history: [], weather: frostNight(may, 5), now: may })).toMatchObject({ action: "protect", title: "Nuit fraîche : protège le basilic" });
    expect(careProfileFor(plant("rosemary")).seasonFrost).toBeUndefined();
    expect(careProfileFor(plant("parsley")).seasonFrost).toBeUndefined(); // annuelle qui ne craint pas le gel
  });

  it("plusieurs annuelles le même soir : une seule alerte « récolte tout avant ce soir »", () => {
    const decisions = ["basil", "cherry-tomato"].map((id, index) => decideReminder({ plant: { ...careProfileFor(plant(id)), plantId: `p${index}` }, history: [], weather: frostNight(october, 4), now: october })!);
    const [group] = groupReminders(decisions.map((decision, index) => ({ ...decision, plantLabel: index === 0 ? "le basilic" : "les tomates cerises" })));
    expect(group.title).toBe("Nuit fraîche : récolte tout avant ce soir");
    expect(group.body).toBe("Jusqu’à 4 °C cette nuit : leur saison se termine. Cueille tout ce qui peut l’être sur le basilic et les tomates cerises.");
  });
});

describe("après « Oui » : ton pot est libre", () => {
  it("la ligne dit pourquoi le pot est libre ; l'automne, le pot passe au repos", () => {
    const basil = plant("basil");
    const now = new Date(2026, 9, 2, 9);
    const day = planDay({ plants: [basil], events: [started(new Date(2026, 3, 10))], now, harvestEnds: harvestEndStates(answerAllHarvested([], "p", now), now) })[0];
    expect(day.gestures.map((gesture) => [gesture.title, gesture.instruction])).toEqual([["Ton pot est libre", "Saison de basilic finie · que veux-tu y mettre ?"]]);
    const choices = freePotChoices(basil, null, { month: 10 });
    expect(choices.some((choice) => choice.kind === "restart")).toBe(false);
    expect(choices.at(-1)?.label).toBe("Laisser le pot au repos jusqu’au printemps");
  });

  it("ressemer efface la question, sa relance et le soir de gel", () => {
    const now = new Date(2026, 9, 2);
    const snoozes = markSeasonFrost(markSeasonAsked(answerAllHarvested([], "p", now), "p", now), "p", now);
    expect(clearHarvestEnd(snoozes, "p")).toEqual([]);
  });
});

describe("me le reproposer au printemps", () => {
  it("la plante rejoint les envies du printemps, une seule fois", () => {
    expect(addSpringWish(undefined, "basil")).toEqual(["basil"]);
    expect(addSpringWish(["tomato"], "basil")).toEqual(["tomato", "basil"]);
    const wishes = ["basil"];
    expect(addSpringWish(wishes, "basil")).toBe(wishes);
  });
});

