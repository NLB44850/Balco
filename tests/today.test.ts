import { describe, expect, it } from "vitest";

import { eventForGesture, planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants } from "../lib/garden/garden-logic";
import { isAvoidedWatering } from "../lib/garden/progress";
import { balconyStatus, buildTodayList, doneSubtitle, headline, isInfoBanner, layoutTodayList, rainSavingsToLog, splitTodayList } from "../lib/garden/today";
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

  it("propose de planter une plante « à planter », et rien d'autre pour elle", () => {
    const toPlant = resolvePlants([{ id: "lavender-2", catalogId: "lavender", addedAt: new Date(2026, 8, 28).toISOString(), toPlant: true }]);
    const plan = planDay({ plants: toPlant, events: [], now });
    const items = buildTodayList({ groups: [], plan });
    expect(items.map((item) => item.title)).toEqual(["Plante la lavande"]);
  });

  it("une fois le premier geste fait, le suivant prend sa place (récolte, semis, plantation…)", () => {
    const today = plants.map(({ plant }) => ({ id: `t-${plant.id}`, plantId: plant.id, type: "watering" as const, completedAt: new Date(2026, 8, 29, 8).toISOString(), source: "manual" as const }));
    const events = [...watered, ...today];
    const plan = planDay({ plants, events, now });
    const items = buildTodayList({ groups: [], plan });
    const pending = items.filter((item) => !item.done);
    // Le basilic se récolte en septembre : sa récolte est proposée une fois arrosé.
    expect(pending.find((item) => item.plantName === "Basilic")).toMatchObject({ gesture: "harvest", title: "Récolte le basilic" });
    // Chaque plante garde au plus une ligne à faire ; ses arrosages faits restent, cochés, à la fin.
    const names = pending.map((item) => item.plantName);
    expect(new Set(names).size).toBe(names.length);
    expect(items.filter((item) => item.done && item.gesture === "watering")).toHaveLength(plants.length);
    expect(items.slice(-plants.length).every((item) => item.done)).toBe(true);
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

describe("alertes météo en bandeaux", () => {
  it("sort le gel de la liste pour le mettre en bandeau, avec un bouton à faire", () => {
    const { items } = list(-2);
    const { banners, rest } = splitTodayList(items);
    expect(banners).toHaveLength(1);
    expect(banners[0]).toMatchObject({ tone: "frost", title: "Gel cette nuit : protège 2 plantes" });
    expect(isInfoBanner(banners[0])).toBe(false);
    expect(rest.some((item) => item.kind === "alert" && item.group.cause === "frost")).toBe(false);
    expect(rest.length).toBe(items.length - 1);
  });

  it("garde la soif d'une plante dans la liste, pas en bandeau", () => {
    const { items } = list(12);
    const { banners, rest } = splitTodayList(items);
    expect(banners).toHaveLength(0);
    expect(rest.some((item) => item.kind === "alert" && item.group.cause === "thirst")).toBe(true);
  });

  it("pluie : bandeau à lire seulement, qui ne compte pas comme un geste à faire", () => {
    const { items } = list(12, watered, 8);
    const { banners } = splitTodayList(items);
    expect(banners[0]).toMatchObject({ tone: "rain", title: "N’arrose pas tes plantes aujourd’hui" });
    expect(isInfoBanner(banners[0])).toBe(true);
    const status = balconyStatus(items, watered, now);
    expect(status.remaining).toBe(items.filter((item) => !isInfoBanner(item)).length);
  });

  it("pluie : l'arrosage évité est compté tout seul, une fois par plante et par jour", () => {
    const { items } = list(12, watered, 8);
    const { banners } = splitTodayList(items);
    const toLog = rainSavingsToLog(banners, watered, now);
    expect(toLog).toHaveLength(banners[0].group.decisions.length);
    expect(toLog.every(isAvoidedWatering)).toBe(true);
    expect(rainSavingsToLog(banners, [...watered, ...toLog], now)).toHaveLength(0);
    // Compté tout seul, ce n'est pas un geste de la journée.
    expect(balconyStatus([], toLog, now)).toMatchObject({ doneToday: 0, label: "rien à faire aujourd’hui" });
  });

  it("rien à compter sans pluie", () => {
    const { banners } = splitTodayList(list(-2).items);
    expect(rainSavingsToLog(banners, watered, now)).toHaveLength(0);
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


describe("liste affichée : arrosages regroupés, gestes pas urgents repliés", () => {
  type Item = ReturnType<typeof buildTodayList>[number];
  const item = (key: string, gesture: Item["gesture"], plantName: string, done = false) =>
    ({ kind: "task", key, tone: "care", icon: "•", title: `${gesture} ${plantName}`, subtitle: "", gesture, plantName, done }) as unknown as Item;

  it("regroupe les arrosages en une ligne « Vérifie la terre de N plantes » qui garde chaque plante", () => {
    const { items } = list(12, []);
    const lines = layoutTodayList(items);
    const group = lines.find((line) => line.type === "watering");
    expect(group).toMatchObject({ title: "Vérifie la terre de 3 plantes", done: false });
    expect(group?.type === "watering" && group.subtitle).toMatch(/^Sèche \? Arrose · /u);
    expect(group?.type === "watering" && group.items).toHaveLength(wateringRows(items).length);
    expect(lines.filter((line) => line.type === "item" && line.item.gesture === "watering")).toHaveLength(0);
  });

  it("laisse un arrosage seul tel quel", () => {
    const lines = layoutTodayList([item("a", "watering", "Basilic"), item("b", "harvest", "Thym")]);
    expect(lines.map((line) => line.type)).toEqual(["item", "item"]);
  });

  it("compte les arrosages faits, et passe le groupe en bas une fois tout fait", () => {
    const partial = layoutTodayList([item("a", "watering", "Basilic", true), item("b", "watering", "Menthe"), item("c", "harvest", "Thym")]);
    expect(partial[0]).toMatchObject({ type: "watering", subtitle: "1 sur 2 faites · Basilic, menthe", done: false });
    const all = layoutTodayList([item("a", "watering", "Basilic", true), item("b", "watering", "Menthe", true), item("c", "harvest", "Thym")]);
    expect(all.map((line) => line.key)).toEqual(["c", "watering"]);
  });

  it("au-delà de 5 lignes, replie engrais et entretien, jamais alertes, arrosages ni récoltes", () => {
    const items = [
      item("alert", "alert", "Basilic"),
      item("w1", "watering", "Basilic"),
      item("w2", "watering", "Menthe"),
      ...["Thym", "Fraisier", "Tomates"].map((name) => item(`h-${name}`, "harvest", name)),
      item("f", "fertilizing", "Rosier"),
      item("c", "care", "Lavande"),
    ];
    const lines = layoutTodayList(items);
    expect(lines.map((line) => line.key)).toEqual(["alert", "watering", "h-Thym", "h-Fraisier", "h-Tomates", "more"]);
    expect(lines.at(-1)).toMatchObject({ type: "more", title: "2 autres gestes, pas urgents", subtitle: "Rosier, lavande" });
  });

  it("ne replie rien jusqu'à 5 lignes", () => {
    const lines = layoutTodayList([item("h", "harvest", "Thym"), item("f", "fertilizing", "Rosier"), item("c", "care", "Lavande"), item("s", "season", "Ail"), item("c2", "care", "Menthe")]);
    expect(lines.some((line) => line.type === "more")).toBe(false);
    expect(lines).toHaveLength(5);
  });

  it("garde une seule ligne par plante sur le balcon du test utilisateur", () => {
    const { items } = list(12, []);
    const names = layoutTodayList(items).flatMap((line) => (line.type === "item" ? [line.item] : line.items)).filter((entry) => entry.kind !== "alert" || entry.group.cause === "thirst").map((entry) => entry.plantName);
    expect(new Set(names).size).toBe(names.length);
  });
});
