import { describe, expect, it } from "vitest";

import { anticipate, anticipationMonths, whenText } from "../lib/garden/anticipate";
import { resolvePlants } from "../lib/garden/garden-logic";
import { climateZoneFor } from "../lib/plants/climate";
import { pickTodayCards } from "../lib/garden/today-cards";

const day = (month: number, date: number) => new Date(2026, month - 1, date, 10);

describe("« À anticiper » : 3 à 6 semaines devant", () => {
  it("regarde les mois qui chevauchent la fenêtre, jamais le mois en cours", () => {
    expect(anticipationMonths(day(10, 8)).map((item) => item.month)).toEqual([11]);
    expect(anticipationMonths(day(10, 25)).map((item) => item.month)).toEqual([11, 12]);
    expect(anticipationMonths(day(10, 1)).map((item) => item.month)).toEqual([11]);
  });

  it("dit « Dans 4 semaines » quand le mois est encore loin, sinon « En novembre »", () => {
    expect(whenText(new Date(2026, 10, 1), day(10, 4))).toBe("Dans 4 semaines");
    expect(whenText(new Date(2026, 10, 1), day(10, 20))).toBe("En novembre");
  });

  it("annonce le semis au chaud d'une envie du printemps, avec ce qu'il faut préparer", () => {
    const result = anticipate({ plants: [], events: [], springWishes: ["cherry-tomato"], now: day(2, 5) });
    expect(result).toMatchObject({ kind: "sow-indoor", month: 3, when: "Dans 3 semaines", title: "Semis de tomates cerises au chaud", prepare: "Prépare des godets et du terreau à semis." });
    expect(result?.plantId).toBeUndefined();
  });

  it("annonce la plantation d'une plante choisie mais pas encore en terre", () => {
    const plants = resolvePlants([{ id: "garlic-1", catalogId: "garlic", addedAt: day(9, 1).toISOString(), toPlant: true }]);
    // L'ail se plante en octobre : en septembre, c'est à anticiper.
    expect(anticipate({ plants, events: [], now: day(9, 5) })).toMatchObject({ kind: "plant", plantId: "garlic-1", title: "Plantation d’ail", prepare: "Il te faudra un pot d’au moins 8 L et du terreau." });
    // Déjà possible ce mois-ci : c'est sur Aujourd'hui, pas une annonce.
    expect(anticipate({ plants, events: [], now: day(10, 8) })).toBeNull();
  });

  it("annonce le rempotage d'une vivace quand son rythme arrive, avec le pot à prévoir", () => {
    // Une menthe arrivée il y a deux ans : rempotage chaque année, au printemps.
    const plants = resolvePlants([{ id: "mint-1", catalogId: "mint", addedAt: new Date(2024, 1, 10).toISOString() }]);
    const result = anticipate({ plants, events: [], now: day(2, 5) });
    expect(result).toMatchObject({ kind: "repot", plantId: "mint-1", title: "Rempotage de la menthe" });
    expect(result?.prepare).toMatch(/^Prévois un pot d’environ \d+ L \(\d+ cm de large\) et du terreau neuf\.$/u);
  });

  it("garde la plus proche, et rien quand rien n'est prévu", () => {
    const result = anticipate({ plants: [], events: [], springWishes: ["basil", "sweet-pepper"], now: day(1, 8) });
    // Poivron semé au chaud en février, basilic en mars : le poivron d'abord.
    expect(result).toMatchObject({ kind: "sow-indoor", title: "Semis de poivron au chaud", month: 2 });
    expect(anticipate({ plants: [], events: [], springWishes: [], now: day(7, 1) })).toBeNull();
  });

  it("suit le climat : en montagne, le basilic se sème un mois plus tard", () => {
    const mountain = climateZoneFor(45.9, 6.9, 1200);
    expect(anticipate({ plants: [], events: [], springWishes: ["basil"], now: day(2, 5) })).toMatchObject({ month: 3 });
    expect(anticipate({ plants: [], events: [], springWishes: ["basil"], now: day(2, 5), climate: mountain })).toBeNull();
    expect(anticipate({ plants: [], events: [], springWishes: ["basil"], now: day(3, 5), climate: mountain })).toMatchObject({ month: 4 });
  });
});

describe("cartes en plus d'Aujourd'hui", () => {
  it("au plus deux, par priorité ; les envies du printemps prennent la place de l'annonce", () => {
    expect(pickTodayCards({ anticipate: true, tip: true, idea: true })).toEqual(["anticipate", "tip"]);
    expect(pickTodayCards({ event: true, anticipate: true, idea: true })).toEqual(["event", "anticipate"]);
    expect(pickTodayCards({ spring: true, anticipate: true, idea: true })).toEqual(["spring", "idea"]);
    expect(pickTodayCards({ idea: true })).toEqual(["idea"]);
    expect(pickTodayCards({})).toEqual([]);
  });
});
