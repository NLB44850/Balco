import { describe, expect, it } from "vitest";

import { eventForGesture, planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants } from "../lib/garden/garden-logic";
import { balconyStatus, buildTodayList, doneSubtitle, headline } from "../lib/garden/today";
import { decideReminders, type MaintenanceEvent, type WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { groupReminders } from "../lib/reminders/reminder-groups";

const now = new Date(2026, 8, 29, 18, 30);
const plants = resolvePlants([
  { id: "basil-1", catalogId: "basil", addedAt: new Date(2026, 8, 1).toISOString() },
  { id: "tomato-1", catalogId: "cherry-tomato", addedAt: new Date(2026, 8, 1).toISOString() },
  { id: "lavender-1", catalogId: "lavender", addedAt: new Date(2026, 8, 1).toISOString() },
]);
const watered: MaintenanceEvent[] = plants.map(({ plant }) => ({ id: `w-${plant.id}`, plantId: plant.id, type: "watering", completedAt: new Date(2026, 8, 26, 9).toISOString(), source: "manual" }));

function weather(minTemp: number, rainMm = 0): WeatherSnapshot {
  return {
    fetchedAt: now.toISOString(), timezone: "Europe/Paris", city: "Nantes", latitude: 47.2, longitude: -1.55,
    current: { temperatureC: 12, apparentTemperatureC: 11, weatherCode: 1 },
    next12h: { precipitationMm: rainMm, precipitationProbabilityMax: rainMm ? 90 : 5, windGustKmhMax: 10 },
    today: { precipitationMm: 0, temperatureMinC: minTemp, temperatureMaxC: 14, windGustKmhMax: 10 },
  };
}

function decisionsFor(minTemp: number, events: MaintenanceEvent[], rainMm = 0) {
  return decideReminders(plants.map((resolved) => ({ plant: careProfileFor(resolved), history: events, weather: weather(minTemp, rainMm), settings: { enabled: true }, now })));
}

function list(minTemp: number, events = watered, rainMm = 0) {
  const decisions = decisionsFor(minTemp, events, rainMm);
  const plan = planDay({ plants, events, now, decisions });
  return { items: buildTodayList({ groups: groupReminders(decisions), plan }), plan };
}

const wateringRows = (items: ReturnType<typeof buildTodayList>) => items.filter((item) => (item.kind === "task" && item.task.task.type === "watering" && !item.done) || (item.kind === "alert" && item.group.cause === "thirst"));

describe("liste « Aujourd'hui »", () => {
  it("met l'alerte gel en tête, avec l'échéance et la température", () => {
    const { items } = list(-2);
    expect(items[0]).toMatchObject({ kind: "alert", tone: "frost", icon: "❄", title: "Gel cette nuit : protège 2 plantes", subtitle: "Avant la nuit · jusqu’à -2 °C" });
  });

  it("n'affiche pas deux fois l'arrosage d'une plante qui a déjà une alerte de soif", () => {
    const { items } = list(12);
    const titles = items.map((item) => item.title);
    expect(titles.filter((title) => title.toLowerCase().includes("arrose le basilic"))).toHaveLength(1);
    expect(items.find((item) => item.title === "Arrose le basilic")?.kind).toBe("alert");
  });

  it("ne propose pas d'arroser quand l'alerte pluie dit de ne pas le faire", () => {
    const { items } = list(12, watered, 8);
    expect(items[0]).toMatchObject({ kind: "alert", tone: "rain" });
    expect(wateringRows(items)).toHaveLength(0);
  });

  it("ne repropose pas d'arroser une fois l'alerte pluie cochée (« Compris »)", () => {
    const rain = decisionsFor(12, watered, 8);
    const plan = planDay({ plants, events: watered, now, decisions: [], allDecisions: rain });
    expect(wateringRows(buildTodayList({ groups: [], plan }))).toHaveLength(0);
  });

  it("ne double pas l'arrosage sous une alerte chaleur, ni pendant un orage, ni une fois arrosé", () => {
    const base = planDay({ plants, events: watered, now });
    expect(wateringRows(buildTodayList({ groups: [], plan: base })).length).toBeGreaterThan(0);
    const decision = (plantId: string, cause: "heat" | "storm") => ({ ...decisionsFor(12, watered)[0], plantId, cause });
    const heat = plants.map(({ plant }) => decision(plant.id, "heat"));
    expect(wateringRows(buildTodayList({ groups: [], plan: planDay({ plants, events: watered, now, decisions: heat }) }))).toHaveLength(0);
    expect(wateringRows(buildTodayList({ groups: [], plan: planDay({ plants, events: watered, now, decisions: [decision("basil-1", "storm")] }) }))).toHaveLength(0);
    const today = plants.map(({ plant }) => ({ id: `t-${plant.id}`, plantId: plant.id, type: "watering" as const, completedAt: new Date(2026, 8, 29, 8).toISOString(), source: "manual" as const }));
    expect(wateringRows(buildTodayList({ groups: [], plan: planDay({ plants, events: [...watered, ...today], now }) }))).toHaveLength(0);
  });

  it("propose un geste de saison quand la plante n'a rien de plus pressant", () => {
    // La lavande, arrivée ce mois-ci et arrosée hier : son geste du jour est de la planter.
    const events = [...watered.filter((event) => event.plantId !== "lavender-1"), { id: "w-lav", plantId: "lavender-1", type: "watering" as const, completedAt: new Date(2026, 8, 28, 9).toISOString(), source: "manual" as const }];
    const { items } = list(12, events);
    expect(items.some((item) => item.kind === "season" && item.title === "Plante la lavande")).toBe(true);
  });

  it("une ligne par plante au plus, hors alertes météo", () => {
    const { items } = list(12);
    const plantIds = items.flatMap((item) => (item.kind === "task" ? [item.task.resolved.plant.id] : item.kind === "season" ? [item.activity.subjectId] : item.group.cause === "thirst" ? item.group.decisions.map((decision) => decision.plantId) : []));
    expect(new Set(plantIds).size).toBe(plantIds.length);
  });

  it("range les gestes déjà faits en bas, avec leur heure", () => {
    const plan = planDay({ plants, events: watered, now });
    const basil = plan[0].gestures[0];
    const doneEvent = eventForGesture(basil, new Date(2026, 8, 29, 8, 40));
    const items = buildTodayList({ groups: [], plan: planDay({ plants, events: [...watered, doneEvent], now }) });
    const last = items.at(-1)!;
    expect(last).toMatchObject({ done: true, title: basil.title });
    expect(doneSubtitle(last, [...watered, doneEvent])).toBe("Fait à 8 h 40");
  });

  it("raccourcit les titres des gestes du catalogue", () => {
    expect(headline("Aujourd’hui, pince les fleurs du basilic.")).toBe("Pince les fleurs du basilic");
  });
});

describe("état du balcon", () => {
  it("compte les gestes restants et l'avancement de la journée", () => {
    const { items } = list(-2);
    const one: MaintenanceEvent = { id: "x", plantId: "basil-1", type: "observation", completedAt: new Date(2026, 8, 29, 9).toISOString(), source: "manual" };
    const status = balconyStatus(items, [...watered, one], now);
    expect(status.label).toBe(`${items.length} gestes avant ce soir`);
    expect(status.progress).toBeCloseTo(1 / (items.length + 1));
  });

  it("annonce un balcon prêt pour la nuit quand tout est fait le soir", () => {
    const done: MaintenanceEvent = { id: "y", plantId: "basil-1", type: "watering", completedAt: now.toISOString(), source: "daily_task" };
    expect(balconyStatus([], [done], now)).toMatchObject({ label: "prêt pour la nuit", allDone: true, progress: 1 });
    expect(balconyStatus([], [done], new Date(2026, 8, 29, 11))).toMatchObject({ label: "à jour pour aujourd’hui" });
    expect(balconyStatus([], [], now)).toMatchObject({ label: "rien à faire aujourd’hui", allDone: true });
  });
});

