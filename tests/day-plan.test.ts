/**
 * Plan du jour (lib/garden/day-plan.ts) : la seule source du geste du jour et de l'état d'une plante,
 * lue par Aujourd'hui, la carte Balcon et la fiche plante.
 */
import { describe, expect, it } from "vitest";

import { dayOf, GESTURE_ORDER, gestureLine, observerProblem, planDay, scanEventId } from "../lib/garden/day-plan";
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
  it("bleu pour le gel ou la pluie, vert même avec un arrosage du jour, gris sans soin", () => {
    expect(dayOf(scene(watered, { min: -2 }).plan, "basil-1")!.status).toEqual({ tone: "weather", label: "Gel annoncé", worry: true });
    // La pluie reste bleue mais n'est pas un souci : pas comptée dans « à surveiller ».
    expect(dayOf(scene(watered, { rainMm: 9 }).plan, "basil-1")!.status).toEqual({ tone: "weather", label: "Pluie annoncée" });
    // Un arrosage à faire aujourd'hui ne change pas l'état (retour du 14/10) : le geste s'affiche, la plante reste en forme.
    const due = dayOf(scene().plan, "mint-1")!;
    expect(due.first?.kind).toBe("watering");
    expect(due.status).toEqual({ tone: "good", label: "En forme" });
    // Hors saison (chantier « Plante hors saison ») : le basilic début octobre est en fin de saison, en gris, ses gestes restent.
    expect(dayOf(scene().plan, "basil-1")!.status).toEqual({ tone: "rest", label: "Fin de saison" });
    expect(dayOf(scene().plan, "basil-1")!.first?.kind).toBe("watering");
    expect(scene().plan.filter((day) => day.status.worry)).toHaveLength(0);
    const today = plants.map(({ plant }) => ({ ...watered[0], id: `t-${plant.id}`, plantId: plant.id, completedAt: at(0, 8) }));
    expect(dayOf(scene([...watered, ...today]).plan, "mint-1")!.status).toEqual({ tone: "good", label: "En forme" });
    expect(planDay({ plants: resolvePlants([{ id: "l", catalogId: "lavender", addedAt: at(2) }]), events: [], now: new Date(2026, 0, 10) })[0].status).toEqual({ tone: "rest", label: "Au repos jusqu’en avril" });
    // Gris sans soin : une plante rustique en saison, jamais soignée dans l'app.
    expect(planDay({ plants: resolvePlants([{ id: "l", catalogId: "lavender", addedAt: at(2) }]), events: [], now: NOW })[0].status).toEqual({ tone: "new", label: "Nouvelle" });
  });

  it("orange : arrosage en retard de 3 jours ou plus sur son rythme", () => {
    const old = plants.map(({ plant }) => ({ ...watered[0], id: `w-${plant.id}`, plantId: plant.id, completedAt: at(12) }));
    // La menthe (accordée : « arrosée »), le thym au masculin.
    expect(dayOf(scene(old).plan, "mint-1")!.status).toEqual({ tone: "watch", label: "Pas arrosée depuis 12 jours", worry: true });
    expect(dayOf(scene(old).plan, "thyme-1")!.status.label).toBe("Pas arrosé depuis 12 jours");
    // Jamais arrosée dans l'app : compté depuis son arrivée (12 jours) ; arrivée il y a 2 jours : pas en retard.
    const mint = (days: number) => resolvePlants([{ id: "m", catalogId: "mint", addedAt: at(days) }]);
    expect(planDay({ plants: mint(12), events: [], now: NOW })[0].status).toEqual({ tone: "watch", label: "Pas arrosée depuis 12 jours", worry: true });
    expect(planDay({ plants: mint(2), events: [], now: NOW })[0].status.tone).toBe("new");
    // Arrosée aujourd'hui : plus en retard.
    const today = { ...watered[0], id: "t-mint", plantId: "mint-1", completedAt: at(0, 8) };
    expect(dayOf(scene([...old, today]).plan, "mint-1")!.status.tone).toBe("good");
  });

  it("orange : un problème vu par Observer, pendant 14 jours, sauf nouvelle analyse qui va bien", () => {
    const scan = (days: number, health: string): MaintenanceEvent => ({ id: scanEventId("basil-1", new Date(at(days)), health), plantId: "basil-1", type: "observation", completedAt: at(days), source: "manual", note: "Scanner : pucerons." });
    expect(dayOf(scene([...watered, scan(3, "sick")]).plan, "basil-1")!.status).toEqual({ tone: "watch", label: "Problème vu par Observer", worry: true });
    expect(dayOf(scene([...watered, scan(3, "needs_attention")]).plan, "basil-1")!.status.label).toBe("Problème vu par Observer");
    expect(dayOf(scene([...watered, scan(20, "sick")]).plan, "basil-1")!.status.label).toBe("Fin de saison");
    expect(dayOf(scene([...watered, scan(5, "sick"), scan(1, "healthy")]).plan, "basil-1")!.status.label).toBe("Fin de saison");
    expect(observerProblem("basil-1", [{ id: "scan:basil-1:123", plantId: "basil-1", type: "observation", completedAt: at(1), source: "manual" }], NOW)).toBe(false);
  });

  it("orange : un pot choisi trop petit pour la plante ; sans taille choisie, rien", () => {
    const small = resolvePlants([{ id: "tomato-s", catalogId: "cherry-tomato", potSize: "small", addedAt: new Date(2026, 8, 5).toISOString() }]);
    const unknown = resolvePlants([{ id: "tomato-u", catalogId: "cherry-tomato", addedAt: new Date(2026, 8, 5).toISOString() }]);
    const events = [{ ...watered[0], plantId: "tomato-s" }, { ...watered[0], id: "w-u", plantId: "tomato-u" }];
    expect(planDay({ plants: small, events, now: NOW })[0].status).toMatchObject({ tone: "watch", label: expect.stringMatching(/^Pot trop (petit|peu profond)$/u), worry: true });
    expect(planDay({ plants: unknown, events, now: NOW })[0].status.label).toBe("Fin de saison");
  });

  it("les pastilles d'Aujourd'hui et les cartes Balcon lisent le même état", () => {
    const { plan } = scene();
    // Les deux écrans lisent `status` du même plan : on vérifie qu'il n'y a qu'un état par plante.
    expect(new Set(plan.map((day) => day.resolved.plant.id)).size).toBe(plan.length);
    expect(plan.every((day) => ["good", "watch", "weather", "new", "rest"].includes(day.status.tone))).toBe(true);
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
      // Combien verser est dans la pastille « 💧 2 L » (étape 6a) : `liters`, arrondi au demi-litre.
      expect(item.subtitle).toMatch(/^Sèche sur \d cm \? Arrose au pied$/u);
      expect(String(item.liters)).toMatch(/^\d+(\.5)?$/u);
      expect(item.subtitle.toLowerCase()).not.toContain(item.title.toLowerCase());
    }
  });
});
