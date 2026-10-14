import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Retour du 14/10 : l'orange « à surveiller » garde son sens d'alerte ; un arrosage du jour ne change pas l'état. */

test("Balcon : un arrosage à faire laisse « En forme » ; un arrosage en retard de 3 jours passe en orange et compte", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 5, 15, 10));
  await mockWeather(page);
  // La menthe et la ciboulette arrosées il y a 2 jours (arrosage dû aujourd'hui), le thym il y a 12 jours.
  await seedBalcony(page, { plants: ["mint", "chives", "thyme"], waterings: { mint: [2], chives: [2], thyme: [12] }, now });

  await open(page, "/balcony", "Ajouter une plante");
  await expect(page.getByText("3 plantes · 1 à surveiller")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Thym, Pas arrosé depuis 12 jours, voir la fiche$/u })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Menthe, En forme, voir la fiche$/u })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Ciboulette, En forme, voir la fiche$/u })).toBeVisible();
  expect(errors).toEqual([]);
});
