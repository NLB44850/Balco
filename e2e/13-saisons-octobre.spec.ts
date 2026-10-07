import { expect, test } from "@playwright/test";

import { climateZoneFor } from "../lib/plants/climate";
import { seasonalSuggestions } from "../lib/plants/suggestions";
import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Saisons en octobre (retour du 07/10) : le repère de gel parle de l'automne, et quand tout ce qui convient au
 * balcon y est déjà, le texte le dit et le lien reste sur octobre (plus de « Voir toutes les plantes de mars »).
 */
test("Saisons en octobre : premières gelées, et « tout est déjà sur ton balcon » avec le lien d'octobre", async ({ page }) => {
  const errors = trackErrors(page);
  const now = new Date(2026, 9, 7, 10);
  await page.clock.install({ time: now });
  await page.clock.resume();
  await mockWeather(page);
  // Le balcon de seedBalcony (plein soleil, balcon, envie de tomates) à Lyon : on y met tout ce qui conviendrait.
  const answers = { sunlight: "sunny", space: "balcony", goals: ["tomatoes"], experience: "beginner" } as const;
  const fitting = seasonalSuggestions(answers as never, { month: 10, climate: climateZoneFor(45.76, 4.84), limit: 100 }).map((suggestion) => suggestion.entry.id);
  expect(fitting.length).toBeGreaterThan(0);
  await seedBalcony(page, { plants: ["basil", ...fitting], wateredDaysAgo: 0 });

  await open(page, "/calendar", /^À semer ou planter en octobre/);
  await expect(page.getByText(/premières gelées vers/)).toBeVisible();
  await expect(page.getByText(/dernières gelées/)).toHaveCount(0);
  await expect(page.getByText(/et convient à ton balcon y est déjà/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Voir toutes les plantes d’octobre" })).toBeVisible();
  await expect(page.getByText(/plantes de mars/)).toHaveCount(0);
  expect(errors).toEqual([]);
});
