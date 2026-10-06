import { expect, test } from "@playwright/test";

import { mockWeather, open, seedBalcony, trackErrors, wateringGroup } from "./helpers";

/**
 * Cohérence entre les écrans, sur le balcon de démonstration du test utilisateur : chaque plante a le
 * même geste du jour et le même état sur Aujourd'hui, la carte Balcon et sa fiche ; un geste fait se voit
 * dans Saisons, Ma semaine et Moi, avec les mêmes chiffres.
 */
const DEMO = { plants: ["basil", "mint", "thyme", "cherry-tomato", "strawberry"], wateredDaysAgo: 3, pastGestureDays: [1, 2, 4] };
const NAMES: Record<string, string> = { basil: "Basilic", mint: "Menthe", thyme: "Thym", "cherry-tomato": "Tomates cerises", strawberry: "Fraisier" };
const NOTHING = "Rien à faire aujourd’hui";

test("cohérence : Aujourd'hui, Balcon et la fiche disent la même chose de chaque plante", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, DEMO);

  // 1. Balcon : l'état et le geste du jour de chaque carte.
  await open(page, "/balcony", "Ajouter une plante");
  const balcony = new Map<string, { status: string; line: string }>();
  for (const [id, name] of Object.entries(NAMES)) {
    const card = page.getByRole("button", { name: new RegExp(`^${name}, .+, voir la fiche$`) });
    const label = (await card.getAttribute("aria-label")) ?? "";
    const status = label.replace(`${name}, `, "").replace(", voir la fiche", "");
    const lines = (await card.innerText()).split("\n").map((line) => line.trim()).filter(Boolean);
    balcony.set(id, { status, line: lines.at(-1) ?? "" });
  }

  // 2. Aujourd'hui : même état dans la pastille, et le geste de la carte est dans la liste du jour.
  await open(page, "/", "Tes plantes");
  for (const [id, name] of Object.entries(NAMES)) {
    const { status, line } = balcony.get(id)!;
    await expect(page.getByRole("button", { name: `${name}, ${status}` })).toBeVisible();
    // Les onglets restent montés, cachés : on ne regarde que ce qui est à l'écran.
    if (line !== NOTHING && !line.startsWith("✓") && !line.startsWith("Arrose")) await expect(page.getByText(line, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
  // Les arrosages sont regroupés : chacun se retrouve dans la feuille « Vérifie la terre de N plantes ».
  const waterings = [...balcony.values()].map(({ line }) => line).filter((line) => line.startsWith("Arrose"));
  if (waterings.length > 1) {
    await wateringGroup(page).click();
    for (const line of waterings) await expect(page.getByRole("checkbox", { name: `Marquer comme fait : ${line}` })).toBeVisible();
    await page.keyboard.press("Escape");
  } else {
    for (const line of waterings) await expect(page.getByText(line, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }

  // 3. La fiche de chaque plante : même état, même prochain geste.
  for (const [id] of Object.entries(NAMES)) {
    const { status, line } = balcony.get(id)!;
    await open(page, `/garden/${id}-e2e`, "Sa progression");
    await expect(page.getByText(status, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(line, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

/** Un chiffre affiché au-dessus de son libellé (« 5 » puis « gestes »), lu dans le texte de l'écran. */
async function figure(page: import("@playwright/test").Page, label: RegExp) {
  const text = await page.locator("body").innerText();
  const match = text.match(new RegExp(`(\\d+)\\n${label.source}`, "u"));
  return match ? Number(match[1]) : null;
}

test("cohérence : une récolte sur Aujourd'hui se voit dans Saisons, Ma semaine et Moi, avec les mêmes chiffres", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  // Arrosées ce matin : la récolte du mois est le geste proposé.
  await seedBalcony(page, { plants: ["mint", "thyme", "chives"], wateredDaysAgo: 0, pastGestureDays: [1, 2, 4] });

  await open(page, "/week", "Ma semaine");
  const before = { gestures: await figure(page, /gestes?\n/), streak: await figure(page, /jours? de suite/), harvests: await figure(page, /récoltes?\n/) };
  expect(before.gestures).not.toBeNull();
  expect(before.streak).not.toBeNull();

  // Moi montre les mêmes chiffres que Ma semaine.
  await open(page, "/profile", "Mode vacances");
  expect(await figure(page, /gestes? cette semaine/)).toBe(before.gestures);
  expect(await figure(page, /jours? de suite/)).toBe(before.streak);

  // Une récolte sur Aujourd'hui…
  await open(page, "/", "Tes plantes");
  const harvest = page.getByRole("checkbox", { name: /^Marquer comme fait : Récolte / }).filter({ visible: true }).first();
  await harvest.click();
  await expect(page.getByRole("checkbox", { name: /^Annuler ce geste : Récolte / }).filter({ visible: true }).first()).toBeVisible();

  // … se voit dans Saisons (sans rien à cocher)…
  await page.getByRole("tab", { name: /Saisons/ }).click();
  await expect(page.getByText(/^1 sur \d+ déjà fait · /u).filter({ visible: true })).toBeVisible();

  // … et compte une fois de plus dans Ma semaine et dans Moi.
  await open(page, "/week", "Ma semaine");
  expect(await figure(page, /gestes?\n/)).toBe((before.gestures ?? 0) + 1);
  expect(await figure(page, /récoltes?\n/)).toBe((before.harvests ?? 0) + 1);
  await open(page, "/profile", "Mode vacances");
  expect(await figure(page, /gestes? cette semaine/)).toBe((before.gestures ?? 0) + 1);
  expect(errors).toEqual([]);
});
