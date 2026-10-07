import { expect, test } from "@playwright/test";

import { loginCodes, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Nora quand la connexion se coupe : le Codespace renvoie une réponse vide (serveur qui redémarre, délai
 * dépassé). Avant : « Failed to execute 'json' on 'Response'… ». Maintenant : une phrase simple et « Réessayer ».
 */
test("Nora : réponse vide du serveur, message clair, puis « Réessayer » renvoie la question", async ({ page }) => {
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

  // La première question tombe sur une réponse vide, comme le proxy du Codespace.
  let cut = true;
  await page.route("**/api/trpc/ai.ask**", (route) => (cut ? route.fulfill({ status: 502, body: "" }) : route.fallback()));
  await page.goto("/assistant");
  await expect(page.getByPlaceholder("Écris à Nora…")).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder("Écris à Nora…").fill("Mon basilic a soif ?");
  await page.getByPlaceholder("Écris à Nora…").press("Enter");
  await expect(page.getByText("Nora n’a pas pu répondre : la connexion avec le serveur s’est coupée. Réessaie dans un instant.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Failed to execute|JSON/)).toHaveCount(0);

  // « Réessayer » : la notice disparaît, la même question repart et Nora répond (faux service d'IA).
  cut = false;
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByText("Nora n’a pas pu répondre", { exact: false })).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText("Mon basilic a soif ?")).toHaveCount(1);
  await expect(page.getByText(/Basilic|basilic/).last()).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
