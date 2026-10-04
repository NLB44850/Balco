import { describe, expect, it } from "vitest";

import { eventForGesture, planDay } from "../lib/garden/day-plan";

import { createGardenPlant, eventForSessionTask, resolvePlants } from "../lib/garden/garden-logic";
import { addPhoto, coverPhotos, growingSince, journalByDay, orphanPhotos, photoDateLabel, photosForPlant, sunlightLabel, type PlantPhoto } from "../lib/garden/photos";
import { getCatalogPlant } from "../lib/plants/catalog";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

// Dates en heure locale pour ne pas dépendre du fuseau de la machine de test.
const now = new Date(2026, 8, 29, 10, 0); // mardi 29 septembre 2026
const daysAgo = (days: number, hour = 10) => new Date(2026, 8, 29 - days, hour, 0);
const photo = (id: string, plantId: string, date: Date): PlantPhoto => ({ id, plantId, takenAt: date.toISOString(), source: `${id}.jpg` });

describe("photos des plantes", () => {
  it("classe les photos d'une plante de la plus récente à la plus ancienne et choisit la couverture", () => {
    const photos = [photo("a", "basil", daysAgo(5)), photo("b", "basil", daysAgo(1)), photo("c", "mint", daysAgo(3))];
    expect(photosForPlant(photos, "basil").map((item) => item.id)).toEqual(["b", "a"]);
    const covers = coverPhotos(photos);
    expect(covers.get("basil")?.id).toBe("b");
    expect(covers.get("mint")?.id).toBe("c");
    expect(covers.has("thyme")).toBe(false);
  });

  it("garde au plus N photos par plante et renvoie celles qui partent", () => {
    let photos: PlantPhoto[] = [];
    for (let day = 5; day >= 1; day -= 1) photos = addPhoto(photos, photo(`p${day}`, "basil", daysAgo(day)), 3).photos;
    photos = addPhoto(photos, photo("m", "mint", daysAgo(9)), 3).photos;
    const result = addPhoto(photos, photo("new", "basil", now), 3);
    expect(photosForPlant(result.photos, "basil").map((item) => item.id)).toEqual(["new", "p1", "p2"]);
    expect(result.dropped.map((item) => item.id)).toEqual(["p3"]);
    expect(result.photos.some((item) => item.id === "m")).toBe(true);
  });

  it("repère les photos des plantes qui ont quitté le balcon", () => {
    const photos = [photo("a", "basil", daysAgo(1)), photo("b", "gone", daysAgo(2))];
    expect(orphanPhotos(photos, ["basil"]).map((item) => item.id)).toEqual(["b"]);
    expect(orphanPhotos(photos, [])).toHaveLength(2);
  });

  it("date la photo en mots simples", () => {
    expect(photoDateLabel(daysAgo(0, 8).toISOString(), now)).toBe("Ta photo d’aujourd’hui");
    expect(photoDateLabel(daysAgo(1).toISOString(), now)).toBe("Ta photo d’hier");
    expect(photoDateLabel(daysAgo(4).toISOString(), now)).toBe("Ta photo · il y a 4 jours");
    expect(photoDateLabel(new Date(2026, 6, 12).toISOString(), now)).toMatch(/^Ta photo du 12 juil/);
  });

  it("dit depuis combien de temps la plante est sur le balcon", () => {
    expect(growingSince(now.toISOString(), now)).toBe("Depuis aujourd’hui");
    expect(growingSince(daysAgo(1).toISOString(), now)).toBe("Depuis 1 jour");
    expect(growingSince(daysAgo(12).toISOString(), now)).toBe("Depuis 12 jours");
    expect(growingSince(daysAgo(28).toISOString(), now)).toBe("Depuis 4 semaines");
    expect(growingSince(daysAgo(120).toISOString(), now)).toBe("Depuis 4 mois");
    expect(growingSince(daysAgo(800).toISOString(), now)).toBe("Depuis 2 ans");
  });

  it("résume l'exposition aimée par la plante", () => {
    const basil = getCatalogPlant("basil")!;
    expect(sunlightLabel({ ...basil, sunlight: ["sunny"] })).toBe("Soleil");
    expect(sunlightLabel({ ...basil, sunlight: ["partial", "sunny"] })).toBe("Soleil ou mi-ombre");
    expect(sunlightLabel({ ...basil, sunlight: ["shade", "partial", "sunny"] })).toBe("Toute exposition");
  });
});

describe("fiche plante", () => {
  const [basil] = resolvePlants([{ ...createGardenPlant("basil", daysAgo(10)), id: "basil-1" }]);

  it("propose le prochain geste du jour (le plan du jour), puis le montre fait une fois coché", () => {
    const gesture = planDay({ plants: [basil], events: [], now })[0].first;
    expect(gesture).not.toBeNull();
    expect(gesture!.done).toBe(false);
    const events = [eventForGesture(gesture!, now)];
    expect(planDay({ plants: [basil], events, now })[0].first?.done).toBe(true);
  });

  it("mêle photos et gestes jour par jour, du plus récent au plus ancien", () => {
    const events: MaintenanceEvent[] = [
      { id: "e1", plantId: "basil-1", type: "watering", completedAt: daysAgo(0, 9).toISOString(), source: "daily_task" },
      { id: "e2", plantId: "basil-1", type: "harvest", completedAt: daysAgo(3).toISOString(), source: "daily_task" },
      { id: "other", plantId: "mint-1", type: "watering", completedAt: daysAgo(1).toISOString(), source: "daily_task" },
    ];
    const photos = [photo("p1", "basil-1", daysAgo(1)), photo("p0", "basil-1", daysAgo(0, 8))];
    const days = journalByDay(events, photos, "basil-1", now);
    expect(days.map((day) => day.label)).toEqual(["Aujourd’hui", "Hier", expect.stringMatching(/^Samedi 26 septembre/)]);
    expect(days[0].events.map((event) => event.id)).toEqual(["e1"]);
    expect(days[0].photos.map((item) => item.id)).toEqual(["p0"]);
    expect(days[1].events).toEqual([]);
    expect(days[1].photos.map((item) => item.id)).toEqual(["p1"]);
    expect(days[2].events.map((event) => event.id)).toEqual(["e2"]);
  });
});
