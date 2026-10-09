import { describe, expect, it } from "vitest";

import { almostThere, pastSeasonBadges } from "../lib/garden/collection";
import { computeBadges, computeStats, resolvePlants } from "../lib/garden/garden-logic";
import { bloomEvent, canMarkBloom, herbariumAwards, herbariumCards } from "../lib/garden/herbarium";
import { seasonAwards, seasonBadges, seasonOf, seasonWindow } from "../lib/garden/season-badges";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const day = (year: number, month: number, date: number, hour = 10) => new Date(year, month - 1, date, hour);
const ev = (id: string, plantId: string, type: MaintenanceEvent["type"], at: Date, extra: Partial<MaintenanceEvent> = {}): MaintenanceEvent => ({ id, plantId, type, completedAt: at.toISOString(), source: "daily_task", ...extra });

describe("badges de saison", () => {
  it("saisons à dates fixes ; l'hiver porte le millésime de son année de fin", () => {
    expect(seasonOf(day(2026, 12, 5))).toEqual({ season: "winter", year: 2027 });
    expect(seasonOf(day(2027, 2, 28))).toEqual({ season: "winter", year: 2027 });
    expect(seasonOf(day(2027, 3, 1))).toEqual({ season: "spring", year: 2027 });
    expect(seasonWindow("winter", 2027)).toEqual({ start: new Date(2026, 11, 1), end: new Date(2027, 2, 1) });
  });

  it("quatre par saison ; « Protégé du gel · 2027 » pour une alerte gel suivie en hiver", () => {
    const plants = resolvePlants([{ id: "basil-1", catalogId: "basil", addedAt: day(2026, 5, 1).toISOString() }]);
    const frost = ev("reminder:basil-1:protection:frost:2026-12-10", "basil-1", "protection", day(2026, 12, 10), { source: "reminder", note: "Gel cette nuit : protège le basilic" });
    const list = seasonBadges({ plants, past: [], events: [frost], now: day(2026, 12, 12) });
    expect(list.map((badge) => badge.id)).toEqual(["frost-guard", "warm-sowing", "winter-harvest", "winter-shelter"]);
    expect(list[0]).toMatchObject({ obtained: true, year: 2027, key: "season:frost-guard:2027" });
    expect(seasonAwards({ plants, past: [], events: [frost], now: day(2026, 12, 12) })).toEqual({ "season:frost-guard:2027": day(2026, 12, 12).toISOString() });
    // L'année suivante, le même badge est à regagner.
    expect(seasonBadges({ plants, past: [], events: [frost], now: day(2027, 12, 12) })[0].obtained).toBe(false);
  });

  it("l'automne compte la Sainte-Catherine et les envies du printemps", () => {
    const list = seasonBadges({ plants: [], past: [], events: [], springWishes: ["basil", "chili"], now: day(2026, 11, 20), awards: { "event:sainte-catherine:2026": day(2026, 11, 19).toISOString() } });
    expect(list.map((badge) => [badge.id, badge.obtained])).toEqual([["winter-ready", false], ["spring-seeds", true], ["sainte-catherine", true], ["autumn-harvest", false]]);
  });
});

describe("herbier", () => {
  const plants = resolvePlants([
    { id: "tomato-1", catalogId: "cherry-tomato", addedAt: day(2026, 5, 1).toISOString() },
    { id: "tomato-2", catalogId: "cherry-tomato", addedAt: day(2026, 5, 2).toISOString() },
    { id: "cosmos-1", catalogId: "cosmos", addedAt: day(2026, 5, 1).toISOString() },
  ]);

  it("une carte par plante du catalogue, à sa première récolte ou floraison", () => {
    const events = [ev("h2", "tomato-2", "harvest", day(2026, 7, 20)), ev("h1", "tomato-1", "harvest", day(2026, 7, 25)), bloomEvent(plants[2], day(2026, 8, 1))];
    const awards = herbariumAwards(plants, events);
    expect(awards).toEqual({ "herbier:cherry-tomato": day(2026, 7, 20).toISOString(), "herbier:cosmos": day(2026, 8, 1).toISOString() });
    expect(herbariumCards(awards).map((card) => [card.entry.id, card.kind])).toEqual([["cosmos", "bloom"], ["cherry-tomato", "harvest"]]);
  });

  it("« Elle a fleuri » : seulement une fleur, pendant sa floraison, une fois par an", () => {
    expect(canMarkBloom(plants[2], [], day(2026, 8, 1))).toBe(true);
    expect(canMarkBloom(plants[2], [], day(2026, 2, 1))).toBe(false);
    expect(canMarkBloom(plants[0], [], day(2026, 8, 1))).toBe(false);
    expect(canMarkBloom(plants[2], [bloomEvent(plants[2], day(2026, 7, 1))], day(2026, 8, 1))).toBe(false);
  });

  it("« Elle a fleuri » n'est pas un geste (pas de points)", () => {
    expect(computeStats(plants, [bloomEvent(plants[2], day(2026, 8, 1))], day(2026, 8, 2)).gestures).toBe(0);
  });
});

describe("Moi : presque là et badges passés", () => {
  it("les plus proches d'abord, avec une phrase", () => {
    const plants = resolvePlants(["basil", "mint"].map((id) => ({ id, catalogId: id, addedAt: day(2026, 5, 1).toISOString() })));
    const badges = computeBadges(computeStats(plants, [], day(2026, 10, 8)));
    const items = almostThere(badges, []);
    expect(items[0]).toMatchObject({ key: "bees", current: 2, target: 3, phrase: "Encore 1 plante mellifère" });
    expect(items[1]).toMatchObject({ key: "first-pot", phrase: "Encore 3 plantes accueillies" });
  });

  it("les saisons passées et les événements, sans la saison en cours", () => {
    const past = pastSeasonBadges({ "season:frost-guard:2027": day(2026, 12, 10).toISOString(), "event:sainte-catherine:2026": day(2026, 11, 20).toISOString(), "season:rain-saver:2027": day(2027, 7, 1).toISOString(), "badge:plate": day(2026, 7, 1).toISOString() }, day(2027, 7, 15));
    expect(past.map((badge) => badge.title)).toEqual(["Protégé du gel · 2027", "Sainte-Catherine · 2026"]);
  });
});
