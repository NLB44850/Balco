import { describe, expect, it } from "vitest";

import { resolvePlants } from "../lib/garden/garden-logic";
import { HELPER_NOTE_SIGNATURE, heatNow, helperNoteMessage, helperNoteText, helperPlants, helperPlantWatering, helperVisits } from "../lib/garden/helper-note";
import type { Vacation } from "../lib/garden/vacation";

const plants = resolvePlants([
  { id: "tomato-1", catalogId: "cherry-tomato", potSize: "large", addedAt: "2026-05-01T10:00:00.000Z" },
  { id: "basil-1", catalogId: "basil", nickname: "Basilic cuisine", potSize: "small", addedAt: "2026-05-01T10:00:00.000Z" },
  { id: "thyme-1", catalogId: "thyme", addedAt: "2026-05-01T10:00:00.000Z" },
  { id: "radish-1", catalogId: "radish", toPlant: true, addedAt: "2026-05-01T10:00:00.000Z" },
]);
const july: Vacation = { start: "2026-07-18", end: "2026-07-31", helper: true, done: [] };

describe("consignes pour qui arrose", () => {
  it("suit le pot de chaque plante : un petit pot plus souvent, un grand pot plus d'eau", () => {
    const items = helperPlants(plants, july);
    expect(items.map((item) => item.resolved.plant.id)).toEqual(["tomato-1", "basil-1", "thyme-1"]);
    const [tomato, basil, thyme] = items;
    expect(basil.pot).toBe("petit pot");
    expect(basil.everyDays).toBe(1);
    expect(basil.liters).toBe(1);
    expect(tomato.pot).toBe("grand pot");
    expect(tomato.liters).toBe(4.5);
    expect(tomato.everyDays!).toBeGreaterThan(basil.everyDays!);
    expect(thyme.pot).toBeNull();
    expect(helperPlantWatering(basil, 1)).toBe("environ 1 L à chaque passage, si la terre est sèche");
  });

  it("suit les passages : chaque passage, un passage sur deux, ou passer plus souvent par forte chaleur", () => {
    const [tomato, , thyme] = helperPlants(plants, july);
    // Passages réglés sur la tomate : pas de rythme à part « tous les 4 jours ».
    expect(helperPlantWatering(tomato, tomato.everyDays)).toMatch(/^environ 4,5 L à chaque passage, si la terre est sèche/);
    expect(helperPlantWatering({ ...tomato, everyDays: 4, heatEveryDays: null }, 2)).toBe("environ 4,5 L un passage sur deux, si la terre est sèche");
    expect(helperPlantWatering({ ...tomato, everyDays: 12, heatEveryDays: null }, 2)).toBe("environ 4,5 L de temps en temps, seulement si la terre est sèche");
    expect(helperPlantWatering({ ...thyme, everyDays: 3, heatEveryDays: 1 }, 3)).toBe(
      `environ ${thyme.liters.toString().replace(".", ",")} L à chaque passage, si la terre est sèche ; s’il fait plus de 30 °C, passe plus souvent pour le thym si tu peux (chaque jour)`,
    );
    expect(helperPlantWatering({ ...thyme, everyDays: 4, heatEveryDays: 2 }, 2)).toMatch(/un passage sur deux, si la terre est sèche, et à chaque passage s’il fait plus de 30 °C$/);
    expect(helperPlantWatering(tomato, null)).toBe("environ 4,5 L si tu passes et que la terre est sèche");
    for (const item of helperPlants(plants, july)) expect(helperPlantWatering(item, 1)).not.toMatch(/tous les \d jours,|tous les \d jours$/);
  });

  it("espace les arrosages hors de l'été et ne parle plus de chaleur", () => {
    const october = helperPlants(plants, { ...july, start: "2026-10-10", end: "2026-10-20" });
    const summer = helperPlants(plants, july);
    october.forEach((item, index) => {
      if (item.everyDays !== null) expect(item.everyDays).toBeGreaterThanOrEqual(summer[index].everyDays!);
      expect(item.heatEveryDays).toBeNull();
    });
  });

  it("dit quand passer, d'après la plante la plus assoiffée", () => {
    const visits = helperVisits(helperPlants(plants, july), july)!;
    expect(visits.every).toBe(1);
    expect(visits.text).toBe("Premier passage dimanche 19 juillet, puis chaque jour jusqu’au 31 juillet.");
    const thymeOnly = helperPlants([plants[2]], { ...july, end: "2026-07-20" });
    expect(helperVisits(thymeOnly, { ...july, end: "2026-07-20" })).toBeNull();
  });

  it("parle de la chaleur seulement si le départ est tout proche", () => {
    expect(heatNow({ vacation: july, todayMaxC: 33, now: new Date(2026, 6, 17, 9) })).toBe(33);
    expect(heatNow({ vacation: july, todayMaxC: 33, now: new Date(2026, 6, 10, 9) })).toBeNull();
    expect(heatNow({ vacation: july, todayMaxC: 26, now: new Date(2026, 6, 17, 9) })).toBeNull();
    expect(heatNow({ vacation: july, todayMaxC: null })).toBeNull();
  });

  it("écrit un texte clair avec les dates, plante par plante, et la signature à part", () => {
    const text = helperNoteText({ plants, vacation: july, firstName: " Nicolas ", covered: true, todayMaxC: 32, now: new Date(2026, 6, 17, 9) });
    expect(text).toContain("du 18 au 31 juillet");
    expect(text).toContain("• Basilic cuisine (petit pot) : environ 1 L à chaque passage, si la terre est sèche.");
    expect(text).toContain("• Tomates cerises (grand pot) : environ 4,5 L un passage sur trois, si la terre est sèche, et à chaque passage s’il fait plus de 30 °C.");
    expect(text).toContain("  À récolter : cueille-les");
    expect(text).not.toMatch(/ : \p{Lu}\p{Ll}/u);
    expect(text).toContain("Il fait chaud en ce moment (32 °C)");
    expect(text).toContain("arrose même s’il pleut");
    expect(text).not.toContain("Radis");
    expect(text).not.toContain(HELPER_NOTE_SIGNATURE);
    expect(text.trim().endsWith("Merci ! Nicolas")).toBe(true);
    expect(helperNoteMessage(text, true).endsWith(`Merci ! Nicolas\n\n${HELPER_NOTE_SIGNATURE}`)).toBe(true);
    expect(helperNoteMessage("Arrose bien ! \n", false)).toBe("Arrose bien !");
    const open = helperNoteText({ plants, vacation: july });
    expect(open).toContain("S’il a bien plu, tu peux sauter un arrosage.");
    expect(open).not.toContain("Il fait chaud");
  });
});
