import { expect, test } from "@playwright/test";

import { atDate, checkboxOf, denyGeolocation, mockWeather, open, openHarvests, seedBalcony, trackErrors, wateringGroup } from "./helpers";

/** Le parcours de tous les jours : arriver, créer son balcon, cocher, annuler, ajouter une plante. */

test("onboarding « Pas encore » : soleil, espace, envies, puis des plantes de saison à planter", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await open(page, "/", "Ton balcon, au bon moment.");
  await page.getByText("C’est parti").click();
  await expect(page.getByLabel("Étape 1 sur 6")).toBeVisible();
  await page.getByText("Pas encore").click();
  await page.getByText("Le soleil tape presque toute la journée").click();
  await page.getByText("Un petit balcon").click();
  await page.getByText("Tomates cerises").click();
  await page.getByText("Continuer", { exact: true }).click();
  // La ville juste avant les plantes : leur saison suit son climat.
  await expect(page.getByText("Où est ton balcon ?")).toBeVisible();
  await page.getByPlaceholder("Rechercher une ville…").fill("Lyon");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page.getByText("Lyon", { exact: true }).click();
  await expect(page.getByText("Tes premières plantes")).toBeVisible();
  // Plantes de saison seulement : hors de mars à juin, pas de tomates, mais une phrase pour patienter.
  if (![3, 4, 5, 6].includes(new Date().getMonth() + 1)) {
    await expect(page.getByText("Les tomates se plantent en mai. En attendant, voici ce qui pousse maintenant.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Tomates cerises/ })).toHaveCount(0);
  }
  await page.getByText(/^Créer mon balcon/).click();
  await expect(page.getByText("Aujourd’hui").first()).toBeVisible();
  await expect(page.getByText("Météo de Paris par défaut")).toHaveCount(0);
  // Choisies, pas encore en terre : leur premier geste est de les semer ou planter.
  await expect(page.getByRole("checkbox", { name: /^Marquer comme fait : (Sème|Plante) / }).first()).toBeVisible();
  await expect(page.getByText(/Vérifie la terre/)).toHaveCount(0);
  // Carte d'arrivée, jusqu'au premier geste coché.
  await expect(page.getByText("Bienvenue, voici ton balcon 🌱")).toBeVisible();
  await page.getByRole("checkbox", { name: /^Marquer comme fait : (Sème|Plante) / }).first().click();
  await expect(page.getByText("Bienvenue, voici ton balcon 🌱")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("onboarding « Oui » : lesquelles (raccourci + recherche), soleil, espace, ville refusée ; plantes installées", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await denyGeolocation(page);
  await open(page, "/", "Ton balcon, au bon moment.");
  await page.getByText("C’est parti").click();
  await page.getByText("Oui", { exact: true }).click();
  await expect(page.getByText("Lesquelles ?")).toBeVisible();
  await expect(page.getByLabel("Étape 2 sur 5")).toBeVisible();
  await page.getByRole("checkbox", { name: "Basilic" }).click();
  await page.getByLabel("Rechercher une plante").fill("romarin");
  await page.getByRole("checkbox", { name: "Romarin" }).first().click();
  await page.getByText("Continuer · 2 plantes").click();
  await page.getByText("Je ne sais pas").click();
  await page.getByText("Un petit balcon").click();
  // Position refusée : Balco le dit, on passe, et Aujourd'hui propose de choisir la ville.
  await page.getByRole("button", { name: "⌖ Utiliser ma position" }).click();
  await expect(page.getByText("Position indisponible : cherche ta ville, ou passe pour l’instant.")).toBeVisible();
  await page.getByRole("button", { name: "Plus tard" }).click();
  await expect(page.getByText("Aujourd’hui").first()).toBeVisible();
  await expect(page.getByText("Tes plantes", { exact: true })).toBeVisible();
  await expect(page.getByText("Météo de Paris par défaut")).toBeVisible();
  // Déjà en terre : pas de « Plante le basilic », l'arrosage est proposé.
  await expect(page.getByRole("checkbox", { name: /Plante le basilic|Plante le romarin/ })).toHaveCount(0);
  await expect(page.getByText(/Vérifie la terre de 2 plantes|Arrose/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("« Passer » : Aujourd'hui avec des plantes de saison et « Quelques questions », qui relance l'accueil", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await open(page, "/", "Ton balcon, au bon moment.");
  await page.getByRole("button", { name: "Passer" }).click();
  await expect(page.getByText("Ajoute ta première plante")).toBeVisible();
  await page.getByText("Quelques questions").click();
  await expect(page.getByText("Tu as déjà des plantes sur ton balcon ?")).toBeVisible();
  await page.getByText("Oui", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Menthe" }).click();
  await page.getByText("Continuer · 1 plante").click();
  await page.getByText("Presque jamais").click();
  await page.getByText("Un rebord de fenêtre", { exact: true }).click();
  await page.getByRole("button", { name: "Plus tard" }).click();
  await expect(page.getByText("Tes plantes", { exact: true })).toBeVisible();
  await expect(page.getByText("Quelques questions")).toHaveCount(0);
  // « Refaire l'accueil » (Réglages → Version de test) ne retire aucune plante.
  await page.goto("/settings");
  await page.getByRole("button", { name: "Refaire l’accueil" }).click();
  await expect(page.getByText("Tu as déjà des plantes sur ton balcon ?")).toBeVisible();
  await page.getByRole("button", { name: "Revenir à l'étape précédente" }).click();
  await page.getByRole("button", { name: "Passer" }).click();
  // Retour sur Réglages, et la menthe est toujours sur le balcon.
  await expect(page.getByRole("button", { name: "Refaire l’accueil" })).toBeVisible();
  await open(page, "/", "Tes plantes");
  await expect(page.getByRole("button", { name: /^Menthe/ }).first()).toBeVisible();
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
  // En juillet : en pleine saison du basilic et des tomates (en octobre, leur saison est finie).
  const now = await atDate(page, new Date(2027, 6, 10, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "cherry-tomato", "mint"], wateredDaysAgo: 1, now });
  await open(page, "/", "Tes plantes");
  // Les trois récoltes de juillet sont regroupées : on coche la première dans leur feuille.
  await openHarvests(page);
  const first = page.getByRole("checkbox", { name: /^Marquer comme fait : / }).first();
  const name = (await first.getAttribute("aria-label"))!.replace("Marquer comme fait : ", "");
  await first.click();
  await expect(page.getByText(/noté/).first()).toBeVisible();
  await expect(checkboxOf(page, `Annuler ce geste : ${name}`)).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(checkboxOf(page, `Marquer comme fait : ${name}`)).toBeVisible();
});

test("une série de 3 jours se dit dans le message du bas, sans plein écran", async ({ page }) => {
  await mockWeather(page);
  // Thym arrosé il y a 2 jours (et 8), ciboulette il y a 3 jours : hier et avant-hier sont des jours
  // suivis, il y a 3 jours le thym avait soif. Aujourd'hui, seule la ciboulette est à arroser.
  await seedBalcony(page, { plants: ["thyme", "chives"], waterings: { thyme: [2, 8], chives: [3] } });
  await open(page, "/", "Tes plantes");
  await page.getByRole("checkbox", { name: /^Marquer comme fait : Arrose la ciboulette/ }).click();
  await expect(page.getByText(/^🔥 3 jours de suite · /u)).toBeVisible();
  await expect(page.getByRole("button", { name: /\. Fermer$/ })).toHaveCount(0);
  // Le message garde son « Annuler ».
  await expect(page.getByRole("button", { name: "Annuler" })).toBeVisible();
});

test("une 1ʳᵉ récolte se fête en grand, une seule fois par jour", async ({ page }) => {
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint", "thyme"], wateredDaysAgo: 0 });
  await open(page, "/", "Tes plantes");
  await openHarvests(page);
  await page.getByRole("checkbox", { name: /^Marquer comme fait : Récolte la menthe/ }).click();
  const party = page.getByRole("button", { name: /^(Nouveau badge|Première récolte).*\. Fermer$/u });
  await expect(party).toBeVisible();
  await party.click();
  await expect(party).toHaveCount(0);
  // La 2ᵉ grande occasion du jour se dit dans le message du bas.
  await page.getByRole("checkbox", { name: /^Marquer comme fait : Récolte le thym/ }).click();
  await expect(page.getByText(/^(🧺|🏅) .+ · Récolte le thym : noté/u)).toBeVisible();
  await expect(page.getByRole("button", { name: /\. Fermer$/ })).toHaveCount(0);
});

test("catalogue : ajouter une plante puis ouvrir sa fiche", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/garden/add", "Ajouter une plante");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("menthe");
  // « + » : déjà sur le balcon, ou à planter ?
  await page.getByRole("button", { name: /^Ajouter Menthe/ }).first().click();
  await page.getByRole("button", { name: "Menthe : Déjà sur mon balcon" }).click();
  await expect(page.getByText("Ajouté à ton balcon : Menthe")).toBeVisible();
  await expect(page.getByText("✓ Sur ton balcon")).toBeVisible();
  // La même, à planter : son premier geste sera de la planter.
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("lavande");
  await page.getByRole("button", { name: /^Ajouter Lavande/ }).first().click();
  await page.getByRole("button", { name: "Lavande : À planter" }).click();
  await expect(page.getByText("À planter sur ton balcon : Lavande")).toBeVisible();
  await page.getByRole("button", { name: "Voir mon balcon · 3 plantes" }).click();
  await page.getByRole("button", { name: /^Menthe, .*voir la fiche/ }).click();
  await expect(page.getByText(/Photo d’exemple|Ajoute ta photo/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("catalogue : la fiche d'une nouvelle plante et ses variétés", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/garden/add", "101 plantes pour le balcon");
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
  await open(page, "/garden/add", "101 plantes pour le balcon");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("piment");
  const openSheet = () => page.getByRole("button", { name: /^Piment, voir le détail/ }).click();

  // Fiche longue sur un petit écran : le bouton du bas reste atteignable (le contenu défile).
  await openSheet();
  const close = page.getByRole("button", { name: "Fermer la fiche" });
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  await page.getByRole("button", { name: "Déjà sur mon balcon" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Déjà sur mon balcon" })).toBeInViewport();

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

test("Saisons : calendrier à lire, rangé par type ; les gestes du mois se font sur Aujourd'hui", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil", "mint", "thyme", "cherry-tomato", "strawberry", "parsley", "chives"], wateredDaysAgo: 1 });
  await open(page, "/calendar", /^À semer ou planter en /);
  await expect(page.getByText(/^Ton calendrier : ce qui t’attend dans les prochains mois\. Les gestes de ce mois se font depuis Aujourd’hui\.$/)).toBeVisible();
  // Rien ne se coche dans Saisons.
  await expect(page.getByRole("checkbox").filter({ visible: true })).toHaveCount(0);

  // Une ligne par type de geste (« À récolter · 5 plantes »), qui ouvre la liste des plantes, à lire.
  const group = page.getByRole("button", { name: /^(À récolter|Entretien|Engrais|À rempoter|À planter|À semer) · \d+ (plantes|gestes), détail$/ }).first();
  await expect(group).toBeVisible();
  await group.click();
  await expect(page.getByText(/^Ces gestes se font depuis Aujourd’hui, plante par plante\./)).toBeVisible();
  await expect(page.getByRole("checkbox").filter({ visible: true })).toHaveCount(0);

  // Le détail d'un geste du mois renvoie vers Aujourd'hui.
  await page.getByRole("button", { name: /, détail$/ }).filter({ visible: true }).last().click();
  await page.getByRole("button", { name: "Le faire sur Aujourd’hui" }).click();
  await expect(page.getByText("Tes plantes", { exact: true })).toBeVisible();

  // Un mois à venir se lit aussi, sans bouton.
  await page.getByRole("tab", { name: /Saisons/ }).click();
  await page.getByRole("button", { name: "Par saison" }).click();
  await expect(page.getByText(/^À semer ou planter (au|en) /)).toBeVisible();
  expect(errors).toEqual([]);
});

test("Aujourd'hui : une fois la plante arrosée, sa récolte du mois prend la place ; décocher se voit partout", async ({ page }) => {
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 3 });
  await open(page, "/", "Tes plantes");
  await checkboxOf(page, /^Marquer comme fait : Arrose la menthe/).click();
  await expect(checkboxOf(page, /^Marquer comme fait : Récolte la menthe/)).toBeVisible();
  await expect(checkboxOf(page, /^Annuler ce geste : Arrose la menthe/)).toBeVisible();

  // Récoltée sur Aujourd'hui : Saisons le montre (sans rien à cocher).
  await checkboxOf(page, /^Marquer comme fait : Récolte la menthe/).click();
  await page.getByRole("tab", { name: /Saisons/ }).click();
  await expect(page.getByText("✓ Faite aujourd’hui").filter({ visible: true })).toBeVisible();

  // Décocher sur Aujourd'hui se voit partout : la récolte revient, puis l'arrosage revient.
  await page.getByRole("tab", { name: /Aujourd’hui/ }).click();
  await checkboxOf(page, /^Annuler ce geste : Récolte la menthe/).click();
  await expect(checkboxOf(page, /^Marquer comme fait : Récolte la menthe/)).toBeVisible();
  await page.getByRole("tab", { name: /Saisons/ }).click();
  await expect(page.getByText("✓ Faite aujourd’hui").filter({ visible: true })).toHaveCount(0);
  await page.getByRole("tab", { name: /Aujourd’hui/ }).click();
  await checkboxOf(page, /^Annuler ce geste : Arrose la menthe/).click();
  await expect(checkboxOf(page, /^Marquer comme fait : Arrose la menthe/)).toBeVisible();
});

test("une plante « à planter » : un seul geste, « Plante la lavande », puis l'arrosage prend sa place", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  const addedAt = new Date().toISOString();
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 0, extra: { "balco.garden.plants.v1": JSON.stringify([{ id: "lavender-e2e", catalogId: "lavender", addedAt, toPlant: true }]) } });
  await open(page, "/", "Plante la lavande");
  await page.goto("/balcony");
  await expect(page.getByRole("button", { name: /^Lavande, À planter/ })).toBeVisible();
  await page.goto("/");
  await checkboxOf(page, "Marquer comme fait : Plante la lavande").click();
  await expect(checkboxOf(page, /Arrose la lavande|Vérifie la terre/)).toBeVisible();
  await page.goto("/balcony");
  await expect(page.getByRole("button", { name: /^Lavande, À planter/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Nora demande le prénom, sans compte ni IA, et le garde pour Réglages", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await open(page, "/", "Ton balcon, au bon moment.");
  await page.getByRole("button", { name: "Passer" }).click();
  await page.getByRole("tab", { name: /Nora/ }).click();
  await expect(page.getByText("Comment je t’appelle ?")).toBeVisible();
  await page.getByLabel("Ton prénom").fill("Camille");
  await page.getByRole("button", { name: "Enregistrer mon prénom" }).click();
  await expect(page.getByText("Bonjour Camille ! Je suis Nora, ta coach pour un balcon vivant et facile à entretenir.")).toBeVisible();
  await expect(page.getByText("Enchantée, Camille ! Tu pourras changer ton prénom dans Réglages.")).toBeVisible();
  await expect(page.getByText("Comment je t’appelle ?")).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Prénom : Camille" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("« Pas encore acheté ? Rappelle-moi samedi » : le geste disparaît, « Annuler » le remet", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 0, extra: { "balco.garden.plants.v1": JSON.stringify([{ id: "lavender-e2e", catalogId: "lavender", addedAt: new Date().toISOString(), toPlant: true }]) } });
  await open(page, "/", "Plante la lavande");
  await page.getByRole("button", { name: "Plante la lavande, détail" }).click();
  await page.getByRole("button", { name: "Pas encore acheté ? Rappelle-moi samedi" }).click();
  await expect(page.getByText("Je te le rappelle samedi")).toBeVisible();
  await expect(checkboxOf(page, "Marquer comme fait : Plante la lavande")).toHaveCount(0);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(checkboxOf(page, "Marquer comme fait : Plante la lavande")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Saisons : l'ail des ours « à planter » n'a qu'un geste, le même qu'Aujourd'hui (ni semis ni rempotage)", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2026, 9, 6, 10) });
  await page.clock.resume();
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 0, extra: { "balco.garden.plants.v1": JSON.stringify([{ id: "ail-e2e", catalogId: "wild-garlic", addedAt: new Date(2026, 9, 6).toISOString(), toPlant: true }]) } });
  await open(page, "/", "Plante l’ail des ours");
  await page.getByRole("tab", { name: /Saisons/ }).click();
  await expect(page.getByText("Plante l’ail des ours").first()).toBeVisible();
  await expect(page.getByText("Rempote l’ail des ours")).toHaveCount(0);
  await expect(page.getByText("Sème l’ail des ours")).toHaveCount(0);
  expect(errors).toEqual([]);
});
