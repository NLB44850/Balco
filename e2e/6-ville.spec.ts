import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Sans ville (position refusée), Aujourd'hui le dit et propose d'en choisir une. */

test("ville refusée : bandeau « Météo de Paris par défaut », choix de Lyon, plus de bandeau", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint"], wateredDaysAgo: 1, extra: { "balco.location.preference.v1": JSON.stringify({ mode: "denied" }) } });
  await open(page, "/", "Météo de Paris par défaut");
  await page.getByRole("button", { name: "Choisir ma ville" }).click();
  await page.getByPlaceholder("Cherche ta ville").fill("Lyon");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page.getByText("Lyon", { exact: true }).click();
  await expect(page.getByText("Météo de Paris par défaut")).toHaveCount(0);
  // Réglages affiche la ville choisie.
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Ville : Lyon" })).toBeVisible();
  expect(errors).toEqual([]);
});
