import { expect, test } from "@playwright/test";

import { DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Rien ne se perd (étape 2 du chantier « toute l'année ») : un badge obtenu reste acquis, et un badge gagné sans
 * passer par un geste coché (la pluie notée toute seule) est fêté à l'ouverture d'Aujourd'hui.
 */
test("un badge déjà obtenu reste acquis dans Moi, même quand son compteur est retombé", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  // Main Verte gardée dans le carnet (série cassée depuis), Bio-Défenseur jamais obtenu.
  await seedBalcony(page, { plants: ["basil"], extra: { "balco.progress.awards.v1": JSON.stringify({ awards: { "badge:streak": new Date(Date.now() - 40 * DAY_MS).toISOString() }, seen: ["badge:streak"], backfilled: true }) } });
  await open(page, "/profile", "Mes badges éco");
  await page.getByRole("button", { name: /Main Verte/ }).click();
  await expect(page.getByText("Débloqué, bravo !")).toBeVisible();
  await page.getByRole("button", { name: /Bio-Défenseur/ }).click();
  await expect(page.getByText(/Encore \d+ pour le débloquer/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("pluie : le 5ᵉ arrosage évité, noté tout seul, débloque Zéro Gâchis d'Eau, fêté sur Aujourd'hui", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  const now = Date.now();
  const avoided = [2, 3, 4, 5].map((days) => ({ id: `rain-${days}`, plantId: "mint-e2e", type: "observation", completedAt: new Date(now - days * DAY_MS).toISOString(), source: "reminder", note: "N’arrose pas la menthe aujourd’hui" }));
  await seedBalcony(page, { plants: ["mint"], scenario: "rain", extra: { "balco.garden.events.v1": JSON.stringify(avoided) } });
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("button", { name: /^Nouveau badge : Zéro Gâchis d'Eau.*Fermer$/u })).toBeVisible({ timeout: 10_000 });
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem("balco.progress.awards.v1"))) ?? "{}");
  expect(Object.keys(stored.awards)).toContain("badge:water");
  expect(stored.seen).toContain("badge:water");
  expect(errors).toEqual([]);
});
