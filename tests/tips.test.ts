import { describe, expect, it } from "vitest";

import { PLANT_CATALOG } from "../lib/plants/catalog";
import { climateZoneFor } from "../lib/plants/climate";
import { TIP_BANK } from "../lib/tips/bank";
import { eligibleTips, emptyTipState, tipHidden, tipMonths, tipOfTheWeek, weekKey, type Tip } from "../lib/tips/tips";

const day = (month: number, date: number) => new Date(2026, month - 1, date, 10);
const ids = new Set(PLANT_CATALOG.map((entry) => entry.id));

describe("banque d'astuces", () => {
  it("environ 100 astuces, au moins 6 par mois, 30 mots au plus, des plantes du catalogue", () => {
    expect(TIP_BANK.length).toBeGreaterThanOrEqual(95);
    for (let month = 1; month <= 12; month += 1) expect(TIP_BANK.filter((tip) => tip.months.includes(month)).length).toBeGreaterThanOrEqual(6);
    expect(new Set(TIP_BANK.map((tip) => tip.id)).size).toBe(TIP_BANK.length);
    for (const tip of TIP_BANK) {
      expect(tip.text.split(/\s+/u).filter((word) => /[\p{L}\d]/u.test(word)).length, tip.id).toBeLessThanOrEqual(30);
      expect(tip.text, tip.id).not.toContain("'");
      for (const id of [...(tip.plants ?? []), ...(tip.about ?? [])]) expect(ids.has(id), `${tip.id} : ${id}`).toBe(true);
    }
  });

  it("corrections du porteur appliquées", () => {
    const byId = (id: string) => TIP_BANK.find((tip) => tip.id === id)!;
    expect(byId("mar-terre-dessus").text).toContain("5 premiers centimètres");
    expect(byId("nov-romarin").plants).not.toContain("sage");
    expect(byId("dec-rebord").about).not.toContain("parsley");
    expect(byId("jan-micropousses").about).toEqual(["microgreens"]);
    expect(byId("mai-saints-glace").climates?.only).toEqual(["oceanic", "temperate", "continental"]);
  });
});

describe("astuce de la semaine", () => {
  const bank: Tip[] = [
    { id: "a-general", text: "Générale.", months: [11] },
    { id: "b-thym", text: "Thym.", months: [11], plants: ["thyme"] },
    { id: "c-gel", text: "Gel.", months: [11], condition: "frost" },
    { id: "d-montagne", text: "Montagne.", months: [11], climates: { only: ["mountain"] } },
    { id: "e-avril", text: "Avril.", months: [4], climates: { shift: true } },
  ];

  it("une astuce liée à une plante du balcon passe avant une astuce générale", () => {
    expect(eligibleTips({ now: day(11, 10), owned: ["thyme"], state: emptyTipState(), bank }).map((tip) => tip.id)).toEqual(["b-thym", "a-general"]);
    expect(eligibleTips({ now: day(11, 10), owned: [], weather: ["frost"], state: emptyTipState(), bank }).map((tip) => tip.id)).toEqual(["c-gel", "a-general"]);
    expect(eligibleTips({ now: day(11, 10), owned: [], climate: climateZoneFor(45.9, 6.9, 1200), state: emptyTipState(), bank }).map((tip) => tip.id)).toEqual(["a-general", "d-montagne"]);
  });

  it("ses mois suivent le climat quand elle le demande", () => {
    expect(tipMonths(bank[4], climateZoneFor(45.9, 6.9, 1200))).toEqual([5]);
    expect(tipMonths(bank[4], null)).toEqual([4]);
  });

  it("la même toute la semaine, une autre la semaine suivante, jamais deux fois dans l'année", () => {
    const first = tipOfTheWeek({ now: day(11, 9), owned: [], state: emptyTipState(), bank });
    expect(first.tip?.id).toBe("a-general");
    const sameWeek = tipOfTheWeek({ now: day(11, 13), owned: ["thyme"], state: first.state, bank });
    expect(sameWeek.tip?.id).toBe("a-general");
    const nextWeek = tipOfTheWeek({ now: day(11, 16), owned: [], state: first.state, bank });
    expect(nextWeek.tip).toBeNull();
    expect(weekKey(day(11, 9))).toBe("2026-W46");
  });

  it("la croix la masque jusqu'à la suivante", () => {
    const state = { ...emptyTipState(), dismissedWeek: weekKey(day(11, 10)) };
    expect(tipHidden(state, day(11, 12))).toBe(true);
    expect(tipHidden(state, day(11, 17))).toBe(false);
  });
});
