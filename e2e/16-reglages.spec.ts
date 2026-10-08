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

test("Rappels : une plante décochée garde ses alertes à l'écran, seules ses notifications se taisent", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  const settings = { enabled: false, preferredHour: 18, preferredMinute: 30, quietStartHour: 21, quietEndHour: 9, maxNormalRemindersPerDay: 1, skipWateringWhenRainExpected: true, enabledPlantIds: ["mint-e2e"], vacation: null };
  await seedBalcony(page, { plants: ["basil", "mint", "chives"], scenario: "wind", extra: { "balco.reminder.settings.v1": JSON.stringify(settings) } });
  await open(page, "/", "Vent fort : mets 3 plantes à l’abri");

  await open(page, "/settings", "Rappels");
  await expect(page.getByRole("button", { name: "Mode vacances : Non" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Plantes suivies : 1 sur 3" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Heure : 18 h 30" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Plage calme : 21 h → 9 h" })).toBeVisible();
  // Sur le web, pas de notification : la feuille l'explique.
  await page.getByRole("button", { name: "Je ne reçois pas les rappels" }).click();
  await expect(page.getByRole("dialog").getByText("On vérifie ensemble")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("La version web ne peut pas envoyer de notifications.", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Balco+ sans compte : « Me prévenir à l'ouverture » avec une adresse e-mail", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"] });
  await open(page, "/settings", "Compte");
  await expect(page.getByRole("button", { name: "Sauvegarde : Sur ce téléphone seulement" }).or(page.getByText("Sur ce téléphone seulement"))).toBeVisible();
  await expect(page.getByText("Pour retrouver ton balcon si tu changes de téléphone.")).toBeVisible();
  await expect(page.getByText("Supprimer mon compte")).toHaveCount(0);
  await page.getByRole("button", { name: "Balco+ : Bientôt" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Prix fondateur pour les 500 premiers", { exact: false })).toBeVisible();
  await expect(sheet.getByText("Gratuit pour tous : tes rappels, le calendrier, la sauvegarde, 1 photo et 5 questions par mois.")).toBeVisible();
  await expect(sheet.getByText("On t’écrira une seule fois, à l’ouverture de Balco+.")).toBeVisible();
  await sheet.getByRole("button", { name: "Me prévenir à l’ouverture" }).click();
  await expect(sheet.getByText("Vérifie ton adresse e-mail.")).toBeVisible();
  await sheet.getByLabel("Ton adresse e-mail").fill(`plus-${Date.now()}@balco.test`);
  await sheet.getByRole("button", { name: "Me prévenir à l’ouverture" }).click();
  await expect(sheet.getByText("C’est noté, on te prévient")).toBeVisible();
  expect(errors).toEqual([]);
});

test("À propos : avis, confidentialité bientôt, crédits et version", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"] });
  await open(page, "/settings", "À propos");
  await expect(page.getByRole("button", { name: "Donner mon avis" })).toBeVisible();
  await expect(page.getByText("Confidentialité")).toBeVisible();
  await expect(page.getByText("Version 1.0.0 · test")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Simulation météo/ })).toBeVisible();
  await page.getByRole("button", { name: "Crédits photos" }).click();
  await expect(page).toHaveURL(/\/credits/);
  expect(errors).toEqual([]);
});
