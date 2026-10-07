/**
 * Plan du jour (lib/garden/day-plan.ts) : la seule source du geste du jour et de l'état d'une plante,
 * lue par Aujourd'hui, la carte Balcon et la fiche plante.
 */
import { describe, expect, it } from "vitest";

import { dayOf, GESTURE_ORDER, gestureLine, planDay } from "../lib/garden/day-plan";
import { careProfileFor, resolvePlants } from "../lib/garden/garden-logic";
import { harvestEndStates, markSeasonAsked } from "../lib/garden/harvest-end";
import { buildTodayList } from "../lib/garden/today";
import { getCatalogPlant, PLANT_CATALOG, soilCheckDepthCm } from "../lib/plants/catalog";
import { decideReminders, type MaintenanceEvent, type WeatherSnapshot } from "../lib/reminders/reminder-engine";
import { groupReminders } from "../lib/reminders/reminder-groups";

// Le balcon de démonstration du test utilisateur : 5 plantes, arrosées il y a 3 jours, début octobre à Lyon.
const NOW = new Date(2026, 9, 4, 11);
const DEMO = ["basil", "mint", "thyme", "cherry-tomato", "strawberry"];
const plants = resolvePlants(DEMO.map((id) => ({ id: `${id}-1`, catalogId: id, addedAt: new Date(2026, 8, 5).toISOString() })));
const at = (days: number, hour = 9) => new Date(2026, 9, 4 - days, hour).toISOString();
const watered: MaintenanceEvent[] = plants.map(({ plant }) => ({ id: `w-${plant.id}`, plantId: plant.id, type: "watering", completedAt: at(3), source: "manual" }));

function weather({ min = 10, rainMm = 0 } = {}): WeatherSnapshot {
  return {
    fetchedAt: NOW.toISOString(), timezone: "Europe/Paris", city: "Lyon", latitude: 45.76, longitude: 4.84,
    current: { temperatureC: 16, apparentTemperatureC: 15, weatherCode: 2 },
    next12h: { precipitationMm: rainMm, precipitationProbabilityMax: rainMm ? 90 : 5, windGustKmhMax: 18 },
    today: { precipitationMm: rainMm, temperatureMinC: min, temperatureMaxC: 19, windGustKmhMax: 18 },
  };
}

// Début octobre, la saison du basilic est finie : la question « Ta saison de basilic est finie ? » a été posée
// le 1ᵉʳ et laissée sans réponse ; ses gestes habituels reviennent jusqu'à la relance (lib/garden/harvest-end.ts).
const seasonAsked = harvestEndStates(plants.reduce((snoozes, { plant }) => markSeasonAsked(snoozes, plant.id, new Date(2026, 9, 1, 9)), [] as ReturnType<typeof markSeasonAsked>), NOW);

function scene(events = watered, options: { min?: number; rainMm?: number } = {}) {
  const decisions = decideReminders(plants.map((resolved) => ({ plant: careProfileFor(resolved), history: events, weather: weather(options), settings: { enabled: true }, now: NOW })));
  const plan = planDay({ plants, events, now: NOW, decisions, harvestEnds: seasonAsked });
  return { decisions, plan, items: buildTodayList({ groups: groupReminders(decisions), plan }) };
}

describe("plan du jour : une seule source", () => {
  it("le basilic d'octobre : Aujourd'hui et Balcon disent la même chose", () => {
    const { plan, items } = scene();
    const basil = dayOf(plan, "basil-1")!;
    // Avant : « Arrose le basilic » sur Aujourd'hui, « Rien à faire aujourd'hui » sur Balcon et sa fiche.
    expect(basil.first?.kind).toBe("watering");
    expect(gestureLine(basil)).toBe(basil.first!.title);
    expect(items.some((item) => item.title === basil.first!.title)).toBe(true);
  });

  it("pour chaque plante du balcon, la ligne d'Aujourd'hui est le geste de la carte Balcon", () => {
    for (const events of [watered, plants.map(({ plant }) => ({ ...watered[0], id: `y-${plant.id}`, plantId: plant.id, completedAt: at(1) }))]) {
      const { plan, items } = scene(events);
      for (const day of plan) {
        if (!day.first || day.first.kind === "alert") continue;
        // La carte Balcon montre le premier geste ; Aujourd'hui en a une ligne, avec le même titre.
        expect(items.some((item) => item.title === day.first!.title || (item.kind === "alert" && item.group.decisions.some((decision) => decision.plantId === day.resolved.plant.id && decision.title === day.first!.title)))).toBe(true);
      }
    }
  });

  it("le thym à récolter apparaît aussi sur Aujourd'hui (plus de limite à 3 plantes)", () => {
    const { plan, items } = scene(plants.map(({ plant }) => ({ ...watered[0], id: `y-${plant.id}`, plantId: plant.id, completedAt: at(1) })));
    const thyme = dayOf(plan, "thyme-1")!;
    expect(thyme.first?.kind).toBe("harvest");
    expect(items.some((item) => item.title === thyme.first!.title)).toBe(true);
  });

  it("range les gestes de chaque plante dans l'ordre unique : alerte, arrosage, récolte, saison, engrais, entretien", () => {
    const rank = (kind: string) => GESTURE_ORDER.indexOf(kind as never);
    for (const month of [1, 4, 7, 10]) {
      const all = resolvePlants(PLANT_CATALOG.map((entry) => ({ id: `${entry.id}-x`, catalogId: entry.id, addedAt: new Date(2026, month - 1, 1).toISOString() })));
      const now = new Date(2026, month - 1, 15, 10);
      const decisions = decideReminders(all.map((resolved) => ({ plant: careProfileFor(resolved), history: [], weather: { ...weather({ min: -2 }), fetchedAt: now.toISOString() }, settings: { enabled: true }, now })));
      for (const day of planDay({ plants: all, events: [], now, decisions })) {
        const ranks = day.gestures.map((gesture) => rank(gesture.kind));
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      }
    }
  });

  it("une soif mise en sommeil (« Pas aujourd'hui ») ne revient pas en arrosage", () => {
    const { decisions } = scene();
    const plan = planDay({ plants, events: watered, now: NOW, decisions: [], allDecisions: decisions });
    expect(plan.flatMap((day) => day.gestures).filter((gesture) => gesture.kind === "watering")).toHaveLength(0);
  });
});

describe("état d'une plante : une couleur, un sens", () => {
  it("bleu pour le gel ou la pluie, orange pour un arrosage en attente, vert une fois fait, gris sans soin", () => {
    expect(dayOf(scene(watered, { min: -2 }).plan, "basil-1")!.status).toEqual({ tone: "weather", label: "Gel annoncé" });
    expect(dayOf(scene(watered, { rainMm: 9 }).plan, "basil-1")!.status).toEqual({ tone: "weather", label: "Pluie annoncée" });
    expect(dayOf(scene().plan, "basil-1")!.status.tone).toBe("watch");
    const today = plants.map(({ plant }) => ({ ...watered[0], id: `t-${plant.id}`, plantId: plant.id, completedAt: at(0, 8) }));
    expect(dayOf(scene([...watered, ...today]).plan, "basil-1")!.status).toEqual({ tone: "good", label: "En forme" });
    expect(planDay({ plants: resolvePlants([{ id: "l", catalogId: "lavender", addedAt: at(2) }]), events: [], now: new Date(2026, 0, 10) })[0].status).toEqual({ tone: "new", label: "Nouvelle" });
  });

  it("les pastilles d'Aujourd'hui et les cartes Balcon lisent le même état", () => {
    const { plan } = scene();
    // Les deux écrans lisent `status` du même plan : on vérifie qu'il n'y a qu'un état par plante.
    expect(new Set(plan.map((day) => day.resolved.plant.id)).size).toBe(plan.length);
    expect(plan.every((day) => ["good", "watch", "weather", "new"].includes(day.status.tone))).toBe(true);
  });
});

describe("geste fait", () => {
  it("un arrosage demandé par la météo reste affiché, coché, une fois fait", () => {
    const { decisions } = scene();
    const thirst = decisions.find((decision) => decision.plantId === "basil-1")!;
    expect(thirst.cause).toBe("thirst");
    const done: MaintenanceEvent = { id: "reminder:basil-1:watering:x", plantId: "basil-1", type: "watering", completedAt: at(0, 10), source: "reminder" };
    // Le basilic arrosé : la météo ne demande plus rien, mais sa ligne reste, cochée.
    const after = scene([...watered, done]);
    const basil = dayOf(after.plan, "basil-1")!;
    expect(basil.first).toMatchObject({ kind: "watering", done: true, doneEventId: done.id });
    expect(after.items.some((item) => item.done && item.kind === "task" && item.task.resolved.plant.id === "basil-1")).toBe(true);
  });
});

describe("titres qui disent quoi faire", () => {
  it("aucun titre de geste ne dit « si besoin » ou « si la terre est sèche »", () => {
    for (const entry of PLANT_CATALOG) for (const task of entry.tasks) expect(task.title).not.toMatch(/si besoin|si la terre/u);
    const { decisions } = scene();
    for (const decision of decisions) expect(decision.title).not.toMatch(/si besoin|si la terre/u);
  });

  it("le sous-titre d'un arrosage dit comment vérifier, à la bonne profondeur, sans répéter le titre", () => {
    expect(soilCheckDepthCm(getCatalogPlant("basil")!)).toBe(2);
    expect(soilCheckDepthCm(getCatalogPlant("thyme")!)).toBe(4);
    expect(soilCheckDepthCm(getCatalogPlant("lavender")!)).toBe(5);
    const { items } = scene();
    const watering = items.filter((item) => item.title.startsWith("Arrose"));
    expect(watering.length).toBeGreaterThan(0);
    for (const item of watering) {
      expect(item.subtitle).toMatch(/^Enfonce ton doigt : sèche sur \d cm \? Arrose\.$/u);
      expect(item.subtitle.toLowerCase()).not.toContain(item.title.toLowerCase());
    }
  });
});
