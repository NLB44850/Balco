import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** L'hiver dans l'accueil, et le rappel des envies en mars : l'horloge du navigateur est avancée à la date voulue. */

test("accueil en janvier : rebord intérieur et envies pour le printemps", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 0, 15, 10) });
  await page.clock.resume();
  await mockWeather(page);
  await open(page, "/", "Ton balcon, au bon moment.");
  await page.getByText("C’est parti").click();
  await page.getByText("Pas encore").click();
  await page.getByText("Le soleil tape presque toute la journée").click();
  await page.getByText("Un petit balcon", { exact: true }).click();
  await page.getByText("Basilic & menthe").click();
  await page.getByText("Continuer", { exact: true }).click();
  await page.getByRole("button", { name: "Plus tard" }).click();
  await expect(page.getByText("À semer sur le rebord intérieur")).toBeVisible();
  await expect(page.getByText("Tes envies pour le printemps")).toBeVisible();
  await page.getByRole("checkbox", { name: "Persil" }).click();
  await page.getByRole("checkbox", { name: "Envie pour le printemps : Basilic" }).click();
  await page.getByText(/^Créer mon balcon/).click();
  await expect(page.getByRole("checkbox", { name: "Marquer comme fait : Sème le persil à l’intérieur" })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("balco.onboarding.preferences.v1") ?? "{}"));
  expect(stored.springWishes).toEqual(["basil"]);
  expect(errors).toEqual([]);
});

test("en mars, « C'est le moment » propose les envies du printemps", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 2, 3, 10) });
  await page.clock.resume();
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 1, extra: { "balco.onboarding.preferences.v1": JSON.stringify({ sunlight: "sunny", space: "balcony", goals: [], springWishes: ["basil", "mint"], completedAt: new Date(2027, 0, 15).toISOString() }) } });
  await open(page, "/", "C’est le moment 🌱");
  // La menthe est déjà là : seul le basilic est proposé.
  await expect(page.getByRole("button", { name: "Ajouter Basilic" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter Menthe" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ajouter Basilic" }).click();
  await expect(page.getByText("C’est le moment 🌱")).toHaveCount(0);
  expect(errors).toEqual([]);
});
