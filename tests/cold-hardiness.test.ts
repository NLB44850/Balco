import { describe, expect, it } from "vitest";
import { canComeIndoors, COLD_TENDER, isColdTender, NOT_COLD_TENDER } from "../lib/plants/cold-hardiness";
import { PLANT_CATALOG } from "../lib/plants/catalog";

const byId = new Map(PLANT_CATALOG.map((entry) => [entry.id, entry]));

describe("plantes frileuses (chantier « Plante hors saison »)", () => {
  it("chaque plante du catalogue est rangée : frileuse, ou rustique", () => {
    for (const entry of PLANT_CATALOG) {
      // Une plante protégée par les alertes gel est frileuse, sauf exception expliquée.
      if (entry.care.frostSensitive) expect(isColdTender(entry) || entry.id in NOT_COLD_TENDER, entry.id).toBe(true);
      else expect(isColdTender(entry), entry.id).toBe(false);
    }
  });

  it("ne parle que de plantes du catalogue", () => {
    for (const id of [...Object.keys(COLD_TENDER), ...Object.keys(NOT_COLD_TENDER)]) expect(byId.has(id), id).toBe(true);
  });

  it("un seuil vérifié a deux sources au moins, une plante à rentrer dit où la garder", () => {
    for (const [id, data] of Object.entries(COLD_TENDER)) {
      expect(data.sources.length, id).toBeGreaterThanOrEqual(data.nightEstimate ? 1 : 2);
      if (data.indoor !== "no") expect(data.place, id).toBeDefined();
      expect(data.nightC, id).toBeGreaterThanOrEqual(0);
      expect(data.nightC, id).toBeLessThanOrEqual(15);
    }
  });

  it("basilic : quelques semaines de plus ; piment : passe l'hiver ; courgette et thym : non", () => {
    expect(COLD_TENDER.basil).toMatchObject({ nightC: 10, indoor: "weeks" });
    expect(COLD_TENDER.chili.indoor).toBe("winters");
    expect(COLD_TENDER.physalis.indoor).toBe("winters");
    expect(canComeIndoors(byId.get("zucchini")!)).toBe(false);
    expect(isColdTender(byId.get("thyme")!)).toBe(false);
    expect(canComeIndoors(byId.get("thyme")!)).toBe(false);
  });
});
