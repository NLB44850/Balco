import { expect, test } from "@playwright/test";

import { atDate, mockWeather, seedBalcony, trackErrors } from "./helpers";

/** L'accueil à l'ouverture : météo, bonjour, tes plantes, ce qui t'attend, puis il s'efface tout seul. */

test("à l'ouverture un soir de gel : « Bonsoir / Camille », la météo, l'alerte en carte, puis Aujourd'hui", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 4, 5, 19));
  await mockWeather(page, { min: -3 });
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, now, opening: true, extra: { "balco.user.profile.v1": JSON.stringify({ firstName: "Camille" }) } });
  await page.goto("/");
  await expect(page.getByText("Bonsoir", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Camille", { exact: true })).toBeVisible();
  await expect(page.getByText("Mercredi 5 mai")).toBeVisible();
  await expect(page.getByText(/^❄️ -3° cette nuit$/u)).toBeVisible();
  await expect(page.getByText("1 plante craint le froid")).toBeVisible();
  await expect(page.getByText("Gel cette nuit", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Je m’en occupe" })).toBeVisible();
  // Il s'efface tout seul et laisse Aujourd'hui.
  await expect(page.getByText("Bonsoir", { exact: true })).toHaveCount(0, { timeout: 12_000 });
  await expect(page.getByText("Gel cette nuit : protège le basilic").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("son bouton laisse la place tout de suite ; sans balcon créé, il ne s'affiche pas", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page, {});
  await seedBalcony(page, { plants: ["thyme", "basil"], wateredDaysAgo: 0, opening: true });
  await page.goto("/");
  const go = page.getByRole("button", { name: /^(C’est parti|Voir mon balcon)$/u });
  await expect(go).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/^2 plantes · /u)).toBeVisible();
  await go.click();
  await expect(go).toHaveCount(0, { timeout: 3_000 });

  // Premier lancement, rien de créé : directement les questions de l'accueil.
  await page.evaluate(() => window.localStorage.removeItem("balco.onboarding.preferences.v1"));
  await page.reload();
  await expect(page.getByText("ou touche n’importe où")).toHaveCount(0, { timeout: 10_000 });
  expect(errors).toEqual([]);
});
