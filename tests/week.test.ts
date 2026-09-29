import { describe, expect, it } from "vitest";

import { createGardenPlant, resolvePlants } from "../lib/garden/garden-logic";
import type { PlantPhoto } from "../lib/garden/photos";
import { comparedToLastWeek, startOfWeek, weekSummary } from "../lib/garden/week";
import { quickQuestions } from "../lib/ai/quick-questions";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

// Mercredi 30 septembre 2026, heure locale : la semaine va du lundi 28 septembre au dimanche 4 octobre.
const now = new Date(2026, 8, 30, 18, 0);
const at = (day: number, hour = 10) => new Date(2026, 8, day, hour, 0).toISOString();
const plants = resolvePlants([
  { ...createGardenPlant("basil", new Date(2026, 7, 1)), id: "basil-1" },
  { ...createGardenPlant("cherry-tomato", new Date(2026, 7, 1)), id: "tomato-1" },
]);
const event = (id: string, plantId: string, completedAt: string, extra: Partial<MaintenanceEvent> = {}): MaintenanceEvent => ({ id, plantId, type: "watering", completedAt, source: "daily_task", ...extra });

describe("ma semaine", () => {
  it("commence le lundi", () => {
    expect(startOfWeek(now)).toEqual(new Date(2026, 8, 28));
    expect(startOfWeek(new Date(2026, 9, 4, 22))).toEqual(new Date(2026, 8, 28));
  });

  it("compte les jours, les gestes, les récoltes et les photos de la semaine", () => {
    const events = [
      event("a", "basil-1", at(28)),
      event("b", "basil-1", at(30, 9), { type: "harvest" }),
      event("c", "tomato-1", at(30, 17), { source: "reminder" }),
      event("old", "basil-1", at(22)),
      event("other", "gone-1", at(29)),
    ];
    const photos: PlantPhoto[] = [{ id: "p", plantId: "tomato-1", takenAt: at(29), source: "p.jpg" }];
    const summary = weekSummary(plants, events, photos, now);
    expect(summary.days.map((day) => day.gestures)).toEqual([1, 0, 2, 0, 0, 0, 0]);
    expect(summary.days[2].today).toBe(true);
    expect(summary.days[3].future).toBe(true);
    expect(summary.gestures).toBe(3);
    expect(summary.previousGestures).toBe(1);
    expect(summary.activeDays).toBe(2);
    expect(summary.harvests).toBe(1);
    expect(summary.photos).toBe(1);
    expect(summary.weatherTips).toBe(1);
    expect(summary.plants.map((item) => item.resolved.plant.id)).toEqual(["basil-1", "tomato-1"]);
    expect(summary.title).toBe("Tu fais mieux que la semaine dernière");
    expect(summary.message).toBe("3 gestes sur 2 jours. Basilic a eu le plus de soins.");
    expect(comparedToLastWeek(summary)).toBe("+2 par rapport à la semaine dernière");
  });

  it("encourage sans culpabiliser quand rien n'est noté", () => {
    const summary = weekSummary(plants, [], [], now);
    expect(summary.title).toBe("Une semaine tranquille");
    expect(comparedToLastWeek(summary)).toBe("");
    expect(weekSummary([], [], [], now).title).toBe("Ta semaine commence ici");
  });
});

describe("questions prêtes pour Nora", () => {
  it("part de tes plantes et de la saison", () => {
    const questions = quickQuestions(plants, now).map((question) => question.replace("\u00A0", " "));
    expect(questions).toHaveLength(4);
    expect(questions[0]).toBe("Comment bien récolter le basilic ?");
    expect(questions).toContain("Comment protéger le basilic du froid ?");
  });

  it("propose des questions générales sans plante", () => {
    expect(quickQuestions([], now).map((question) => question.replace("\u00A0", " "))).toEqual(["Que préparer sur mon balcon pour cet hiver ?", "Quoi planter ce mois-ci sur mon balcon ?", "Pourquoi les feuilles jaunissent ?", "Comment économiser l’eau ?"]);
  });
});
