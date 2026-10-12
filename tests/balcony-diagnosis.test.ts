import { describe, expect, it } from "vitest";

import { diagnoseBalcony, hoursText } from "../lib/garden/balcony-diagnosis";
import { getCatalogPlant } from "../lib/plants/catalog";
import { climateZoneFor } from "../lib/plants/climate";
import { sunPatch } from "../lib/garden/settings-summary";

const PARIS = 48.85;
const OCTOBER = new Date(2026, 9, 13);

describe("diagnostic du balcon", () => {
  it("donne le soleil en heures, la chaleur d'un plein sud, la place et le climat", () => {
    const answers = { ...sunPatch("S", false, false, PARIS), space: "balcony" };
    const diagnosis = diagnoseBalcony({ answers, latitude: PARIS, climate: climateZoneFor(PARIS, 2.35), now: OCTOBER });
    expect(diagnosis.headline).toBe("Plein sud");
    expect(diagnosis.sunHours).toBe(7.5);
    expect(diagnosis.items.map((item) => item.key)).toEqual(["sun", "heat", "space", "climate"]);
    expect(diagnosis.items[0].title).toBe("Plein soleil : 7 h 30 de soleil par jour");
    expect(diagnosis.bestPlants).toHaveLength(3);
  });

  it("prévient qu'un balcon couvert ne reçoit pas la pluie, et qu'un vis-à-vis cache le soleil bas", () => {
    const answers = sunPatch("E", true, true, PARIS);
    const diagnosis = diagnoseBalcony({ answers, latitude: PARIS, now: OCTOBER });
    expect(diagnosis.headline).toBe("À l’est, couvert, avec vis-à-vis");
    expect(diagnosis.items.find((item) => item.key === "rain")).toMatchObject({ tone: "watch", text: "Vérifie la terre même quand il pleut : le toit l’arrête." });
    expect(diagnosis.items.find((item) => item.key === "facing")).toBeDefined();
    expect(diagnosis.items.find((item) => item.key === "heat")).toBeUndefined();
  });

  it("signale les plantes déjà là qui voudraient plus de soleil, accordées", () => {
    const answers = sunPatch("N", false, false, PARIS);
    const diagnosis = diagnoseBalcony({ answers, latitude: PARIS, plants: [getCatalogPlant("cherry-tomato")!], now: OCTOBER });
    expect(diagnosis.items.find((item) => item.key === "shade")).toBeDefined();
    expect(diagnosis.items.find((item) => item.key === "plant-cherry-tomato")?.text).toBe("Les tomates cerises préfèrent le plein soleil.");
    expect(diagnosis.bestPlants.map((entry) => entry.id)).not.toContain("cherry-tomato");
  });

  it("sans orientation : mi-ombre par prudence, et une invitation à la choisir", () => {
    const diagnosis = diagnoseBalcony({ answers: sunPatch("unknown", false, false, PARIS), latitude: PARIS, now: OCTOBER });
    expect(diagnosis.sunHours).toBeNull();
    expect(diagnosis.items[0]).toMatchObject({ title: "Mi-ombre, par prudence" });
    expect(hoursText(5)).toBe("5 h");
    expect(hoursText(5.5)).toBe("5 h 30");
  });
});
