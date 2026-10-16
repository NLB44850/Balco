import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Chantier « Plante hors saison », étape 5 : « Ressors ton basilic » au feu vert des Saints de glace. */

test("20 mai, nuits douces : « Ressors ton basilic », pas-à-pas en 3 écrans, puis ses rappels normaux", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 4, 20, 10));
  await mockWeather(page, { min: 12 });
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, winter: { basil: "wintered" }, now });

  await open(page, "/", "Ressors ton basilic");
  await expect(page.getByText("Feu vert des Saints de glace · pas-à-pas")).toBeVisible();
  await page.getByRole("button", { name: "Ressors ton basilic, détail" }).click();
  await expect(page.getByText("Ressortir le basilic")).toBeVisible();
  const steps = ["Sors-le quelques heures, à l’ombre et à l’abri du vent.", "Laisse-le dehors un peu plus longtemps chaque jour.", "Installe-le à sa place au soleil, puis arrose bien."];
  for (const step of steps) {
    await expect(page.getByText(step)).toBeVisible();
    await page.getByRole("button", { name: step === steps[2] ? "Et après ?" : "Suivant" }).click();
  }
  await expect(page.getByText("Un coup de froid annoncé ? Rentre-le quelques nuits.")).toBeVisible();
  await page.getByRole("button", { name: "C’est ressorti" }).click();
  await expect(page.getByText("C’est ressorti : bien joué !")).toBeVisible();

  await open(page, "/balcony", "Ajouter une plante");
  await expect(page.getByRole("button", { name: /^Basilic, 🏠 À l’intérieur, voir la fiche$/u })).toHaveCount(0);
  await open(page, "/", "Aujourd’hui");
  await expect(page.getByText("Ressors ton basilic")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("nuit à 6 °C annoncée : la ligne attend ; deux plantes : « Ressors 2 plantes », et la fiche « C'est ressorti »", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 4, 20, 10));
  await mockWeather(page, { min: 6 });
  await seedBalcony(page, { plants: ["basil", "lemon-tree"], wateredDaysAgo: 1, winter: { basil: "wintered", "lemon-tree": "wintered" }, now });
  await open(page, "/garden/basil-e2e", "Revoir le pas-à-pas ›");
  await expect(page.getByText(/^🏠 À l’intérieur depuis le /u)).toBeVisible();
  await expect(page.getByText("Ressors ton basilic")).toHaveCount(0);

  await mockWeather(page, { min: 13 });
  await page.reload();
  await open(page, "/", "Ressors 2 plantes");
  await open(page, "/garden/lemon-tree-e2e", "Feu vert des Saints de glace : ressors-le.");
  await page.getByRole("button", { name: "C’est ressorti" }).click();
  await expect(page.getByText("Ton citronnier : de retour dehors, Balco reprend ses rappels")).toBeVisible();
  await expect(page.getByText(/^🏠 À l’intérieur depuis le /u)).toHaveCount(0);
  expect(errors).toEqual([]);
});
