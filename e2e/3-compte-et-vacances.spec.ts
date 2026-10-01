import { expect, test } from "@playwright/test";

import { loginCodes, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Le compte (code par e-mail, balcon retrouvé sur un autre téléphone) et le mode vacances. */

test("connexion par code, puis le balcon retrouvé sur un autre téléphone", async ({ browser }) => {
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
  await open(phone, "/settings", `Connecté avec ${email}`);
  // Laisse le temps à la synchronisation d'envoyer le balcon.
  await phone.waitForTimeout(3000);
  expect(errors).toEqual([]);
  await phone.close();

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
