import { describe, expect, it } from "vitest";

import { openingDate, openingGreeting, openingLine } from "@/lib/garden/opening";

const at = (hour: number) => new Date(2026, 9, 17, hour, 30);

describe("message d'accueil", () => {
  it("dit bonjour le jour, bonsoir le soir et la nuit", () => {
    expect(openingGreeting(" Léa ", at(9))).toBe("Bonjour, Léa");
    expect(openingGreeting("Léa", at(19))).toBe("Bonsoir, Léa");
    expect(openingGreeting(undefined, at(2))).toBe("Bonsoir");
    expect(openingGreeting("", at(5))).toBe("Bonjour");
  });

  it("donne la date en toutes lettres", () => {
    expect(openingDate(at(9))).toBe("Samedi 17 octobre");
  });

  it("annonce l'alerte météo avant les gestes", () => {
    expect(openingLine({ plantCount: 2, alert: "Gel cette nuit : protège le basilic", status: { remaining: 3, doneToday: 0 }, now: at(9) })).toBe("Gel cette nuit : protège le basilic");
  });

  it("compte les gestes qui restent, au singulier comme au pluriel", () => {
    expect(openingLine({ plantCount: 2, status: { remaining: 1, doneToday: 0 }, now: at(9) })).toBe("Un geste t’attend aujourd’hui.");
    expect(openingLine({ plantCount: 2, status: { remaining: 3, doneToday: 1 }, now: at(16) })).toBe("3 gestes t’attendent avant ce soir.");
  });

  it("dit quand tout est fait, ou qu'il n'y a rien à faire", () => {
    expect(openingLine({ plantCount: 2, status: { remaining: 0, doneToday: 2 }, now: at(10) })).toBe("Ton balcon est à jour pour aujourd’hui.");
    expect(openingLine({ plantCount: 2, status: { remaining: 0, doneToday: 2 }, now: at(20) })).toBe("Ton balcon est prêt pour la nuit.");
    expect(openingLine({ plantCount: 2, status: { remaining: 0, doneToday: 0 }, now: at(10) })).toBe("Rien à faire aujourd’hui : profite de ton balcon.");
  });

  it("ne parle pas des gestes pendant les vacances", () => {
    expect(openingLine({ plantCount: 2, alert: "Orage : mets tes plantes à l’abri", away: true, status: { remaining: 2, doneToday: 0 }, now: at(10) })).toBe("Bonnes vacances : Balco veille sur ton balcon.");
  });

  it("invite à ajouter une plante quand le balcon est vide", () => {
    expect(openingLine({ plantCount: 0, status: { remaining: 0, doneToday: 0 }, now: at(10) })).toBe("Ton balcon t’attend : ajoute ta première plante.");
  });
});
