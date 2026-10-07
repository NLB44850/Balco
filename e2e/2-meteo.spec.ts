import { expect, type Page, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, type Scenario } from "./helpers";

/**
 * Les alertes météo, comme sur le téléphone : Réglages → Simulation météo, puis Aujourd'hui et Saisons.
 * Balcon type : basilic (craint le froid), menthe et ciboulette (rustiques).
 */
const PLANTS = ["basil", "mint", "chives"];
const LABELS: Record<Scenario, string> = { none: "Météo réelle", rain: "Pluie", frost: "Gel", storm: "Orage", wind: "Vent fort", heat: "Canicule" };
const HINTS: Record<Scenario, RegExp> = { none: /vraie météo de ta ville/, rain: /^8 mm dans les 12 h/, frost: /^-3 °C cette nuit/, storm: /^Orage en cours/, wind: /^Rafales à 75 km\/h/, heat: /^35 °C\./ };

async function simulate(page: Page, scenario: Scenario) {
  await open(page, "/settings", "Simulation météo");
  await page.getByRole("button", { name: LABELS[scenario], exact: true }).click();
  // L'explication du scénario choisi s'affiche sous les pastilles.
  await expect(page.getByText(HINTS[scenario])).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Tes plantes")).toBeVisible({ timeout: 20_000 });
}

/** Les arrosages encore à faire sur Aujourd’hui : « Arrose … » seul, ou regroupés dans « Vérifie la terre de N plantes ». */
const wateringRows = (page: Page) => page.getByRole("button", { name: /^(Arrose .+|Vérifie la terre de \d+ plantes), détail$/ }).filter({ visible: true });
/** Le bouton « C'est fait » d'un bandeau d'alerte météo, en haut d'Aujourd'hui. */
const doneButton = (page: Page, title: string) => page.getByRole("button", { name: `C’est fait : ${title}` }).filter({ visible: true });

test.describe("alertes météo", () => {
  test("sans alerte, les arrosages du jour sont proposés", async ({ page }) => {
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS });
    await open(page, "/", "Tes plantes");
    await expect(wateringRows(page).first()).toBeVisible();
    await expect(page.getByText(/N’arrose pas|Gel cette nuit|Orage|Vent fort|°C aujourd’hui/)).toHaveCount(0);
  });

  test("pluie : bandeau « N'arrose pas » sans bouton, plus d'arrosage proposé, eau économisée toute seule", async ({ page }) => {
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS });
    await simulate(page, "rain");
    await expect(page.getByText("N’arrose pas tes plantes aujourd’hui")).toBeVisible();
    await expect(page.getByText("8 mm de pluie prévus d’ici 12 h")).toBeVisible();
    await expect(page.getByText(/^≈ [\d,]+ L d’eau économisés aujourd’hui, sans rien faire\.$/)).toBeVisible();
    await expect(wateringRows(page)).toHaveCount(0);
    // Rien à cocher ni à valider : la pluie se lit seulement.
    await expect(page.getByRole("checkbox", { name: /N’arrose pas/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^C’est fait : N’arrose pas/ })).toHaveCount(0);

    // Le bandeau reste toute la journée, sans reproposer d'arrosage (même après un rechargement).
    await page.reload();
    await expect(page.getByText("Tes plantes")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("N’arrose pas tes plantes aujourd’hui")).toBeVisible();
    await expect(wateringRows(page)).toHaveCount(0);

    await open(page, "/week", "Ma semaine");
    await expect(page.getByText(/≈ [\d,]+ L d’eau économisés/)).toBeVisible();
    await expect(page.getByText("3 arrosages évités grâce à la pluie.")).toBeVisible();
  });

  test("gel : seul le basilic est à protéger, l'alerte se voit aussi dans Saisons", async ({ page }) => {
    // Un gel de printemps : la jeune plante se protège (à l'automne, on récolterait tout, voir 15-fin-de-saison).
    const now = await atDate(page, new Date(2027, 4, 5, 10));
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS, now });
    await simulate(page, "frost");
    await expect(page.getByText("Gel cette nuit : protège le basilic")).toBeVisible();
    await expect(page.getByText("Avant la nuit · jusqu’à -3 °C")).toBeVisible();

    await page.getByRole("tab", { name: /Saisons/ }).click();
    // Le sous-titre n'existe que dans Saisons (Aujourd'hui reste monté, caché, avec le même titre).
    await expect(page.getByText("Alerte météo · à voir sur Aujourd’hui")).toBeVisible();

    await page.getByRole("tab", { name: /Aujourd’hui/ }).click();
    await doneButton(page, "Gel cette nuit : protège le basilic").click();
    await expect(page.getByText(/C’est noté · \+4 points/)).toBeVisible();
    await expect(page.getByText("Gel cette nuit : protège le basilic")).toHaveCount(0);
    // Traitée sur Aujourd'hui, l'alerte disparaît aussi de Saisons.
    await page.getByRole("tab", { name: /Saisons/ }).click();
    await expect(page.getByText("Alerte météo · à voir sur Aujourd’hui")).toHaveCount(0);
  });

  test("orage : tout le balcon à l'abri, pas d'arrosage pendant l'orage", async ({ page }) => {
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS });
    await simulate(page, "storm");
    await expect(page.getByText("Orage : mets tes plantes à l’abri")).toBeVisible();
    await expect(page.getByText("Orage en cours ou imminent")).toBeVisible();
    await expect(doneButton(page, "Orage : mets tes plantes à l’abri")).toBeVisible();
    await expect(wateringRows(page)).toHaveCount(0);
  });

  test("vent fort : rafales à 75 km/h pour toutes les plantes", async ({ page }) => {
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS });
    await simulate(page, "wind");
    await expect(page.getByText("Vent fort : mets 3 plantes à l’abri")).toBeVisible();
    await expect(page.getByText("Rafales jusqu’à 75 km/h")).toBeVisible();
    await expect(doneButton(page, "Vent fort : mets 3 plantes à l’abri")).toBeVisible();
  });

  test("canicule : alerte même sans arrosage noté, sans doublon d'arrosage", async ({ page }) => {
    const now = await atDate(page, new Date(2027, 6, 10, 10));
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS, now });
    await simulate(page, "heat");
    await expect(page.getByText("35 °C aujourd’hui : pense à tes plantes")).toBeVisible();
    await expect(wateringRows(page)).toHaveCount(0);

    await doneButton(page, "35 °C aujourd’hui : pense à tes plantes").click();
    await expect(page.getByText(/C’est noté/)).toBeVisible();
    // Arrosées pour de bon : ni l’alerte ni « Arrose … » ne reviennent aujourd'hui.
    await page.reload();
    await expect(page.getByText("Tes plantes")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("35 °C aujourd’hui : pense à tes plantes")).toHaveCount(0);
    // Les arrosages restent dans la liste, cochés, regroupés en une ligne faite.
    await expect(page.getByText(/^3 sur 3 faites · /u).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /^Marquer comme fait : Arrose / })).toHaveCount(0);
  });

  test("vent : traité sur Aujourd'hui, l'alerte disparaît aussi de Saisons, même avec une plante à planter", async ({ page }) => {
    // Une plante pas encore en terre n'a pas d'alerte sur Aujourd'hui : Saisons ne doit pas lui en inventer une.
    const now = await atDate(page, new Date(2027, 6, 10, 10));
    await mockWeather(page);
    const plants = [...PLANTS.map((id, index) => ({ id: `${id}-e2e`, catalogId: id, addedAt: new Date(2027, 5, 1 + index).toISOString() })), { id: "radish-e2e", catalogId: "radish", addedAt: new Date(2027, 6, 9).toISOString(), toPlant: true }];
    await seedBalcony(page, { plants: [], now, extra: { "balco.garden.plants.v1": JSON.stringify(plants), "balco.garden.events.v1": "[]" } });
    await simulate(page, "wind");
    await doneButton(page, "Vent fort : mets 3 plantes à l’abri").click();
    await expect(page.getByText(/C’est noté/)).toBeVisible();
    await page.getByRole("tab", { name: /Saisons/ }).click();
    await expect(page.getByText(/Ton calendrier/).first()).toBeVisible();
    await expect(page.getByText("Alerte météo · à voir sur Aujourd’hui")).toHaveCount(0);
  });

  test("« Pas aujourd'hui » fait taire l'alerte jusqu'à demain", async ({ page }) => {
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS });
    await simulate(page, "wind");
    await page.getByRole("button", { name: /Vent fort : mets 3 plantes à l’abri, détail/ }).click();
    await page.getByRole("button", { name: "Pas aujourd’hui" }).click();
    await expect(page.getByText("Balco n’en reparlera pas avant demain")).toBeVisible();
    await expect(page.getByText("Vent fort : mets 3 plantes à l’abri")).toHaveCount(0);
  });

  test("retour à la météo réelle : plus d'alerte", async ({ page }) => {
    await mockWeather(page);
    await seedBalcony(page, { plants: PLANTS, scenario: "storm" });
    await open(page, "/", "Orage : mets tes plantes à l’abri");
    await simulate(page, "none");
    await expect(page.getByText("Orage : mets tes plantes à l’abri")).toHaveCount(0);
    await expect(wateringRows(page).first()).toBeVisible();
  });
});
