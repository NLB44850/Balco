import { expect, test } from "@playwright/test";

import { atDate, DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * L'arrosage selon le pot et la météo (chantier « Pots et balcon », étape 6a) : balcon couvert, la pluie annoncée ne
 * dispense pas d'arroser ; la quantité d'eau en pastille sur la ligne, en grand avec des bouteilles dans le détail.
 */
test("balcon couvert : il pleut, mais Balco dit d'arroser, avec la quantité ; la quantité en grand avec ses bouteilles", async ({ page }) => {
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
  // La quantité se voit d'un coup d'œil : pastille sur la ligne (menthe, pot de sa fiche : 3 L).
  await expect(page.getByText("💧 3 L")).toBeVisible();
  await page.screenshot({ path: "dist/e2e-results/arrosage-liste.png" });

  await page.getByRole("button", { name: "Arrose la menthe, détail" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("☂️  Balcon couvert : la pluie n’arrive pas à tes pots")).toBeVisible();
  await expect(sheet.getByLabel("Environ 3 L, 2 grandes bouteilles")).toBeVisible();
  await expect(sheet.getByText("Vide la soucoupe après 30 min")).toBeVisible();
  // Plus de « Pourquoi : Délai de 48 h dépassé… » technique sur un arrosage.
  await expect(sheet.getByText(/^Pourquoi/u)).toHaveCount(0);
  await page.screenshot({ path: "dist/e2e-results/arrosage-detail.png" });
  expect(errors).toEqual([]);
});

test("arrosage et engrais le même jour : la quantité, les gestes, puis l'engrais à part", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 6, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["strawberry"], now, wateredDaysAgo: 3 });
  await open(page, "/", "Tes plantes");
  await page.getByRole("button", { name: "Arrose et nourris tes fraisiers, détail" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Arrosage et engrais", { exact: false })).toBeVisible();
  await expect(sheet.getByText("🌿  Puis l’engrais")).toBeVisible();
  await expect(sheet.getByText("Sur la terre humide · à refaire dans 14 jours")).toBeVisible();
  await page.screenshot({ path: "dist/e2e-results/arrosage-engrais.png" });
  expect(errors).toEqual([]);
});
