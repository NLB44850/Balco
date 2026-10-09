import { expect, test } from "@playwright/test";

import { DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Rien ne se perd (étape 2 du chantier « toute l'année ») : un badge obtenu reste acquis, et un badge gagné sans
 * passer par un geste coché (la pluie notée toute seule) est fêté à l'ouverture d'Aujourd'hui.
 */
test("un badge déjà obtenu reste acquis dans Moi, même quand son compteur est retombé", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  // Main verte gardée dans le carnet (série cassée depuis), Bio-défenseur jamais obtenu.
  await seedBalcony(page, { plants: ["basil"], extra: { "balco.progress.awards.v1": JSON.stringify({ awards: { "badge:streak": new Date(Date.now() - 40 * DAY_MS).toISOString() }, seen: ["badge:streak"], backfilled: true }) } });
  await open(page, "/profile", "Mes badges éco");
  // Palier Graine gardé ; le suivant (Pousse, 30 jours) repart de la série du moment.
  await expect(page.getByRole("button", { name: /Main verte/ })).toContainText("Graine");
  await expect(page.getByRole("button", { name: /Main verte/ })).toContainText("Prochain : 30 jours suivis de suite");
  await page.getByRole("button", { name: /Bio-défenseur/ }).click();
  await expect(page.getByText(/^Encore \d+ observations? de tes plantes\.$/u)).toBeVisible();
  expect(errors).toEqual([]);
});

test("pluie : le 5ᵉ arrosage évité, noté tout seul, débloque Zéro gâchis d’eau, fêté sur Aujourd'hui", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  const now = Date.now();
  const avoided = [2, 3, 4, 5].map((days) => ({ id: `rain-${days}`, plantId: "mint-e2e", type: "observation", completedAt: new Date(now - days * DAY_MS).toISOString(), source: "reminder", note: "N’arrose pas la menthe aujourd’hui" }));
  await seedBalcony(page, { plants: ["mint"], scenario: "rain", extra: { "balco.garden.events.v1": JSON.stringify(avoided) } });
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("button", { name: /^Nouveau badge : Zéro gâchis d’eau.*Fermer$/u })).toBeVisible({ timeout: 10_000 });
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem("balco.progress.awards.v1"))) ?? "{}");
  expect(Object.keys(stored.awards)).toContain("badge:water");
  expect(stored.seen).toContain("badge:water");
  expect(errors).toEqual([]);
});
