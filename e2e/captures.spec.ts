import { expect, test, type Page } from "@playwright/test";

import { checkboxOf, loginCodes, mockWeather, open, seedBalcony } from "./helpers";
import { climateZoneFor } from "../lib/plants/climate";
import { seasonalSuggestions } from "../lib/plants/suggestions";

/**
 * Captures d'écran des nouveautés, pour le récap à coller dans Claude (docs/captures/). Pas un test : lancé
 * seulement à la demande, `CAPTURES=1 bash scripts/e2e.sh captures`.
 */
test.skip(!process.env.CAPTURES, "Captures seulement à la demande (CAPTURES=1).");

const DIR = "docs/captures";
const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(700); // les apparitions en fondu se terminent
  await page.screenshot({ path: `${DIR}/${name}.png` });
};

test("rempotage : la ligne, le détail, le pas-à-pas, « Pas besoin cette année »", async ({ page }) => {
  await page.clock.install({ time: new Date(2027, 2, 10, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const plants = [{ id: "thyme-e2e", catalogId: "thyme", addedAt: new Date(2025, 2, 1).toISOString() }];
  const events = [
    { id: "w-thyme", plantId: "thyme-e2e", type: "watering", completedAt: new Date(2027, 2, 10, 8).toISOString(), source: "manual" },
  ];
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify(plants), "balco.garden.events.v1": JSON.stringify(events) } });
  await open(page, "/", "Récolte le thym");
  await checkboxOf(page, "Marquer comme fait : Récolte le thym").click();
  await expect(page.getByText("Rempote le thym")).toBeVisible();
  await page.waitForTimeout(3500); // le message « Annuler » s'en va
  await shot(page, "01-aujourdhui-rempote-le-thym");
  await page.getByRole("button", { name: "Rempote le thym, détail" }).click();
  await shot(page, "02-rempotage-signe-et-pot-suivant");
  await page.getByRole("button", { name: "Pas à pas, avec ce qu’il te faut" }).click();
  await shot(page, "03-rempotage-ce-quil-te-faut");
  await page.getByRole("button", { name: "Commencer le pas-à-pas" }).click();
  await shot(page, "04-rempotage-etape-1-le-signe");
  for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Suivant" }).click();
  await shot(page, "05-rempotage-etape-4-demeler");
  for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Et après ?" }).click();
  await shot(page, "06-rempotage-et-apres");
  await page.goBack();
  await expect(page.getByText("Rempote le thym")).toBeVisible();
  await page.getByRole("button", { name: "Rempote le thym, détail" }).click();
  await page.getByRole("button", { name: "Pas besoin cette année" }).click();
  await expect(page.getByText("Change la terre du dessus du thym").first()).toBeVisible();
  await shot(page, "07-pas-besoin-cette-annee-terre-du-dessus");
});

test("pincer le basilic : le pas-à-pas d'un geste de suite", async ({ page }) => {
  await page.clock.install({ time: new Date(2027, 4, 20, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const plants = [{ id: "basil-e2e", catalogId: "basil", addedAt: new Date(2027, 4, 1).toISOString() }];
  const events = [
    { id: "basil-e2e:start", plantId: "basil-e2e", type: "observation", completedAt: new Date(2027, 4, 5, 9).toISOString(), source: "manual", note: "Plante le basilic" },
    { id: "w-basil", plantId: "basil-e2e", type: "watering", completedAt: new Date(2027, 4, 20, 8).toISOString(), source: "manual" },
  ];
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify(plants), "balco.garden.events.v1": JSON.stringify(events) } });
  await open(page, "/", "Pince le basilic");
  await page.getByRole("button", { name: "Pince le basilic, détail" }).click();
  await shot(page, "08-pincer-detail");
  await page.getByRole("button", { name: "Pas à pas, avec ce qu’il te faut" }).click();
  await page.getByRole("button", { name: "Commencer le pas-à-pas" }).click();
  await shot(page, "09-pincer-etape-1");
  for (let step = 0; step < 2; step += 1) await page.getByRole("button", { name: "Suivant" }).click();
  await shot(page, "10-pincer-etape-3-deux-tiges");
});

test("Saisons en octobre : repère de gel et suggestions", async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 7, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const answers = { sunlight: "sunny", space: "balcony", goals: ["tomatoes"], experience: "beginner" } as const;
  const fitting = seasonalSuggestions(answers as never, { month: 10, climate: climateZoneFor(45.76, 4.84), limit: 100 }).map((suggestion) => suggestion.entry.id);
  await seedBalcony(page, { plants: ["basil", ...fitting], wateredDaysAgo: 0 });
  await open(page, "/calendar", /premières gelées vers/);
  await shot(page, "11-saisons-octobre-premieres-gelees");
  await page.mouse.move(200, 500);
  await page.mouse.wheel(0, 900);
  await shot(page, "12-saisons-octobre-tout-est-deja-la");
});

test("Nora : réponse perdue en route, « Réessayer »", async ({ page }) => {
  const email = `captures-${Date.now()}@balco.test`;
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/login", "Retrouve ton balcon partout.");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir mon code" }).click();
  await expect.poll(() => loginCodes(email).length, { timeout: 10_000 }).toBe(1);
  await page.getByLabel("Code reçu par e-mail").pressSequentially(loginCodes(email)[0]);
  await expect(page.getByText("Regarde tes e-mails.")).toHaveCount(0, { timeout: 15_000 });
  await page.route("**/api/trpc/ai.ask**", (route) => route.fulfill({ status: 502, body: "" }));
  await page.goto("/assistant");
  await expect(page.getByPlaceholder("Écris à Nora…")).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder("Écris à Nora…").fill("Fais le point sur mes plantes");
  await page.getByPlaceholder("Écris à Nora…").press("Enter");
  await expect(page.getByText(/La réponse de Nora s’est perdue en route/)).toBeVisible({ timeout: 30_000 });
  await shot(page, "13-nora-reponse-perdue-reessayer");
});

test("les dessins des nouveaux pas-à-pas", async ({ page }) => {
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/illustrations", "Illustrations");
  await page.getByText("Des racines sortent sous le pot", { exact: true }).scrollIntoViewIfNeeded();
  await shot(page, "14-nouveaux-dessins");
});
