import { expect, test } from "@playwright/test";

import { ILLUSTRATION_IDS, ILLUSTRATION_LABELS } from "../lib/plants/illustration-names";
import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** L'écran de revue des illustrations (Réglages → Version de test) : tous les dessins s'affichent. */
test("illustrations du pas-à-pas : toutes visibles, chacune nommée", async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 412, height: 3000 });
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/illustrations", "Illustrations");
  for (const id of ILLUSTRATION_IDS) await expect(page.getByText(ILLUSTRATION_LABELS[id], { exact: true })).toBeVisible();
  await page.screenshot({ path: "dist/illustrations.png", fullPage: true });
  expect(errors).toEqual([]);
});
