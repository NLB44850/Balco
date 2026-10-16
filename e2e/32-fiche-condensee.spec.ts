import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Fiche condensée (16/10) : moins de défilement, rien de perdu ; le détail s'ouvre en touchant. */

test("fiche du basilic : légende, variété, progression repliée et historique des 5 derniers jours", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 5, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], now, waterings: { basil: [1, 3, 5, 7, 9, 11, 13] } });
  await open(page, "/garden/basil-e2e", "Revoir le pas-à-pas ›");

  // La récolte passe dans les pastilles du haut.
  await expect(page.getByText(/^🧺 {2}Récolte /u)).toBeVisible();

  // La légende des couleurs s'ouvre en touchant l'état.
  await page.getByRole("button", { name: /, voir ce que disent les couleurs$/u }).click();
  await expect(page.getByText("Ce que disent les couleurs")).toBeVisible();
  await expect(page.getByText("À surveiller", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fermer la fiche" }).click();

  // La variété : une ligne, le choix dans la feuille du bas.
  await page.getByRole("button", { name: /^Variété/u }).click();
  await expect(page.getByText("Sa variété")).toBeVisible();
  await page.getByRole("button", { name: "Pourpre" }).click();
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
  await expect(page.getByRole("button", { name: /^Variété.*Pourpre/u })).toBeVisible();

  // Sa progression repliée : le stade et ses chiffres, le détail en la touchant.
  await expect(page.getByText(/^Sur ton balcon depuis 4 semaines/u)).toBeVisible();
  await expect(page.getByText(/semaines? sur \d+/u)).toHaveCount(0);
  await page.getByRole("button", { name: /, voir le détail$/u }).click();
  await expect(page.getByText(/semaines? sur \d+/u)).toBeVisible();

  // L'historique : les 5 derniers jours, puis « Voir tout l'historique ».
  await expect(page.getByRole("button", { name: /^Arrosage à /u })).toHaveCount(5);
  await page.getByRole("button", { name: "Voir tout l’historique (7 gestes) ›" }).click();
  await expect(page.getByRole("button", { name: /^Arrosage à /u })).toHaveCount(7);
  expect(errors).toEqual([]);
});

test("fiche du thym : ses deux pas-à-pas dans une feuille du bas ; coach en une ligne", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 5, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["thyme"], now, wateredDaysAgo: 1 });
  await open(page, "/garden/thyme-e2e", "Pas-à-pas · 2 guides ›");
  await expect(page.getByText("✨  Coach d’arrosage · bientôt avec Balco+")).toBeVisible();
  await page.getByRole("button", { name: "Pas-à-pas · 2 guides ›" }).click();
  await expect(page.getByText("Ses pas-à-pas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoir le pas-à-pas" })).toBeVisible();
  await page.getByRole("button", { name: /^(Comment le rempoter|Changer la terre du dessus, pas à pas)$/u }).click();
  await expect(page).toHaveURL(/\/guide\/thyme/u);
  expect(errors).toEqual([]);
});
