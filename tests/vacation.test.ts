import { describe, expect, it } from "vitest";

import { resolvePlants } from "../lib/garden/garden-logic";
import { addDays, awayOn, helperMessage, helperTasks, isValidVacation, preparationSteps, vacationDays, vacationRange, vacationState, wateringRhythm, type Vacation } from "../lib/garden/vacation";

const plants = resolvePlants([
  { id: "tomato-1", catalogId: "cherry-tomato", addedAt: "2026-05-01T10:00:00.000Z" },
  { id: "basil-1", catalogId: "basil", nickname: "Basilic cuisine", addedAt: "2026-05-01T10:00:00.000Z" },
  { id: "thyme-1", catalogId: "thyme", addedAt: "2026-05-01T10:00:00.000Z" },
]);
const july: Vacation = { start: "2026-07-18", end: "2026-07-31", helper: false, done: [] };

describe("mode vacances", () => {
  it("sait où on en est : avant, pendant, au retour, puis plus rien", () => {
    expect(vacationState(null)).toEqual({ phase: "none" });
    expect(vacationState(july, new Date(2026, 6, 15, 9))).toEqual({ phase: "upcoming", daysLeft: 3 });
    expect(vacationState(july, new Date(2026, 6, 18, 9))).toEqual({ phase: "away", daysLeft: 13 });
    expect(vacationState(july, new Date(2026, 6, 31, 22))).toEqual({ phase: "away", daysLeft: 0 });
    expect(vacationState(july, new Date(2026, 7, 1, 9))).toEqual({ phase: "back", daysSince: 1 });
    expect(vacationState(july, new Date(2026, 7, 4, 9))).toEqual({ phase: "none" });
    expect(awayOn(july, "2026-07-18")).toBe(true);
    expect(awayOn(july, "2026-08-01")).toBe(false);
  });

  it("compte les jours et écrit les dates simplement", () => {
    expect(vacationDays(july)).toBe(14);
    expect(vacationRange(july)).toBe("du 18 au 31 juillet");
    expect(vacationRange({ start: "2026-09-28", end: "2026-10-05" })).toBe("du 28 septembre au 5 octobre");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(isValidVacation(july)).toBe(true);
    expect(isValidVacation({ ...july, end: "2026-07-01" })).toBe(false);
  });

  it("prépare un départ long en été sans personne pour arroser", () => {
    const ids = preparationSteps(plants, july).map((step) => step.id);
    expect(ids).toEqual(["harvest", "tidy", "group", "mulch", "reserve", "saucer", "water"]);
    const saucer = preparationSteps(plants, july).find((step) => step.id === "saucer")!;
    expect(saucer.detail).toContain("Basilic cuisine");
    expect(saucer.detail).not.toContain("Thym");
  });

  it("adapte le plan : court séjour d'hiver avec un proche", () => {
    const winter: Vacation = { start: "2026-12-20", end: "2026-12-22", helper: true, done: [] };
    const ids = preparationSteps(plants, winter).map((step) => step.id);
    expect(ids).not.toContain("reserve");
    expect(ids).not.toContain("mulch");
    expect(ids).toContain("frost");
    expect(ids.at(-1)).toBe("share");
  });

  it("donne à la personne qui arrose un rythme par plante et un message prêt à envoyer", () => {
    expect(wateringRhythm(plants[0], 7)).toBe("tous les 2 jours");
    expect(wateringRhythm(plants[2], 7)).toBe("tous les 4 jours");
    expect(helperTasks(plants, july)[0].harvest).toBeTruthy();
    const message = helperMessage(plants, { ...july, helper: true }, "Nicolas");
    expect(message).toContain("du 18 au 31 juillet");
    expect(message).toContain("• Basilic cuisine : arroser");
    expect(message.trim().endsWith("Merci ! Nicolas")).toBe(true);
  });
});
