import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Chantier « Cohérence », livraison 2 : supprimer = tout de suite, avec « Annuler » dans le message du bas. */

test("fiche plante : un geste de l'historique se supprime depuis sa feuille, « Annuler » le remet", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint"], wateredDaysAgo: 1 });
  await open(page, "/garden/basil-e2e", "Historique");
  await expect(page.getByText("Supprimer", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Arrosage à .*, détail$/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer ce geste" }).click();
  await expect(page.getByText("Geste supprimé de l’historique")).toBeVisible();
  await expect(page.getByText("Historique", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Arrosage à .*, détail$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: /^Arrosage à .*, détail$/ })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("fiche plante : son nom dans une feuille, « Retirer du balcon » tout de suite avec « Annuler » sur Balcon", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint"], wateredDaysAgo: 1 });
  await open(page, "/balcony", "Basilic");
  await page.getByRole("button", { name: /^Basilic, .*voir la fiche/ }).click();
  await expect(page.getByText("Ta plante")).toBeVisible();
  await page.getByRole("button", { name: /^Son nom/ }).click();
  await page.getByRole("dialog").getByLabel("Son nom").fill("Basilic du salon");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Basilic du salon").first()).toBeVisible();

  await page.getByRole("button", { name: /^Retirer du balcon/ }).click();
  await expect(page.getByText("Basilic du salon retiré de ton balcon")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Basilic du salon, .*voir la fiche/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: /^Basilic du salon, .*voir la fiche/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mode vacances : « Arrêter » tout de suite, « Annuler » remet les dates", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/vacation", "Mode vacances");
  await page.getByRole("button", { name: "Préparer mon départ" }).click();
  await page.getByRole("button", { name: "Arrêter le mode vacances" }).click();
  await expect(page.getByText("Mode vacances arrêté")).toBeVisible();
  await expect(page.getByText("Tu pars quand ?")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: "Arrêter le mode vacances" })).toBeVisible();
  expect(errors).toEqual([]);
});
