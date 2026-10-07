import { describe, expect, it } from "vitest";
import { planDay } from "../lib/garden/day-plan";
import { balconyStatus, buildTodayList, layoutTodayList } from "../lib/garden/today";
import { computeStats, inGroundSince, resolvePlants, startEventId, type GardenPlant } from "../lib/garden/garden-logic";
import {
  answerAllHarvested,
  archiveSeason,
  clearHarvestEnd,
  freePotChoices,
  harvestEndStates,
  harvestQuestionDate,
  harvestQuestionDue,
  harvestRunEnd,
  markHarvestAsked,
  potIsFree,
} from "../lib/garden/harvest-end";
import { weekSummary } from "../lib/garden/week";
import { PLANT_CATALOG } from "../lib/plants/catalog";
import { DEFAULT_HARVEST_DAYS, HARVEST_ONCE } from "../lib/plants/harvest-once";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const plant = (catalogId: string, extra: Partial<GardenPlant> = {}) => resolvePlants([{ id: "p", catalogId, addedAt: new Date(2026, 2, 1).toISOString(), ...extra }])[0];
const started = (at: Date, note = "Sème les radis"): MaintenanceEvent => ({ id: startEventId("p"), plantId: "p", type: "observation", completedAt: at.toISOString(), source: "manual", note });
const harvest = (at: Date, id = `p:harvest:${at.getTime()}`): MaintenanceEvent => ({ id, plantId: "p", type: "harvest", completedAt: at.toISOString(), source: "manual" });

describe("le catalogue : plantes récoltées en une fois", () => {
  it("marque les radis, carottes, betteraves, navets, ail, pommes de terre… avec leur durée de récolte", () => {
    const once = PLANT_CATALOG.filter((entry) => entry.harvestOnceDays !== undefined).map((entry) => entry.id).sort();
    expect(once).toEqual(["beetroot", "garlic", "head-lettuce", "kohlrabi", "oca", "pak-choi", "potato", "radish", "round-carrot", "spring-onion", "turnip"]);
    expect(PLANT_CATALOG.find((entry) => entry.id === "radish")?.harvestOnceDays).toBe(7);
    expect(PLANT_CATALOG.find((entry) => entry.id === "round-carrot")?.harvestOnceDays).toBe(21);
    expect(PLANT_CATALOG.find((entry) => entry.id === "basil")?.harvestOnceDays).toBeUndefined();
    for (const data of Object.values(HARVEST_ONCE)) expect(data.sources.length).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_HARVEST_DAYS).toBe(21);
  });

  it("chacune se ressème ou se replante à un moment de l'année", () => {
    for (const entry of PLANT_CATALOG.filter((candidate) => candidate.harvestOnceDays !== undefined)) expect(entry.sowMonths.length + entry.plantMonths.length).toBeGreaterThan(0);
  });
});

describe("quand demander « Tout récolté ? »", () => {
  it("la fin d'une période de récolte, même à cheval sur deux années", () => {
    expect(harvestRunEnd([4, 5, 6, 7, 8, 9, 10], new Date(2026, 4, 10))).toEqual(new Date(2026, 10, 1));
    expect(harvestRunEnd([11, 12, 1, 2, 3], new Date(2026, 10, 15))).toEqual(new Date(2027, 3, 1));
    expect(harvestRunEnd([6, 7], new Date(2026, 9, 15))).toEqual(new Date(2027, 7, 1));
  });

  it("récolte ignorée : rien ne change avant la fin de sa durée de récolte", () => {
    const radish = plant("radish");
    const events = [started(new Date(2026, 3, 1)), harvest(new Date(2026, 4, 10, 9))];
    expect(harvestQuestionDate(radish, events)).toEqual(new Date(2026, 4, 17, 9));
    expect(harvestQuestionDue(radish, events, new Date(2026, 4, 16, 12), undefined)).toBe(false);
    const day = planDay({ plants: [radish], events, now: new Date(2026, 4, 16, 12) })[0];
    expect(day.gestures.some((gesture) => gesture.source.type === "harvest-end")).toBe(false);
  });

  it("sans réponse, une semaine après la 1ʳᵉ récolte de radis, la question remplace sa ligne, une seule fois", () => {
    const radish = plant("radish");
    const events = [started(new Date(2026, 3, 1)), harvest(new Date(2026, 4, 10, 9))];
    const now = new Date(2026, 4, 17, 12);
    const day = planDay({ plants: [radish], events, now })[0];
    expect(day.gestures.map((gesture) => gesture.title)).toEqual(["Tes radis sont-ils tous récoltés ?"]);

    // Posée le 17 : encore là ce jour-là, plus jamais ensuite.
    const asked = harvestEndStates(markHarvestAsked([], "p", now), now);
    expect(harvestQuestionDue(radish, events, new Date(2026, 4, 17, 20), asked.get("p"))).toBe(true);
    expect(harvestQuestionDue(radish, events, new Date(2026, 4, 18, 9), asked.get("p"))).toBe(false);
    const nextDay = planDay({ plants: [radish], events, now: new Date(2026, 4, 18, 9), harvestEnds: asked })[0];
    expect(nextDay.gestures.some((gesture) => gesture.source.type === "harvest-end")).toBe(false);
  });

  it("la fin des mois de récolte arrive avant : la question aussi", () => {
    const radish = plant("radish");
    const events = [started(new Date(2026, 8, 1)), harvest(new Date(2026, 9, 28))];
    expect(harvestQuestionDate(radish, events)).toEqual(new Date(2026, 10, 1));
  });

  it("aucune récolte notée : à la fin des mois de récolte", () => {
    const radish = plant("radish");
    expect(harvestQuestionDate(radish, [started(new Date(2026, 8, 1))])).toEqual(new Date(2026, 10, 1));
  });

  it("jamais pour une plante récoltée au fil des cueillettes, ni pour une plante à planter", () => {
    expect(harvestQuestionDate(plant("basil"), [harvest(new Date(2026, 6, 1))])).toBeNull();
    expect(harvestQuestionDate(plant("radish", { toPlant: true }), [])).toBeNull();
  });

  it("une récolte d'une saison précédente ne compte pas", () => {
    const radish = plant("radish");
    const events = [harvest(new Date(2026, 4, 1)), started(new Date(2026, 6, 1)), harvest(new Date(2026, 7, 3, 9))];
    expect(harvestQuestionDate(radish, events)).toEqual(new Date(2026, 7, 10, 9));
  });
});

describe("« Oui » : ton pot est libre", () => {
  it("après « Oui », la plante n'a plus qu'une ligne : son pot libre (ni arrosage ni récolte)", () => {
    const radish = plant("radish");
    const now = new Date(2026, 4, 12, 9);
    const states = harvestEndStates(answerAllHarvested([], "p", now), now);
    expect(potIsFree(radish, states.get("p"))).toBe(true);
    const day = planDay({ plants: [radish], events: [started(new Date(2026, 3, 1)), harvest(new Date(2026, 4, 10))], now, harvestEnds: states })[0];
    expect(day.gestures.map((gesture) => [gesture.title, gesture.instruction])).toEqual([["Ton pot est libre", "Radis récoltés · que veux-tu y mettre ?"]]);
  });

  it("feuille fermée sans choisir : la ligne reste le jour du « Oui », puis se replie avec les gestes pas urgents", () => {
    const radish = plant("radish");
    const events = [started(new Date(2026, 3, 1)), harvest(new Date(2026, 4, 10))];
    const answeredOn = new Date(2026, 4, 12, 9);
    const states = harvestEndStates(answerAllHarvested([], "p", answeredOn), answeredOn);
    const sameDay = buildTodayList({ groups: [], plan: planDay({ plants: [radish], events, now: new Date(2026, 4, 12, 18), harvestEnds: states }) });
    expect(layoutTodayList(sameDay).map((line) => line.type)).toEqual(["item"]);
    expect(balconyStatus(sameDay, events, new Date(2026, 4, 12, 18)).remaining).toBe(1);

    const nextDay = buildTodayList({ groups: [], plan: planDay({ plants: [radish], events, now: new Date(2026, 4, 13, 9), harvestEnds: states }) });
    const lines = layoutTodayList(nextDay);
    expect(lines.map((line) => [line.type, line.type === "item" ? line.item.title : line.title])).toEqual([["more", "1 autre geste, pas urgent"]]);
    expect(lines[0].type === "more" && lines[0].items.map((item) => item.title)).toEqual(["Ton pot est libre"]);
    // Plus compté dans ce qui reste à faire : « Rien à faire aujourd'hui » peut s'afficher.
    expect(balconyStatus(nextDay, events, new Date(2026, 4, 13, 9)).remaining).toBe(0);
  });

  it("en mai : ressemer des radis, une plante de saison qui tient dans ce pot, laisser le pot vide", () => {
    const choices = freePotChoices(plant("radish"), null, { month: 5 });
    expect(choices.map((choice) => choice.kind)).toEqual(["restart", "plant", "empty"]);
    expect(choices[0].label).toBe("Ressemer des radis");
    expect(choices.at(-1)?.label).toBe("Laisser le pot vide");
    const other = choices.find((choice) => choice.kind === "plant");
    expect(other?.kind === "plant" && other.entry.potLiters).toBeLessThanOrEqual(3);
    expect(other?.label).toMatch(/^(Semer|Planter) (le |la |les |l’)/u);
  });

  it("les plantes à replanter disent « Replanter » : ail, pommes de terre", () => {
    expect(freePotChoices(plant("garlic"), null, { month: 10 })[0].label).toBe("Replanter de l’ail");
    expect(freePotChoices(plant("potato"), null, { month: 4 })[0].label).toBe("Replanter des pommes de terre");
    expect(freePotChoices(plant("round-carrot"), null, { month: 6 })[0].label).toBe("Ressemer des carottes");
  });

  it("hors saison de semis : pas de « Ressemer », jusqu'à deux plantes de saison", () => {
    const choices = freePotChoices(plant("round-carrot"), null, { month: 9 });
    expect(choices.some((choice) => choice.kind === "restart")).toBe(false);
    expect(choices.filter((choice) => choice.kind === "plant").length).toBeLessThanOrEqual(2);
    expect(choices.filter((choice) => choice.kind === "plant").length).toBeGreaterThan(0);
    for (const choice of choices) if (choice.kind === "plant") expect(choice.entry.potLiters).toBeLessThanOrEqual(10);
    expect(choices.length).toBeLessThanOrEqual(3);
  });

  it("l'hiver : laisser le pot au repos jusqu'au printemps", () => {
    for (const month of [10, 11, 12, 1, 2]) expect(freePotChoices(plant("radish"), null, { month }).at(-1)?.label).toBe("Laisser le pot au repos jusqu’au printemps");
    expect(freePotChoices(plant("radish"), null, { month: 3 }).at(-1)?.label).toBe("Laisser le pot vide");
    const january = freePotChoices(plant("radish"), null, { month: 1 });
    expect(january.some((choice) => choice.kind === "restart")).toBe(false);
  });

  it("jamais plus de trois choix", () => {
    for (const entry of PLANT_CATALOG.filter((candidate) => candidate.harvestOnceDays !== undefined)) {
      for (let month = 1; month <= 12; month += 1) expect(freePotChoices(plant(entry.id), null, { month }).length).toBeLessThanOrEqual(3);
    }
  });
});

describe("ressemer : une nouvelle saison pour la même plante", () => {
  it("les gestes « une fois par saison » sont rangés sous leur date, rien n'est perdu", () => {
    const events = [started(new Date(2026, 3, 1)), { ...harvest(new Date(2026, 4, 10)) }, { id: "p:thin", plantId: "p", type: "pruning" as const, completedAt: new Date(2026, 3, 20).toISOString(), source: "manual" as const }];
    const { remove, add } = archiveSeason(events, "p");
    expect(remove.sort()).toEqual(["p:start", "p:thin"]);
    expect(add.map((event) => event.id).sort()).toEqual(["p:start:2026-04-01", "p:thin:2026-04-20"]);
    const next = [...add, ...events.filter((event) => !remove.includes(event.id))];
    expect(next).toHaveLength(events.length);
    // La plante repasse à planter : plus « en terre » jusqu'à son nouveau premier geste.
    expect(inGroundSince({ ...plant("radish").plant, toPlant: true }, next)).toBeNull();
    expect(harvestQuestionDate(plant("radish"), [...next, started(new Date(2026, 5, 1))])).toEqual(new Date(2026, 10, 1));
  });

  it("la réponse et la question s'effacent pour la nouvelle saison", () => {
    const now = new Date(2026, 4, 17);
    const snoozes = answerAllHarvested(markHarvestAsked([{ key: "repot:x", kind: "skip", until: new Date(2027, 0, 1).toISOString() }], "p", now), "p", now);
    expect(harvestEndStates(snoozes, now).get("p")).toEqual({ answered: true, askedOn: "2026-05-17", answeredOn: "2026-05-17" });
    // Une réponse notée avant qu'on garde le jour reste lue (et sa ligne est déjà repliée).
    expect(harvestEndStates([{ key: "harvest-done:p", kind: "skip", until: new Date(2027, 0, 1).toISOString() }], now).get("p")).toEqual({ answered: true, answeredOn: undefined });
    expect(clearHarvestEnd(snoozes, "p").map((snooze) => snooze.key)).toEqual(["repot:x"]);
  });
});

describe("laisser le pot vide : les récoltes restent dans la progression", () => {
  it("Moi, badges et Ma semaine comptent encore les gestes d'une plante qui a quitté le balcon", () => {
    const gone = plant("radish", { removedAt: new Date(2026, 4, 12).toISOString() });
    const events = [started(new Date(2026, 4, 1)), harvest(new Date(2026, 4, 11))];
    const without = computeStats([], events, new Date(2026, 4, 12));
    const withPast = computeStats([], events, new Date(2026, 4, 12), [gone]);
    expect([without.harvests, without.gestures]).toEqual([0, 0]);
    expect([withPast.harvests, withPast.gestures, withPast.plants]).toEqual([1, 2, 0]);
    expect(weekSummary([], events, [], new Date(2026, 4, 12), [gone]).harvests).toBe(1);
  });
});

describe("la laitue pommée", () => {
  it("se récolte en une fois ; « Ta laitue est-elle toute récoltée ? », puis ressemer en mars, replanter en été (comme son premier geste)", () => {
    const lettuce = plant("head-lettuce");
    expect(lettuce.entry.harvestOnceDays).toBe(14);
    expect(freePotChoices(lettuce, null, { month: 3 })[0].label).toBe("Ressemer de la laitue");
    expect(freePotChoices(lettuce, null, { month: 6 })[0].label).toBe("Replanter de la laitue");
    expect(freePotChoices(lettuce, null, { month: 9 })[0].label).toBe("Replanter de la laitue");
    expect(freePotChoices(lettuce, null, { month: 11 }).some((choice) => choice.kind === "restart")).toBe(false);
  });
});
