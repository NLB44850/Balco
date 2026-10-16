import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Chantier « Plante hors saison », étape 4 : « Rentre ton basilic », le pas-à-pas, puis « À l'intérieur ». */

test("nuit à 9 °C annoncée : « Rentre ton basilic », pas-à-pas en 4 écrans, puis « À l'intérieur » et « Le remettre dehors »", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 10, 2, 10));
  await mockWeather(page, { min: 9 });
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, winter: { basil: "indoors" }, now });

  await open(page, "/", "Rentre ton basilic");
  await expect(page.getByText("Nuit sous 10 °C annoncée · pas-à-pas")).toBeVisible();
  await page.getByRole("button", { name: "Rentre ton basilic, détail" }).click();
  await expect(page.getByText("Rentrer le basilic")).toBeVisible();
  for (const step of ["Vérifie les pucerons sous les feuilles.", "Vide la soucoupe.", "Choisis la fenêtre la plus lumineuse.", "Éloigne-le du radiateur."]) {
    await expect(page.getByText(step)).toBeVisible();
    await page.getByRole("button", { name: step === "Éloigne-le du radiateur." ? "Et après ?" : "Suivant" }).click();
  }
  await expect(page.getByText("À l’intérieur, il tiendra souvent quelques semaines de plus.")).toBeVisible();
  await page.getByRole("button", { name: "C’est rentré" }).click();
  await expect(page.getByText("C’est rentré : bien joué !")).toBeVisible();

  await open(page, "/balcony", "Ajouter une plante");
  await expect(page.getByRole("button", { name: /^Basilic, 🏠 À l’intérieur, voir la fiche$/u })).toBeVisible();
  await open(page, "/garden/basil-e2e", "Revoir le pas-à-pas ›");
  await expect(page.getByText("🏠 À l’intérieur depuis le 2 novembre")).toBeVisible();
  await expect(page.getByText(/^Arrose environ tous les \d+ jours, si la terre est sèche sur 2 cm \(estimation Balco\)\./u)).toBeVisible();
  await page.getByRole("button", { name: "Le remettre dehors" }).click();
  await expect(page.getByText("Basilic remis dehors : Balco te redira quand le rentrer")).toBeVisible();
  await expect(page.getByText("Pour l’hiver : le rentrer à l’intérieur")).toBeVisible();
  expect(errors).toEqual([]);
});

test("nuits douces : la ligne attend ; une fois dedans, le gel ne compte plus pour lui", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 10, 2, 10));
  await mockWeather(page, { min: 12 });
  await seedBalcony(page, { plants: ["basil", "chili"], wateredDaysAgo: 1, winter: { basil: "indoors", chili: "inside" }, now });
  await open(page, "/balcony", "Ajouter une plante");
  await expect(page.getByText("Rentre ton basilic")).toHaveCount(0);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockWeather(page, { min: -3 });
  await page.reload();
  await expect(page.getByRole("button", { name: /^Piment, 🏠 À l’intérieur, voir la fiche$/u })).toBeVisible({ timeout: 20_000 });
  await open(page, "/", "Rentre ton basilic");
  // Pas d'alerte gel pour le piment rentré, ni « protège » pour le basilic qui va rentrer.
  await expect(page.getByText(/protège le piment|Gel cette nuit/u)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("le pas-à-pas est facultatif : « C'est rentré » directement sur la fiche, sans nuit froide annoncée", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 10, 2, 10));
  await mockWeather(page, { min: 14 });
  await seedBalcony(page, { plants: ["lemon-tree"], wateredDaysAgo: 1, winter: { "lemon-tree": "indoors" }, now });
  await open(page, "/garden/lemon-tree-e2e", "Pour l’hiver : le rentrer à l’intérieur");
  await page.getByRole("button", { name: "C’est rentré" }).click();
  await expect(page.getByText("Ton citronnier : à l’intérieur, Balco adapte ses soins")).toBeVisible();
  await expect(page.getByText("🏠 À l’intérieur depuis le 2 novembre")).toBeVisible();
  expect(errors).toEqual([]);
});
