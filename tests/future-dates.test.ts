import { describe, expect, it } from "vitest";

import { repairAwardDates, repairEventDate, repairPlantDates, repairSnoozeDates } from "../lib/garden/future-dates";
import { resolvePlants, type GardenPlant } from "../lib/garden/garden-logic";
import { plantProgress, plantStage } from "../lib/garden/progress";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const REAL = new Date(2026, 9, 20, 20, 17); // mardi 20 octobre, le vrai jour
const SIMULATED = new Date(2026, 10, 18, 20, 40).toISOString(); // noté pendant la date simulée « 18 nov. »
const watering: MaintenanceEvent = { id: "w", plantId: "lemon-1", type: "watering", completedAt: SIMULATED, source: "daily_task" };

describe("dates restées dans le futur (retour du 20/10)", () => {
  it("le citronnier arrivé « le 18 novembre », rentré le 17 octobre : arrivé au plus tard le 17 octobre", () => {
    const plant: GardenPlant = { id: "lemon-1", catalogId: "lemon-tree", addedAt: SIMULATED, winter: { choice: "indoors", decidedAt: new Date(2026, 9, 16).toISOString(), indoorsAt: new Date(2026, 9, 17, 9).toISOString() } };
    const fixed = repairPlantDates(plant, [watering], REAL);
    expect(fixed?.addedAt).toBe(new Date(2026, 9, 16).toISOString());
    expect(fixed?.winter?.indoorsAt).toBe(plant.winter?.indoorsAt);
    expect(repairEventDate(watering, REAL)?.completedAt).toBe(REAL.toISOString());
  });

  it("sans autre date connue, l'arrivée devient maintenant ; une date passée ne bouge pas", () => {
    expect(repairPlantDates({ id: "a", catalogId: "basil", addedAt: SIMULATED }, [], REAL)?.addedAt).toBe(REAL.toISOString());
    expect(repairPlantDates({ id: "a", catalogId: "basil", addedAt: new Date(2026, 9, 1).toISOString() }, [], REAL)).toBeNull();
    expect(repairEventDate({ ...watering, completedAt: new Date(2026, 9, 19).toISOString() }, REAL)).toBeNull();
    // Un écart d'horloge de quelques minutes entre deux téléphones n'est pas corrigé.
    expect(repairEventDate({ ...watering, completedAt: new Date(REAL.getTime() + 60_000).toISOString() }, REAL)).toBeNull();
  });

  it("badges et mises en sommeil", () => {
    expect(repairAwardDates({ a: SIMULATED, b: new Date(2026, 9, 1).toISOString() }, REAL)).toEqual({ a: REAL.toISOString(), b: new Date(2026, 9, 1).toISOString() });
    expect(repairAwardDates({ b: new Date(2026, 9, 1).toISOString() }, REAL)).toBeNull();
    const fixed = repairSnoozeDates([
      { key: "harvest-done:lemon-1:2026-11-18", kind: "skip", until: new Date(2027, 11, 1).toISOString() },
      { key: "lemon-1:watering", kind: "skip", until: new Date(2026, 10, 19, 9).toISOString() },
      { key: "repot:lemon-1", kind: "skip", until: new Date(2028, 0, 1).toISOString() },
      { key: "basil-1:watering", kind: "later", until: new Date(2026, 9, 20, 23).toISOString() },
    ], REAL);
    expect(fixed).toEqual([
      { key: "harvest-done:lemon-1:2026-10-20", kind: "skip", until: new Date(2027, 11, 1).toISOString() },
      { key: "repot:lemon-1", kind: "skip", until: new Date(2027, 0, 1).toISOString() },
      { key: "basil-1:watering", kind: "later", until: new Date(2026, 9, 20, 23).toISOString() },
    ]);
    expect(repairSnoozeDates([{ key: "basil-1:watering", kind: "later", until: new Date(2026, 9, 20, 23).toISOString() }], REAL)).toBeNull();
  });
});

describe("« Sa progression » d'accord avec l'état de la plante", () => {
  const lemon = (extra: Partial<GardenPlant>) => resolvePlants([{ id: "lemon-1", catalogId: "lemon-tree", addedAt: new Date(2026, 9, 10).toISOString(), ...extra }])[0];

  it("rentré pour l'hiver : « À l'abri pour l'hiver », et l'étape « Rentré pour l'hiver »", () => {
    const resolved = lemon({ winter: { choice: "indoors", decidedAt: new Date(2026, 9, 16).toISOString(), indoorsAt: new Date(2026, 9, 17).toISOString() } });
    expect(plantStage(resolved, 10, REAL).label).toBe("À l’abri pour l’hiver");
    expect(plantProgress(resolved, [], [], REAL).milestones.map((milestone) => milestone.label)).toContain("Rentré pour l’hiver");
  });

  it("choix pas encore fait, choix de le rentrer, laissé dehors, à planter", () => {
    expect(plantStage(lemon({}), 10, REAL).label).toBe("À rentrer avant l’hiver");
    expect(plantStage(lemon({ winter: { choice: "indoors", decidedAt: new Date(2026, 9, 16).toISOString() } }), 10, REAL).label).toBe("Bientôt à l’abri");
    expect(plantStage(lemon({ winter: { choice: "outside", decidedAt: new Date(2026, 9, 16).toISOString() } }), 10, REAL).detail).toContain("protège-le");
    expect(plantStage(lemon({ toPlant: true }), 0, REAL).label).toBe("À planter");
  });

  it("une annuelle en fin de saison et une vivace au repos", () => {
    const [basil, mint] = resolvePlants([
      { id: "basil-1", catalogId: "basil", addedAt: new Date(2026, 4, 1).toISOString() },
      { id: "mint-1", catalogId: "mint", addedAt: new Date(2026, 4, 1).toISOString() },
    ]);
    expect(plantStage(basil, 170, new Date(2026, 10, 10)).label).toBe("Fin de saison");
    expect(plantStage(mint, 190, new Date(2026, 11, 10)).label).toMatch(/^Au repos jusqu’en/);
  });
});
