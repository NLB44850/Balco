import { describe, expect, it } from "vitest";

import type { PlantDay } from "@/lib/garden/day-plan";
import { digestText, planDailyDigests } from "@/lib/reminders/daily-digest";

const day = (gestures: [string, string, boolean][]) => ({ gestures: gestures.map(([kind, title, done]) => ({ kind, title, done })) }) as unknown as PlantDay;
const timing = { preferredHour: 9, preferredMinute: 0, quietStartHour: 22, quietEndHour: 7 };
const at = (date: number, hour: number) => new Date(2026, 9, date, hour, 0);

describe("récapitulatifs des 7 prochains jours", () => {
  it("résume le premier geste à faire de chaque plante", () => {
    expect(digestText([day([["watering", "Arrose le basilic", false]])])).toEqual({ title: "🌱 Un geste pour ton balcon aujourd’hui", body: "Arrose le basilic." });
    expect(digestText([day([["watering", "Arrose le basilic", false]]), day([["harvest", "Récolte le thym", false]])])?.body).toBe("Arrose le basilic et récolte le thym.");
    const four = digestText([day([["watering", "Arrose le basilic", false]]), day([["harvest", "Récolte le thym", false]]), day([["care", "Pince la menthe", false]]), day([["watering", "Arrose la lavande", false]])]);
    expect(four).toEqual({ title: "🌱 4 gestes pour ton balcon aujourd’hui", body: "Arrose le basilic, récolte le thym et 2 autres gestes." });
  });

  it("rien à faire (ou déjà fait), pas de notification", () => {
    expect(digestText([])).toBeNull();
    expect(digestText([day([["watering", "Arrose le basilic", true]])])).toBeNull();
  });

  it("un par jour à l'heure des rappels, après le jour du conseil déjà prévu", () => {
    const planFor = () => [day([["watering", "Arrose le basilic", false]])];
    const digests = planDailyDigests({ now: at(18, 20), timing, nextReminder: at(19, 9), planFor });
    expect(digests.map((digest) => digest.day)).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(digests[0].date).toEqual(at(20, 9));
  });

  it("sans conseil prévu, aujourd'hui compte encore si l'heure n'est pas passée ; vacances et jours sans geste sautés", () => {
    const planFor = (date: Date) => (date.getDate() === 21 ? [] : [day([["watering", "Arrose le basilic", false]])]);
    const digests = planDailyDigests({ now: at(18, 8), timing, nextReminder: null, planFor, isAway: (key) => key === "2026-10-23" });
    expect(digests.map((digest) => digest.day)).toEqual(["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-22", "2026-10-24", "2026-10-25"]);
  });
});
