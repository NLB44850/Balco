import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Retour du 14/10 : sur la fiche, « Pot conseillé : … » tant que la taille n'est pas choisie, puis « Pot moyen (…) ». */

test("fiche : la taille conseillée est dite comme telle ; la toucher ouvre le choix, puis la taille choisie s'affiche", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 5, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, now });

  await open(page, "/garden/basil-e2e", "Revoir le pas-à-pas ›");
  const pill = page.getByRole("button", { name: "Pot conseillé : petit (jusqu’à 20 cm), choisir la taille du pot" });
  await expect(pill).toBeVisible();
  await expect(page.getByText(/^🪴 {2}Pot de \d+ cm$/u)).toHaveCount(0);
  // Un seul format de durée (15/10) : en haut et dans « Sa progression », arrivée il y a 30 jours.
  await expect(page.getByText("🌱  Depuis 4 semaines")).toBeVisible();
  await expect(page.getByText(/^Sur ton balcon depuis 4 semaines/u)).toBeVisible();
  await pill.click();
  await page.getByRole("radio", { name: "Moyen (21 à 30 cm)" }).click();
  await expect(page.getByRole("button", { name: "Pot moyen (21 à 30 cm), choisir la taille du pot" })).toBeVisible();
  expect(errors).toEqual([]);
});
