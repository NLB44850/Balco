import { expect, test } from "@playwright/test";

import { checkboxOf, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Les pas-à-pas des gestes de suite : ici pincer le basilic, deux semaines après l'avoir planté. */

test("pas-à-pas pour pincer : depuis Aujourd'hui, puis « C'est pincé » coche le geste", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 4, 20, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const basil = { id: "basil-e2e", catalogId: "basil", addedAt: new Date(2027, 4, 1).toISOString() };
  const events = [
    { id: "basil-e2e:start", plantId: "basil-e2e", type: "observation", completedAt: new Date(2027, 4, 5, 9).toISOString(), source: "manual", note: "Plante le basilic" },
    { id: "w-basil", plantId: "basil-e2e", type: "watering", completedAt: new Date(2027, 4, 20, 8).toISOString(), source: "manual" },
  ];
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([basil]), "balco.garden.events.v1": JSON.stringify(events) } });
  await open(page, "/", "Pince le basilic");
  await page.getByRole("button", { name: "Pince le basilic, détail" }).click();
  await page.getByRole("button", { name: "Pas à pas, avec ce qu’il te faut" }).click();

  await expect(page.getByText("Pincer le basilic")).toBeVisible();
  await expect(page.getByText("Tes doigts, ou de petits ciseaux propres")).toBeVisible();
  await page.getByRole("button", { name: "Commencer le pas-à-pas" }).click();
  await expect(page.getByText("Repère le bout d’une tige, au-dessus d’une paire de feuilles.")).toBeVisible();
  await expect(page.getByText("Étape 1 sur 4")).toBeVisible();
  for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Et après ?" }).click();
  await expect(page.getByText("Les bouts pincés se mangent : ne les jette pas.")).toBeVisible();

  await page.getByRole("button", { name: "C’est pincé" }).click();
  await expect(page.getByText("C’est pincé : bien joué !")).toBeVisible();
  await expect(checkboxOf(page, "Annuler ce geste : Pince le basilic")).toBeVisible({ timeout: 5_000 });

  // La fiche ne propose plus le pas-à-pas une fois le geste fait.
  await open(page, "/garden/basil-e2e", "Revoir le pas-à-pas ›");
  await expect(page.getByText("Comment la pincer, pas à pas ›")).toHaveCount(0);
  expect(errors).toEqual([]);
});
