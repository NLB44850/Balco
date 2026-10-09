import { expect, test } from "@playwright/test";

import { atDate, checkboxOf, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

/**
 * La Sainte-Catherine (18-30 novembre) : la carte sur Aujourd'hui, la page (« Ce qui se plante maintenant »,
 * « Paille tes pots », Nora), une plante ajoutée puis plantée → le badge « Sainte-Catherine · 2026 », et le bilan
 * le 1er décembre.
 */
test("Sainte-Catherine : grande carte d'arrivée, page, plantation, badge, puis bilan", async ({ page }) => {
  const errors = trackErrors(page);
  const now = await atDate(page, new Date(2026, 10, 20, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["thyme"], now, wateredDaysAgo: 1, eventIntro: true });
  await open(page, "/", "Tes plantes");

  // À l'arrivée, la grande carte en plein écran, qui ouvre la page.
  await expect(page.getByText("Temps fort de l’année")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Voir ce qui se plante" }).click();
  await expect(page.getByText("« À la Sainte-Catherine, tout bois prend racine. »")).toBeVisible();
  await expect(page.getByText("Ce qui se plante maintenant")).toBeVisible();
  await expect(page.getByText("Groseillier")).toBeVisible();
  await expect(page.getByText(/^Fraisier$/)).toHaveCount(0);
  // Une seule fois : de retour sur Aujourd'hui, la carte compacte, sans la grande carte.
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("button", { name: "La Sainte-Catherine. Ce que tu plantes maintenant s’enracine tout l’hiver" })).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByText("Temps fort de l’année")).toHaveCount(0);
  await page.goto("/event/sainte-catherine");

  await page.getByRole("button", { name: "Ajouter Framboisier" }).click();
  await expect(page.getByText("Ajouté à ton balcon : Framboisier")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pas à pas : Framboisier" })).toBeVisible();

  await page.getByRole("button", { name: "C’est fait : Paille tes pots avant l’hiver" }).click();
  await expect(page.getByText("✓ C’est fait")).toBeVisible();

  // « Demander à Nora » : Nora s'ouvre avec la question (sans compte, elle invite d'abord à se connecter).
  await page.getByRole("button", { name: /Demander à Nora/ }).click();
  await expect(page.getByText("Se connecter pour discuter avec Nora")).toBeVisible();
  expect(decodeURIComponent(page.url())).toContain("question=Que planter pour la Sainte-Catherine sur mon balcon ?");

  // Planté sur Aujourd'hui : « Semeur » est fêté en grand (une grande fête par jour), puis le badge de l'édition d'un mot.
  await page.getByRole("tab", { name: /Aujourd/ }).click();
  // Le paillage a d'abord donné le badge d'automne « Paré pour l'hiver », fêté à l'arrivée sur Aujourd'hui.
  const winterReady = page.getByRole("button", { name: /^Nouveau badge : Paré pour l’hiver · 2026.*Fermer$/u });
  await expect(winterReady).toBeVisible({ timeout: 10_000 });
  await winterReady.click();
  await checkboxOf(page, "Marquer comme fait : Plante le framboisier").click();
  await expect(page.getByText(/Nouveau badge : Sainte-Catherine · 2026/u).first()).toBeVisible({ timeout: 10_000 });
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem("balco.progress.awards.v1"))) ?? "{}");
  expect(Object.keys(stored.awards)).toContain("event:sainte-catherine:2026");

  // Le 1er décembre : le bilan.
  await page.clock.setSystemTime(new Date(2026, 11, 1, 10));
  await open(page, "/", "Tes plantes");
  await expect(page.getByText("Tu as planté 1 plante pour la Sainte-Catherine. Rendez-vous au printemps pour les voir repartir.")).toBeVisible();
  await page.getByRole("button", { name: "Masquer : La Sainte-Catherine" }).click();
  await expect(page.getByText(/Tu as planté 1 plante/)).toHaveCount(0);

  await open(page, "/profile", "Mes badges éco");
  await expect(page.getByText("🌳 Sainte-Catherine · 2026")).toBeVisible();
  expect(errors).toEqual([]);
});
