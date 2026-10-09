import { describe, expect, it } from "vitest";

import { coldMode, eventAwardKey, eventCardText, eventParticipation, PREPARE_SPRING, SAINTS_DE_GLACE, SUMMER_HOLIDAYS, eventAwards, eventMoment, eventPlanted, eventPlantings, nextEventNotification, protectionDone, protectionEvents, SAINTE_CATHERINE } from "../lib/events/events";
import { resolvePlants } from "../lib/garden/garden-logic";
import { awardCelebration } from "../lib/garden/progress";
import { climateZoneFor } from "../lib/plants/climate";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const day = (month: number, date: number, hour = 10) => new Date(2026, month - 1, date, hour);

describe("Sainte-Catherine : dates", () => {
  it("visible du 18 au 30 novembre, puis le bilan quelques jours", () => {
    expect(eventMoment(day(11, 17, 23))).toBeNull();
    expect(eventMoment(day(11, 18, 0))).toMatchObject({ phase: "running", year: 2026 });
    expect(eventMoment(day(11, 30, 23))).toMatchObject({ phase: "running" });
    expect(eventMoment(day(12, 1))).toMatchObject({ phase: "summary", year: 2026 });
    expect(eventMoment(day(12, 4))).toBeNull();
  });

  it("une seule notification, le 18 novembre à l'heure du conseil ; rien une fois l'événement commencé", () => {
    const next = nextEventNotification(day(10, 8), { preferredHour: 18, preferredMinute: 30 });
    expect(next?.event.id).toBe("sainte-catherine");
    expect(next?.date).toEqual(new Date(2026, 10, 18, 18, 30));
    // Une fois la Sainte-Catherine commencée, la suivante est « Prépare ton printemps », le 12 janvier.
    expect(nextEventNotification(day(11, 20), { preferredHour: 8, preferredMinute: 30 })).toMatchObject({ event: { id: "prepare-ton-printemps" }, date: new Date(2027, 0, 12, 8, 30) });
  });
});

describe("Ce qui se plante maintenant", () => {
  it("propose les petits fruits d'abord, adaptés au soleil et à la place, sans les fraisiers", () => {
    const sunnyBalcony = eventPlantings(SAINTE_CATHERINE, { sunlight: "sunny", space: "balcony" });
    expect(sunnyBalcony.map((entry) => entry.id)).toEqual(["dwarf-raspberry", "redcurrant", "blackcurrant", "blueberry"]);
    expect(sunnyBalcony.some((entry) => entry.id === "strawberry")).toBe(false);
  });

  it("sur un rebord de fenêtre ou en jardinière, ce qui y tient (violas, ail)", () => {
    expect(eventPlantings(SAINTE_CATHERINE, { sunlight: "sunny", space: "windowsill" }).map((entry) => entry.id)).toEqual(["viola"]);
    expect(eventPlantings(SAINTE_CATHERINE, { sunlight: "sunny", space: "planter" }).map((entry) => entry.id)).toEqual(["garlic", "viola"]);
    expect(eventPlantings(SAINTE_CATHERINE, { sunlight: "shade", space: "planter" }).map((entry) => entry.id)).toEqual(["viola", "wild-garlic"]);
  });

  it("ne repropose pas une plante déjà en terre sur le balcon", () => {
    expect(eventPlantings(SAINTE_CATHERINE, { sunlight: "sunny", space: "balcony" }, { owned: ["dwarf-raspberry"] })[0].id).toBe("redcurrant");
  });

  it("met la protection en avant en montagne ou quand le gel est annoncé", () => {
    expect(coldMode(climateZoneFor(45.9, 6.9, 1200), false)).toBe(true);
    expect(coldMode(climateZoneFor(48.85, 2.35), false)).toBe(false);
    expect(coldMode(null, true)).toBe(true);
  });
});

describe("badge et bilan", () => {
  const plants = resolvePlants([
    { id: "rasp-1", catalogId: "dwarf-raspberry", addedAt: day(11, 19).toISOString() },
    { id: "basil-1", catalogId: "basil", addedAt: day(5, 1).toISOString() },
  ]);
  const start = (plantId: string, when: Date): MaintenanceEvent => ({ id: `${plantId}:start`, plantId, type: "observation", completedAt: when.toISOString(), source: "manual" });

  it("le badge de l'édition, daté de la première plantation faite pendant l'événement", () => {
    const events = [start("rasp-1", day(11, 20))];
    expect(eventPlanted(SAINTE_CATHERINE, 2026, plants, events)).toHaveLength(1);
    expect(eventAwards(plants, events, day(11, 21))).toEqual({ [eventAwardKey(SAINTE_CATHERINE, 2026)]: day(11, 20).toISOString() });
    expect(awardCelebration("event:sainte-catherine:2026")).toMatchObject({ title: "Nouveau badge : Sainte-Catherine · 2026", big: true });
    expect(SAINTE_CATHERINE.summary(2)).toBe("Tu as planté 2 plantes pour la Sainte-Catherine. Rendez-vous au printemps pour les voir repartir.");
    expect(SAINTE_CATHERINE.summary(1)).toMatch(/^Tu as planté 1 plante pour/u);
  });

  it("rien pour une plantation avant l'événement, ni pour une plante qui ne se plante pas en novembre", () => {
    expect(eventAwards(plants, [start("rasp-1", day(11, 10))], day(11, 21))).toEqual({});
    expect(eventPlanted(SAINTE_CATHERINE, 2026, plants, [start("basil-1", day(11, 20))])).toEqual([]);
  });

  it("« Paille tes pots » : noté pour chaque pot en terre, une fois par édition", () => {
    const waiting = resolvePlants([{ id: "garlic-1", catalogId: "garlic", addedAt: day(11, 1).toISOString(), toPlant: true }]);
    const logged = protectionEvents(SAINTE_CATHERINE, 2026, [...plants, ...waiting], day(11, 22));
    expect(logged.map((item) => item.plantId)).toEqual(["rasp-1", "basil-1"]);
    expect(logged[0]).toMatchObject({ type: "protection", id: "event:sainte-catherine:2026:mulch:rasp-1", note: "Paille tes pots avant l’hiver" });
    expect(protectionDone(SAINTE_CATHERINE, 2026, logged)).toBe(true);
    expect(protectionDone(SAINTE_CATHERINE, 2027, logged)).toBe(false);
  });
});

describe("les autres temps forts de l'année", () => {
  const paris = climateZoneFor(48.85, 2.35);
  const mountain = climateZoneFor(45.9, 6.9, 1200);
  const nice = climateZoneFor(43.7, 7.26);

  it("un par saison : janvier, mai, juillet, novembre", () => {
    expect(eventMoment(new Date(2027, 0, 20, 10), paris)?.event.id).toBe("prepare-ton-printemps");
    expect(eventMoment(new Date(2027, 4, 8, 10), paris)?.event.id).toBe("saints-de-glace");
    expect(eventMoment(new Date(2027, 6, 5, 10), paris)?.event.id).toBe("balcon-en-vacances");
    expect(eventMoment(new Date(2027, 2, 15, 10), paris)).toBeNull();
  });

  it("les Saints de glace : pas en montagne ni dans le Midi, où les gelées finissent à d'autres dates", () => {
    expect(eventMoment(new Date(2027, 4, 8, 10), mountain)).toBeNull();
    expect(eventMoment(new Date(2027, 4, 8, 10), nice)).toBeNull();
    expect(eventMoment(new Date(2027, 4, 8, 10), null)?.event.id).toBe("saints-de-glace");
    expect(nextEventNotification(new Date(2027, 3, 1), { preferredHour: 18, preferredMinute: 30 }, mountain)?.event.id).toBe("balcon-en-vacances");
  });

  it("compte à rebours, puis feu vert selon la météo réelle", () => {
    const text = (date: Date, frostAnnounced = false) => eventCardText(SAINTS_DE_GLACE, { now: date, year: 2027, frostAnnounced });
    expect(text(new Date(2027, 4, 8, 10))).toBe("Dans 3 jours : garde encore tes plantes frileuses à l’abri");
    expect(text(new Date(2027, 4, 10, 10))).toBe("Dans 1 jour : garde encore tes plantes frileuses à l’abri");
    expect(text(new Date(2027, 4, 12, 10))).toBe("C’est aujourd’hui : attends encore un peu pour les plantes frileuses");
    expect(text(new Date(2027, 4, 15, 10))).toBe("Feu vert : installe tes plantes frileuses dehors");
    expect(text(new Date(2027, 4, 15, 10), true)).toBe("Pas encore : du gel est annoncé chez toi");
  });

  it("les Saints de glace proposent seulement des plantes frileuses, et le badge vient après le 13 mai", () => {
    const list = eventPlantings(SAINTS_DE_GLACE, { sunlight: "sunny", space: "balcony" });
    expect(list.map((entry) => entry.id)).toEqual(["cherry-tomato", "basil", "sweet-pepper", "chili"]);
    const plants = resolvePlants([{ id: "tomato-1", catalogId: "cherry-tomato", addedAt: new Date(2027, 4, 1).toISOString() }]);
    const start = (date: Date): MaintenanceEvent => ({ id: "tomato-1:start", plantId: "tomato-1", type: "observation", completedAt: date.toISOString(), source: "manual" });
    expect(eventAwards(plants, [start(new Date(2027, 4, 9, 10))], new Date(2027, 4, 21))).toEqual({});
    expect(eventAwards(plants, [start(new Date(2027, 4, 15, 10))], new Date(2027, 4, 21))).toEqual({ "event:saints-de-glace:2027": new Date(2027, 4, 15, 10).toISOString() });
  });

  it("Prépare ton printemps : des plantes à garder pour le printemps, badge donné en les gardant", () => {
    const list = eventPlantings(PREPARE_SPRING, { sunlight: "sunny", space: "balcony" });
    expect(list).toHaveLength(5);
    expect(list[0].id).toBe("cherry-tomato");
    expect(eventParticipation(PREPARE_SPRING, 2027, { plants: [], events: [], springWishes: ["basil", "radish"], awards: { "event:prepare-ton-printemps:2027": "2027-01-15T10:00:00.000Z" } })).toBe(2);
    expect(eventParticipation(PREPARE_SPRING, 2027, { plants: [], events: [], springWishes: ["basil"] })).toBe(0);
  });

  it("Balcon en vacances : le paillage fait le badge et le bilan", () => {
    const plants = resolvePlants([{ id: "basil-1", catalogId: "basil", addedAt: new Date(2027, 4, 20).toISOString() }]);
    const mulch = protectionEvents(SUMMER_HOLIDAYS, 2027, plants, new Date(2027, 6, 3, 18));
    expect(eventAwards(plants, mulch, new Date(2027, 6, 4))).toEqual({ "event:balcon-en-vacances:2027": new Date(2027, 6, 3, 18).toISOString() });
    expect(eventParticipation(SUMMER_HOLIDAYS, 2027, { plants, events: mulch })).toBe(1);
    expect(SUMMER_HOLIDAYS.link?.route).toBe("/vacation");
  });
});
