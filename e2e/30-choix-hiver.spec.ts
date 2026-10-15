import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Chantier « Plante hors saison », étape 3 : le choix pour l'hiver d'une frileuse en fin de saison. */

test("15 octobre : « Prépare 2 plantes pour le froid », le basilic rentrera, la fiche le dit et on peut changer d'avis", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "cherry-tomato", "thyme"], wateredDaysAgo: 1, now });

  await open(page, "/", "Prépare 2 plantes pour le froid");
  await page.getByRole("button", { name: "Prépare 2 plantes pour le froid, détail" }).click();
  await page.getByRole("button", { name: "Décide pour ton basilic avant le froid, détail" }).click();
  await expect(page.getByText("Ton basilic n’aime pas le froid. Que veux-tu faire ?")).toBeVisible();
  await expect(page.getByText("Il souffre quand les nuits passent sous 10 °C.")).toBeVisible();
  await expect(page.getByText("Hache-le sous l’huile d’olive, en bac à glaçons, au congélateur.")).toBeVisible();
  await page.getByRole("button", { name: "Basilic : Le rentrer à l’intérieur" }).click();
  await expect(page.getByText("Noté : Balco te dira quand le rentrer")).toBeVisible();
  // Il ne reste que les tomates : une ligne à elles.
  await expect(page.getByText("Décide pour tes tomates cerises avant le froid")).toBeVisible();
  await expect(page.getByText("Prépare 2 plantes pour le froid")).toHaveCount(0);

  await open(page, "/garden/basil-e2e", "Revoir le pas-à-pas ›");
  await expect(page.getByText("Pour l’hiver : le rentrer à l’intérieur")).toBeVisible();
  await page.getByRole("button", { name: "Changer d’avis" }).click();
  await expect(page.getByText("Ton basilic n’aime pas le froid. Que veux-tu faire ?")).toBeVisible();
  expect(errors).toEqual([]);
});

test("« Tout récolter » sur la fiche des tomates : « Tout récolté ? » avec l'astuce, puis « Ton pot est libre »", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["cherry-tomato"], wateredDaysAgo: 1, now });

  await open(page, "/garden/cherry-tomato-e2e", "Revoir le pas-à-pas ›");
  await expect(page.getByText("Tes tomates cerises n’aiment pas le froid. Que veux-tu faire ?")).toBeVisible();
  await page.getByRole("button", { name: "Tomates cerises : Tout récolter" }).click();
  await expect(page.getByText("Noté : récolte tout, puis dis-le sur Aujourd’hui")).toBeVisible();

  await open(page, "/", "Tes tomates cerises sont-elles toutes récoltées ?");
  await expect(page.getByText("Fais mûrir les vertes au chaud, en carton, avec une pomme.")).toBeVisible();
  await page.getByRole("checkbox", { name: "Marquer comme fait : Tes tomates cerises sont-elles toutes récoltées ?" }).click();
  await expect(page.getByText("Ton pot est libre").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("sans réponse, la ligne attend le froid : rien le lendemain, de retour quand une nuit à 9 °C est annoncée", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, now });
  await open(page, "/", "Décide pour ton basilic avant le froid");

  await page.clock.setSystemTime(new Date(2026, 9, 16, 10));
  await page.reload();
  await expect(page.getByText("Basilic").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Décide pour ton basilic avant le froid")).toHaveCount(0);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockWeather(page, { min: 9 });
  await page.reload();
  await expect(page.getByText("Décide pour ton basilic avant le froid")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
