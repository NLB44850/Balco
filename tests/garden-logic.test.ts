import { describe, expect, it } from "vitest";

import {
  appendEvent,
  buildDailySession,
  careProfileFor,
  computeBadges,
  computeProgress,
  computeStats,
  createGardenPlant,
  eventForSessionTask,
  formatLongDate,
  gardenDay,
  greeting,
  historyByDay,
  initials,
  isScannerEvent,
  plantStatus,
  relativeDay,
  resolvePlants,
  seasonName,
  streakDays,
  type GardenPlant,
} from "../lib/garden/garden-logic";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

// Dates en heure locale pour ne pas dépendre du fuseau de la machine de test.
const now = new Date(2026, 8, 26, 10, 0); // samedi 26 septembre 2026
const daysAgo = (days: number, hour = 10) => new Date(2026, 8, 26 - days, hour, 0);

function gardenPlant(catalogId: string, id = catalogId, addedDaysAgo = 10): GardenPlant {
  return { id, catalogId, addedAt: daysAgo(addedDaysAgo).toISOString() };
}

function event(plantId: string, type: MaintenanceEvent["type"], date: Date, overrides: Partial<MaintenanceEvent> = {}): MaintenanceEvent {
  return { id: `${plantId}-${type}-${date.getTime()}`, plantId, type, completedAt: date.toISOString(), source: "daily_task", ...overrides };
}

describe("garden plants", () => {
  it("creates unique instance ids for the same catalog plant", () => {
    const a = createGardenPlant("basil", now);
    const b = createGardenPlant("basil", now);
    expect(a.catalogId).toBe("basil");
    expect(a.id).not.toBe(b.id);
  });

  it("drops plants whose catalog entry no longer exists", () => {
    expect(resolvePlants([gardenPlant("basil"), gardenPlant("unknown-plant")])).toHaveLength(1);
  });

  it("builds a reminder care profile keyed by the instance id", () => {
    const [resolved] = resolvePlants([{ ...gardenPlant("basil", "basil-kitchen"), nickname: "Basilic cuisine" }]);
    const profile = careProfileFor(resolved);
    expect(profile).toMatchObject({ plantId: "basil-kitchen", displayName: "Basilic cuisine", frostSensitive: true });
    expect(profile.allowedTaskTypes).toEqual(expect.arrayContaining(["watering", "harvest", "protection"]));
  });
});

describe("plant status", () => {
  const [basil] = resolvePlants([gardenPlant("basil")]);

  it("flags a new plant without history", () => {
    expect(plantStatus(basil, [], now)).toMatchObject({ tone: "new", meta: "Aucun soin noté" });
  });

  it("is fine right after watering and needs attention after the interval", () => {
    expect(plantStatus(basil, [event("basil", "watering", daysAgo(1))], now)).toMatchObject({ tone: "good", meta: "Dernier soin · hier" });
    expect(plantStatus(basil, [event("basil", "watering", daysAgo(4))], now)).toMatchObject({ tone: "watch", label: "À SURVEILLER" });
  });
});

describe("daily session", () => {
  const plants = resolvePlants([gardenPlant("basil"), gardenPlant("mint"), gardenPlant("radish"), gardenPlant("thyme")]);

  it("proposes one task per plant, capped at three", () => {
    const session = buildDailySession(plants, [], now);
    expect(session).toHaveLength(3);
    expect(new Set(session.map((item) => item.resolved.plant.id)).size).toBe(3);
  });

  it("asks to check the soil when watering is due", () => {
    const session = buildDailySession(resolvePlants([gardenPlant("basil")]), [], now);
    expect(session[0].task.type).toBe("watering");
    expect(session[0].task.title).toContain("arrose le basilic");
  });

  it("puts the most neglected plant first", () => {
    const events = [event("basil", "watering", daysAgo(1)), event("mint", "watering", daysAgo(1)), event("thyme", "watering", daysAgo(1))];
    expect(buildDailySession(plants, events, now)[0].resolved.plant.id).toBe("radish");
  });

  it("marks a task as done without reordering the session", () => {
    const before = buildDailySession(plants, [], now);
    const doneEvent = eventForSessionTask(before[0], now);
    const after = buildDailySession(plants, [doneEvent], now);
    expect(after.map((item) => item.eventId)).toEqual(before.map((item) => item.eventId));
    expect(after[0].done).toBe(true);
    expect(after.slice(1).every((item) => !item.done)).toBe(true);
    expect(doneEvent).toMatchObject({ plantId: before[0].resolved.plant.id, type: before[0].task.type, source: "daily_task" });
  });

  it("never proposes a harvest out of season", () => {
    const winter = new Date(2026, 0, 15, 10);
    const session = buildDailySession(resolvePlants([gardenPlant("cherry-tomato")]), [], winter);
    expect(session.every((item) => item.task.type !== "harvest")).toBe(true);
  });
});

describe("stats, badges and progress", () => {
  it("counts consecutive days, tolerating an unfinished today", () => {
    const events = [event("basil", "watering", daysAgo(1)), event("basil", "observation", daysAgo(2)), event("basil", "watering", daysAgo(4))];
    expect(streakDays(events, now)).toBe(2);
    expect(streakDays([...events, event("basil", "harvest", now)], now)).toBe(3);
    expect(streakDays([event("basil", "watering", daysAgo(3))], now)).toBe(0);
  });

  it("ignores events of removed plants", () => {
    const plants = resolvePlants([gardenPlant("basil")]);
    const stats = computeStats(plants, [event("basil", "watering", daysAgo(1)), event("old-plant", "harvest", daysAgo(1))], now);
    expect(stats).toMatchObject({ gestures: 1, harvests: 0, plants: 1 });
  });

  it("unlocks badges from real activity", () => {
    const plants = resolvePlants([gardenPlant("basil"), gardenPlant("lavender"), gardenPlant("borage")]);
    const events = [event("basil", "harvest", daysAgo(1)), ...[1, 2, 3, 4, 5].map((day) => event("lavender", "observation", daysAgo(day)))];
    const badges = computeBadges(computeStats(plants, events, now));
    const unlocked = badges.filter((badge) => badge.unlocked).map((badge) => badge.id);
    expect(unlocked).toEqual(expect.arrayContaining(["first-pot", "bees", "bio", "plate"]));
    expect(unlocked).not.toContain("water");
    expect(badges.find((badge) => badge.id === "streak")).toMatchObject({ current: 5, target: 7, unlocked: false });
  });

  it("derives points and level from stats and badges", () => {
    const stats = computeStats(resolvePlants([gardenPlant("basil")]), [], now);
    const progress = computeProgress(stats, computeBadges(stats));
    // 1 plante (5) + badge Premier Pot (10)
    expect(progress).toMatchObject({ points: 15, level: 1, pointsToNext: 85, levelTitle: "Graine curieuse" });
  });

  it("dedupes events by id and caps storage", () => {
    const first = event("basil", "watering", daysAgo(1));
    expect(appendEvent([first], { ...first, note: "maj" })).toHaveLength(1);
  });
});

describe("dates and identity", () => {
  it("formats real dates in French", () => {
    expect(formatLongDate(now)).toBe("SAMEDI 26 SEPTEMBRE");
    expect(relativeDay(daysAgo(0), now)).toBe("aujourd’hui");
    expect(relativeDay(daysAgo(3), now)).toBe("il y a 3 jours");
    expect(seasonName(now)).toBe("automne");
    expect(seasonName(new Date(2026, 6, 1))).toBe("été");
  });

  it("counts garden days from the first plant", () => {
    expect(gardenDay([], now)).toBeNull();
    expect(gardenDay([gardenPlant("basil", "a", 3), gardenPlant("mint", "b", 1)], now)).toBe(4);
  });

  it("greets without a made-up name", () => {
    expect(greeting(undefined)).toBe("Bonjour");
    expect(greeting("  Léa ")).toBe("Bonjour, Léa");
    expect(initials("Léa Martin")).toBe("LM");
    expect(initials("")).toBeNull();
  });
});

describe("historyByDay", () => {
  const event = (id: string, plantId: string, date: Date, type: MaintenanceEvent["type"] = "watering"): MaintenanceEvent => ({ id, plantId, type, completedAt: date.toISOString(), source: "manual" });

  it("regroupe les gestes d'une plante par jour, du plus récent au plus ancien", () => {
    const events = [
      event("a", "basil", daysAgo(0, 8)),
      event("b", "basil", daysAgo(0, 18), "observation"),
      event("c", "basil", daysAgo(1)),
      event("d", "tomato", daysAgo(0)),
      event("e", "basil", daysAgo(6)),
    ];
    const days = historyByDay(events, "basil", now);
    expect(days.map((day) => day.label)).toEqual(["Aujourd’hui", "Hier", "Dimanche 20 septembre"]);
    expect(days[0].events.map((item) => item.id)).toEqual(["b", "a"]);
    expect(days.flatMap((day) => day.events).some((item) => item.plantId !== "basil")).toBe(false);
  });

  it("précise l'année pour un geste d'une autre année", () => {
    const [day] = historyByDay([event("old", "basil", new Date(2025, 5, 3))], "basil", now);
    expect(day.label).toBe("Mardi 3 juin 2025");
  });

  it("renvoie une liste vide sans historique", () => {
    expect(historyByDay([], "basil", now)).toEqual([]);
  });

  it("reconnaît les notes du scanner", () => {
    expect(isScannerEvent(event("scan:basil:1", "basil", now, "observation"))).toBe(true);
    expect(isScannerEvent(event("task:basil", "basil", now))).toBe(false);
  });
});
