import { describe, expect, it } from "vitest";

import { planDay } from "../lib/garden/day-plan";
import { resolvePlants } from "../lib/garden/garden-logic";
import { nextSaturdayMorning, postponedStarts, postponeStart, saturdayReminder, startSnoozeKey } from "../lib/garden/postpone";

describe("« Pas encore acheté ? Rappelle-moi samedi »", () => {
  it("le prochain samedi à 9 h, jamais le jour même", () => {
    // Mardi 6 octobre 2026 → samedi 10 ; un samedi → le samedi suivant ; un dimanche → 6 jours plus tard.
    expect(nextSaturdayMorning(new Date(2026, 9, 6, 18))).toEqual(new Date(2026, 9, 10, 9, 0));
    expect(nextSaturdayMorning(new Date(2026, 9, 10, 8))).toEqual(new Date(2026, 9, 17, 9, 0));
    expect(nextSaturdayMorning(new Date(2026, 9, 11, 12))).toEqual(new Date(2026, 9, 17, 9, 0));
  });

  it("le geste disparaît d'Aujourd'hui jusqu'à samedi, puis revient", () => {
    const now = new Date(2026, 9, 6, 18);
    const plants = resolvePlants([{ id: "lav", catalogId: "lavender", addedAt: now.toISOString(), toPlant: true }]);
    const snoozes = postponeStart([], "lav", now);
    expect(snoozes).toEqual([{ key: startSnoozeKey("lav"), kind: "later", until: new Date(2026, 9, 10, 9, 0).toISOString() }]);
    const [waiting] = planDay({ plants, events: [], now, postponed: postponedStarts(snoozes, now) });
    expect(waiting.gestures).toEqual([]);
    expect(waiting.status.label).toBe("À planter");
    const saturday = new Date(2026, 9, 10, 10);
    const [back] = planDay({ plants, events: [], now: saturday, postponed: postponedStarts(snoozes, saturday) });
    expect(back.first?.title).toBe("Plante la lavande");
  });

  it("la notification du samedi dit quoi apporter", () => {
    expect(saturdayReminder({ kind: "plant", title: "Plante la lavande" })).toEqual({ title: "C’est samedi 🌱", body: "Pense au plant : plante la lavande ce week-end." });
    expect(saturdayReminder({ kind: "sow", title: "Sème la mâche" }).body).toBe("Pense aux graines : sème la mâche ce week-end.");
  });
});
