import { expect, test } from "@playwright/test";

import { checkboxOf, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Le parcours de tous les jours : arriver, créer son balcon, cocher, annuler, ajouter une plante. */

test("onboarding : de l'accueil à « Aujourd'hui » avec les premières plantes", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await open(page, "/", "On commence par faire connaissance.");
  await page.getByRole("textbox").fill("Camille");
  await page.getByText("C’est parti").click();
  await page.getByText("Je débute").click();
  await page.getByText("Très ensoleillé").click();
  await page.getByText("Un petit balcon").click();
  await page.getByText("Tomates cerises").click();
  await page.getByText("Continuer", { exact: true }).click();
  await expect(page.getByText("Tes premières plantes")).toBeVisible();
  await page.getByText(/^Créer mon balcon/).click();
  await expect(page.getByText("Aujourd’hui").first()).toBeVisible();
  await expect(page.getByText(/Ton balcon/)).toBeVisible();
  await expect(page.getByText("Tes plantes")).toBeVisible();
  expect(errors).toEqual([]);
});

test("les écrans principaux s'ouvrent sans erreur", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "cherry-tomato", "mint"], wateredDaysAgo: 1 });
  await open(page, "/", "Tes plantes");
  await page.getByRole("tab", { name: /Balcon/ }).click();
  await expect(page.getByText("Basilic").first()).toBeVisible();
  await page.getByRole("tab", { name: /Saisons/ }).click();
  await expect(page.getByText(/octobre|novembre|décembre|janvier|février|mars|avril|mai|juin|juillet|août|septembre/i).first()).toBeVisible();
  await page.getByRole("tab", { name: /Nora/ }).click();
  await expect(page.getByText(/Nora/).first()).toBeVisible();
  for (const [url, ready] of [["/profile", "Ma semaine"], ["/settings", "Réglages"], ["/week", "Ma semaine"], ["/vacation", /vacances/i], ["/garden/add", /Basilic, fraisier/], ["/credits", /Crédits/]] as const) {
    if (url === "/garden/add") await open(page, url, "Basilic").then(() => expect(page.getByPlaceholder("Basilic, fraisier, lavande…")).toBeVisible());
    else await open(page, url, ready);
  }
  expect(errors).toEqual([]);
});

test("cocher un geste, puis « Annuler »", async ({ page }) => {
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "cherry-tomato", "mint"], wateredDaysAgo: 1 });
  await open(page, "/", "Tes plantes");
  const first = page.getByRole("checkbox", { name: /^Marquer comme fait : / }).first();
  const name = (await first.getAttribute("aria-label"))!.replace("Marquer comme fait : ", "");
  await first.click();
  await expect(page.getByText(/noté/).first()).toBeVisible();
  await expect(checkboxOf(page, `Annuler ce geste : ${name}`)).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(checkboxOf(page, `Marquer comme fait : ${name}`)).toBeVisible();
});

test("une série de 3 jours se fête en grand", async ({ page }) => {
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint"], wateredDaysAgo: 1, pastGestureDays: [1, 2] });
  await open(page, "/", "Tes plantes");
  await page.getByRole("checkbox", { name: /^Marquer comme fait : / }).first().click();
  await expect(page.getByText("3 jours de suite")).toBeVisible();
  await expect(page.getByText("Ton balcon adore ta régularité.")).toBeVisible();
  // Le message habituel reste en bas, avec « Annuler ».
  await expect(page.getByRole("button", { name: "Annuler" })).toBeVisible();
});

test("catalogue : ajouter une plante puis ouvrir sa fiche", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/garden/add", "Basilic");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("menthe");
  await page.getByRole("button", { name: /^Ajouter Menthe/ }).first().click();
  await expect(page.getByText("Ajouté à ton balcon : Menthe")).toBeVisible();
  await expect(page.getByText("✓ Sur ton balcon")).toBeVisible();
  await page.getByRole("button", { name: "Voir mon balcon · 2 plantes" }).click();
  await page.getByRole("button", { name: /^Menthe, .*voir la fiche/ }).click();
  await expect(page.getByText(/Photo d’exemple|Ajoute ta photo/).first()).toBeVisible();
  expect(errors).toEqual([]);
});
