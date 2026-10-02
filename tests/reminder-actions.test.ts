import { describe, expect, it } from "vitest";

import {
  addSnooze,
  eventForReminder,
  nextPreferredDate,
  planGroupedNotification,
  planNotification,
  snoozeUntil,
  withoutSnoozed,
  type ReminderSnooze,
} from "../lib/reminders/reminder-actions";
import type { ReminderDecision } from "../lib/reminders/reminder-engine";

// Heures locales, pour ne pas dépendre du fuseau de la machine de test.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute);
const timing = { preferredHour: 18, preferredMinute: 30, quietStartHour: 21, quietEndHour: 9 };

function decision(plantId: string, overrides: Partial<ReminderDecision> = {}, now = at(28, 10)): ReminderDecision {
  return {
    plantId,
    taskType: "watering",
    priority: "normal",
    action: "observe",
    title: `Arrose ${plantId} si la terre est sèche`,
    body: "Dernier arrosage il y a 3 jours.",
    reason: "Délai dépassé.",
    validUntil: new Date(now.getTime() + 12 * 3600_000).toISOString(),
    weatherFetchedAt: now.toISOString(),
    ...overrides,
  };
}

describe("heure des rappels", () => {
  it("vise l'heure préférée du jour, ou celle du lendemain si elle est passée", () => {
    expect(nextPreferredDate(timing, at(28, 10))).toEqual(at(28, 18, 30));
    expect(nextPreferredDate(timing, at(28, 19))).toEqual(at(29, 18, 30));
  });

  it("« Dans 3 h » ne réveille pas pendant la plage calme", () => {
    expect(snoozeUntil("later", timing, at(28, 14))).toEqual(at(28, 17));
    // 19 h + 3 h = 22 h, en pleine plage calme : on attend 9 h le lendemain.
    expect(snoozeUntil("later", timing, at(28, 19))).toEqual(at(29, 9));
    // 5 h + 3 h = 8 h, encore calme : réveil à 9 h le jour même.
    expect(snoozeUntil("later", timing, at(28, 5))).toEqual(at(28, 9));
  });

  it("« Pas aujourd'hui » attend l'heure préférée du lendemain", () => {
    expect(snoozeUntil("skip", timing, at(28, 8))).toEqual(at(29, 18, 30));
    expect(snoozeUntil("skip", timing, at(28, 23))).toEqual(at(29, 18, 30));
  });
});

describe("mise en sommeil", () => {
  it("masque un rappel mis en sommeil, puis le laisse revenir", () => {
    const basil = decision("basilic");
    const mint = decision("menthe");
    const snoozes = addSnooze([], basil, "later", timing, at(28, 10));
    expect(withoutSnoozed([basil, mint], snoozes, at(28, 11)).map((item) => item.plantId)).toEqual(["menthe"]);
    expect(withoutSnoozed([basil, mint], snoozes, at(28, 13, 1)).map((item) => item.plantId)).toEqual(["basilic", "menthe"]);
  });

  it("remplace l'ancienne mise en sommeil de la même plante et oublie celles qui sont passées", () => {
    const basil = decision("basilic");
    let snoozes: ReminderSnooze[] = [{ key: "vieux:watering", kind: "skip", until: at(27, 18).toISOString() }];
    snoozes = addSnooze(snoozes, basil, "later", timing, at(28, 10));
    snoozes = addSnooze(snoozes, basil, "skip", timing, at(28, 11));
    expect(snoozes).toEqual([{ key: "basilic:watering", kind: "skip", until: at(29, 18, 30).toISOString() }]);
  });
});

describe("prochaine notification", () => {
  it("programme le rappel le plus urgent à l'heure préférée", () => {
    const urgent = decision("tomates", { priority: "urgent", taskType: "protection", action: "protect" });
    const plan = planNotification([urgent, decision("basilic")], [], timing, at(28, 10));
    expect(plan?.decision.plantId).toBe("tomates");
    expect(plan?.date).toEqual(at(28, 18, 30));
  });

  it("réveille un « Dans 3 h » à son heure, avant l'heure préférée", () => {
    const basil = decision("basilic", {}, at(28, 12));
    const snoozes = addSnooze([], basil, "later", timing, at(28, 12));
    const plan = planNotification([basil], snoozes, timing, at(28, 12, 5));
    expect(plan?.date).toEqual(at(28, 15));
  });

  it("ne programme rien pour un rappel écarté aujourd'hui", () => {
    const basil = decision("basilic");
    const snoozes = addSnooze([], basil, "skip", timing, at(28, 10));
    expect(planNotification([basil], snoozes, timing, at(28, 10))).toBeNull();
  });

  it("ne programme pas une notification qui arriverait après la fin de validité du conseil", () => {
    // Conseil calculé à 20 h, valable jusqu'à 8 h : l'heure préférée (18 h 30 le lendemain) est trop tard.
    expect(planNotification([decision("basilic", {}, at(28, 20))], [], timing, at(28, 20))).toBeNull();
  });
});

describe("geste enregistré par « Fait »", () => {
  it("note un arrosage, ou une simple observation pour un « n'arrose pas »", () => {
    const now = at(28, 18, 40);
    expect(eventForReminder(decision("basilic"), now)).toEqual({
      id: "reminder:basilic:watering:2026-09-28",
      plantId: "basilic",
      type: "watering",
      completedAt: now.toISOString(),
      source: "reminder",
      note: "Arrose basilic si la terre est sèche",
    });
    expect(eventForReminder(decision("basilic", { action: "skip", taskType: "observation" }), now).type).toBe("observation");
  });
});

describe("notification groupée", () => {
  it("envoie une seule notification pour la même alerte météo sur plusieurs plantes", () => {
    const rain = (plantId: string, plantLabel: string) => decision(plantId, { action: "skip", taskType: "observation", cause: "rain", value: 8, plantLabel, title: `N’arrose pas ${plantLabel} aujourd’hui` });
    const plan = planGroupedNotification([rain("basil", "le basilic"), rain("mint", "la menthe")], [], timing, at(28, 10));
    expect(plan?.group.decisions.map((item) => item.plantId)).toEqual(["basil", "mint"]);
    expect(plan?.group.title).toBe("N’arrose pas tes plantes aujourd’hui");
    expect(plan?.date).toEqual(at(28, 18, 30));
  });

  it("n'inclut pas une plante mise en sommeil jusqu'après l'heure de la notification", () => {
    const rain = (plantId: string) => decision(plantId, { action: "skip", taskType: "observation", cause: "rain", value: 8, plantLabel: plantId });
    const snoozes = addSnooze([], rain("mint"), "skip", timing, at(28, 10));
    const plan = planGroupedNotification([rain("basil"), rain("mint")], snoozes, timing, at(28, 10));
    expect(plan?.group.decisions.map((item) => item.plantId)).toEqual(["basil"]);
  });
});
