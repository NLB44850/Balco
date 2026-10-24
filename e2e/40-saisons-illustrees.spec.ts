import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Retour du 24/10 : « améliore aussi l'affichage de Saisons avec des illustrations » (maquettes A + B). En haut, la
 * saison du mois affiché, dessinée, avec le climat ; sous la liste, l'année de chaque plante en cases colorées.
 */
test("Saisons : la scène suit le mois choisi, et « L'année de tes plantes » ouvre la fiche", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 24, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint", "cosmos"], wateredDaysAgo: 1, winter: { basil: "outside" }, now });
  await open(page, "/calendar", "L’automne sur ton balcon");
  await expect(page.getByText("Le temps des dernières récoltes et des bulbes de printemps.")).toBeVisible();
  await expect(page.getByText(/premières gelées vers/)).toBeVisible();
  await page.getByRole("button", { name: /^Jan/ }).first().click();
  await expect(page.getByText("L’hiver sur ton balcon")).toBeVisible();
  await page.getByRole("button", { name: /^Avr/ }).first().click();
  await expect(page.getByText("Le printemps sur ton balcon")).toBeVisible();

  await expect(page.getByText("L’année de tes plantes")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Cosmos : semis .*floraison .*Voir sa fiche$/u })).toBeVisible();
  await page.getByRole("button", { name: /^Menthe : .*récolte .*Voir sa fiche$/u }).click();
  await expect(page).toHaveURL(/\/garden\/mint-e2e/);
  expect(errors).toEqual([]);
});

test("Saisons par saison : la scène et les saisons dessinées", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 24, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, winter: { basil: "outside" }, now });
  await open(page, "/calendar", "L’automne sur ton balcon");
  await page.getByRole("button", { name: "Par saison" }).click();
  await page.getByRole("button", { name: /Été/ }).first().click();
  await expect(page.getByText("L’été sur ton balcon")).toBeVisible();
  expect(errors).toEqual([]);
});
