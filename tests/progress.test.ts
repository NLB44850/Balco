import { describe, expect, it } from "vitest";

import { resolvePlants } from "../lib/garden/garden-logic";
import { celebrationFor, formatLiters, plantProgress, plantStage, sinceLabel, upcomingHarvests, waterSaved } from "../lib/garden/progress";
import { weekSummary } from "../lib/garden/week";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const NOW = new Date(2026, 6, 15, 18); // mercredi 15 juillet
const at = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const plants = resolvePlants([
  { id: "tomato-1", catalogId: "cherry-tomato", addedAt: at(70) },
  { id: "basil-1", catalogId: "basil", addedAt: at(10) },
  { id: "pepper-1", catalogId: "sweet-pepper", addedAt: at(40) },
]);
const event = (plantId: string, type: MaintenanceEvent["type"], days: number, extra: Partial<MaintenanceEvent> = {}): MaintenanceEvent => ({ id: `${plantId}-${type}-${days}-${extra.note ?? ""}`, plantId, type, completedAt: at(days), source: "daily_task", ...extra });
const skipped = (plantId: string, days: number) => event(plantId, "observation", days, { source: "reminder", note: "N’arrose pas les tomates cerises aujourd’hui" });

describe("eau économisée", () => {
  it("compte les « N'arrose pas » suivis, selon la taille du pot", () => {
    const events = [skipped("tomato-1", 1), skipped("basil-1", 2), event("tomato-1", "observation", 1, { source: "reminder", note: "Observe tes tomates" }), skipped("tomato-1", 30)];
    const result = waterSaved(plants, events, new Date(at(7)), NOW);
    expect(result.avoided).toBe(2);
    expect(result.liters).toBeGreaterThan(0);
    expect(formatLiters(1.5)).toBe("1,5 L");
    expect(weekSummary(plants, events, [], NOW)).toMatchObject({ avoidedWaterings: 2, waterSavedLiters: result.liters });
  });
});

describe("récoltes à venir", () => {
  it("met d'abord ce qui se récolte ce mois-ci, puis le mois prochain", () => {
    const upcoming = upcomingHarvests(plants, new Date(2026, 5, 15));
    expect(upcoming.map((item) => [item.resolved.plant.id, item.now])).toEqual(expect.arrayContaining([["basil-1", true]]));
    expect(upcoming.find((item) => item.resolved.plant.id === "tomato-1")).toMatchObject({ now: false, label: "À partir de juillet" });
    expect(upcoming.findIndex((item) => item.now)).toBe(0);
  });
});

describe("progression d'une plante", () => {
  it("raconte son chemin : stade, 8 semaines, étapes marquantes", () => {
    const events = [event("tomato-1", "watering", 0), event("tomato-1", "watering", 3), event("tomato-1", "harvest", 5), event("tomato-1", "fertilizing", 20), event("tomato-1", "watering", 45), event("basil-1", "watering", 1)];
    const progress = plantProgress(plants[0], events, [{ id: "p", plantId: "tomato-1", takenAt: at(8), source: "x" }], NOW);
    expect(progress).toMatchObject({ daysOnBalcony: 70, gestures: 5, waterings: 3, harvests: 1, photos: 1, activeWeeks: 3 });
    expect(progress.weeks).toHaveLength(8);
    expect(progress.weeks[7]).toBe(3);
    expect(progress.stage.label).toBe("En récolte");
    expect(progress.milestones.map((milestone) => milestone.key)).toEqual(["harvest", "photo", "feed", "added"]);
    expect(sinceLabel(70)).toBe("depuis 2 mois");
  });

  it("trouve le bon stade selon la saison et l'âge de la plante", () => {
    expect(plantStage(plants[2], 40, new Date(2026, 3, 10)).label).toBe("En croissance");
    expect(plantStage(plants[0], 40, new Date(2026, 5, 10))).toMatchObject({ label: "Bientôt la récolte", detail: expect.stringContaining("juillet") });
    expect(plantStage(plants[0], 5, new Date(2026, 4, 10)).label).toBe("Elle s’installe");
    expect(plantStage(plants[0], 200, new Date(2026, 10, 10)).label).toBe("Fin de saison");
  });
});

describe("petites victoires", () => {
  it("fête un badge, une série, une première récolte, et se tait sinon", () => {
    const harvest = event("tomato-1", "harvest", 0);
    expect(celebrationFor(plants, [], [harvest], NOW)).toBe("🎉 Nouveau badge : Du Balcon à l'Assiette !");
    const second = event("tomato-1", "harvest", 0, { note: "encore" });
    expect(celebrationFor(plants, [harvest], [second, harvest], NOW)).toBeNull();

    const week = [1, 2, 3, 4, 5, 6].map((days) => event("basil-1", "watering", days));
    const withBadge = [event("tomato-1", "harvest", 30), ...week];
    expect(celebrationFor(plants, withBadge, [event("basil-1", "watering", 0), ...withBadge], NOW)).toBe("🎉 Nouveau badge : Main Verte !");

    const two = [1, 2].map((days) => event("basil-1", "pruning", days));
    const base = [event("tomato-1", "harvest", 30), ...two];
    expect(celebrationFor(plants, base, [event("basil-1", "pruning", 0), ...base], NOW)).toBe("🔥 3 jours de suite : ton balcon adore ta régularité !");

    const pepperHarvest = event("pepper-1", "harvest", 0);
    const quiet = [event("tomato-1", "harvest", 30), event("basil-1", "pruning", 4)];
    expect(celebrationFor(plants, quiet, [pepperHarvest, ...quiet], NOW)).toBe("🧺 Première récolte de Poivron : bravo !");
  });
});
