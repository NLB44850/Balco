import { expect, test } from "@playwright/test";

import { checkboxOf, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Le rempotage selon le besoin : le signe à vérifier, le pot suivant, « Pas besoin cette année ». */

test("rempotage : le signe, le pot suivant, puis « Pas besoin cette année » propose la terre du dessus", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 2, 10, 10) });
  await page.clock.resume();
  await mockWeather(page);
  // Un thym dans son pot depuis deux ans : c'est son année.
  const thyme = { id: "thyme-e2e", catalogId: "thyme", addedAt: new Date(2025, 2, 1).toISOString() };
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([thyme]), "balco.garden.events.v1": JSON.stringify([{ id: "w-thyme", plantId: "thyme-e2e", type: "watering", completedAt: new Date(2027, 2, 10, 8).toISOString(), source: "manual" }]) } });
  // Un geste à la fois par plante : la récolte d'abord, puis le rempotage prend sa place.
  await open(page, "/", "Récolte le thym");
  await checkboxOf(page, "Marquer comme fait : Récolte le thym").click();
  await expect(page.getByText("Rempote le thym")).toBeVisible();
  await page.getByRole("button", { name: "Rempote le thym, détail" }).click();
  await expect(page.getByText(/des racines sortent par le trou, rempote ton thym\. Si son pot fait environ \d+ L, prends-en un d’environ \d+ L \(\d+ cm de large\)/)).toBeVisible();

  await page.getByRole("button", { name: "Pas besoin cette année" }).click();
  await expect(page.getByText("Pas de rempotage cette année : change plutôt la terre du dessus")).toBeVisible();
  await expect(page.getByText("Change la terre du dessus du thym").first()).toBeVisible();
  await expect(page.getByText("Rempote le thym")).toHaveCount(0);

  // Saisons dit la même chose.
  await open(page, "/calendar", "Change la terre du dessus du thym");
  await expect(page.getByText("Rempote le thym")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("pas-à-pas du rempotage : ce qu'il te faut, les étapes, puis « C'est rempoté » coche le geste", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 2, 10, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const thyme = { id: "thyme-e2e", catalogId: "thyme", addedAt: new Date(2025, 2, 1).toISOString() };
  const events = [
    { id: "w-thyme", plantId: "thyme-e2e", type: "watering", completedAt: new Date(2027, 2, 10, 8).toISOString(), source: "manual" },
    { id: "h-thyme", plantId: "thyme-e2e", type: "harvest", completedAt: new Date(2027, 2, 10, 8).toISOString(), source: "manual" },
  ];
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([thyme]), "balco.garden.events.v1": JSON.stringify(events) } });
  await open(page, "/", "Aujourd’hui");
  // La récolte d'abord si elle est proposée, puis le rempotage.
  const harvest = page.getByText("Récolte le thym");
  if (await harvest.isVisible()) await checkboxOf(page, "Marquer comme fait : Récolte le thym").click();
  await page.getByRole("button", { name: "Rempote le thym, détail" }).click();
  await page.getByRole("button", { name: "Pas à pas, avec ce qu’il te faut" }).click();

  await expect(page.getByText("Rempoter le thym")).toBeVisible();
  await expect(page.getByText(/^Un pot percé d’environ \d+ L$/)).toBeVisible();
  await page.getByRole("button", { name: "Commencer le pas-à-pas" }).click();
  await expect(page.getByText("Regarde sous le pot si des racines sortent.")).toBeVisible();
  await expect(page.getByText("Étape 1 sur 7")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByText("Erreur à éviter : un pot bien plus grand. La terre resterait trempée.")).toBeVisible();
  for (let step = 0; step < 5; step += 1) await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Et après ?" }).click();
  await expect(page.getByText("Prochain rempotage dans 2 à 4 ans : Balco te le dira.")).toBeVisible();

  await page.getByRole("button", { name: "C’est rempoté" }).click();
  await expect(page.getByText("C’est rempoté : bien joué !")).toBeVisible();
  await expect(checkboxOf(page, "Annuler ce geste : Rempote le thym")).toBeVisible({ timeout: 5_000 });
  expect(errors).toEqual([]);
});
