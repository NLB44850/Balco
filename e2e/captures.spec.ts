import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { loginCodes, mockWeather, open, seedBalcony } from "./helpers";

/**
 * Captures d'écran de l'app telle qu'elle est (14/10 : fin des chantiers « Pots et balcon » et « Cohérence »), pour le
 * récap à coller dans Claude (docs/captures/). Pas un test : lancé seulement à la demande, `bash scripts/captures.sh`.
 */
test.skip(!process.env.CAPTURES, "Captures seulement à la demande (CAPTURES=1).");

const DIR = "docs/captures";
const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(800); // les apparitions en fondu se terminent
  await page.screenshot({ path: `${DIR}/${name}.png` });
};
/** Mi-octobre, en fin d'après-midi : la date du récap. */
const atOctober = async (page: Page) => {
  await page.clock.install({ time: new Date(2026, 9, 14, 17) });
  await page.clock.resume();
  return new Date(2026, 9, 14, 17);
};
const PLANTS = ["basil", "cherry-tomato", "chives", "blackcurrant", "mint"];

test("le quotidien : Aujourd'hui, Balcon, fiche plante, Saisons, catalogue", async ({ page }) => {
  const now = await atOctober(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: PLANTS, now, wateredDaysAgo: 2 });
  await open(page, "/", "Aujourd’hui");
  await shot(page, "01-aujourdhui");
  const group = page.getByRole("button", { name: /^Vérifie la terre de \d+ plantes, détail$/u });
  if (await group.count()) {
    await group.click();
    await shot(page, "02-aujourdhui-arrosage-selon-le-pot");
    await page.getByRole("button", { name: "Fermer la fiche" }).click();
  }
  await open(page, "/balcony", "Ajouter une plante");
  await shot(page, "03-balcon");
  await open(page, "/garden/basil-e2e", "Historique");
  await shot(page, "04-fiche-plante");
  await page.getByText("Ta plante", { exact: true }).scrollIntoViewIfNeeded();
  await shot(page, "05-fiche-plante-ta-plante");
  await open(page, "/calendar", "Saisons");
  await shot(page, "06-saisons");
  await open(page, "/garden/add", "Ajouter une plante");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("aubergine");
  await page.getByRole("button", { name: /^Ajouter Aubergine/ }).first().click();
  await expect(page.getByRole("dialog").getByText(/Où en est ton aubergine/u)).toBeVisible();
  await shot(page, "07-catalogue-ou-en-est-ton-aubergine");
});

test("pots et balcon : courses, réglages, poids des pots, Balco+, consignes du voisin", async ({ page }) => {
  const now = await atOctober(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: PLANTS, now, wateredDaysAgo: 2 });
  await page.goto("/balcony");
  await page.evaluate(() => {
    // Deux plantes à planter : la liste a des pots, du terreau et des billes d'argile.
    const plants = JSON.parse(window.localStorage.getItem("balco.garden.plants.v1") ?? "[]");
    plants.push({ id: "garlic-e2e", catalogId: "garlic", addedAt: new Date().toISOString(), toPlant: true }, { id: "strawberry-e2e", catalogId: "strawberry", addedAt: new Date().toISOString(), toPlant: true });
    window.localStorage.setItem("balco.garden.plants.v1", JSON.stringify(plants));
  });
  await open(page, "/shopping", "Liste de courses");
  await shot(page, "08-liste-de-courses");
  await open(page, "/settings", "Réglages");
  await shot(page, "09-reglages");
  await page.getByRole("button", { name: /^Poids de tes pots/u }).click();
  await expect(page.getByRole("dialog").getByText(/^Environ \d+ kg$/u)).toBeVisible();
  await shot(page, "10-poids-des-pots");
  await open(page, "/plus", "Pour ne rien laisser au hasard");
  await shot(page, "11-ecran-balco-plus");
  await open(page, "/vacation", "Mode vacances");
  await page.getByRole("radio", { name: /Oui, un proche passera/ }).click();
  await page.getByRole("button", { name: "Préparer mon départ" }).click();
  await page.getByRole("button", { name: "Préparer les consignes pour qui arrose" }).click();
  await expect(page.getByLabel("Texte des consignes")).toBeVisible();
  await shot(page, "12-consignes-pour-qui-arrose");
});

test("premier soir de gel : l'alerte et la ligne Balco+", async ({ page }) => {
  const now = await atOctober(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: PLANTS, now, wateredDaysAgo: 1, scenario: "frost" });
  await open(page, "/", "Avec Balco+, l’alerte gel arrive même app fermée ›");
  await shot(page, "13-alerte-gel-et-balco-plus");
});

test("pot libre : « Que planter à la place ? »", async ({ page }) => {
  await page.clock.install({ time: new Date(2027, 4, 18, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const radish = { id: "radish-e2e", catalogId: "radish", addedAt: new Date(2027, 3, 1).toISOString(), potSize: "small" };
  const sown = { id: "radish-e2e:start", plantId: "radish-e2e", type: "observation", completedAt: new Date(2027, 3, 2, 9).toISOString(), source: "manual", note: "Sème les radis" };
  const harvested = { id: "h-radish", plantId: "radish-e2e", type: "harvest", completedAt: new Date(2027, 4, 10, 9).toISOString(), source: "manual" };
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([radish]), "balco.garden.events.v1": JSON.stringify([sown, harvested]) } });
  await open(page, "/", "Tes radis sont-ils tous récoltés ?");
  await page.getByRole("button", { name: "Tes radis sont-ils tous récoltés ?, détail" }).click();
  await page.getByRole("button", { name: "Oui, tout est récolté" }).click();
  await expect(page.getByRole("dialog").getByText("Que planter à la place ?")).toBeVisible();
  await page.getByRole("dialog").getByText("Que planter à la place ?").scrollIntoViewIfNeeded();
  await shot(page, "14-pot-libre-que-planter-a-la-place");
});

test("Observer : le traitement naturel vérifié", async ({ page }) => {
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"] });
  await open(page, "/scanner", "1 analyse offerte, sans compte");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choisir dans ma galerie" }).click();
  await (await chooser).setFiles(path.resolve(__dirname, "../assets/plants/basil.jpg"));
  await page.getByRole("button", { name: "Analyser cette photo" }).click();
  const remedy = page.getByLabel("Traitement naturel : pucerons");
  await expect(remedy).toBeVisible({ timeout: 20_000 });
  await remedy.scrollIntoViewIfNeeded();
  await shot(page, "15-observer-traitement-naturel");
});

test("Nora : la conversation", async ({ page }) => {
  const email = `captures-${Date.now()}@balco.test`;
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "chives"], wateredDaysAgo: 1 });
  await open(page, "/login", "Retrouve ton balcon partout.");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect.poll(() => loginCodes(email).length, { timeout: 10_000 }).toBe(1);
  await page.getByLabel("Code reçu par e-mail").pressSequentially(loginCodes(email)[0]);
  await expect(page.getByText("Regarde tes e-mails.")).toHaveCount(0, { timeout: 15_000 });
  await page.goto("/assistant");
  await expect(page.getByPlaceholder("Écris à Nora…")).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder("Écris à Nora…").fill("Fais le point sur mes plantes");
  await page.getByPlaceholder("Écris à Nora…").press("Enter");
  await expect(page.getByText(/^Réponse simulée/)).toBeVisible({ timeout: 30_000 });
  await shot(page, "16-nora");
});
