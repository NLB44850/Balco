import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Retour du 24/10 : « la météo s'affiche mieux, avec des illustrations » (maquette A). Une carte en haut
 * d'Aujourd'hui : le ciel dessiné, la température, le mini et le maxi, les prochaines heures ; la toucher ouvre le
 * détail avec les jours qui viennent.
 */
test("carte météo : le ciel, la température, les prochaines heures, puis le détail des jours qui viennent", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, winter: { basil: "outside" } });
  await open(page, "/", "Tes plantes");
  const card = page.getByRole("button", { name: /^Météo à Lyon : 16°, Éclaircies\. Mini 10°, maxi 19°\. Voir le détail$/u });
  await expect(card).toBeVisible();
  await expect(card.getByText("Maint.")).toBeVisible();
  // L'ancienne ligne sous le titre a laissé sa place à la carte.
  await expect(page.getByText(/maintenant · .*au plus bas/u)).toHaveCount(0);
  await card.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Les jours qui viennent")).toBeVisible();
  await expect(sheet.getByLabel(/^Demain : de 10° à 19°$/u)).toBeVisible();
  await expect(sheet.getByText(/^Ressenti 15°/u)).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Changer de ville/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("carte météo : la pluie qui arrive et le gel de la simulation se disent en une phrase", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page, { code: 61, rainMm: 8 });
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, winter: { basil: "outside" } });
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("button", { name: /^Météo à Lyon : 16°, Pluie faible\./u })).toBeVisible();
  await expect(page.getByText("🌧️  La pluie arrose à ta place : vérifie juste les pots à l’abri du balcon.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("carte météo : en simulation de gel, la carte le montre aussi", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, scenario: "frost", winter: { basil: "outside" } });
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("button", { name: /^Météo à Lyon : 1°/u })).toBeVisible();
  await expect(page.getByText("❄️  Gel cette nuit (-3°) : protège tes plantes frileuses.")).toBeVisible();
  expect(errors).toEqual([]);
});
