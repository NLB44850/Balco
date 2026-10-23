import { expect, test } from "@playwright/test";

import { atDate, checkboxOf, DAY_MS, denyGeolocation, mockWeather, open, openHarvests, openPlantings, seedBalcony, trackErrors, wateringGroup } from "./helpers";

/** Le parcours de tous les jours : arriver, créer son balcon, cocher, annuler, ajouter une plante. */

test("onboarding « Pas encore » : soleil, espace, envies, puis des plantes de saison à planter", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await open(page, "/", "Ton balcon, au bon moment.");
  await page.getByText("C’est parti").click();
  await expect(page.getByLabel("Étape 1 sur 6")).toBeVisible();
  await page.getByText("Pas encore").click();
  // Le simulateur de soleil : l'orientation, puis l'ombre ; les heures se recalculent à chaque case.
  await page.getByText("Plein sud").click();
  await expect(page.getByText("Ton balcon a-t-il de l’ombre ?")).toBeVisible();
  await expect(page.getByText(/de soleil par jour, d’avril à septembre : plein soleil\./)).toBeVisible();
  await page.getByText("Il est couvert").click();
  await page.getByText("Un immeuble ou un arbre en face").click();
  await expect(page.getByText(/de soleil par jour, d’avril à septembre : mi-ombre\./)).toBeVisible();
  await page.getByText("Il est couvert").click();
  await page.getByText("Un immeuble ou un arbre en face").click();
  await expect(page.getByText(/: plein soleil\./)).toBeVisible();
  await page.getByText("Continuer", { exact: true }).click();
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
  // Le diagnostic de son balcon pour finir (étape 3b), puis Aujourd'hui.
  await expect(page.getByText("Ton balcon", { exact: true })).toBeVisible();
  await expect(page.getByText("de soleil par jour, d’avril à septembre")).toBeVisible();
  await expect(page.getByText("Chaud l’été")).toBeVisible();
  await expect(page.getByText("Ce qui y poussera bien")).toBeVisible();
  await page.getByRole("button", { name: "Voir mon balcon" }).click();
  await expect(page.getByText("Aujourd’hui").first()).toBeVisible();
  await expect(page.getByText("Météo de Paris par défaut")).toHaveCount(0);
  // Choisies, pas encore en terre : leur premier geste est de les semer ou planter, regroupés en une ligne.
  await expect(page.getByRole("button", { name: /^(Sème|Plante|Plante ou sème) \d+ plantes de saison, détail$/u })).toBeVisible();
  await expect(page.getByText(/Vérifie la terre/)).toHaveCount(0);
  // Première tâche liée au pot (étape 3c) : le pot et le terreau de chaque plante à planter.
  await page.getByRole("button", { name: /^Prépare le pot (de \d+ plantes|: )/u }).click();
  await expect(page.getByText(/Un pot percé d’au moins \d+ cm de large, du terreau/u).first()).toBeVisible();
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
  // Carte d'arrivée, jusqu'au premier geste coché.
  await expect(page.getByText("Bienvenue, voici ton balcon 🌱")).toBeVisible();
  await openPlantings(page);
  await page.getByRole("checkbox", { name: /^Marquer comme fait : (Sème|Plante) / }).first().click();
  await expect(page.getByText(/1 sur \d+ faites/u).first()).toBeVisible();
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
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
  await page.getByRole("button", { name: "Voir mon balcon" }).click();
  await expect(page.getByText("Aujourd’hui").first()).toBeVisible();
  await expect(page.getByText("Tes plantes", { exact: true })).toBeVisible();
  await expect(page.getByText("Météo de Paris par défaut")).toBeVisible();
  // Déjà en terre : pas de « Plante le basilic », l'arrosage est proposé.
  await expect(page.getByRole("checkbox", { name: /Plante le basilic|Plante le romarin/ })).toHaveCount(0);
  await expect(page.getByText(/Vérifie la terre de 2 plantes|Arrose/).first()).toBeVisible();
  // « Vérifie tes pots » (étape 3c) : le pot noté d'office, qu'on change depuis la fiche, puis « C'est bon ».
  // Une seule ligne, quel que soit le nombre de plantes ; le détail dans la feuille du bas.
  await page.getByRole("button", { name: /^Vérifie le pot de 2 plantes, / }).click();
  await page.getByRole("button", { name: /^Basilic : / }).click();
  await expect(page.getByText("Dans quel pot ?")).toBeVisible();
  await page.getByText("Grand (31 à 40 cm)").click();
  await expect(page.getByText("Dans quel pot ?")).toHaveCount(0);
  await page.goBack();
  await page.getByRole("button", { name: /^Vérifie le pot de 2 plantes, / }).click();
  await expect(page.getByRole("button", { name: "Basilic : Grand (31 à 40 cm)" })).toBeVisible();
  await page.getByRole("button", { name: "C’est bon" }).click();
  await expect(page.getByRole("button", { name: /^Vérifie le pot de 2 plantes, / })).toHaveCount(0);
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
  await page.getByText("Au nord").click();
  await expect(page.getByText(/: ombre\./)).toBeVisible();
  await page.getByText("Continuer", { exact: true }).click();
  await page.getByText("Un rebord de fenêtre", { exact: true }).click();
  await page.getByRole("button", { name: "Plus tard" }).click();
  await page.getByRole("button", { name: "Voir mon balcon" }).click();
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
  // En pots moyens notés (sans taille, ils compteraient en petit pot, plus assoiffés).
  const added = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const pots = [{ id: "thyme-e2e", catalogId: "thyme", addedAt: added, potSize: "medium" }, { id: "chives-e2e", catalogId: "chives", addedAt: added, potSize: "medium" }];
  await seedBalcony(page, { plants: ["thyme", "chives"], waterings: { thyme: [2, 8], chives: [3] }, extra: { "balco.garden.plants.v1": JSON.stringify(pots) } });
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

test("catalogue : ajouter une plante d'un « + » puis ouvrir sa fiche", async ({ page }) => {
  const errors = trackErrors(page);
  // En octobre : la menthe et la lavande se plantent, l'aubergine finit sa saison.
  const now = await atDate(page, new Date(2027, 9, 14, 10));
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1, now });
  await open(page, "/garden/add", "Ajouter une plante");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("menthe");
  // « + » : une question, deux cartes qui disent ce qui va se passer ; c'est le moment de la planter.
  await page.getByRole("button", { name: /^Ajouter Menthe/ }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Où en est ta menthe ?")).toBeVisible();
  await expect(sheet.getByText("C’est le moment")).toBeVisible();
  await sheet.getByRole("button", { name: "Menthe : Déjà sur mon balcon" }).click();
  // Balco lui donne la taille de pot de sa fiche et le dit dans le message du bas (pas de question).
  await expect(page.getByText("Ajouté : menthe · pot conseillé : moyen (21 à 30 cm)")).toBeVisible();
  await expect(page.getByText("Dans quel pot ?")).toHaveCount(0);
  await expect(page.getByText("✓ Sur ton balcon")).toBeVisible();
  // La lavande, pas encore plantée.
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("lavande");
  await page.getByRole("button", { name: /^Ajouter Lavande/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Lavande : Pas encore plantée" }).click();
  await expect(page.getByText("À planter : lavande · pot conseillé : moyen (21 à 30 cm)")).toBeVisible();
  // L'aubergine en octobre : les cartes préviennent avant de choisir ; « Pas encore plantée » la garde pour le printemps.
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("aubergine");
  await page.getByRole("button", { name: /^Ajouter Aubergine/ }).first().click();
  await expect(page.getByRole("dialog").getByText("Fin de saison : récolte avant les premières gelées.")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("À semer au chaud dès février : Balco te la reproposera au printemps.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Aubergine : Pas encore plantée" }).click();
  await expect(page.getByText("Aubergine : à semer au chaud dès février. Balco te la reproposera au printemps")).toBeVisible();
  await expect(page.getByText("✓ Sur ton balcon")).toHaveCount(0);
  const wish = () => page.evaluate(() => (JSON.parse(localStorage.getItem("balco.onboarding.preferences.v1") ?? "{}") as { springWishes?: string[] }).springWishes ?? []);
  await expect.poll(wish).toContain("eggplant");
  // « Annuler » retire l'envie.
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect.poll(wish).not.toContain("eggplant");
  await page.getByRole("button", { name: "Voir mon balcon · 3 plantes" }).click();
  await page.getByRole("button", { name: /^Menthe, .*voir la fiche/ }).click();
  await expect(page.getByText(/Photo d’exemple|Ajouter une photo/).first()).toBeVisible();
  // Sa fiche « Spécial pot » compare son pot à celui qu'il lui faut, en centimètres (menthe : 30 cm de large).
  await expect(page.getByText("Spécial pot")).toBeVisible();
  // La taille n'est pas notée d'office : « Quel est ton pot ? » et la pastille « Pot conseillé : … ».
  await expect(page.getByText("Quel est ton pot ?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pot conseillé : moyen (21 à 30 cm), choisir la taille du pot" })).toBeVisible();
  await expect(page.getByText("Il lui faut un pot de 30 cm de large, 20 cm de profondeur.")).toBeVisible();
  await expect(page.getByText("Terreau universel")).toBeVisible();
  // Trop petit : un titre orange et ce qu'il faut prendre. La feuille marque la taille conseillée.
  await page.getByRole("button", { name: "Ton pot : Je ne sais pas" }).click();
  await expect(page.getByRole("radio", { name: "Je ne sais pas" })).toBeChecked();
  await expect(page.getByText("✓ Conseillé")).toBeVisible();
  await page.getByRole("radio", { name: "Petit (jusqu’à 20 cm)" }).click();
  // Dans « Spécial pot », et en orange dans l'état de la plante (retour du 14/10 : un vrai souci).
  await expect(page.getByText(/^(⚠︎ )?Pot trop petit$/u)).toHaveCount(2);
  await expect(page.getByText("Il lui faut un pot de 30 cm de large, 20 cm de profondeur. Prends un pot moyen.")).toBeVisible();
  // Jardinière : combien de pieds y tiennent.
  await page.getByRole("button", { name: "Ton pot : Petit (jusqu’à 20 cm)" }).click();
  await page.getByRole("radio", { name: "Jardinière (60 cm, peu profonde)" }).click();
  await expect(page.getByText("Ta jardinière lui convient", { exact: false })).toBeVisible();
  await expect(page.getByText("Place pour un seul pied dans 60 cm.")).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("balco.garden.plants.v1") ?? "[]"));
  const kept = (catalogId: string) => stored.find((plant: { catalogId: string; removedAt?: string }) => plant.catalogId === catalogId && !plant.removedAt);
  expect(kept("mint")).toMatchObject({ potSize: "planter" });
  expect(kept("mint")?.toPlant).toBeFalsy();
  // Pas de taille notée d'office : seulement celle qu'on choisit (retour du 14/10).
  expect(kept("lavender")).toMatchObject({ toPlant: true });
  expect(kept("lavender")?.potSize).toBeUndefined();
  expect(errors).toEqual([]);
});

test("catalogue : la fiche d'une nouvelle plante et ses variétés", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["basil"], wateredDaysAgo: 1 });
  await open(page, "/garden/add", "127 plantes pour le balcon");
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
  await open(page, "/garden/add", "127 plantes pour le balcon");
  await page.getByPlaceholder("Basilic, fraisier, lavande…").fill("piment");
  const openSheet = () => page.getByRole("button", { name: /^Piment, voir le détail/ }).click();

  // Fiche longue sur un petit écran : le bouton du bas reste atteignable (le contenu défile).
  await openSheet();
  const close = page.getByRole("button", { name: "Fermer la fiche" });
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  await page.getByRole("button", { name: "Piment : Pas encore planté" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Piment : Pas encore planté" })).toBeInViewport();

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
  await expect(page.getByText(/^Ajouté : /)).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();

  await open(page, "/calendar", /^À semer ou planter en /);
  await page.getByRole("button", { name: /, voir le détail$/ }).first().click();
  await expect(page.getByRole("button", { name: "+ Ajouter à mon balcon" })).toBeVisible();
  await page.getByRole("button", { name: "+ Ajouter à mon balcon" }).click();
  await expect(page.getByText(/^Ajouté : /)).toBeVisible();

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

test("« Pas encore acheté : me le rappeler samedi » : le geste disparaît, « Annuler » le remet", async ({ page }) => {
  const errors = trackErrors(page);
  await mockWeather(page);
  await seedBalcony(page, { plants: ["mint"], wateredDaysAgo: 0, extra: { "balco.garden.plants.v1": JSON.stringify([{ id: "lavender-e2e", catalogId: "lavender", addedAt: new Date().toISOString(), toPlant: true }]) } });
  await open(page, "/", "Plante la lavande");
  await page.getByRole("button", { name: "Plante la lavande, détail" }).click();
  await page.getByRole("button", { name: "Pas encore acheté : me le rappeler samedi" }).click();
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
