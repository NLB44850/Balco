import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Chantier « Plante hors saison », étape 2 : un état juste, en neutre, au lieu de « Nouvelle · Rien à faire ». */

test("15 octobre : le basilic est « Fin de saison », le thym reste « Nouvelle », rien en orange", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "thyme"], now });

  await open(page, "/balcony", "Ajouter une plante");
  await expect(page.getByRole("button", { name: /^Basilic, Fin de saison, voir la fiche$/u })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Thym, Nouvelle, voir la fiche$/u })).toBeVisible();
  await expect(page.getByText(/à surveiller/u)).toHaveCount(0);
  // La fiche dit la même chose.
  await open(page, "/garden/basil-e2e", "Revoir le pas-à-pas ›");
  await expect(page.getByText("Fin de saison", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("15 novembre : la menthe est « Au repos jusqu'en mars », et le catalogue le dit avant d'ajouter", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 10, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], now });

  await open(page, "/balcony", "Ajouter une plante");
  await expect(page.getByRole("button", { name: /^Menthe, Au repos jusqu’en mars, voir la fiche$/u })).toBeVisible();

  await open(page, "/garden/add", "Ajouter une plante");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("lavande");
  await page.getByRole("button", { name: /^Ajouter Lavande/ }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Au repos jusqu’en avril : rien à faire d’ici là.")).toBeVisible();
  await sheet.getByRole("button", { name: "Lavande : Déjà sur mon balcon" }).click();
  await expect(page.getByText(/^Ajouté : lavande.*· Au repos jusqu’en avril : rien à faire d’ici là$/u)).toBeVisible();
  expect(errors).toEqual([]);
});
