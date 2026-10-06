import { describe, expect, it } from "vitest";

import { eventForGesture, planDay, TO_PLANT_LABEL } from "../lib/garden/day-plan";
import { createGardenPlant, followedDays, inGroundSince, resolvePlants, startedPlantId, startEventId } from "../lib/garden/garden-logic";
import { startActivity } from "../lib/plants/calendar";
import { getCatalogPlant } from "../lib/plants/catalog";
import { climateZoneFor } from "../lib/plants/climate";
import { buildPush, emptyOutbox, recordPlant } from "../lib/sync/sync-logic";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";

const OCTOBER = new Date(2026, 9, 6, 18);
const subject = (catalogId: string) => ({ id: `${catalogId}-1`, entry: getCatalogPlant(catalogId)!, displayName: getCatalogPlant(catalogId)!.name });

describe("deux états pour une plante : installée ou à planter", () => {
  it("une nouvelle plante est installée, sauf si on la crée « à planter »", () => {
    expect(createGardenPlant("mint", OCTOBER).toPlant).toBeUndefined();
    expect(createGardenPlant("mint", OCTOBER, { toPlant: true }).toPlant).toBe(true);
  });

  it("le bon verbe selon le calendrier : « Sème la mâche », « Plante la lavande »", () => {
    // La lavande se plante en octobre ; la mâche se sème.
    expect(startActivity(subject("lavender"), 10).title).toBe("Plante la lavande");
    expect(startActivity(subject("lambs-lettuce"), 10).title).toBe("Sème la mâche");
    // Basilic en mars : semis au chaud ; à la montagne en mars, rien n'est de saison, mais le verbe reste juste.
    expect(startActivity(subject("basil"), 3).title).toBe("Sème le basilic au chaud");
    const mountain = startActivity(subject("cherry-tomato"), 1, { climate: climateZoneFor(45.92, 6.87, 1035) });
    expect(mountain.title).toBe("Plante les tomates cerises");
    expect(mountain.description).toContain("Meilleure période");
  });

  it("à planter : un seul geste, ni arrosage ni entretien, état « À planter »", () => {
    const plants = resolvePlants([{ id: "lav", catalogId: "lavender", addedAt: OCTOBER.toISOString(), toPlant: true }]);
    const [day] = planDay({ plants, events: [], now: OCTOBER });
    expect(day.gestures.map((gesture) => gesture.title)).toEqual(["Plante la lavande"]);
    expect(day.status).toEqual({ tone: "new", label: TO_PLANT_LABEL });
    expect(eventForGesture(day.gestures[0], OCTOBER).id).toBe(startEventId("lav"));
    expect(startedPlantId(startEventId("lav"))).toBe("lav");
    expect(startedPlantId("lav:watering")).toBeNull();
  });

  it("installée : jamais de « Plante … », l'arrosage d'abord ; plantée aujourd'hui, son geste reste coché", () => {
    const installed = resolvePlants([{ id: "lav", catalogId: "lavender", addedAt: OCTOBER.toISOString() }]);
    const [fresh] = planDay({ plants: installed, events: [], now: OCTOBER });
    expect(fresh.gestures.map((gesture) => gesture.title)).not.toContain("Plante la lavande");
    expect(fresh.first?.kind).toBe("watering");

    const planted: MaintenanceEvent = { id: startEventId("lav"), plantId: "lav", type: "observation", completedAt: OCTOBER.toISOString(), source: "manual" };
    const nowInstalled = resolvePlants([{ id: "lav", catalogId: "lavender", addedAt: OCTOBER.toISOString(), toPlant: false }]);
    const [day] = planDay({ plants: nowInstalled, events: [planted], now: OCTOBER });
    expect(day.gestures.find((gesture) => gesture.title === "Plante la lavande")?.done).toBe(true);
    // Le suivant prend sa place : l'arrosage.
    expect(day.gestures.find((gesture) => !gesture.done)?.kind).toBe("watering");
  });

  it("une plante à planter ne casse pas la série et compte dès qu'elle est en terre", () => {
    const waiting = { id: "lav", catalogId: "lavender", addedAt: new Date(2026, 9, 1).toISOString(), toPlant: true };
    expect(inGroundSince(waiting, [])).toBeNull();
    const planted: MaintenanceEvent = { id: startEventId("lav"), plantId: "lav", type: "observation", completedAt: new Date(2026, 9, 4).toISOString(), source: "manual" };
    expect(inGroundSince({ ...waiting, toPlant: false }, [planted])).toBe(new Date(2026, 9, 4).getTime());
    const mint = { id: "mint", catalogId: "mint", addedAt: new Date(2026, 9, 1).toISOString() };
    const waterings: MaintenanceEvent[] = [1, 2, 3, 4, 5, 6].map((day) => ({ id: `w${day}`, plantId: "mint", type: "watering", completedAt: new Date(2026, 9, day, 9).toISOString(), source: "manual" }));
    const withWaiting = followedDays(resolvePlants([mint, waiting]), waterings, OCTOBER);
    expect(withWaiting).toBe(followedDays(resolvePlants([mint]), waterings, OCTOBER));
    expect(withWaiting).toBeGreaterThan(0);
  });

  it("l'état part avec la synchro", () => {
    const plant = createGardenPlant("lavender", OCTOBER, { toPlant: true });
    const push = buildPush(recordPlant(emptyOutbox(), plant), { plants: [plant], events: [], settings: {} } as never);
    expect(push.plants[0].toPlant).toBe(true);
  });
});

describe("catalogue : déjà sur le balcon, ou à planter ?", () => {
  it("« À planter » d'abord quand c'est sa saison, sinon « Déjà sur mon balcon »", async () => {
    const { addChoices, ADD_CHOICE_LABELS } = await import("../lib/plants/suggestions");
    expect(addChoices(getCatalogPlant("lavender")!, 10)).toEqual(["toPlant", "installed"]);
    expect(addChoices(getCatalogPlant("cherry-tomato")!, 10)).toEqual(["installed", "toPlant"]);
    expect(ADD_CHOICE_LABELS).toEqual({ installed: "Déjà sur mon balcon", toPlant: "À planter" });
  });
});
