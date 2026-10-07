import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Réglages : une ligne par réglage, avec sa valeur ; la feuille du bas reprend les choix de l'accueil. */

test("Mon balcon : soleil « Je ne sais pas », espace, envies, envies du printemps", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], extra: { "balco.onboarding.preferences.v1": JSON.stringify({ sunlight: "sunny", space: "balcony", goals: ["tomatoes", "salads"], springWishes: ["basil", "cherry-tomato"], completedAt: new Date().toISOString() }) } });
  await open(page, "/settings", "Mon balcon");
  await expect(page.getByText("Gérer mes plantes")).toHaveCount(0);

  // Soleil : la feuille, « Je ne sais pas » et son astuce.
  await page.getByRole("button", { name: "Soleil : Toute la journée" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Combien de soleil reçoit ton balcon ?")).toBeVisible();
  await expect(sheet.getByText("Astuce : regarde ton balcon à 10 h, 14 h et 18 h.")).toBeVisible();
  await sheet.getByRole("radio", { name: "Je ne sais pas" }).click();
  await expect(page.getByRole("button", { name: "Soleil : Je ne sais pas" })).toBeVisible();

  // Espace.
  await page.getByRole("button", { name: "Espace : Un petit balcon" }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "Une terrasse" }).click();
  await expect(page.getByRole("button", { name: "Espace : Une terrasse" })).toBeVisible();

  // Envies : plusieurs choix, enregistrés d'un coup.
  await page.getByRole("button", { name: "Envies : Tomates cerises, salades" }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: "Basilic & menthe" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("button", { name: "Envies : Tomates cerises et 2 autres" })).toBeVisible();

  // Envies du printemps : « Retirer ».
  await page.getByRole("button", { name: "Envies du printemps : Basilic, tomates cerises" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Retirer Basilic" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Retirer Tomates cerises" }).click();
  await expect(page.getByRole("dialog").getByText("Quand tu laisses un pot au repos, tu peux garder la plante ici pour le printemps.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Fermer la fiche" }).click();
  await expect(page.getByRole("button", { name: "Envies du printemps : Aucune pour l’instant" })).toBeVisible();

  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem("balco.onboarding.preferences.v1"))) ?? "{}");
  expect(stored).toMatchObject({ sunlight: "partial", sunlightUnknown: true, space: "terrace", goals: ["tomatoes", "aromatics", "salads"], springWishes: [] });
  expect(errors).toEqual([]);
});

test("Toi : prénom et « Comment Nora te parle », une seule valeur", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"] });
  await open(page, "/settings", "Toi");
  await page.getByRole("button", { name: "Prénom : Pas encore" }).click();
  await page.getByRole("dialog").getByLabel("Ton prénom").fill("Nicolas");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("button", { name: "Prénom : Nicolas" })).toBeVisible();

  await page.getByRole("button", { name: "Comment Nora te parle : Simplement" }).click();
  await expect(page.getByRole("dialog").getByText("Tu peux aussi le changer depuis Nora.")).toBeVisible();
  await page.getByRole("dialog").getByRole("radio", { name: "En jardinier, droit au but" }).click();
  await expect(page.getByRole("button", { name: "Comment Nora te parle : En jardinier" })).toBeVisible();
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem("balco.onboarding.preferences.v1"))) ?? "{}");
  expect(stored.experience).toBe("experienced");
  expect(errors).toEqual([]);
});
