import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Réglages → Version de test → Date simulée : « Faire comme si on était le… ». Aujourd'hui et Saisons suivent le
 * jour choisi, jusqu'à « Revenir à aujourd'hui ».
 */
test("date simulée : Saisons passe en novembre, puis retour au vrai jour", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 8, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], now });
  await open(page, "/settings", "Version de test");

  await page.getByRole("button", { name: "Date simulée : Aujourd’hui" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Aujourd’hui, jeudi 8 octobre 2026")).toBeVisible();
  await sheet.getByRole("button", { name: "18 nov." }).click();
  await expect(sheet.getByText("mercredi 18 novembre 2026")).toBeVisible();
  await sheet.getByRole("button", { name: "+ 1 semaine" }).click();
  await expect(sheet.getByText("mercredi 25 novembre 2026")).toBeVisible();
  await sheet.getByRole("button", { name: "Fermer la fiche" }).click();
  await expect(page.getByRole("button", { name: "Date simulée : mercredi 25 novembre 2026" })).toBeVisible();

  // Gardée après un rechargement, et visible sur Aujourd'hui.
  await open(page, "/", "Aujourd’hui");
  await expect(page.getByText("🧪 Date simulée : mercredi 25 novembre 2026")).toBeVisible();
  await page.getByRole("tab", { name: /Saisons/ }).click();
  await expect(page.getByText(/novembre/i).first()).toBeVisible();

  await page.getByRole("tab", { name: /Aujourd/ }).click();
  await page.getByRole("button", { name: "Revenir à aujourd’hui" }).click();
  await expect(page.getByText(/Date simulée/)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("balco.clock.simulation.v1"))).toBeNull();
  expect(errors).toEqual([]);
});
