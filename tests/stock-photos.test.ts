import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PLANT_CATALOG } from "../lib/plants/catalog";

const ROOT = path.resolve(__dirname, "..");
const credits = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/plants/credits.json"), "utf8")) as Record<string, { author: string; license: string; page: string }>;
const index = fs.readFileSync(path.join(ROOT, "components/plant-stock-photos.ts"), "utf8");

/** Plantes qui attendent leur photo d'exemple (l'app montre leur emoji en attendant). Vide : toutes en ont une. */
const AWAITING_PHOTO = new Set<string>([]);

describe("photos d'exemple des plantes", () => {
  it("n'attendent leur photo que pour des plantes qui n'en ont vraiment pas encore", () => {
    for (const id of AWAITING_PHOTO) {
      expect(PLANT_CATALOG.some((entry) => entry.id === id), id).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "assets/plants", `${id}.jpg`)), `${id} a sa photo : retire-le de AWAITING_PHOTO`).toBe(false);
    }
  });

  it("existent pour chaque plante du catalogue, légères, avec leur crédit", () => {
    for (const entry of PLANT_CATALOG.filter((item) => !AWAITING_PHOTO.has(item.id))) {
      const file = path.join(ROOT, "assets/plants", `${entry.id}.jpg`);
      expect(fs.existsSync(file), entry.id).toBe(true);
      expect(fs.statSync(file).size, entry.id).toBeLessThan(400 * 1024);
      expect(index).toContain(`"${entry.id}": require("@/assets/plants/${entry.id}.jpg")`);
      expect(credits[entry.id]?.author, entry.id).toBeTruthy();
      expect(credits[entry.id]?.page, entry.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });

  it("n'utilisent que des licences qui permettent l'usage dans l'app", () => {
    for (const [id, credit] of Object.entries(credits)) {
      expect(credit.license, id).toMatch(/^(CC0|Public domain|CC BY(-SA)? [0-9.]+)$/);
    }
  });
});
