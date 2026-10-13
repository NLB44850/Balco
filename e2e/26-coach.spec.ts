import { expect, test } from "@playwright/test";

import { atDate, DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Le coach d'arrosage Balco+ (étape 6b), avec « Simuler Balco+ » de la version de test : la fiche dit ce qu'il reste
 * d'eau et quoi faire ; Aujourd'hui suit le coach. Sans Balco+, la fiche présente le coach (« bientôt »).
 */
const onboarding = (now: Date) => JSON.stringify({ firstName: "Camille", experience: "beginner", sunlight: "sunny", orientation: "S", space: "balcony", goals: ["aromatics"], completedAt: new Date(now.getTime() - 30 * DAY_MS).toISOString() });

test("Balco+ simulé : le coach dit d'arroser, avec sa quantité, sur Aujourd'hui et dans la fiche", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 6, 15, 10));
  await mockWeather(page, { min: 16, max: 26 });
  await seedBalcony(page, { plants: ["mint"], now, wateredDaysAgo: 3, extra: { "balco.onboarding.preferences.v1": onboarding(now), "balco.test.simulate-plus.v1": "1" } });
  await open(page, "/", "Tes plantes");
  await page.getByRole("button", { name: "Arrose la menthe, détail" }).click();
  await expect(page.getByRole("dialog").getByText(/Coach Balco\+ : selon la chaleur du jour/u)).toBeVisible();
  await page.screenshot({ path: "dist/e2e-results/coach-detail.png" });

  await open(page, "/garden/mint-e2e", "Spécial pot");
  await expect(page.getByText("✨  Coach d’arrosage Balco+")).toBeVisible();
  await expect(page.getByText(/^Arrose environ \d+(,5)? L ce soir$/u)).toBeVisible();
  await page.getByText("✨  Coach d’arrosage Balco+").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "dist/e2e-results/coach-fiche.png" });
  expect(errors).toEqual([]);
});

test("Balco+ simulé : arrosée ce matin, « Pas besoin aujourd'hui » ; sans Balco+, « bientôt avec Balco+ »", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 6, 15, 18));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], now, waterings: { mint: [0.3] }, extra: { "balco.onboarding.preferences.v1": onboarding(now), "balco.test.simulate-plus.v1": "1" } });
  await open(page, "/garden/mint-e2e", "Spécial pot");
  await expect(page.getByText("Pas besoin aujourd’hui")).toBeVisible();
  await expect(page.getByText(/^Ta terre a encore de l’eau · prochain arrosage /u)).toBeVisible();

  await page.evaluate(() => window.localStorage.setItem("balco.test.simulate-plus.v1", "0"));
  await page.reload();
  await expect(page.getByText("✨  Coach d’arrosage · bientôt avec Balco+")).toBeVisible();
  expect(errors).toEqual([]);
});
