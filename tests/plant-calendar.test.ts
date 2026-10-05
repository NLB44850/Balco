import { describe, expect, it } from "vitest";

import { activityDoneLabel, activityDoneSoFar, activityGroupSummary, activityGroupTitle, calendarActivities, groupActivities, upcomingMonths } from "../lib/plants/calendar";
import { getCatalogPlant } from "../lib/plants/catalog";

const subject = (catalogId: string, id = catalogId) => ({ id, entry: getCatalogPlant(catalogId)!, displayName: getCatalogPlant(catalogId)!.name });

describe("calendar activities", () => {
  it("derives sowing, harvest and care from the catalog", () => {
    const july = calendarActivities([subject("cherry-tomato")], 7);
    expect(july.map((activity) => activity.kind)).toEqual(["harvest", "care", "care", "care"]);
    expect(july[0]).toMatchObject({ title: "Récolte les tomates cerises", eventType: "harvest" });
    expect(july.map((activity) => activity.title)).toEqual(expect.arrayContaining(["Retire les gourmands des tomates", "Vérifie le tuteur des tomates", "Nourris les tomates cerises (engrais)"]));

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

import { activityDone, activityEventId, describeMonths, eventForActivity, seasonActivities, seasonalToDo, SEASONS, upcomingSeasons } from "../lib/plants/calendar";
import { adaptToClimate, climateSummary, climateZoneFor } from "../lib/plants/climate";
import { sessionEventId } from "../lib/garden/garden-logic";

describe("rempotage", () => {
  it("propose de rempoter les vivaces au printemps, pas les annuelles", () => {
    const march = calendarActivities([subject("thyme"), subject("basil")], 3);
    expect(march.filter((activity) => activity.kind === "repot").map((activity) => activity.title)).toEqual(["Rempote le thym"]);
    expect(march.find((activity) => activity.kind === "repot")?.eventType).toBe("repotting");
  });

  it("suit les exceptions du catalogue (ail des ours à l'automne)", () => {
    expect(calendarActivities([subject("wild-garlic")], 9).some((activity) => activity.kind === "repot")).toBe(true);
    expect(calendarActivities([subject("wild-garlic")], 3).some((activity) => activity.kind === "repot")).toBe(false);
  });
});

describe("climat local", () => {
  it.each([
    ["Marseille", 43.3, 5.37, 20, "mediterranean"],
    ["Ajaccio", 41.92, 8.74, 10, "mediterranean"],
    ["Nantes", 47.22, -1.55, 20, "oceanic"],
    ["Bordeaux", 44.84, -0.58, 10, "oceanic"],
    ["Toulouse", 43.6, 1.44, 150, "oceanic"],
    ["Paris", 48.85, 2.35, 35, "temperate"],
    ["Lille", 50.63, 3.06, 20, "temperate"],
    ["Strasbourg", 48.57, 7.75, 140, "continental"],
    ["Chamonix", 45.92, 6.87, 1035, "mountain"],
  ] as const)("%s : climat %s", (_city, latitude, longitude, elevation, zone) => {
    expect(climateZoneFor(latitude, longitude, elevation).zone).toBe(zone);
  });

  it("signale une position hors de France", () => {
    const london = climateZoneFor(51.5, -0.12, 20);
    expect(london.outsideFrance).toBe(true);
    expect(climateSummary(london)).toContain("Hors de France");
  });

  it("avance les plantations frileuses dans le Midi et les retarde en montagne", () => {
    const tomato = getCatalogPlant("cherry-tomato")!;
    expect(tomato.plantMonths).toEqual([5, 6]);
    expect(adaptToClimate(tomato, climateZoneFor(43.3, 5.37, 20)).plantMonths).toEqual([4, 5]);
    expect(adaptToClimate(tomato, climateZoneFor(45.92, 6.87, 1035)).plantMonths).toEqual([6, 7]);
    // Une plante rustique ne bouge pas.
    const thyme = getCatalogPlant("thyme")!;
    expect(adaptToClimate(thyme, climateZoneFor(43.3, 5.37, 20))).toBe(thyme);
  });

  it("le calendrier du Midi propose de planter les tomates dès avril", () => {
    const climate = climateZoneFor(43.3, 5.37, 20);
    expect(calendarActivities([subject("cherry-tomato")], 4, { climate }).map((activity) => activity.kind)).toContain("plant");
    expect(calendarActivities([subject("cherry-tomato")], 4).map((activity) => activity.kind)).not.toContain("plant");
    expect(climateSummary(climate)).toBe("Climat méditerranéen · dernières gelées vers mi-mars. Semis et plantations frileuses : un mois plus tôt.");
  });
});

describe("lien avec l'accueil", () => {
  const now = new Date(2026, 6, 14, 10);

  it("un entretien du calendrier porte le même identifiant que dans la session du jour", () => {
    const suckers = calendarActivities([subject("cherry-tomato", "tomato-1")], 7).find((activity) => activity.taskId === "suckers")!;
    expect(activityEventId(suckers, now)).toBe(sessionEventId("tomato-1", "suckers", now));
  });

  it("un rempotage noté reste fait tout le mois", () => {
    const march = new Date(2026, 2, 3);
    const repot = calendarActivities([subject("thyme", "thyme-1")], 3).find((activity) => activity.kind === "repot")!;
    const event = eventForActivity(repot, march);
    expect(activityDone(repot, [event], new Date(2026, 2, 28))).toBe(true);
    expect(activityDone(repot, [event], new Date(2027, 2, 3))).toBe(false);
  });

  it("liste pour l'accueil les gestes de saison pas encore faits", () => {
    const march = new Date(2026, 2, 10);
    const subjects = [subject("thyme", "thyme-1"), subject("cherry-tomato", "tomato-1")];
    const todo = seasonalToDo(subjects, [], march);
    expect(todo.map((activity) => activity.title)).toEqual(["Rempote le thym", "Sème le thym au chaud", "Sème les tomates cerises au chaud"]);
    const done = eventForActivity(todo[0], march);
    expect(seasonalToDo(subjects, [done], march).map((activity) => activity.title)).toEqual(["Sème le thym au chaud", "Sème les tomates cerises au chaud"]);
  });
});

describe("vue par saison", () => {
  it("commence par la saison en cours", () => {
    expect(upcomingSeasons(new Date(2026, 8, 29)).map((season) => season.label)).toEqual(["Automne", "Hiver", "Printemps", "Été"]);
  });

  it("regroupe une activité une seule fois par saison, avec ses mois", () => {
    const spring = seasonActivities([subject("cherry-tomato")], SEASONS[0]);
    const plant = spring.filter((activity) => activity.kind === "plant");
    expect(plant).toHaveLength(1);
    expect(plant[0].months).toEqual([5]);
    const sow = spring.find((activity) => activity.kind === "sow")!;
    expect(describeMonths(sow.months!)).toBe("en mars et avril");
    expect(describeMonths([6, 7, 8])).toBe("de juin à août");
  });
});

describe("gestes rangés par type (Saisons)", () => {
  const balcony = ["cherry-tomato", "basil", "strawberry", "mint", "thyme"].map((id) => subject(id));

  it("une ligne par type de geste, récoltes d'abord, l'engrais à part de l'entretien", () => {
    const activities = calendarActivities(balcony, 7);
    const groups = groupActivities(activities);
    expect(groups.length).toBeLessThan(activities.length);
    expect(groups[0].key).toBe("harvest");
    expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
    expect(groups.flatMap((group) => group.activities)).toHaveLength(activities.length);
    const feed = groups.find((group) => group.key === "fertilize");
    expect(feed?.activities.every((activity) => activity.eventType === "fertilizing")).toBe(true);
    expect(groups.find((group) => group.key === "care")?.activities.some((activity) => activity.eventType === "fertilizing")).toBe(false);
  });

  it("des titres et des résumés courts, en français", () => {
    const [harvest] = groupActivities(calendarActivities(balcony, 7));
    expect(activityGroupTitle(harvest)).toMatch(/^À récolter · \d+ plantes$/);
    expect(activityGroupTitle({ key: "care", label: "Entretien", activities: [harvest.activities[0]] })).toBe("Entretien · 1 geste");
    expect(activityGroupSummary(["Basilic", "Menthe"])).toBe("Basilic, menthe");
    expect(activityGroupSummary(["Basilic", "Menthe", "Thym", "Fraisier", "Sauge"])).toBe("Basilic, menthe, thym et 2 autres");
    expect(activityGroupSummary(["Basilic", "Menthe", "Thym", "Fraisier"])).toBe("Basilic, menthe, thym et 1 autre");
    expect(activityGroupSummary([])).toBe("");
  });
});

describe("plantation des plantes déjà sur le balcon", () => {
  const OCTOBER = new Date(2026, 9, 15);
  const mint = (addedAt?: string) => ({ ...subject("mint"), addedAt });
  const kinds = (addedAt: string | undefined, month: number) => calendarActivities([mint(addedAt)], month, { now: OCTOBER }).map((activity) => activity.kind);

  it("ne propose plus de planter une plante déjà installée", () => {
    expect(kinds(new Date(2026, 5, 1).toISOString(), 10)).not.toContain("plant");
    // Ni les mois suivants.
    expect(kinds(new Date(2026, 9, 3).toISOString(), 11)).not.toContain("plant");
  });

  it("garde « Plante … » ce mois-ci pour une plante tout juste ajoutée, et pour les idées d'un balcon vide", () => {
    expect(kinds(new Date(2026, 9, 3).toISOString(), 10)).toContain("plant");
    expect(kinds(undefined, 10)).toContain("plant");
  });

  it("vaut aussi pour les gestes de saison de l'accueil", () => {
    const old = { ...subject("mint"), addedAt: new Date(2026, 3, 1).toISOString() };
    expect(seasonalToDo([old], [], OCTOBER).map((activity) => activity.kind)).not.toContain("plant");
  });
});


describe("Saisons : ce qui est déjà fait", () => {
  const now = new Date(2026, 9, 5, 18);
  const harvest = calendarActivities([subject("mint", "mint-1")], 10, { now }).find((activity) => activity.kind === "harvest")!;
  const event = (type: "harvest" | "repotting" | "watering", date: Date) => ({ id: `${type}-${date.getTime()}`, plantId: "mint-1", type, completedAt: date.toISOString(), source: "daily_task" as const });

  it("voit une récolte faite aujourd'hui sur Aujourd'hui, pas celle d'hier", () => {
    expect(activityDoneSoFar(harvest, [event("harvest", new Date(2026, 9, 5, 9))], now)).toBe(true);
    expect(activityDoneSoFar(harvest, [event("harvest", new Date(2026, 9, 4, 9))], now)).toBe(false);
    expect(activityDoneSoFar(harvest, [event("watering", new Date(2026, 9, 5, 9))], now)).toBe(false);
    expect(activityDoneLabel(harvest)).toBe("✓ Faite aujourd’hui");
  });

  it("voit un semis ou un rempotage fait ce mois-ci", () => {
    const sow = calendarActivities([subject("basil", "basil-1")], 4, { now: new Date(2026, 3, 10) }).find((activity) => activity.kind === "sow")!;
    expect(activityDoneSoFar(sow, [eventForActivity(sow, new Date(2026, 3, 2))], new Date(2026, 3, 20))).toBe(true);
    expect(activityDoneLabel(sow)).toBe("✓ Fait ce mois-ci");
  });
});
