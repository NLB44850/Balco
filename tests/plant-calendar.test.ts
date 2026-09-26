import { describe, expect, it } from "vitest";

import { calendarActivities, upcomingMonths } from "../lib/plants/calendar";
import { getCatalogPlant } from "../lib/plants/catalog";

const subject = (catalogId: string, id = catalogId) => ({ id, entry: getCatalogPlant(catalogId)!, displayName: getCatalogPlant(catalogId)!.name });

describe("calendar activities", () => {
  it("derives sowing, harvest and care from the catalog", () => {
    const july = calendarActivities([subject("cherry-tomato")], 7);
    expect(july.map((activity) => activity.kind)).toEqual(["harvest", "care", "care"]);
    expect(july[0]).toMatchObject({ title: "Récolte les tomates cerises", eventType: "harvest" });
    expect(july.map((activity) => activity.title)).toEqual(expect.arrayContaining(["Retire les gourmands des tomates", "Vérifie le tuteur des tomates"]));

    const march = calendarActivities([subject("cherry-tomato")], 3);
    expect(march.map((activity) => activity.kind)).toEqual(["sow"]);
  });

  it("keeps activities of each plant instance distinct", () => {
    const activities = calendarActivities([subject("basil", "basil-1"), subject("basil", "basil-2")], 7);
    expect(new Set(activities.map((activity) => activity.key)).size).toBe(activities.length);
    expect(activities.some((activity) => activity.subjectId === "basil-2")).toBe(true);
  });

  it("returns nothing for a dormant month", () => {
    expect(calendarActivities([subject("zucchini")], 12)).toEqual([]);
  });

  it("lists the next twelve months from the current one", () => {
    expect(upcomingMonths(new Date(2026, 8, 26))).toEqual([9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
