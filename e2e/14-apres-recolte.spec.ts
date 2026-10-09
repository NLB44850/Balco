import { expect, test } from "@playwright/test";

import { checkboxOf, mockWeather, open, seedBalcony, trackErrors } from "./helpers";

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
  await expect(page.getByText("1 plante sur 101")).toBeVisible();
  expect(errors).toEqual([]);
});
