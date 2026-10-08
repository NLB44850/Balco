import { describe, expect, it } from "vitest";

import { backfillAwards, badgesEarnedNow, mergeAwards, newAwards, unseenAwards } from "../lib/garden/awards";
import { computeBadges, computeStats, resolvePlants } from "../lib/garden/garden-logic";
import { awardCelebration, celebrationFor } from "../lib/garden/progress";
import { alertCauseOf, eventForReminder } from "../lib/reminders/reminder-actions";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";
import { applySnapshot, buildPush, emptyOutbox, markAwardsDirty, mergeOutbox, seedOutbox, type LocalGardenState } from "../lib/sync/sync-logic";

const NOW = new Date(2026, 9, 8, 18); // jeudi 8 octobre 2026
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const event = (plantId: string, type: MaintenanceEvent["type"], days: number, extra: Partial<MaintenanceEvent> = {}): MaintenanceEvent => ({ id: `${plantId}-${type}-${days}-${extra.id ?? ""}`, plantId, type, completedAt: at(days), source: "daily_task", ...extra });

describe("carnet des badges obtenus", () => {
  it("réunit deux carnets sans rien perdre, la date la plus ancienne gagne", () => {
    expect(mergeAwards({ a: at(5), b: at(1) }, { b: at(3), c: at(2), bad: "pas une date" })).toEqual({ a: at(5), b: at(3), c: at(2) });
    expect(newAwards({ a: at(5) }, { a: at(1), b: at(0) })).toEqual({ b: at(0) });
    expect(newAwards({ a: at(5) }, { a: at(1) })).toBeNull();
    expect(unseenAwards({ a: at(1), b: at(5), c: at(2) }, ["c"])).toEqual(["b", "a"]);
  });

  it("un badge obtenu reste débloqué quand son compteur baisse (série cassée, plantes retirées)", () => {
    const stats = computeStats([], [], NOW);
    expect(computeBadges(stats).find((badge) => badge.id === "streak")?.unlocked).toBe(false);
    const kept = computeBadges(stats, { "badge:streak": at(30), "badge:first-pot": at(60) });
    expect(kept.filter((badge) => badge.unlocked).map((badge) => badge.id)).toEqual(["first-pot", "streak"]);
    // Palier Graine gardé ; la marche suivante (Pousse, 30 jours) repart de la série du moment.
    expect(kept.find((badge) => badge.id === "streak")).toMatchObject({ tier: 1, current: 0, target: 30 });
  });

  it("ne refête pas un badge déjà obtenu, et sait fêter un badge gagné ailleurs", () => {
    const plants = resolvePlants([{ id: "tomato-1", catalogId: "cherry-tomato", addedAt: at(70) }]);
    const harvest = event("tomato-1", "harvest", 0);
    expect(celebrationFor(plants, [], [harvest], NOW)).toMatchObject({ kind: "badge", awardKey: "badge:plate" });
    expect(celebrationFor(plants, [], [harvest], NOW, [], { "badge:plate": at(40) })).toMatchObject({ kind: "harvest", big: true });
    expect(awardCelebration("badge:water")).toMatchObject({ title: "Nouveau badge : Zéro gâchis d’eau", big: true });
    // Un nouveau palier : un mot dans le message du bas, pas le plein écran.
    expect(awardCelebration("badge:bees:2")).toMatchObject({ kind: "tier", title: "Ami des abeilles : palier Pousse", big: false, awardKey: "badge:bees:2" });
    expect(awardCelebration("season:inconnu")).toBeNull();
  });
});

describe("Bio-Défenseur : les vraies observations seulement", () => {
  it("compte le geste « Observe » et les analyses Observer, pas les semis, plantations ni la pluie", () => {
    const plants = resolvePlants([{ id: "basil-1", catalogId: "basil", addedAt: at(30) }]);
    const events = [
      event("basil-1", "observation", 1),
      event("basil-1", "observation", 2, { id: "scan:basil-1:1", source: "manual" }),
      event("basil-1", "observation", 3, { id: "basil-1:calendar-sow:2026-09", source: "manual" }),
      event("basil-1", "observation", 4, { id: "basil-1:start", source: "manual" }),
      event("basil-1", "observation", 5, { source: "reminder", note: "N’arrose pas le basilic aujourd’hui" }),
    ];
    expect(computeStats(plants, events, NOW).observations).toBe(2);
  });
});

describe("recalcul unique depuis l'historique", () => {
  it("rend les badges déjà mérités, datés du jour où ils l'ont été", () => {
    const past = resolvePlants([{ id: "mint-0", catalogId: "mint", addedAt: at(90), removedAt: at(80) }]);
    const plants = resolvePlants([
      { id: "basil-1", catalogId: "basil", addedAt: at(60) },
      { id: "thyme-1", catalogId: "thyme", addedAt: at(50) },
      { id: "tomato-1", catalogId: "cherry-tomato", addedAt: at(40) },
    ]);
    const events = [
      event("tomato-1", "harvest", 20),
      event("tomato-1", "harvest", 10),
      ...[30, 29, 28, 27, 26].map((days) => event("basil-1", "observation", days, { source: "reminder", note: "N’arrose pas le basilic aujourd’hui" })),
      event("basil-1", "protection", 25, { id: "reminder:basil-1:protection:frost:2026-09-13", source: "reminder", note: "Gel cette nuit : protège le basilic" }),
      event("tomato-1", "observation", 39, { id: "tomato-1:start", source: "manual" }),
      ...[15, 14, 13, 12].map((days) => event("thyme-1", "observation", days)),
      event("thyme-1", "observation", 11, { id: "scan:thyme-1:2", source: "manual" }),
    ];
    const awards = backfillAwards(plants, past, events, NOW);
    expect(awards["badge:first-pot"]).toBe(at(90));
    expect(awards["badge:plate"]).toBe(at(20));
    expect(awards["badge:water"]).toBe(at(26));
    expect(awards["badge:bio"]).toBe(at(11));
    expect(awards["badge:alerts"]).toBe(at(25));
    expect(awards["badge:sower"]).toBe(at(39));
    // Trois plantes mellifères différentes accueillies (la menthe retirée compte) : à l'arrivée du thym.
    expect(awards["badge:bees"]).toBe(at(50));
    expect(awards["badge:bees:2"]).toBeUndefined();
    expect(awards["badge:plate:2"]).toBeUndefined();
  });

  it("retrouve une série de 7 jours suivis cassée depuis", () => {
    // En juillet (le basilic a soif) : arrosé chaque jour pendant 10 jours il y a un mois, puis plus rien.
    const july = new Date(2026, 6, 31, 18);
    const ago = (days: number) => new Date(july.getTime() - days * DAY).toISOString();
    const plants = resolvePlants([{ id: "basil-1", catalogId: "basil", addedAt: ago(40) }]);
    const events = Array.from({ length: 10 }, (_, index): MaintenanceEvent => ({ id: `w-${index}`, plantId: "basil-1", type: "watering", completedAt: ago(38 - index), source: "daily_task" }));
    const awards = backfillAwards(plants, [], events, july);
    expect(awards["badge:streak"]).toBeDefined();
    expect(new Date(awards["badge:streak"]).getTime()).toBeLessThan(july.getTime() - 20 * DAY);
    expect(badgesEarnedNow(plants, events, july)["badge:streak"]).toBeUndefined();
  });
});

describe("cause d'une alerte suivie", () => {
  it("entre dans l'identifiant du geste : gel et vent le même soir ne s'écrasent plus", () => {
    const frost = eventForReminder({ plantId: "basil-1", taskType: "protection", action: "protect", cause: "frost", title: "Gel cette nuit : protège le basilic" }, NOW);
    const wind = eventForReminder({ plantId: "basil-1", taskType: "protection", action: "protect", cause: "wind", title: "Vent fort : mets le basilic à l’abri" }, NOW);
    expect(frost.id).not.toBe(wind.id);
    expect(alertCauseOf(frost)).toBe("frost");
    expect(alertCauseOf(wind)).toBe("wind");
    // La pluie et la soif gardent leur identifiant d'avant.
    expect(eventForReminder({ plantId: "basil-1", taskType: "watering", action: "skip", cause: "rain", title: "N’arrose pas le basilic aujourd’hui" }, NOW).id).toBe("reminder:basil-1:watering:2026-10-08");
  });

  it("se retrouve par le titre pour les gestes notés avant", () => {
    const old = (note: string): MaintenanceEvent => ({ id: "reminder:basil-1:protection:2026-09-01", plantId: "basil-1", type: "protection", completedAt: at(30), source: "reminder", note });
    expect(alertCauseOf(old("Nuit fraîche : protège le basilic"))).toBe("frost");
    expect(alertCauseOf(old("Récolte tout ton basilic avant cette nuit"))).toBe("frost");
    expect(alertCauseOf(old("Orage : mets le basilic à l’abri"))).toBe("storm");
    expect(alertCauseOf(old("Coup de vent : vérifie le basilic"))).toBe("wind");
    expect(alertCauseOf(old("34 °C aujourd’hui : pense au basilic"))).toBe("heat");
    expect(alertCauseOf(old("N’arrose pas le basilic aujourd’hui"))).toBeNull();
    expect(alertCauseOf({ ...old("Gel cette nuit : protège le basilic"), source: "daily_task" })).toBeNull();
  });
});

describe("badges dans la sauvegarde du compte", () => {
  const settings = { enabled: false, preferredHour: 18, preferredMinute: 30, quietStartHour: 21, quietEndHour: 9, skipWateringWhenRainExpected: true, maxNormalRemindersPerDay: 1, enabledPlantIds: [] };
  const local: LocalGardenState = { plants: [], events: [], onboarding: null, settings, awards: { "badge:plate": at(3) } };

  it("le carnet complet part quand un badge a été obtenu, et pas sinon", () => {
    expect(buildPush(emptyOutbox(), local).awards).toBeUndefined();
    expect(buildPush(markAwardsDirty(emptyOutbox()), local).awards).toEqual({ "badge:plate": at(3) });
    expect(mergeOutbox(markAwardsDirty(emptyOutbox()), emptyOutbox()).awardsDirty).toBe(true);
    expect(seedOutbox(local, settings).awardsDirty).toBe(true);
  });

  it("un badge obtenu sur un autre téléphone s'ajoute, rien ne disparaît", () => {
    const applied = applySnapshot({ profile: { firstName: null, balcony: null }, settings: null, plants: [], events: [], awards: { "badge:bees": at(9), "badge:plate": at(8) }, serverTime: NOW.toISOString() }, emptyOutbox(), local);
    expect(applied.awards).toEqual({ "badge:plate": at(8), "badge:bees": at(9) });
    const olderServer = applySnapshot({ profile: { firstName: null, balcony: null }, settings: null, plants: [], events: [], serverTime: NOW.toISOString() }, emptyOutbox(), local);
    expect(olderServer.awards).toEqual({ "badge:plate": at(3) });
  });
});
