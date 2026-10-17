import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Tour de l'appli, étape 3 : sans réseau, la dernière vraie prévision ; sans elle, aucune alerte inventée. */

test("gel annoncé, puis plus de réseau : l'alerte reste, la météo dit son âge ; sans prévision gardée, rien d'inventé", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2027, 4, 5, 10));
  await mockWeather(page, { min: -3 });
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, now });
  await open(page, "/", "Gel cette nuit : protège le basilic");

  // Plus de réseau : ni le serveur Balco ni Open-Meteo ne répondent.
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("https://api.open-meteo.com/**", (route) => route.abort());
  await page.route("**/api/weather?**", (route) => route.abort());
  await page.reload();
  await expect(page.getByText("Gel cette nuit : protège le basilic")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Hors connexion", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Balco utilise la météo reçue à \d+ h\./u)).toBeVisible();

  // Sans prévision gardée : pas d'alerte, et un bandeau qui le dit.
  await page.evaluate(() => window.localStorage.removeItem("balco.weather.last-forecast.v1"));
  await page.reload();
  await expect(page.getByText("Météo indisponible")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Sans connexion, Balco ne peut pas te prévenir du gel, de la pluie ou de la chaleur.")).toBeVisible();
  await expect(page.getByText("Gel cette nuit : protège le basilic")).toHaveCount(0);
  await expect(page.getByText("Météo de Paris par défaut")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("un écran qui plante : « Oups », puis « Réessayer » ramène l'app, au lieu d'une app fermée", async ({ page }) => {
  const now = await atDate(page, new Date(2027, 4, 5, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, now });
  await open(page, "/settings", "Version de test");
  await page.getByText("Voir l’écran « Oups »").click();
  await expect(page.getByText("Oups, cet écran a eu un souci")).toBeVisible();
  await expect(page.getByText("Ton balcon et tes gestes sont bien gardés. Réessaie : le plus souvent, ça suffit.")).toBeVisible();
  // L'app repart de l'accueil, tout est là.
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByText("Tes plantes").filter({ visible: true }).first()).toBeVisible();
});
