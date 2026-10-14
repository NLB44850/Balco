import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, openPlantings, seedBalcony, trackErrors } from "./helpers";

/** Chantier « Cohérence », livraison 2 : supprimer = tout de suite, avec « Annuler » dans le message du bas. */

test("fiche plante : un geste de l'historique se supprime depuis sa feuille, « Annuler » le remet", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint"], wateredDaysAgo: 1 });
  await open(page, "/garden/basil-e2e", "Historique");
  await expect(page.getByText("Supprimer", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Arrosage à .*, détail$/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer ce geste" }).click();
  await expect(page.getByText("Geste supprimé de l’historique")).toBeVisible();
  await expect(page.getByText("Historique", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Arrosage à .*, détail$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: /^Arrosage à .*, détail$/ })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("fiche plante : son nom dans une feuille, « Retirer du balcon » tout de suite avec « Annuler » sur Balcon", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint"], wateredDaysAgo: 1 });
  await open(page, "/balcony", "Basilic");
  await page.getByRole("button", { name: /^Basilic, .*voir la fiche/ }).click();
  await expect(page.getByText("Ta plante")).toBeVisible();
  await page.getByRole("button", { name: /^Son nom/ }).click();
  await page.getByRole("dialog").getByLabel("Son nom").fill("Basilic du salon");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Basilic du salon").first()).toBeVisible();

  await page.getByRole("button", { name: /^Retirer du balcon/ }).click();
  await expect(page.getByText("Basilic du salon retiré de ton balcon")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Basilic du salon, .*voir la fiche/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: /^Basilic du salon, .*voir la fiche/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mode vacances : « Arrêter » tout de suite, « Annuler » remet les dates", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/vacation", "Mode vacances");
  await page.getByRole("button", { name: "Préparer mon départ" }).click();
  await page.getByRole("button", { name: "Arrêter le mode vacances" }).click();
  await expect(page.getByText("Mode vacances arrêté")).toBeVisible();
  await expect(page.getByText("Tu pars quand ?")).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: "Arrêter le mode vacances" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("plantations du mois : cocher puis décocher dans la feuille ne la referme pas, même un instant", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 14, 15));
  await mockWeather(page);
  const plants = ["chives", "blackcurrant"].map((catalogId, index) => ({ id: `${catalogId}-e2e`, catalogId, addedAt: new Date(now.getTime() - (2 - index) * 86_400_000).toISOString(), toPlant: true }));
  await seedBalcony(page, { plants: ["chives", "blackcurrant"], now, extra: { "balco.garden.plants.v1": JSON.stringify(plants) } });
  await open(page, "/", "Aujourd’hui");
  await openPlantings(page);
  const box = page.getByRole("checkbox", { name: /: Plante le cassissier$/ });
  await box.click();
  await expect(page.getByRole("dialog").getByText(/1 sur 2 faites$/u)).toBeVisible();
  // On guette la feuille toutes les 5 ms pendant le décochage : elle ne doit jamais disparaître.
  await page.evaluate(() => {
    const w = window as unknown as { gone: number };
    w.gone = 0;
    setInterval(() => { if (!document.body.innerText.includes("Pas besoin de tout faire aujourd")) w.gone += 1; }, 5);
  });
  await box.click();
  await expect(page.getByRole("dialog").getByText(/0 sur 2 faites$/u)).toBeVisible();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { gone: number }).gone)).toBe(0);
  expect(errors).toEqual([]);
});
