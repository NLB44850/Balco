import { expect, test } from "@playwright/test";

import { loginCodes, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Le compte (code par e-mail, balcon retrouvé sur un autre téléphone) et le mode vacances. */

test("connexion par code, le balcon retrouvé sur un autre téléphone, qui devient celui de la sauvegarde", async ({ browser }) => {
  const email = `e2e-${Date.now()}@balco.test`;

  // Premier téléphone : un balcon, puis la connexion.
  const phone = await browser.newPage();
  const errors = trackErrors(phone);
  await mockWeather(phone);
  await seedBalcony(phone, { plants: ["basil", "strawberry"], wateredDaysAgo: 1 });
  await open(phone, "/login", "Retrouve ton balcon partout.");
  await phone.getByLabel("Adresse e-mail").fill(email);
  await phone.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect(phone.getByText("Regarde tes e-mails.")).toBeVisible();
  await expect.poll(() => loginCodes(email).length, { timeout: 10_000 }).toBe(1);
  await phone.getByLabel("Code reçu par e-mail").pressSequentially(loginCodes(email)[0]);
  await expect(phone.getByText("Regarde tes e-mails.")).toHaveCount(0, { timeout: 15_000 });
  await open(phone, "/settings", email);
  // Laisse le temps à la synchronisation d'envoyer le balcon.
  await phone.waitForTimeout(3000);
  expect(errors).toEqual([]);

  // Second téléphone, tout neuf : la même adresse retrouve les plantes.
  const other = await browser.newContext();
  const second = await other.newPage();
  await mockWeather(second);
  await open(second, "/login", "Retrouve ton balcon partout.");
  await second.getByLabel("Adresse e-mail").fill(email);
  await second.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect(second.getByText("Regarde tes e-mails.")).toBeVisible();
  await expect.poll(() => loginCodes(email).length, { timeout: 10_000 }).toBe(2);
  await second.getByLabel("Code reçu par e-mail").pressSequentially(loginCodes(email)[1]);
  await expect(second.getByText("Regarde tes e-mails.")).toHaveCount(0, { timeout: 15_000 });
  await open(second, "/balcony", "Basilic");
  await expect(second.getByText("Fraisier").first()).toBeVisible();

  // Compte gratuit : la sauvegarde suit le dernier téléphone connecté ; le premier est prévenu.
  await open(phone, "/settings", "Compte");
  await expect(phone.getByText("Sauvegardé depuis un autre téléphone").first()).toBeVisible({ timeout: 15_000 });
  await phone.getByRole("button", { name: "Sauvegarder depuis ce téléphone" }).click();
  await expect(phone.getByText(/Sauvegardé aujourd/).first()).toBeVisible({ timeout: 15_000 });

  // Balco+ : « Me prévenir à l'ouverture » avec le compte, sans rien demander d'autre.
  await phone.getByRole("button", { name: "Balco+ : Bientôt" }).click();
  await expect(phone.getByRole("dialog").getByLabel("Ton adresse e-mail")).toHaveCount(0);
  await phone.getByRole("dialog").getByRole("button", { name: "Me prévenir à l’ouverture" }).click();
  await expect(phone.getByRole("dialog").getByText("C’est noté, on te prévient")).toBeVisible();
  await phone.getByRole("dialog").getByRole("button", { name: "Fermer la fiche" }).click();

  // Supprimer le compte : le balcon reste sur ce téléphone, sans revenir à l'accueil.
  await phone.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(phone.getByRole("dialog").getByText("Ton compte, ta sauvegarde et tes échanges avec Nora seront effacés. Ton balcon reste sur ce téléphone.")).toBeVisible();
  await phone.getByRole("dialog").getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(phone.getByRole("button", { name: "Créer mon compte gratuit" })).toBeVisible({ timeout: 15_000 });
  await expect(phone.getByText("Sur ce téléphone seulement")).toBeVisible();
  await open(phone, "/balcony", "Basilic");
  await expect(phone.getByText("Fraisier").first()).toBeVisible();
  await phone.close();
  await other.close();
});

test("mode vacances : préparer son départ, la carte s'affiche sur Aujourd'hui", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "cherry-tomato"], wateredDaysAgo: 1 });
  await open(page, "/vacation", "Mode vacances");
  await expect(page.getByText("Quelqu’un passera arroser ?")).toBeVisible();
  await page.getByRole("button", { name: "Préparer mon départ" }).click();
  await open(page, "/", "Tes plantes");
  await expect(page.getByText(/Départ demain|Départ dans \d+ jours|Bonnes vacances !/)).toBeVisible();
  expect(errors).toEqual([]);
});
