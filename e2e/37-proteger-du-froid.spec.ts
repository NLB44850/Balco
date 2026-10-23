import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony } from "./helpers";

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
