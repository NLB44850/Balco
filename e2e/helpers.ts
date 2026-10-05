import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Page, type Route } from "@playwright/test";

/** Outils communs aux scénarios : faux service météo, balcon prêt à l'emploi, raccourcis. */

export type Scenario = "none" | "rain" | "frost" | "storm" | "wind" | "heat";

type Weather = { temperature?: number; min?: number; max?: number; rainMm?: number; gust?: number; code?: number };

/** Une météo douce et stable par défaut : aucune alerte tant qu'on ne choisit pas de scénario. */
const MILD: Required<Weather> = { temperature: 16, min: 10, max: 19, rainMm: 0, gust: 18, code: 2 };

/**
 * Remplace la météo (route /api/weather du serveur et Open-Meteo) et le nom de ville par des réponses fixes : les tests ne dépendent ni du
 * réseau ni du temps qu'il fait vraiment.
 */
export async function mockWeather(page: Page, weather: Weather = {}) {
  const w = { ...MILD, ...weather };
  // La météo passe d'abord par le serveur Balco (/api/weather, en cache), sinon par Open-Meteo directement.
  const forecast = (route: Route) => {
    const hours = 48;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        elevation: 170,
        current: { temperature_2m: w.temperature, apparent_temperature: w.temperature - 1, weather_code: w.code, is_day: 1 },
        hourly: {
          precipitation: Array.from({ length: hours }, () => w.rainMm / 12),
          precipitation_probability: Array.from({ length: hours }, () => (w.rainMm > 0 ? 90 : 5)),
          wind_gusts_10m: Array.from({ length: hours }, () => w.gust),
        },
        daily: { precipitation_sum: [w.rainMm, 0], temperature_2m_min: [w.min, w.min], temperature_2m_max: [w.max, w.max], wind_gusts_10m_max: [w.gust, w.gust] },
      }),
    });
  };
  await page.route("https://api.open-meteo.com/**", forecast);
  await page.route("**/api/weather?**", forecast);
  await page.route("https://api.bigdatacloud.net/**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ city: "Lyon" }) }));
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ results: [{ id: 1, name: "Lyon", latitude: 45.76, longitude: 4.84, country: "France", admin1: "Auvergne-Rhône-Alpes" }] }) }),
  );
}

type Seed = {
  /** Identifiants du catalogue (« basil », « cherry-tomato »…). */
  plants: string[];
  /** Arrosage de toutes les plantes il y a N jours (absent : jamais arrosées dans l'app). */
  wateredDaysAgo?: number;
  /** Gestes déjà notés, en jours passés (pour une série, par exemple). */
  pastGestureDays?: number[];
  scenario?: Scenario;
  extra?: Record<string, string>;
};

export const DAY_MS = 86_400_000;

/**
 * Un balcon déjà créé (onboarding fait, ville choisie), posé dans le stockage du navigateur avant le
 * premier affichage. Une seule fois par test : un rechargement de page garde ce que le test a fait.
 */
export async function seedBalcony(page: Page, seed: Seed) {
  const now = Date.now();
  const plants = seed.plants.map((catalogId, index) => ({ id: `${catalogId}-e2e`, catalogId, addedAt: new Date(now - (30 - index) * DAY_MS).toISOString() }));
  const events = [
    ...(seed.wateredDaysAgo === undefined ? [] : plants.map((plant) => ({ id: `w-${plant.id}`, plantId: plant.id, type: "watering", completedAt: new Date(now - seed.wateredDaysAgo! * DAY_MS).toISOString(), source: "manual" }))),
    ...(seed.pastGestureDays ?? []).map((days) => ({ id: `past-${days}`, plantId: plants[0].id, type: "observation", completedAt: new Date(now - days * DAY_MS).toISOString(), source: "manual" })),
  ];
  const storage: Record<string, string> = {
    "balco.onboarding.preferences.v1": JSON.stringify({ firstName: "Camille", experience: "beginner", sunlight: "sunny", space: "balcony", goals: ["tomatoes"], completedAt: new Date(now - 30 * DAY_MS).toISOString() }),
    "balco.garden.plants.v1": JSON.stringify(plants),
    "balco.garden.events.v1": JSON.stringify(events),
    "balco.location.preference.v1": JSON.stringify({ mode: "manual", city: "Lyon", latitude: 45.76, longitude: 4.84 }),
    "balco.weather.simulation.v1": seed.scenario ?? "none",
    ...seed.extra,
  };
  await page.addInitScript((values) => {
    if (window.localStorage.getItem("e2e.seeded")) return;
    for (const [key, value] of Object.entries(values)) window.localStorage.setItem(key, value);
    window.localStorage.setItem("e2e.seeded", "1");
  }, storage);
  return { plants };
}

/** Ouvre une page de l'app et attend qu'elle soit affichée. */
export async function open(page: Page, url: string, ready: string | RegExp) {
  await page.goto(url);
  await expect(page.getByText(ready).first()).toBeVisible({ timeout: 20_000 });
}

/** Le rond à cocher d'une ligne de la liste (Aujourd'hui, Saisons), retrouvé par le titre de la ligne. */
export function checkboxOf(page: Page, title: string | RegExp) {
  return page.getByRole("checkbox", { name: title }).first();
}

/** La ligne qui regroupe les arrosages du jour (« Vérifie la terre de 3 plantes »), dès qu'il y en a deux. */
export function wateringGroup(page: Page) {
  return page.getByRole("button", { name: /^Vérifie la terre de \d+ plantes, détail$/ }).filter({ visible: true });
}

/** Les erreurs JavaScript de la page : un écran qui plante fait échouer le test. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Les codes de connexion écrits par le serveur pour cette adresse (sans SMTP, il les affiche dans son journal). */
export function loginCodes(email: string) {
  const log = readFileSync(path.resolve(__dirname, "../dist/e2e-server.log"), "utf8");
  return [...log.matchAll(new RegExp(`login code for ${email.replace(/[.+]/g, "\\$&")}: (\\d{6})`, "g"))].map((match) => match[1]);
}
