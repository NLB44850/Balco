import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony } from "./helpers";

/**
 * Retour du 23/10 : « je ne vois pas le pas-à-pas comment protéger du froid, j'ai pourtant mis la simulation gel ».
 * L'artichaut ne craint le gel que sous -5 °C : avec « Grand froid » (-8 °C), l'alerte le concerne et propose son
 * pas-à-pas ; sa fiche le propose aussi.
 */
test("grand froid : l'alerte gel ouvre « Protéger l’artichaut du froid », pas à pas", async ({ page }) => {
  await mockWeather(page);
  await seedBalcony(page, { plants: ["artichoke"], wateredDaysAgo: 0, scenario: "hard-frost" });
  await open(page, "/", "Tes plantes");
  const banner = page.getByRole("button", { name: /^Gel cette nuit.*artichaut.*, détail$/ }).filter({ visible: true });
  await expect(banner).toBeVisible({ timeout: 20_000 });
  await banner.click();
  await page.getByRole("button", { name: "Protéger l’artichaut du froid, pas à pas" }).click();
  await expect(page.getByText("Protéger l’artichaut du froid", { exact: true })).toBeVisible();
  await expect(page.getByText("Un voile d’hivernage", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Commencer le pas-à-pas" }).click();
  await expect(page.getByText("Coupe les grandes feuilles à 20 cm du sol.")).toBeVisible();
});

/** Retour du 23/10 : « Guider les tiges » du potimarron introuvable en octobre ; la fiche montre tous ses pas-à-pas. */
test("fiche du potimarron en octobre : « Comment le guider » avec ses mois", async ({ page }) => {
  const now = await atDate(page, new Date(2026, 9, 23, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["kuri-squash"], now, wateredDaysAgo: 0 });
  await open(page, "/garden/kuri-squash-e2e", "Pas-à-pas · 2 guides ›");
  await page.getByRole("button", { name: "Pas-à-pas · 2 guides ›" }).click();
  await expect(page.getByText("À faire en juin–août")).toBeVisible();
  await page.getByRole("button", { name: /^Comment le guider, pas à pas/u }).click();
  await expect(page.getByText("Guider le potimarron", { exact: true })).toBeVisible();
});
