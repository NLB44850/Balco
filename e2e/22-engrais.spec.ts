import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * L'engrais tiré des fiches Spécial pot (chantier « Pots et balcon », étape 4) : le même jour que l'arrosage, une seule
 * ligne « Arrose et nourris… » qui note les deux ; dès deux plantes à nourrir, une ligne « Nourris 2 plantes ».
 */
test("juillet : « Arrose et nourris tes tomates cerises », une seule ligne qui note les deux", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 6, 15, 10));
  await mockWeather(page);
  // Arrivées il y a 30 jours, jamais arrosées dans l'app ni nourries : arrosage et engrais tombent aujourd'hui.
  await seedBalcony(page, { plants: ["cherry-tomato"], now });
  await open(page, "/", "Tes plantes");
  await expect(page.getByText("Arrose et nourris tes tomates cerises")).toBeVisible();
  await expect(page.getByText("Nourris tes tomates cerises", { exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Marquer comme fait : Arrose et nourris tes tomates cerises" }).click();
  await expect(page.getByText(/^Arrose et nourris tes tomates cerises : noté/u)).toBeVisible();
  // Cochée, la ligne reste une seule : l'engrais ne revient pas à part.
  await expect(page.getByText("Nourris tes tomates cerises", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("juillet : deux plantes à nourrir, une ligne « Nourris 2 plantes » et une feuille pour cocher chacune", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 6, 15, 10));
  await mockWeather(page);
  // Arrosées hier : seul l'engrais est dû.
  await seedBalcony(page, { plants: ["cherry-tomato", "sweet-pepper"], now, wateredDaysAgo: 1 });
  await open(page, "/", "Tes plantes");
  await page.getByRole("button", { name: /^Nourris 2 plantes, détail$/u }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Toujours sur une terre humide", { exact: false })).toBeVisible();
  await expect(sheet.getByText("Engrais liquide organique pour tomates")).toBeVisible();
  await sheet.getByRole("checkbox", { name: "Marquer comme fait : Nourris tes tomates cerises" }).click();
  await expect(sheet.getByText("1 sur 2 faites", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
