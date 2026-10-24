import { expect, test } from "@playwright/test";

import { DAY_MS, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Retour du 24/10 : « Moi » devient le 5ᵉ onglet (l'avatar en haut n'était pas clair), l'appareil photo reste seul en
 * haut d'Aujourd'hui et de Balcon, et un petit point vert sur l'onglet annonce un nouveau badge.
 */
test("Moi est le 5ᵉ onglet ; l'appareil photo en haut d'Aujourd'hui et de Balcon", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("button", { name: "Observer une plante : prendre une photo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Moi : profil et réglages" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Balcon/ }).click();
  await expect(page.getByRole("button", { name: "Observer une plante : prendre une photo" })).toBeVisible();
  await page.getByRole("tab", { name: /Moi/ }).click();
  await expect(page.getByText("Mes badges éco")).toBeVisible();
  await expect(page.getByRole("button", { name: "Réglages" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("un nouveau badge allume le point vert de l'onglet Moi, qui s'éteint en ouvrant Moi", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  const now = Date.now();
  await seedBalcony(page, {
    plants: ["basil"],
    wateredDaysAgo: 1,
    extra: {
      "balco.progress.awards.v1": JSON.stringify({ awards: { "badge:streak": new Date(now - DAY_MS).toISOString() }, seen: ["badge:streak"], backfilled: 2 }),
      "balco.profile.badges-seen.v1": new Date(now - 10 * DAY_MS).toISOString(),
    },
  });
  await open(page, "/", "Tes plantes");
  await expect(page.getByLabel("Nouveau badge")).toBeVisible();
  await page.getByRole("tab", { name: /Moi/ }).click();
  await expect(page.getByText("Mes badges éco")).toBeVisible();
  await page.getByRole("tab", { name: /Aujourd/ }).click();
  await expect(page.getByLabel("Nouveau badge")).toHaveCount(0);
  // Rien de nouveau : le point reste éteint après un nouveau lancement.
  await page.reload();
  await expect(page.getByText("Tes plantes").first()).toBeVisible();
  await expect(page.getByLabel("Nouveau badge")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("premier lancement de cette version : les badges déjà obtenus n'allument pas le point", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, {
    plants: ["basil"],
    wateredDaysAgo: 1,
    extra: { "balco.progress.awards.v1": JSON.stringify({ awards: { "badge:streak": new Date(Date.now() - DAY_MS).toISOString() }, seen: ["badge:streak"], backfilled: 2 }) },
  });
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("tab", { name: /Moi/ })).toBeVisible();
  await expect(page.getByLabel("Nouveau badge")).toHaveCount(0);
  expect(errors).toEqual([]);
});
