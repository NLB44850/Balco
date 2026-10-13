import { describe, expect, it } from "vitest";

import { planDay } from "../lib/garden/day-plan";
import { resolvePlants } from "../lib/garden/garden-logic";
import { gestureDetail, gestureKindLabel, sentences } from "../lib/garden/gesture-detail";
import { buildTodayList } from "../lib/garden/today";

const plants = (list: Array<{ id: string; catalogId: string; addedAt: Date; toPlant?: boolean; potSize?: string }>) => resolvePlants(list.map((plant) => ({ ...plant, addedAt: plant.addedAt.toISOString() })) as never);
const items = (now: Date, list: Parameters<typeof plants>[0], events = [] as Parameters<typeof planDay>[0]["events"]) => {
  const resolved = plants(list);
  return { resolved, items: buildTodayList({ groups: [], plan: planDay({ plants: resolved, events, now }) }) };
};

describe("le détail d'un geste, au même format pour tous", () => {
  it("découpe un texte en gestes courts", () => {
    expect(sentences("Coupe les tiges. Elle repartira de plus belle.")).toEqual(["Coupe les tiges", "Elle repartira de plus belle"]);
  });

  it("planter : la largeur du pot en grand, puis terreau, motte, tasser, arroser avec la quantité", () => {
    const now = new Date(2027, 4, 10, 10);
    const { resolved, items: list } = items(now, [{ id: "b", catalogId: "basil", addedAt: now, toPlant: true, potSize: "medium" }]);
    const plant = list.find((item) => item.title === "Plante le basilic")!;
    const detail = gestureDetail(plant, { resolved: resolved[0], events: [], now });
    expect(detail.hero).toMatchObject({ art: "emoji", emoji: "🪴", value: "20 cm" });
    expect(detail.steps.map((step) => step.icon)).toEqual(["🟫", "🌱", "👐", "💧"]);
    expect(detail.steps[3].text).toBe("Arrose bien, environ 2 L");
    expect(gestureKindLabel(plant)).toBe("Plantation · ce mois-ci");
  });

  it("semer au chaud : la température en grand, godets, graines, humidité, levée", () => {
    const now = new Date(2027, 2, 10, 10);
    const { items: list } = items(now, [{ id: "t", catalogId: "cherry-tomato", addedAt: now, toPlant: true }]);
    const sow = list.find((item) => item.kind === "season")!;
    const detail = gestureDetail(sow, { events: [], now });
    expect(detail.hero).toMatchObject({ value: "18 à 22 °C" });
    expect(detail.steps[0].text).toBe("Des godets de terreau de semis");
    expect(detail.steps.at(-1)?.text).toMatch(/^Les pousses sortent en \d+ à \d+ jours$/u);
  });

  it("récolter : jusqu'à quand, comment couper, récolter souvent", () => {
    const now = new Date(2027, 6, 10, 10);
    const watered = { id: "w", plantId: "m", type: "watering" as const, completedAt: new Date(2027, 6, 9).toISOString(), source: "daily_task" as const };
    const { items: list } = items(now, [{ id: "m", catalogId: "mint", addedAt: new Date(2027, 3, 1) }], [watered]);
    const harvest = list.find((item) => item.gesture === "harvest")!;
    const detail = gestureDetail(harvest, { events: [], now });
    expect(detail.hero).toMatchObject({ emoji: "🧺", value: "Jusqu’en octobre" });
    expect(detail.steps.at(-1)?.icon).toBe("🔁");
  });

  it("fait : un bandeau « ✓ Fait à … » en tête, les gestes restent", () => {
    const now = new Date(2027, 4, 10, 10);
    const { resolved, items: list } = items(now, [{ id: "b", catalogId: "basil", addedAt: now, toPlant: true }]);
    const detail = gestureDetail(list[0], { resolved: resolved[0], events: [], now, doneText: "Fait à 14 h 33" });
    expect(detail.banner).toEqual({ text: "✓ Fait à 14 h 33", tone: "done" });
    expect(detail.steps.length).toBeGreaterThan(0);
  });
});
