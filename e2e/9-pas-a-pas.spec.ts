import { expect, test } from "@playwright/test";

import { checkboxOf, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/** Le pas-à-pas pour planter : depuis Aujourd'hui jusqu'à « C'est planté », et depuis le catalogue. */

test("pas-à-pas : ce qu'il te faut, les étapes, puis « C'est planté » coche le geste", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 0, extra: { "balco.garden.plants.v1": JSON.stringify([{ id: "lavender-e2e", catalogId: "lavender", addedAt: new Date().toISOString(), toPlant: true }]) } });
  await open(page, "/", "Plante la lavande");
  await page.getByRole("button", { name: "Plante la lavande, détail" }).click();
  await page.getByRole("button", { name: "Pas à pas, avec ce qu’il te faut" }).click();

  // Ce qu'il te faut : « J'ai déjà » retire l'objet de ce qui manque.
  await expect(page.getByText("Planter la lavande")).toBeVisible();
  await expect(page.getByRole("button", { name: "Partager ce qui manque · 5" })).toBeVisible();
  await page.getByRole("checkbox", { name: "J’ai déjà : Du terreau" }).click();
  await expect(page.getByRole("button", { name: "Partager ce qui manque · 4" })).toBeVisible();

  // Les étapes, une par écran, jusqu'à « Et après ? ».
  await page.getByRole("button", { name: "Commencer le pas-à-pas" }).click();
  await expect(page.getByText("Mets une poignée de billes d’argile au fond.")).toBeVisible();

  // Glisser du doigt change d'étape, comme « Suivant » et « Retour » : le texte et le compteur suivent.
  const swipe = async (fromX: number, toX: number) => {
    const box = (await page.getByText(/^Mets une poignée|^Remplis le pot/).first().boundingBox())!;
    const y = box.y - 60;
    await page.mouse.move(fromX, y);
    await page.mouse.down();
    for (const x of [fromX + (toX - fromX) / 3, fromX + (2 * (toX - fromX)) / 3, toX]) await page.mouse.move(x, y, { steps: 4 });
    await page.mouse.up();
  };
  await swipe(320, 60);
  await expect(page.getByText("Étape 2 sur 6")).toBeVisible();
  await expect(page.getByText("Remplis le pot de terreau aux deux tiers.")).toBeVisible();
  await swipe(60, 320);
  await expect(page.getByText("Étape 1 sur 6")).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "dist/guide-step.png" });
  for (let step = 0; step < 2; step += 1) await page.getByRole("button", { name: "Suivant" }).click();
  // Étape 4 : l'erreur à éviter est à l'étape qu'elle concerne.
  await expect(page.getByText("Erreur à éviter : enterrer la tige plus bas qu’avant. Elle pourrirait.")).toBeVisible();
  await page.screenshot({ path: "dist/guide-mistake.png" });
  for (let step = 0; step < 2; step += 1) await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Et après ?" }).click();
  await expect(page.getByText(/^Premières fleurs dans /)).toBeVisible();

  // « C'est planté » : petite animation, retour sur Aujourd'hui, le geste est fait et l'arrosage suit.
  await page.getByRole("button", { name: "C’est planté" }).click();
  await expect(page.getByText("C’est planté : bien joué !")).toBeVisible();
  await expect(checkboxOf(page, "Annuler ce geste : Plante la lavande")).toBeVisible({ timeout: 5_000 });
  expect(errors).toEqual([]);
});

test("catalogue : « Ce qu'il te faut » seulement, et « J'ai déjà » commun à toutes les plantes", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 1, extra: { "balco.guide.have.v1": JSON.stringify({ shared: ["soil"], byPlant: {} }) } });
  await open(page, "/garden/add", "Ajouter une plante");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("lavande");
  await page.getByRole("button", { name: /^Lavande, voir le détail/ }).click();
  await page.getByRole("button", { name: "🧺  Ce qu’il te faut pour la planter ›" }).click();
  await expect(page.getByText("Ce qu’il te faut").first()).toBeVisible();
  // Le terreau coché pour une autre plante l'est ici aussi.
  await expect(page.getByRole("button", { name: "Partager ce qui manque · 4" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Commencer le pas-à-pas" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
