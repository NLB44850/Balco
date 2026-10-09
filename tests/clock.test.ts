import { afterEach, describe, expect, it } from "vitest";

import { addDays, clockPresets, longDayText, now, setSimulatedClockDay, shiftedDate, simulatedClockDay, subscribeClock } from "../lib/clock";

describe("horloge commune (simulation de date)", () => {
  afterEach(() => setSimulatedClockDay(null));

  it("garde l'heure réelle et change seulement le jour", () => {
    const real = new Date(2026, 9, 8, 14, 35, 12);
    const shifted = shiftedDate(real, "2026-11-20");
    expect([shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), shifted.getHours(), shifted.getMinutes()]).toEqual([2026, 10, 20, 14, 35]);
    expect(shiftedDate(real, null)).toBe(real);
    expect(shiftedDate(real, "pas une date")).toBe(real);
  });

  it("sans simulation, now() est l'heure réelle", () => {
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000);
  });

  it("prévient les écrans quand le jour simulé change, et revient au vrai jour", () => {
    const seen: Array<string | null> = [];
    const stop = subscribeClock((day) => seen.push(day));
    setSimulatedClockDay("2026-11-25");
    expect(simulatedClockDay()).toBe("2026-11-25");
    expect(now().getDate()).toBe(25);
    setSimulatedClockDay("2026-11-25");
    setSimulatedClockDay(null);
    stop();
    setSimulatedClockDay("2027-01-15");
    expect(seen).toEqual(["2026-11-25", null]);
  });

  it("avance ou recule d'un jour ou d'une semaine, en changeant de mois et d'année", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2027-01-03", -7)).toBe("2026-12-27");
  });

  it("écrit le jour en clair", () => {
    expect(longDayText("2026-11-20")).toBe("vendredi 20 novembre 2026");
    expect(longDayText("2026-12-01")).toBe("mardi 1er décembre 2026");
  });

  it("propose des jours à venir, dans l'ordre", () => {
    const presets = clockPresets("2026-10-08");
    expect(presets[0]).toEqual({ day: "2026-11-18", label: "18 nov." });
    expect(presets.map((preset) => preset.day)).toContain("2027-01-15");
    expect(presets.map((preset) => preset.day)).toEqual([...presets.map((preset) => preset.day)].sort());
  });
});
