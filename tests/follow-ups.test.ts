import { describe, expect, it } from "vitest";

import { planDay } from "../lib/garden/day-plan";
import { followUpsFor } from "../lib/garden/follow-ups";
import { resolvePlants, startEventId } from "../lib/garden/garden-logic";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const DAY = 86_400_000;
const started = (plantId: string, at: Date, note: string): MaintenanceEvent => ({ id: startEventId(plantId), plantId, type: "observation", completedAt: at.toISOString(), source: "manual", note });
const plants = (catalogId: string) => resolvePlants([{ id: "p", catalogId, addedAt: new Date(2026, 2, 1).toISOString(), toPlant: false }]);

describe("gestes de suite (P4)", () => {
  it("éclaircir une semaine après la levée la plus lente, une seule fois", () => {
    // Mâche : levée en 7 à 15 jours → « Éclaircis » à partir du 22ᵉ jour.
    const sowing = new Date(2026, 8, 1, 10);
    const start = started("p", sowing, "Sème la mâche");
    expect(followUpsFor(plants("lambs-lettuce")[0], [start], new Date(sowing.getTime() + 15 * DAY))).toEqual([]);
    const due = followUpsFor(plants("lambs-lettuce")[0], [start], new Date(sowing.getTime() + 23 * DAY));
    expect(due.map((activity) => activity.title)).toEqual(["Éclaircis la mâche"]);
    expect(due[0].description).toMatch(/^Garde une pousse tous les \d+ cm/);
    const thinned: MaintenanceEvent = { id: "p:thin", plantId: "p", type: "pruning", completedAt: new Date(sowing.getTime() + 23 * DAY).toISOString(), source: "manual", note: "Éclaircis la mâche" };
    expect(followUpsFor(plants("lambs-lettuce")[0], [start, thinned], new Date(sowing.getTime() + 24 * DAY))).toEqual([]);
    // Oublié trois semaines : il s'efface.
    expect(followUpsFor(plants("lambs-lettuce")[0], [start], new Date(sowing.getTime() + 50 * DAY))).toEqual([]);
  });

  it("un basilic semé au chaud en mars : « Sors tes plants de basilic sur le balcon » en mai", () => {
    const start = started("p", new Date(2026, 2, 10), "Sème le basilic au chaud");
    expect(followUpsFor(plants("basil")[0], [start], new Date(2026, 3, 20)).map((activity) => activity.title)).not.toContain("Sors tes plants de basilic sur le balcon");
    const may = followUpsFor(plants("basil")[0], [start], new Date(2026, 4, 10));
    expect(may.map((activity) => activity.title)).toContain("Sors tes plants de basilic sur le balcon");
  });

  it("pincer quand la plante a pris ; rien pour une plante installée sans premier geste", () => {
    const planting = new Date(2026, 4, 1);
    const start = started("p", planting, "Plante la menthe");
    expect(followUpsFor(plants("mint")[0], [start], new Date(planting.getTime() + 15 * DAY)).map((activity) => activity.title)).toEqual(["Pince la menthe"]);
    expect(followUpsFor(plants("mint")[0], [], new Date(planting.getTime() + 15 * DAY))).toEqual([]);
  });

  it("sur Aujourd'hui : une ligne par plante, cochée le jour où on le fait", () => {
    const sowing = new Date(2026, 8, 1, 10);
    const now = new Date(sowing.getTime() + 23 * DAY);
    const watered: MaintenanceEvent = { id: "w", plantId: "p", type: "watering", completedAt: new Date(now.getTime() - 3_600_000).toISOString(), source: "manual" };
    const start = started("p", sowing, "Sème la mâche");
    const [day] = planDay({ plants: plants("lambs-lettuce"), events: [start, watered], now });
    expect(day.gestures.find((gesture) => !gesture.done)?.title).toBe("Éclaircis la mâche");
    const thinned: MaintenanceEvent = { id: "p:thin", plantId: "p", type: "pruning", completedAt: now.toISOString(), source: "manual", note: "Éclaircis la mâche" };
    const [after] = planDay({ plants: plants("lambs-lettuce"), events: [start, watered, thinned], now });
    expect(after.gestures.find((gesture) => gesture.title === "Éclaircis la mâche")?.done).toBe(true);
  });
});
