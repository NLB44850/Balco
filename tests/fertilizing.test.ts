import { describe, expect, it } from "vitest";

import { eventForGesture, planDay } from "../lib/garden/day-plan";
import { feedingReminderContent, nextFeedingReminder, plantsToFeedOn } from "../lib/garden/feeding-reminder";
import { periodStart, resolvePlants, spacedTaskDue, type ResolvedPlant } from "../lib/garden/garden-logic";
import { buildTodayList, layoutTodayList } from "../lib/garden/today";
import { calendarActivities } from "../lib/plants/calendar";
import { getCatalogPlant, PLANT_CATALOG } from "../lib/plants/catalog";
import { feedingFor } from "../lib/plants/fertilizing";
import { potSheetFor } from "../lib/plants/pot-sheet";
import type { MaintenanceEvent, ReminderDecision } from "../lib/reminders/reminder-engine";
import { describeGarden, summarizeHistory } from "../server/ai/context";

const NOW = new Date(2026, 6, 15, 10); // 15 juillet
const daysAgo = (days: number, from = NOW) => new Date(from.getTime() - days * 86_400_000).toISOString();
const plantOf = (catalogId: string, addedDaysAgo = 60, id = `${catalogId}-1`, from = NOW) => resolvePlants([{ id, catalogId, addedAt: daysAgo(addedDaysAgo, from) }])[0];
const tomato = (addedDaysAgo = 60) => plantOf("cherry-tomato", addedDaysAgo, "tomato-1");
const feedTask = (catalogId = "cherry-tomato") => getCatalogPlant(catalogId)!.tasks.find((task) => task.type === "fertilizing")!;
const event = (plantId: string, type: MaintenanceEvent["type"], completedAt: string, id = `${plantId}-${type}-${completedAt}`): MaintenanceEvent => ({ id, plantId, type, completedAt, source: "daily_task" });
// Arrosée hier : l'arrosage n'est pas dû, l'engrais peut passer seul.
const watered = (plantId = "tomato-1"): MaintenanceEvent => event(plantId, "watering", daysAgo(1), `w-${plantId}`);
const fed = (days: number, plantId = "tomato-1"): MaintenanceEvent => event(plantId, "fertilizing", daysAgo(days), `f${days}-${plantId}`);

describe("le geste « Engrais » tiré des fiches Spécial pot", () => {
  it("suit le rythme et les mois de la fiche", () => {
    expect(feedTask()).toMatchObject({ id: "feed", everyDays: 14, months: [6, 7, 8, 9], title: "Nourris tes tomates cerises" });
    expect(feedTask().instruction).toContain("engrais liquide organique pour tomates");
    // Fiche : courgette tous les 7 jours de juin à août (l'ancienne règle disait 14 jours jusqu'en septembre).
    expect(feedTask("zucchini")).toMatchObject({ everyDays: 7, months: [6, 7, 8] });
    expect(feedTask("basil").title).toBe("Nourris ton basilic");
  });

  it("donne un rappel à chaque plante dont la fiche demande de l'engrais, et à elles seules", () => {
    for (const entry of PLANT_CATALOG) {
      const sheet = potSheetFor(entry.id)?.feeding;
      const task = entry.tasks.find((candidate) => candidate.type === "fertilizing");
      if (!sheet || sheet.need === "none") expect(task, entry.id).toBeUndefined();
      if (sheet?.need === "regular") expect(task?.everyDays, entry.id).toBe(sheet.everyDays);
      // Jamais en hiver.
      expect(task?.months?.some((month) => [11, 12, 1, 2].includes(month)) ?? false, entry.id).toBe(false);
    }
    for (const id of ["thyme", "rosemary", "lavender", "nasturtium", "radish"]) expect(feedTask(id)?.everyDays ?? null, id).toBeNull();
    expect(feedTask("thyme")).toBeUndefined();
  });

  it("« Un peu » : une seule fois dans la période ; rien quand l'apport se fait au semis ou à la plantation", () => {
    expect(feedTask("mint")).toMatchObject({ oncePerSeason: true, months: [3, 4] });
    expect(feedTask("mint").everyDays).toBeUndefined();
    // Tournesol nain : « un peu au semis » (mêlé au terreau), plus de rappel tous les 21 jours.
    expect(feedingFor("dwarf-sunflower")).toBeNull();
    expect(feedingFor("arugula")).toBeNull();
    expect(feedTask("dwarf-sunflower")).toBeUndefined();
  });

  it("revient selon son rythme, compté depuis l'arrivée ou la mise en terre", () => {
    expect(spacedTaskDue(tomato(), feedTask(), [fed(13)], NOW)).toBe(false);
    expect(spacedTaskDue(tomato(), feedTask(), [fed(14)], NOW)).toBe(true);
    expect(spacedTaskDue(tomato(), feedTask(), [], NOW)).toBe(true);
    expect(spacedTaskDue(tomato(5), feedTask(), [], NOW)).toBe(false);
    // Notée « à planter » il y a 2 mois, plantée il y a 10 jours : le terreau neuf la nourrit encore.
    const planted = event("tomato-1", "observation", daysAgo(10), "tomato-1:start");
    expect(spacedTaskDue(tomato(60), feedTask(), [planted], NOW)).toBe(false);
    expect(spacedTaskDue(tomato(60), feedTask(), [event("tomato-1", "observation", daysAgo(14), "tomato-1:start")], NOW)).toBe(true);
  });

  it("une fois par période : dû au début, pas deux fois, pas pour une plante arrivée depuis", () => {
    const april = new Date(2026, 3, 10, 10);
    const mint = (addedDaysAgo: number) => plantOf("mint", addedDaysAgo, "mint-1", april);
    expect(spacedTaskDue(mint(200), feedTask("mint"), [], april)).toBe(true);
    expect(spacedTaskDue(mint(200), feedTask("mint"), [event("mint-1", "fertilizing", new Date(2026, 2, 20).toISOString())], april)).toBe(false);
    // Nourrie l'an dernier : de nouveau due ce printemps.
    expect(spacedTaskDue(mint(400), feedTask("mint"), [event("mint-1", "fertilizing", new Date(2025, 2, 20).toISOString())], april)).toBe(true);
    // Arrivée le 1ᵉʳ avril dans du terreau neuf : rien cette saison.
    expect(spacedTaskDue(mint(9), feedTask("mint"), [], april)).toBe(false);
    // Figuier : deux périodes (mars-avril, puis juin-juillet).
    expect(periodStart([3, 4, 6, 7], new Date(2026, 6, 20))).toEqual(new Date(2026, 5, 1));
    expect(periodStart([3, 4, 6, 7], new Date(2026, 4, 20))).toBeNull();
    expect(periodStart([11, 12, 1], new Date(2026, 0, 5))).toEqual(new Date(2025, 10, 1));
  });

  it("s'ajoute aux gestes du jour quand il est dû, après la récolte, et reste coché le jour même", () => {
    const feed = (events: MaintenanceEvent[], extra: Partial<Parameters<typeof planDay>[0]> = {}) => planDay({ plants: [tomato()], events, now: NOW, ...extra })[0].gestures.find((gesture) => gesture.kind === "fertilizing");
    expect(feed([watered(), fed(20)])).toBeDefined();
    expect(feed([watered(), fed(3)])).toBeUndefined();
    const kinds = planDay({ plants: [tomato()], events: [watered(), fed(20)], now: NOW })[0].gestures.map((gesture) => gesture.kind);
    expect(kinds.indexOf("fertilizing")).toBeGreaterThan(kinds.indexOf("harvest"));
    const doneToday = eventForGesture(feed([watered()])!, NOW);
    expect(feed([watered(), doneToday])).toMatchObject({ done: true });
    // Pluie ou forte chaleur annoncées : l'engrais attend (lessivé ou brûlant), sauf s'il est déjà fait.
    const rain = { plantId: "tomato-1", taskType: "observation", action: "skip", cause: "rain", title: "N’arrose pas" } as ReminderDecision;
    const heat = { plantId: "tomato-1", taskType: "watering", action: "do", cause: "heat", title: "Arrose ce soir" } as ReminderDecision;
    expect(feed([watered()], { allDecisions: [rain] })).toBeUndefined();
    expect(feed([watered()], { allDecisions: [heat] })).toBeUndefined();
    expect(feed([watered(), doneToday], { allDecisions: [rain] })).toMatchObject({ done: true });
  });

  it("apparaît dans Saisons avec son rythme, seulement aux bons mois", () => {
    const subject = [{ id: "tomato-1", entry: getCatalogPlant("cherry-tomato")!, displayName: "Tomates cerises" }];
    const july = calendarActivities(subject, 7).find((activity) => activity.eventType === "fertilizing")!;
    expect(july).toMatchObject({ typeLabel: "ENGRAIS", title: "Nourris tes tomates cerises" });
    expect(july.description).toContain("Tous les 14 jours, juin");
    expect(calendarActivities(subject, 1).some((activity) => activity.eventType === "fertilizing")).toBe(false);
    const mint = calendarActivities([{ id: "mint-1", entry: getCatalogPlant("mint")!, displayName: "Menthe" }], 3).find((activity) => activity.eventType === "fertilizing")!;
    expect(mint.description).toMatch(/^Une fois, mars/u);
  });

  it("est connu de Nora : dernier engrais et rythme conseillé", () => {
    const rows = [{ plantId: "tomato-1", catalogId: "cherry-tomato", nickname: null, displayName: "Tomates cerises", varietyId: null, active: 1, addedAt: new Date(daysAgo(60)), removedAt: null }];
    const events = [{ plantId: "tomato-1", type: "fertilizing", completedAt: new Date(daysAgo(21)), note: null }];
    const summary = summarizeHistory(rows, events, NOW);
    expect(summary.history[0].feedEveryDays).toBe(14);
    const text = describeGarden({ firstName: null, city: null, sunlight: null, space: null, goals: [], plants: [], ...summary, memory: { level: null, preferences: [], notes: [] } }, NOW);
    expect(text).toContain("engrais 1 fois, dernière fois il y a 21 j");
    expect(text).toContain("engrais conseillé tous les 14 j en ce moment");
  });
});

describe("l'engrais sur Aujourd'hui : une ligne par plante au plus", () => {
  const today = (plants: ResolvedPlant[], events: MaintenanceEvent[]) => buildTodayList({ groups: [], plan: planDay({ plants, events, now: NOW }) });

  it("même jour que l'arrosage : une seule ligne « Arrose et nourris tes tomates cerises », qui note les deux", () => {
    const items = today([tomato()], [fed(20)]);
    const tomatoRows = items.filter((item) => item.plantName === "Tomates cerises" && !item.done && item.gesture !== "harvest");
    expect(tomatoRows).toHaveLength(1);
    expect(tomatoRows[0]).toMatchObject({ gesture: "watering", title: "Arrose et nourris tes tomates cerises" });
    expect(tomatoRows[0].feed?.task.type).toBe("fertilizing");
    // Les deux notés : la ligne reste une seule, cochée.
    const water = tomatoRows[0].kind === "task" ? tomatoRows[0].task : null;
    const done = [fed(20), { ...event("tomato-1", "watering", NOW.toISOString(), water!.eventId) }, event("tomato-1", "fertilizing", NOW.toISOString(), tomatoRows[0].feed!.eventId)];
    const after = today([tomato()], done).filter((item) => item.plantName === "Tomates cerises" && item.gesture !== "harvest");
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ done: true, title: "Arrose et nourris tes tomates cerises" });
  });

  it("arrosée hier : l'engrais seul, avec l'engrais à donner", () => {
    const row = today([tomato()], [watered(), fed(20)]).find((item) => item.gesture === "fertilizing");
    expect(row).toMatchObject({ title: "Nourris tes tomates cerises", subtitle: "Engrais liquide organique pour tomates" });
  });

  it("dès deux plantes à nourrir : « Nourris 2 plantes »", () => {
    const pepper = plantOf("sweet-pepper", 60, "pepper-1");
    const lines = layoutTodayList(today([tomato(), pepper], [watered(), watered("pepper-1"), fed(20), fed(20, "pepper-1")]));
    const group = lines.find((line) => line.type === "group" && line.gesture === "feeding");
    expect(group).toMatchObject({ title: "Nourris 2 plantes" });
    expect(group?.type === "group" && group.subtitle).toMatch(/^Sur une terre humide · /u);
  });

  it("arrosages regroupés : le groupe dit combien sont aussi à nourrir", () => {
    const pepper = plantOf("sweet-pepper", 60, "pepper-1");
    const lines = layoutTodayList(today([tomato(), pepper], [fed(20), fed(3, "pepper-1")]));
    const group = lines.find((line) => line.type === "group" && line.gesture === "watering");
    expect(group?.type === "group" && group.subtitle).toContain("engrais pour 1");
    expect(lines.some((line) => line.type === "group" && line.gesture === "feeding")).toBe(false);
  });
});

describe("la notification d'engrais", () => {
  const settings = { preferredHour: 18, preferredMinute: 30, quietStartHour: 21, quietEndHour: 9, enabledPlantIds: [] as string[], vacation: null };
  // Nourries il y a 10 jours : prochain engrais dans 4 jours.
  const events = [fed(10)];

  it("le jour où l'engrais est dû, à l'heure des rappels", () => {
    const next = nextFeedingReminder([tomato()], events, settings, NOW);
    expect(next?.date).toEqual(new Date(2026, 6, 19, 18, 30));
    expect(next).toMatchObject({ plantIds: ["tomato-1"], title: "Nourris tes tomates cerises 🌿", body: "Engrais liquide organique pour tomates, sur une terre humide." });
    expect(feedingReminderContent([tomato(), plantOf("basil")]).title).toBe("Nourris 2 plantes 🌿");
  });

  it("dû aujourd'hui après l'heure des rappels : rien aujourd'hui (la ligne est sur Aujourd'hui)", () => {
    const evening = new Date(2026, 6, 15, 20);
    expect(plantsToFeedOn([tomato()], [], evening)).toHaveLength(1);
    // Pas nourrie depuis 60 jours : due aujourd'hui, mais 18 h 30 est passé ; demain, toujours due.
    expect(nextFeedingReminder([tomato()], [], settings, evening)?.date).toEqual(new Date(2026, 6, 16, 18, 30));
  });

  it("pas pendant les vacances, pas pour une plante non suivie, pas en hiver", () => {
    expect(nextFeedingReminder([tomato()], events, { ...settings, vacation: { start: "2026-07-18", end: "2026-07-25" } as never }, NOW)?.date).toEqual(new Date(2026, 6, 26, 18, 30));
    expect(nextFeedingReminder([tomato()], events, { ...settings, enabledPlantIds: ["basil-1"] }, NOW)).toBeNull();
    const december = new Date(2026, 11, 1, 10);
    expect(nextFeedingReminder([plantOf("cherry-tomato", 200, "tomato-1", december)], [], settings, december)).toBeNull();
  });

  it("une heure de rappel dans la plage calme : pas de notification ce jour-là", () => {
    expect(nextFeedingReminder([tomato()], events, { ...settings, preferredHour: 22 }, NOW)).toBeNull();
  });
});
