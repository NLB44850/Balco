import { expect, test } from "@playwright/test";

import { atDate, DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Le détail des gestes au même format que l'arrosage (13/10) : un repère en grand, des gestes courts avec icône.
 * Planter (largeur du pot), récolter (jusqu'à quand) et un geste fait (bandeau « ✓ Fait à … »).
 */
test("planter et récolter : le repère en grand et les gestes courts ; un geste fait garde son détail", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 4, 12, 10));
  await mockWeather(page);
  const day = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  await seedBalcony(page, {
    plants: ["mint"],
    now,
    wateredDaysAgo: 1,
    extra: {
      "balco.garden.plants.v1": JSON.stringify([
        { id: "mint-e2e", catalogId: "mint", addedAt: day(40), potSize: "large" },
        { id: "basil-e2e", catalogId: "basil", addedAt: day(1), toPlant: true, potSize: "medium" },
      ]),
    },
  });
  await open(page, "/", "Tes plantes");

  await page.getByRole("button", { name: "Plante le basilic, détail" }).click();
  let sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Plantation · ce mois-ci", { exact: false })).toBeVisible();
  await expect(sheet.getByLabel(/^20 cm, de large, pot percé/u)).toBeVisible();
  await expect(sheet.getByText("Place la motte au même niveau que dans son godet")).toBeVisible();
  await expect(sheet.getByText("Arrose bien, environ 2 L")).toBeVisible();
  await page.screenshot({ path: "dist/e2e-results/geste-planter.png" });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Récolte la menthe, détail" }).click();
  sheet = page.getByRole("dialog");
  await expect(sheet.getByLabel(/^Jusqu’en /u)).toBeVisible();
  await expect(sheet.getByText("Récolte souvent : la plante produit davantage")).toBeVisible();
  await sheet.getByRole("button", { name: "C’est fait" }).click();
  await page.getByRole("button", { name: "Récolte la menthe, détail" }).click();
  await expect(page.getByRole("dialog").getByText(/^✓ Fait à /u)).toBeVisible();
  await page.screenshot({ path: "dist/e2e-results/geste-recolte-fait.png" });
  expect(errors).toEqual([]);
});
