import { expect, test } from "@playwright/test";

import { atDate, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * La liste de courses pour la jardinerie (chantier « Pots et balcon », étape 5) : ouverte depuis l'onglet Balcon,
 * l'engrais des fiches en juin, une coche gardée après rechargement.
 */
test("juin : la liste de courses depuis Balcon, l'engrais des tomates, coché et gardé", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 5, 15, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["cherry-tomato", "sweet-pepper"], now, wateredDaysAgo: 1 });
  await open(page, "/balcony", "Ajouter une plante");
  await page.getByRole("button", { name: "🛒  Voir ma liste de courses" }).click();
  await expect(page.getByText("Liste de courses", { exact: true })).toBeVisible();
  await expect(page.getByText("Engrais organique pour tomates (riche en potasse)")).toBeVisible();
  await page.getByRole("checkbox", { name: "Dans le panier : Engrais organique pour tomates (riche en potasse)" }).click();
  await expect(page.getByText("Tout est dans le panier")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Tout est dans le panier")).toBeVisible();
  await expect(page.getByRole("button", { name: "Partager ma liste" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("les conseils se lisent en entier, sans « … » (retour du 15/10)", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 9, 15, 10));
  await mockWeather(page);
  // De l'ail à planter en octobre : la liste a un pot et du terreau.
  await seedBalcony(page, { plants: ["thyme"], now, wateredDaysAgo: 1, extra: { "balco.garden.plants.v1": JSON.stringify([{ id: "garlic-e2e", catalogId: "garlic", addedAt: now.toISOString(), toPlant: true }]) } });
  await open(page, "/shopping", "Liste de courses");
  const soil = page.getByText(/^Un terreau neuf, sans tourbe si possible · /u);
  await expect(soil).toBeVisible();
  // Ni coupé en une ligne avec « … », ni tronqué : le texte tient en entier dans sa boîte.
  expect(await soil.evaluate((element) => getComputedStyle(element).textOverflow)).not.toBe("ellipsis");
  expect(await soil.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await expect(page.getByText("Aucune marque : prends ce que propose ta jardinerie, utilisable en agriculture biologique.")).toBeVisible();
  expect(errors).toEqual([]);
});
