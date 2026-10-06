import path from "node:path";

import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Observer sans compte : une analyse offerte par appareil (faux service d'IA, e2e/fake-anthropic.mjs),
 * puis l'invitation à créer un compte ; l'analyse utilisée, une carte d'exemple et « Créer mon compte ».
 */
const PHOTO = path.resolve(__dirname, "../assets/plants/basil.jpg");

test("Observer sans compte : une analyse offerte, puis l'invitation à créer un compte", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"] });
  await open(page, "/scanner", "1 analyse offerte, sans compte");

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choisir dans ma galerie" }).click();
  await (await chooser).setFiles(PHOTO);
  await page.getByRole("button", { name: "Analyser cette photo" }).click();

  await expect(page.getByText("Basilic", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Laisse sécher la terre", { exact: true })).toBeVisible();
  await expect(page.getByText("Garde ce diagnostic")).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon compte gratuit" })).toBeVisible();

  // L'analyse est utilisée sur cet appareil : au retour, un exemple et « Créer mon compte ».
  await page.reload();
  await expect(page.getByText("Ton analyse offerte est utilisée")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Exemple de résultat")).toBeVisible();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});

test("page rechargée pendant la photo : Observer s'ouvre et explique quoi faire", async ({ page }) => {
  await mockWeather(page);
  // Le navigateur a rechargé la page alors que l'appareil photo venait d'être ouvert.
  await seedBalcony(page, { plants: ["mint"], extra: { "balco.camera.opening.v1": String(Date.now()) } });
  await page.goto("/");
  await expect(page.getByText(/Ton téléphone a rechargé la page pendant la photo/u)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Choisir dans ma galerie" })).toBeVisible();
});
