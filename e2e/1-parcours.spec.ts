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

test("catalogue : la fiche d'une nouvelle plante et ses variétés", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/garden/add", "100 plantes pour le balcon");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("cassis");
  await page.getByRole("button", { name: /^Cassissier, voir le détail/ }).click();
  await expect(page.getByText("Variétés conseillées")).toBeVisible();
  await expect(page.getByText("Noir de Bourgogne", { exact: true })).toBeVisible();
  await expect(page.getByText("Titania", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("fiche du bas : jamais plus haute que l'écran, se ferme par « × » ou en glissant vers le bas", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/garden/add", "100 plantes pour le balcon");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("piment");
  const openSheet = () => page.getByRole("button", { name: /^Piment, voir le détail/ }).click();

  // Fiche longue sur un petit écran : le bouton du bas reste atteignable (le contenu défile).
  await openSheet();
  const close = page.getByRole("button", { name: "Fermer la fiche" });
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  await page.getByRole("button", { name: "Ajouter à mon balcon" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Ajouter à mon balcon" })).toBeInViewport();

  // « × » ferme la fiche.
  await close.click();
  await expect(close).toHaveCount(0);

  // Glisser la poignée vers le bas replie la fiche.
  await openSheet();
  // La fiche monte en glissant : on attend qu'elle soit arrivée avant de saisir la poignée.
  const closeButton = page.getByRole("button", { name: "Fermer la fiche" });
  let previous = -1;
  await expect.poll(async () => {
    const y = (await closeButton.boundingBox())?.y ?? -1;
    const settled = y === previous;
    previous = y;
    return settled;
  }, { intervals: [150] }).toBe(true);
  const handle = (await closeButton.boundingBox())!;
  await page.mouse.move(180, handle.y + 10);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) await page.mouse.move(180, handle.y + 10 + step * 25);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Fermer la fiche" })).toHaveCount(0);
});

test("suggestions de saison : idée du mois sur Aujourd'hui, carte de Saisons, catalogue du mois", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/", "Idée du mois");
  await page.getByRole("button", { name: /^Ajouter .* à mon balcon$/ }).first().click();
  await expect(page.getByText(/^Ajouté à ton balcon : /)).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();

  await open(page, "/calendar", /^À semer ou planter en /);
  await page.getByRole("button", { name: /, voir le détail$/ }).first().click();
  await expect(page.getByRole("button", { name: "+ Ajouter à mon balcon" })).toBeVisible();
  await page.getByRole("button", { name: "+ Ajouter à mon balcon" }).click();
  await expect(page.getByText(/^Ajouté à ton balcon : /)).toBeVisible();

  await page.getByRole("button", { name: /^Voir toutes les plantes d/ }).click();
  await expect(page.getByRole("button", { name: /^✓ À semer en / })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Saisons : gestes rangés par type, cochés dans la feuille, suggestions aussi par saison", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint", "thyme", "cherry-tomato", "strawberry", "parsley", "chives"], wateredDaysAgo: 1 });
  await open(page, "/calendar", /^À semer ou planter en /);

  // Une ligne par type de geste (« À récolter · 5 plantes »), qui ouvre la liste des plantes.
  const group = page.getByRole("button", { name: /^(À récolter|Entretien|Engrais|À rempoter|À planter|À semer) · \d+ (plantes|gestes), détail$/ }).first();
  await expect(group).toBeVisible();
  await group.click();
  await expect(page.getByText(/^0 sur \d+ fait$/)).toBeVisible();
  await page.getByRole("checkbox", { name: /^Noter comme fait : / }).first().click();
  await expect(page.getByText(/^1 sur \d+ fait$/)).toBeVisible();
  // Le message « Annuler » s'affiche par-dessus la feuille.
  await expect(page.getByText(/ : noté$/)).toBeVisible();
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
  await expect(page.getByText(/^1 sur \d+ fait · /).first()).toBeVisible();

  // En vue par saison, les suggestions sont là aussi.
  await page.getByRole("button", { name: "Par saison" }).click();
  await expect(page.getByText(/^À semer ou planter (au|en) /)).toBeVisible();
  expect(errors).toEqual([]);
});
