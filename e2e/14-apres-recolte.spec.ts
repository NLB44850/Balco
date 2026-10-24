import { expect, test } from "@playwright/test";

import { checkboxOf, mockWeather, open, openHarvests, seedBalcony, trackErrors } from "./helpers";

/** Après la récolte d'une plante récoltée en une fois : « Tout récolté ? », puis « Ton pot est libre ». */

const radish = { id: "radish-e2e", catalogId: "radish", addedAt: new Date(2027, 3, 1).toISOString() };
const sown = { id: "radish-e2e:start", plantId: "radish-e2e", type: "observation", completedAt: new Date(2027, 3, 2, 9).toISOString(), source: "manual", note: "Sème les radis" };
const watered = (at: Date) => ({ id: "w-radish", plantId: "radish-e2e", type: "watering", completedAt: at.toISOString(), source: "manual" });

test("radis : récolte cochée → « Tout récolté ? » Oui → ressemer : le semis revient sur Aujourd'hui", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 4, 10, 10) });
  await page.clock.resume();
  await mockWeather(page);
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([radish]), "balco.garden.events.v1": JSON.stringify([sown, watered(new Date(2027, 4, 10, 8))]) } });

  await open(page, "/", "Récolte les radis");
  await checkboxOf(page, "Marquer comme fait : Récolte les radis").click();
  // Le message du bas demande, avec « Oui » à la place de « Annuler ».
  await expect(page.getByText("Radis récoltés : noté · Tout récolté ?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Annuler" })).toHaveCount(0);
  await page.getByRole("button", { name: "Oui" }).click();

  await expect(page.getByRole("dialog").getByText("Ton pot est libre")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ressemer des radis" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Laisser le pot vide" })).toBeVisible();
  await page.getByRole("button", { name: "Ressemer des radis" }).click();

  // Les radis repassent « à planter » : leur premier geste, avec son pas-à-pas.
  await expect(page.getByText("« Sème les radis » t’attend sur Aujourd’hui, avec son pas-à-pas")).toBeVisible();
  await expect(page.getByText("Sème les radis").first()).toBeVisible();
  await page.getByRole("button", { name: "Sème les radis, détail" }).click();
  await expect(page.getByRole("button", { name: "Pas à pas, avec ce qu’il te faut" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("sans réponse, une semaine après la 1ʳᵉ récolte : la question remplace la ligne ; laisser le pot vide garde les récoltes", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 4, 18, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const harvested = { id: "h-radish", plantId: "radish-e2e", type: "harvest", completedAt: new Date(2027, 4, 10, 9).toISOString(), source: "manual" };
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([radish]), "balco.garden.events.v1": JSON.stringify([sown, harvested]) } });

  await open(page, "/", "Tes radis sont-ils tous récoltés ?");
  // Une seule ligne pour la plante : ni arrosage, ni récolte.
  await expect(page.getByText("Arrose les radis")).toHaveCount(0);
  await expect(page.getByText("Récolte les radis")).toHaveCount(0);
  await page.getByRole("button", { name: "Tes radis sont-ils tous récoltés ?, détail" }).click();
  await page.getByRole("button", { name: "Oui, tout est récolté" }).click();
  await expect(page.getByRole("dialog").getByText("Ton pot est libre")).toBeVisible();
  await page.getByRole("button", { name: "Laisser le pot vide" }).click();
  await expect(page.getByText("Pot libéré : tes récoltes restent dans ta progression")).toBeVisible();
  await expect(page.getByText("Tes radis sont-ils tous récoltés ?")).toHaveCount(0);

  // Moi : le badge de la première récolte reste gagné, même sans plante sur le balcon (et Premier Pot aussi :
  // ce qui est acquis reste acquis).
  await open(page, "/profile", "Mes badges éco");
  await expect(page.getByText(/^[1-9]\/8$/u)).toBeVisible();
  await expect(page.getByRole("button", { name: /Du balcon à l’assiette/u })).toContainText("Graine");
  // La récolte a aussi donné la carte des radis à l'herbier.
  await expect(page.getByText("1 plante sur 130")).toBeVisible();
  expect(errors).toEqual([]);
});

test("pot libre : « Que planter à la place ? » propose une autre famille, et la nouvelle plante garde le pot", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 4, 18, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const harvested = { id: "h-radish", plantId: "radish-e2e", type: "harvest", completedAt: new Date(2027, 4, 10, 9).toISOString(), source: "manual" };
  await seedBalcony(page, { plants: [], extra: { "balco.garden.plants.v1": JSON.stringify([{ ...radish, potSize: "small" }]), "balco.garden.events.v1": JSON.stringify([sown, harvested]) } });

  await open(page, "/", "Tes radis sont-ils tous récoltés ?");
  await page.getByRole("button", { name: "Tes radis sont-ils tous récoltés ?, détail" }).click();
  await page.getByRole("button", { name: "Oui, tout est récolté" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Que planter à la place ?")).toBeVisible();
  // Ressemer des radis reste proposé, mais pas dans la même terre (famille du chou).
  await expect(sheet.getByRole("button", { name: "Ressemer des radis" })).toBeVisible();
  await expect(sheet.getByText("Dans un autre pot, ou avec une terre neuve.")).toBeVisible();
  await expect(sheet.getByText(/^Pas de la famille du chou : mêmes maladies dans la terre\. Avant de replanter/u)).toBeVisible();
  const idea = sheet.getByRole("button", { name: /^(Semer|Planter) / }).first();
  const label = (await idea.getAttribute("aria-label")) ?? "";
  expect(label).not.toMatch(/radis|roquette|cresson|navets|pak choï|mizuna|chou/u);
  await idea.click();
  await expect(page.getByText(/à planter : le premier geste t’attend sur Aujourd’hui|notée : Balco te la proposera en/u)).toBeVisible();

  // Les radis ont quitté le balcon ; la nouvelle plante est « à planter » dans le même petit pot.
  const plants = await page.evaluate(() => JSON.parse(localStorage.getItem("balco.garden.plants.v1") ?? "[]") as { catalogId: string; potSize?: string; toPlant?: boolean; removedAt?: string }[]);
  const added = plants.filter((plant) => plant.catalogId !== "radish" && !plant.removedAt);
  expect(added).toHaveLength(1);
  expect(added[0]).toMatchObject({ potSize: "small", toPlant: true });
  expect(errors).toEqual([]);
});

test("radis cochés dans la feuille des récoltes, à l'ombre : « Oui » ouvre une seule feuille, avec des idées", async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install({ time: new Date(2027, 4, 12, 10) });
  await page.clock.resume();
  await mockWeather(page);
  const chives = { id: "chives-e2e", catalogId: "chives", addedAt: new Date(2027, 2, 1).toISOString() };
  const shade = { firstName: "Camille", experience: "beginner", sunlight: "shade", space: "terrace", goals: [], completedAt: new Date(2027, 2, 1).toISOString() };
  await seedBalcony(page, {
    plants: [],
    extra: {
      "balco.garden.plants.v1": JSON.stringify([radish, chives]),
      "balco.garden.events.v1": JSON.stringify([sown, watered(new Date(2027, 4, 12, 8)), { ...watered(new Date(2027, 4, 12, 8)), id: "w-chives", plantId: "chives-e2e" }]),
      "balco.onboarding.preferences.v1": JSON.stringify(shade),
    },
  });

  await open(page, "/", /Récolte ce qui est prêt sur 2 plantes/u);
  await openHarvests(page);
  await checkboxOf(page, "Marquer comme fait : Récolte les radis").click();
  await page.getByRole("button", { name: "Oui" }).click();
  // La feuille des récoltes se replie : une seule feuille, celle du pot libre (sur Android, les deux s’empilaient ;
  // le web n’en montre jamais qu’une).
  await expect(page.getByRole("dialog").getByText("Ton pot est libre")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog").getByText("Dans un autre pot, ou avec une terre neuve.")).toBeVisible();
  // Petit pot à l'ombre, ciboulette déjà là : elle est proposée plutôt que rien.
  await expect(page.getByRole("dialog").getByText("Que planter à la place ?")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/^Déjà sur ton balcon · /u).first()).toBeVisible();
  expect(errors).toEqual([]);
});
