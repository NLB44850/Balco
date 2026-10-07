import { expect, test } from "@playwright/test";

import { loginCodes, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Nora quand la connexion se coupe : le Codespace renvoie une réponse vide (serveur qui redémarre, délai
 * dépassé), souvent alors que le serveur a bien répondu. Avant : « Failed to execute 'json' on 'Response'… ».
 * Maintenant : l'app redemande la même question (même identifiant) et récupère la réponse ; sinon « Réessayer ».
 */
test("Nora : réponse perdue en route récupérée en silence ; connexion coupée, message clair et « Réessayer »", async ({ page }) => {
  const errors = trackErrors(page);
  const email = `e2e-nora-${Date.now()}@balco.test`;
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/login", "Retrouve ton balcon partout.");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect.poll(() => loginCodes(email).length, { timeout: 10_000 }).toBe(1);
  await page.getByLabel("Code reçu par e-mail").pressSequentially(loginCodes(email)[0]);
  await expect(page.getByText("Regarde tes e-mails.")).toHaveCount(0, { timeout: 15_000 });

  // Ton cas : le serveur traite la question, mais la réponse arrive vide (proxy du Codespace).
  let cutAfterServer = true;
  let cutBeforeServer = false;
  await page.route("**/api/trpc/ai.ask**", async (route) => {
    if (cutBeforeServer) return route.fulfill({ status: 502, body: "" });
    if (!cutAfterServer) return route.fallback();
    cutAfterServer = false;
    await route.fetch(); // Le serveur répond bien…
    return route.fulfill({ status: 502, body: "" }); // … mais rien n'arrive au téléphone.
  });
  await page.goto("/assistant");
  await expect(page.getByPlaceholder("Écris à Nora…")).toBeVisible({ timeout: 20_000 });
  const remaining = async () => Number((await page.getByText(/questions? restantes? ce mois-ci/).textContent())?.match(/\d+/)?.[0]);
  const before = await remaining();
  await page.getByPlaceholder("Écris à Nora…").fill("Mon basilic a soif ?");
  await page.getByPlaceholder("Écris à Nora…").press("Enter");
  // L'app redemande en silence et récupère la réponse déjà faite : ni erreur, ni question comptée deux fois.
  await expect(page.getByText(/^Réponse de Nora/)).toHaveCount(1, { timeout: 20_000 });
  await expect(page.getByText(/s’est perdue en route|Failed to execute|JSON/)).toHaveCount(0);
  await expect.poll(remaining, { timeout: 10_000 }).toBe(before - 1);

  // Connexion vraiment coupée : après quelques essais, un message clair et « Réessayer ».
  cutBeforeServer = true;
  await page.getByPlaceholder("Écris à Nora…").fill("Et ma menthe ?");
  await page.getByPlaceholder("Écris à Nora…").press("Enter");
  await expect(page.getByText(/La réponse de Nora s’est perdue en route/)).toBeVisible({ timeout: 30_000 });
  cutBeforeServer = false;
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByText(/s’est perdue en route/)).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText("Et ma menthe ?")).toHaveCount(1);
  await expect(page.getByText(/^Réponse de Nora/)).toHaveCount(2, { timeout: 15_000 });
  await expect.poll(remaining, { timeout: 10_000 }).toBe(before - 2);
  expect(errors).toEqual([]);
});
