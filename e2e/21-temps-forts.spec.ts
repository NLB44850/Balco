import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Les autres temps forts de l'année : Prépare ton printemps (janvier), Saints de glace (mai), Balcon en vacances (juillet). */
test("janvier : Prépare ton printemps, une plante gardée donne le badge", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 0, 20, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["thyme"], now, wateredDaysAgo: 1 });
  await open(page, "/", "Tes plantes");
  await page.getByRole("button", { name: /^Prépare ton printemps\. Choisis tes plantes du printemps/u }).click();
  await expect(page.getByText("À garder pour le printemps")).toBeVisible();
  await page.getByRole("button", { name: "Garder Tomates cerises pour le printemps" }).click();
  await expect(page.getByText("Gardée pour le printemps : Tomates cerises")).toBeVisible();
  await expect(page.getByText("✓ Gardée")).toBeVisible();
  const stored = await page.evaluate(() => ({ prefs: JSON.parse(localStorage.getItem("balco.onboarding.preferences.v1") ?? "{}"), awards: JSON.parse(localStorage.getItem("balco.progress.awards.v1") ?? "{}") }));
  expect(stored.prefs.springWishes).toContain("cherry-tomato");
  expect(Object.keys(stored.awards.awards)).toContain("event:prepare-ton-printemps:2027");
  expect(errors).toEqual([]);
});

test("mai : les Saints de glace, compte à rebours puis feu vert", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 4, 8, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["thyme"], now, wateredDaysAgo: 1, eventIntro: true });
  await open(page, "/", "Tes plantes");
  // La grande carte d'arrivée : « Plus tard » la ferme, la carte compacte reste.
  await expect(page.getByText("Temps fort de l’année")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Plus tard" }).click();
  await expect(page.getByText("Temps fort de l’année")).toHaveCount(0);
  await expect(page.getByText("Dans 3 jours : garde encore tes plantes frileuses à l’abri ›")).toBeVisible();
  await page.clock.setSystemTime(new Date(2027, 4, 15, 10));
  await open(page, "/", "Tes plantes");
  const card = page.getByRole("button", { name: /^Les Saints de glace\. Feu vert : installe tes plantes frileuses dehors/u });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByText("À installer dès le feu vert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter Tomates cerises" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("juillet : Balcon en vacances, le paillage et le lien vers le mode vacances", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 6, 5, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["thyme"], now, wateredDaysAgo: 0 });
  await page.goto("/event/balcon-en-vacances");
  await page.getByRole("button", { name: "C’est fait : Paille tes pots pour l’été" }).click();
  await expect(page.getByText("C’est noté : tes pots sont paillés pour l’été")).toBeVisible();
  const awards = JSON.parse((await page.evaluate(() => localStorage.getItem("balco.progress.awards.v1"))) ?? "{}");
  expect(Object.keys(awards.awards)).toContain("event:balcon-en-vacances:2027");
  await page.getByRole("button", { name: /Préparer mon départ/ }).click();
  await expect(page.getByText(/Quelqu’un passera arroser/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
