import { expect, test } from "@playwright/test";

import { atDate, DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * L'arrosage selon le pot et la météo (chantier « Pots et balcon », étape 6a) : balcon couvert, la pluie annoncée ne
 * dispense pas d'arroser ; la quantité d'eau sur la ligne ; le repère de la bouteille dit une seule fois.
 */
test("balcon couvert : il pleut, mais Balco dit d'arroser, avec la quantité ; le repère n'est dit qu'une fois", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 7, 20, 10));
  await mockWeather(page, { rainMm: 8 });
  await seedBalcony(page, {
    plants: ["mint"],
    now,
    wateredDaysAgo: 3,
    extra: { "balco.onboarding.preferences.v1": JSON.stringify({ firstName: "Camille", experience: "beginner", sunlight: "sunny", space: "balcony", goals: ["aromatics"], covered: true, completedAt: new Date(now.getTime() - 30 * DAY_MS).toISOString() }) },
  });
  await open(page, "/", "Tes plantes");
  await expect(page.getByText("Arrose la menthe")).toBeVisible();
  await expect(page.getByText(/N’arrose pas/u)).toHaveCount(0);
  await expect(page.getByText(/^Sèche sur \d cm \? Arrose environ \d+(,5)? L$/u)).toBeVisible();

  await page.getByRole("button", { name: "Arrose la menthe, détail" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText(/Balcon couvert : la pluie n’arrive pas à tes pots/u)).toBeVisible();
  await expect(sheet.getByText(/1,5 L, c’est une grande bouteille d’eau/u)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Arrose la menthe, détail" }).click();
  await expect(page.getByRole("dialog").getByText(/Balcon couvert/u)).toBeVisible();
  await expect(page.getByText(/1,5 L, c’est une grande bouteille d’eau/u)).toHaveCount(0);
  expect(errors).toEqual([]);
});
