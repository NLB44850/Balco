import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Retour du 20/10 : un citronnier ajouté pendant la date simulée « 18 nov. », rentré le 17 octobre. Revenu au vrai
 * jour, la fiche disait « Arrivée sur ton balcon : 18 novembre », « depuis aujourd'hui » et « Il s'installe ».
 */
test("dates du futur ramenées au présent, et « Sa progression » d'accord avec « À l'intérieur »", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 20, 10));
  await mockWeather(page);
  const plants = [{ id: "lemon-e2e", catalogId: "lemon-tree", addedAt: new Date(2026, 10, 18, 9).toISOString(), winter: { choice: "indoors", decidedAt: new Date(2026, 9, 17, 9).toISOString(), indoorsAt: new Date(2026, 9, 17, 9).toISOString() } }];
  const events = [{ id: "w-lemon", plantId: "lemon-e2e", type: "watering", completedAt: new Date(2026, 10, 18, 9, 30).toISOString(), source: "manual" }];
  await seedBalcony(page, { plants: [], now, extra: { "balco.garden.plants.v1": JSON.stringify(plants), "balco.garden.events.v1": JSON.stringify(events) } });

  await open(page, "/garden/lemon-e2e", "Sa progression");
  await expect(page.getByText("🏠 À l’intérieur depuis le 17 octobre")).toBeVisible();
  await expect(page.getByText("À l’abri pour l’hiver")).toBeVisible();
  await expect(page.getByText(/Sur ton balcon depuis 3 jours/u)).toBeVisible();
  await expect(page.getByText("18 novembre")).toHaveCount(0);
  await expect(page.getByText("Il s’installe")).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("balco.garden.plants.v1") ?? "[]"));
  expect(stored[0].addedAt).toBe(new Date(2026, 9, 17, 9).toISOString());
  expect(errors).toEqual([]);
});
