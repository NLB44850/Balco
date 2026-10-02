import { describe, expect, it } from "vitest";

import { buildDailySession, careProfileFor, eventForSessionTask, resolvePlants } from "../lib/garden/garden-logic";
import { balconyStatus, buildTodayList, doneSubtitle, headline } from "../lib/garden/today";
import { seasonalToDo } from "../lib/plants/calendar";
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

function list(minTemp: number, events = watered, rainMm = 0) {
  const groups = groupReminders(decideReminders(plants.map((resolved) => ({ plant: careProfileFor(resolved), history: events, weather: weather(minTemp, rainMm), settings: { enabled: true }, now }))));
  const session = buildDailySession(plants, events, now);
  const subjects = plants.map((resolved) => ({ id: resolved.plant.id, entry: resolved.entry, displayName: resolved.entry.name }));
  return { items: buildTodayList({ groups, session, seasonal: seasonalToDo(subjects, events, now) }), session };
}

describe("liste « Aujourd'hui »", () => {
  it("met l'alerte gel en tête, avec l'échéance et la température", () => {
    const { items } = list(-2);
    expect(items[0]).toMatchObject({ kind: "alert", tone: "frost", icon: "❄", title: "Gel cette nuit : protège 2 plantes", subtitle: "Avant la nuit · jusqu’à -2 °C" });
  });

  it("n'affiche pas deux fois l'arrosage d'une plante qui a déjà une alerte de soif", () => {
    const { items } = list(12);
    const titles = items.map((item) => item.title);
    expect(titles.filter((title) => title.toLowerCase().includes("arrose le basilic"))).toHaveLength(1);
    expect(items.find((item) => item.title === "Arrose le basilic si la terre est sèche")?.kind).toBe("alert");
  });

  it("ne propose pas d'arroser quand l'alerte pluie dit de ne pas le faire", () => {
    const { items } = list(12, watered, 8);
    expect(items[0]).toMatchObject({ kind: "alert", tone: "rain" });
    expect(items.filter((item) => item.kind === "task" && item.task.task.type === "watering")).toHaveLength(0);
  });

  it("ne repropose pas d'arroser une fois l'alerte pluie cochée (« Compris »)", () => {
    const session = buildDailySession(plants, watered, now);
    const items = buildTodayList({ groups: [], session, seasonal: [], rainExpected: true });
    expect(items.filter((item) => item.kind === "task" && item.task.task.type === "watering")).toHaveLength(0);
  });

  it("ne double pas l'arrosage sous une alerte chaleur, ni pendant un orage, ni une fois arrosé", () => {
    const session = buildDailySession(plants, watered, now);
    const watering = (items: ReturnType<typeof buildTodayList>) => items.filter((item) => item.kind === "task" && item.task.task.type === "watering" && !item.done);
    expect(watering(buildTodayList({ groups: [], session, seasonal: [] })).length).toBeGreaterThan(0);
    const heat = plants.map(({ plant }) => ({ plantId: plant.id, cause: "heat" as const }));
    expect(watering(buildTodayList({ groups: [], session, seasonal: [], decisions: heat }))).toHaveLength(0);
    expect(watering(buildTodayList({ groups: [], session, seasonal: [], decisions: [{ plantId: "basil-1", cause: "storm" }] }))).toHaveLength(0);
    expect(watering(buildTodayList({ groups: [], session, seasonal: [], wateredToday: plants.map(({ plant }) => plant.id) }))).toHaveLength(0);
  });

  it("ajoute les gestes de saison du mois", () => {
    const { items } = list(12);
    expect(items.some((item) => item.kind === "season" && item.title === "Plante la lavande")).toBe(true);
  });

  it("range les gestes déjà faits en bas, avec leur heure", () => {
    const { session } = list(12);
    const doneEvent = eventForSessionTask(session[0], new Date(2026, 8, 29, 8, 40));
    const { items } = list(12, [...watered, doneEvent]);
    const last = items.at(-1)!;
    expect(last.done).toBe(true);
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

