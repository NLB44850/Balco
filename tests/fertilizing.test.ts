import { describe, expect, it } from "vitest";

import { buildDailySession, resolvePlants, spacedTaskDue } from "../lib/garden/garden-logic";
import { calendarActivities } from "../lib/plants/calendar";
import { getCatalogPlant, PLANT_CATALOG } from "../lib/plants/catalog";
import { FERTILIZING } from "../lib/plants/fertilizing";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";
import { describeGarden, summarizeHistory } from "../server/ai/context";

const NOW = new Date(2026, 6, 15, 10); // 15 juillet
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const tomato = (addedDaysAgo = 60) => resolvePlants([{ id: "tomato-1", catalogId: "cherry-tomato", addedAt: daysAgo(addedDaysAgo) }])[0];
const feedTask = () => getCatalogPlant("cherry-tomato")!.tasks.find((task) => task.type === "fertilizing")!;
// Arrosée hier : l'arrosage n'est pas dû, l'engrais peut passer.
const watered: MaintenanceEvent = { id: "w", plantId: "tomato-1", type: "watering", completedAt: daysAgo(1), source: "daily_task" };
const fed = (days: number): MaintenanceEvent => ({ id: `f${days}`, plantId: "tomato-1", type: "fertilizing", completedAt: daysAgo(days), source: "daily_task" });

describe("le geste « Engrais »", () => {
  it("existe pour les gourmandes, pas pour les plantes qui préfèrent une terre pauvre", () => {
    for (const id of Object.keys(FERTILIZING)) expect(getCatalogPlant(id), id).toBeDefined();
    expect(feedTask()).toMatchObject({ id: "feed", everyDays: 14, title: "Aujourd’hui, nourris les tomates cerises (engrais)." });
    for (const id of ["thyme", "rosemary", "lavender", "nasturtium", "radish", "dwarf-bean"]) {
      expect(getCatalogPlant(id)!.tasks.some((task) => task.type === "fertilizing"), id).toBe(false);
    }
    expect(PLANT_CATALOG.filter((entry) => entry.tasks.some((task) => task.type === "fertilizing")).length).toBe(Object.keys(FERTILIZING).length);
  });

  it("revient tous les 14 jours, en comptant depuis l'arrivée de la plante", () => {
    expect(spacedTaskDue(tomato(), feedTask(), [fed(13)], NOW)).toBe(false);
    expect(spacedTaskDue(tomato(), feedTask(), [fed(14)], NOW)).toBe(true);
    expect(spacedTaskDue(tomato(), feedTask(), [], NOW)).toBe(true);
    expect(spacedTaskDue(tomato(5), feedTask(), [], NOW)).toBe(false);
  });

  it("passe en tête de l'accueil quand il est dû, et reste coché le jour même", () => {
    expect(buildDailySession([tomato()], [watered, fed(20)], NOW)[0].task.id).toBe("feed");
    expect(buildDailySession([tomato()], [watered, fed(3)], NOW)[0].task.id).not.toBe("feed");
    const session = buildDailySession([tomato()], [watered], NOW);
    const doneToday: MaintenanceEvent = { id: session[0].eventId, plantId: "tomato-1", type: "fertilizing", completedAt: NOW.toISOString(), source: "daily_task" };
    expect(buildDailySession([tomato()], [watered, doneToday], NOW)[0]).toMatchObject({ done: true, task: { id: "feed" } });
  });

  it("apparaît dans Saisons avec son rythme, seulement aux bons mois", () => {
    const subject = [{ id: "tomato-1", entry: getCatalogPlant("cherry-tomato")!, displayName: "Tomates cerises" }];
    const july = calendarActivities(subject, 7).find((activity) => activity.eventType === "fertilizing")!;
    expect(july).toMatchObject({ typeLabel: "ENGRAIS", title: "Nourris les tomates cerises (engrais)" });
    expect(july.description).toContain("Tous les 14 jours");
    expect(calendarActivities(subject, 1).some((activity) => activity.eventType === "fertilizing")).toBe(false);
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
