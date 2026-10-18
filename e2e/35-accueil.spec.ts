import { expect, test } from "@playwright/test";

import { atDate, mockWeather, seedBalcony, trackErrors } from "./helpers";

/** L'accueil à l'ouverture : bonjour, la date, ce qui attend aujourd'hui, puis il s'efface tout seul. */

test("à l'ouverture : « Bonsoir, Camille », la date et l'alerte du jour, puis Aujourd'hui", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 4, 5, 19));
  await mockWeather(page, { min: -3 });
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, now, opening: true, extra: { "balco.user.profile.v1": JSON.stringify({ firstName: "Camille" }) } });
  await page.goto("/");
  await expect(page.getByText("Bonsoir, Camille")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Mercredi 5 mai")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvrir Balco" }).getByText("Gel cette nuit : protège le basilic")).toBeVisible();
  // Il s'efface tout seul et laisse Aujourd'hui.
  await expect(page.getByText("Bonsoir, Camille")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText("Gel cette nuit : protège le basilic").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("d'une touche, l'accueil laisse la place ; sans balcon créé, il ne s'affiche pas", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page, {});
  await seedBalcony(page, { plants: ["thyme"], wateredDaysAgo: 0, opening: true });
  await page.goto("/");
  const opening = page.getByRole("button", { name: "Ouvrir Balco" });
  await expect(opening.getByText(/^Bon(jour|soir)$/u)).toBeVisible({ timeout: 20_000 });
  await opening.click();
  await expect(opening).toHaveCount(0, { timeout: 3_000 });

  // Premier lancement, rien de créé : directement les questions de l'accueil.
  await page.evaluate(() => window.localStorage.removeItem("balco.onboarding.preferences.v1"));
  await page.reload();
  await expect(page.getByRole("button", { name: "Ouvrir Balco" })).toHaveCount(0, { timeout: 10_000 });
  expect(errors).toEqual([]);
});
