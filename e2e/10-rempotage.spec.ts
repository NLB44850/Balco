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
