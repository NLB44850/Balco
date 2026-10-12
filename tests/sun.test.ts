import { describe, expect, it } from "vitest";

import { seasonSunHours, sunClass, sunHoursOn, sunPosition, sunSummary } from "../lib/garden/sun";
import { onboardingSteps } from "../lib/garden/onboarding";
import { sunlightValue, sunPatch } from "../lib/garden/settings-summary";

const PARIS = 48.85;

describe("simulateur de soleil", () => {
  it("place le soleil au sud à midi, plus haut l'été que l'hiver", () => {
    const summer = sunPosition(PARIS, new Date(2026, 5, 21), 12);
    const winter = sunPosition(PARIS, new Date(2026, 11, 21), 12);
    expect(summer.azimuth).toBeCloseTo(180, 0);
    expect(summer.altitude).toBeGreaterThan(60);
    expect(winter.altitude).toBeLessThan(20);
    // Le matin à l'est, le soir à l'ouest.
    expect(sunPosition(PARIS, new Date(2026, 5, 21), 8).azimuth).toBeLessThan(180);
    expect(sunPosition(PARIS, new Date(2026, 5, 21), 16).azimuth).toBeGreaterThan(180);
  });

  it("classe les orientations comme les jardiniers : sud plein soleil, est et ouest mi-ombre, nord ombre", () => {
    expect(sunClass(seasonSunHours({ orientation: "S", latitude: PARIS }))).toBe("sunny");
    expect(sunClass(seasonSunHours({ orientation: "E", latitude: PARIS }))).toBe("partial");
    expect(sunClass(seasonSunHours({ orientation: "W", latitude: PARIS }))).toBe("partial");
    expect(sunClass(seasonSunHours({ orientation: "N", latitude: PARIS }))).toBe("shade");
  });

  it("retire le soleil caché par un balcon au-dessus ou un immeuble en face", () => {
    const open = seasonSunHours({ orientation: "S", latitude: PARIS });
    const covered = seasonSunHours({ orientation: "S", latitude: PARIS, covered: true });
    const both = seasonSunHours({ orientation: "S", latitude: PARIS, covered: true, facing: true });
    expect(covered).toBeLessThan(open);
    expect(both).toBeLessThan(covered);
    expect(sunClass(both)).toBe("partial");
    // L'hiver, un immeuble en face cache tout le soleil bas.
    expect(sunHoursOn({ orientation: "S", latitude: PARIS, facing: true }, new Date(2026, 11, 21))).toBe(0);
  });

  it("dit les heures en mots simples", () => {
    expect(sunSummary(5.5)).toBe("Environ 5 h 30 de soleil par jour, d’avril à septembre : mi-ombre.");
    expect(sunSummary(7)).toBe("Environ 7 h de soleil par jour, d’avril à septembre : plein soleil.");
  });

  it("enregistre l'orientation et en déduit le soleil, ou garde « Je ne sais pas »", () => {
    expect(sunPatch("S", false, false, PARIS)).toMatchObject({ orientation: "S", sunlight: "sunny", sunlightUnknown: false });
    expect(sunPatch("N", false, false, PARIS)).toMatchObject({ sunlight: "shade" });
    expect(sunPatch("unknown", false, false, PARIS)).toMatchObject({ sunlight: "partial", sunlightUnknown: true, orientation: undefined });
    expect(sunlightValue({ orientation: "E", sunlight: "partial", sunlightUnknown: false })).toBe("Est · mi-ombre");
    // Réponse d'avant le simulateur : la valeur d'avant.
    expect(sunlightValue({ sunlight: "sunny" })).toBe("Toute la journée");
  });

  it("ajoute l'écran de l'ombre dans l'accueil quand l'orientation est connue", () => {
    expect(onboardingSteps({ hasPlants: false, orientation: true })).toEqual(["has", "sun", "shade", "space", "goals", "city", "plants"]);
    expect(onboardingSteps({ hasPlants: true })).toEqual(["has", "which", "sun", "space", "city"]);
  });
});
