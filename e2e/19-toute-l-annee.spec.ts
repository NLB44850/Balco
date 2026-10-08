import { expect, test } from "@playwright/test";

import { atDate, DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Aujourd'hui toute l'année : en hiver, rien à faire → « Ton balcon se repose », puis « À anticiper » (le semis au
 * chaud des tomates cerises gardées pour le printemps), dont la feuille mène à « Ce qu'il te faut ».
 */
test("février : « Ton balcon se repose », puis « À anticiper » et ce qu'il te faut", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 1, 5, 10));
  await mockWeather(page);
  // Une lavande arrosée la veille (rien à faire aujourd'hui), des tomates cerises gardées pour le printemps.
  await seedBalcony(page, {
    plants: ["lavender"],
    now,
    wateredDaysAgo: 1,
    extra: { "balco.onboarding.preferences.v1": JSON.stringify({ sunlight: "sunny", space: "balcony", goals: ["tomatoes"], springWishes: ["cherry-tomato"], completedAt: new Date(now.getTime() - 90 * DAY_MS).toISOString() }) },
  });
  await open(page, "/", "Tes plantes");
  await expect(page.getByText("Ton balcon se repose")).toBeVisible();
  await expect(page.getByText("Rien à faire aujourd’hui. Profites-en pour préparer la suite.")).toBeVisible();

  const card = page.getByRole("button", { name: /^À anticiper\. Dans 3 semaines : Semis de tomates cerises au chaud\./u });
  await expect(card).toBeVisible();
  await card.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Prépare des godets et du terreau à semis.")).toBeVisible();
  await sheet.getByRole("button", { name: "Ce qu’il te faut ›" }).click();
  await expect(page.getByText(/J’ai déjà/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
