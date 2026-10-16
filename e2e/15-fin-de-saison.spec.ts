import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * Fin de saison des annuelles : « Ta saison de basilic est finie ? », le soir de gel, puis « Ton pot est libre ». Le
 * basilic, frileux, passe d'abord par son choix pour l'hiver (chantier « Plante hors saison », étape 3).
 */

const basil = { id: "basil-e2e", catalogId: "basil", addedAt: new Date(2027, 3, 1).toISOString() };
const sown = { id: "basil-e2e:start", plantId: "basil-e2e", type: "observation", completedAt: new Date(2027, 3, 10, 9).toISOString(), source: "manual", note: "Sème le basilic au chaud" };
/** Les envies du printemps gardées dans les réponses de l'accueil. */
async function springWishes(page: Parameters<typeof seedBalcony>[0]) {
  const stored = await page.evaluate(() => localStorage.getItem("balco.onboarding.preferences.v1"));
  return (JSON.parse(stored ?? "{}") as { springWishes?: string[] }).springWishes ?? [];
}

const seed = (page: Parameters<typeof seedBalcony>[0], plant: object = basil) => seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([plant]), "balco.garden.events.v1": JSON.stringify([sown]) } });

test("basilic en octobre : « Décide… » → « Tout récolter » → « Tout récolté ? » → Oui → pot au repos, avec le conseil", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 9, 2, 10) });
  await page.clock.resume();
  await mockWeather(page);
  await seed(page);

  await open(page, "/", "Décide pour ton basilic avant le froid");
  // Une seule ligne pour la plante : le choix pour l'hiver remplace son geste habituel et « Ta saison … est finie ? ».
  await expect(page.getByText("Arrose le basilic")).toHaveCount(0);
  await expect(page.getByText("Ta saison de basilic est finie ?")).toHaveCount(0);
  await page.getByRole("button", { name: "Décide pour ton basilic avant le froid, détail" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Basilic : Tout récolter" }).click();
  await expect(page.getByText("Ton basilic est-il tout récolté ?")).toBeVisible();
  await page.getByRole("button", { name: "Ton basilic est-il tout récolté ?, détail" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Hache-le sous l’huile d’olive, en bac à glaçons, au congélateur.")).toBeVisible();
  await sheet.getByRole("button", { name: "Oui, tout est récolté" }).click();

  await expect(sheet.getByText("Ton pot est libre")).toBeVisible();
  await expect(sheet.getByText("Saison de basilic finie")).toBeVisible();
  await expect(sheet.getByText("Coupe les tiges au ras de la terre et laisse les racines : elles nourrissent le pot.", { exact: false })).toBeVisible();
  // En octobre, trop tard pour ressemer : le pot passe l'hiver au repos.
  await expect(sheet.getByRole("button", { name: /^Ressemer/ })).toHaveCount(0);
  // « Me le reproposer au printemps », cochée d'office : le basilic rejoint les envies du printemps.
  await expect(sheet.getByRole("checkbox", { name: "Me le reproposer au printemps" })).toBeChecked();
  await sheet.getByRole("button", { name: "Laisser le pot au repos jusqu’au printemps" }).click();
  await expect(page.getByText("Pot au repos : tes récoltes restent dans ta progression")).toBeVisible();
  await expect(page.getByText("Ton basilic est-il tout récolté ?")).toHaveCount(0);
  expect(await springWishes(page)).toEqual(["basil"]);
  expect(errors).toEqual([]);
});

test("« Le laisser dehors » : le soir de gel, « Récolte tout ton basilic avant cette nuit », puis la question le lendemain", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 8, 20, 17) });
  await page.clock.resume();
  await mockWeather(page, { min: 3 });
  await seed(page, { ...basil, winter: { choice: "outside", decidedAt: new Date(2027, 8, 15).toISOString() } });

  await open(page, "/", "Récolte tout ton basilic avant cette nuit");
  await page.getByRole("button", { name: "C’est fait : Récolte tout ton basilic avant cette nuit" }).click();
  await expect(page.getByText("Ta saison de basilic est finie ?")).toHaveCount(0);

  // Le lendemain, le froid est passé : la question arrive, avant la fin de ses mois de récolte.
  await page.clock.setSystemTime(new Date(2027, 8, 21, 9));
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockWeather(page);
  await page.reload();
  await expect(page.getByText("Ta saison de basilic est finie ?")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Récolte tout ton basilic avant cette nuit")).toHaveCount(0);

  // Oui, puis « Laisser le pot vide » en décochant « Me le reproposer au printemps » : pas d'envie ajoutée.
  await page.getByRole("button", { name: "Ta saison de basilic est finie ?, détail" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Oui, la saison est finie" }).click();
  await sheet.getByRole("checkbox", { name: "Me le reproposer au printemps" }).click();
  await expect(sheet.getByRole("checkbox", { name: "Me le reproposer au printemps" })).not.toBeChecked();
  await sheet.getByRole("button", { name: "Laisser le pot vide" }).click();
  await expect(page.getByText("Pot libéré : tes récoltes restent dans ta progression")).toBeVisible();
  expect(await springWishes(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test("basilic ajouté « déjà sur mon balcon » en octobre : son choix pour l'hiver vient tout de suite", async ({ page }) => {
  const errors = trackErrors(page);
  const now = new Date(2027, 9, 8, 10);
  await page.clock.install({ time: now });
  await page.clock.resume();
  await mockWeather(page);
  const arrived = { id: "basil-e2e", catalogId: "basil", addedAt: now.toISOString() };
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([arrived]), "balco.garden.events.v1": "[]" } });
  await open(page, "/", "Décide pour ton basilic avant le froid");
  await expect(page.getByText("Arrose le basilic")).toHaveCount(0);
  expect(errors).toEqual([]);
});
