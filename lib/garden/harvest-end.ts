/**
 * Après la récolte d'une plante qui se récolte en une fois (radis, carottes, ail… : `harvestOnceDays` du
 * catalogue). Trois moments :
 * 1. On coche sa récolte : le message du bas demande « Tout récolté ? » avec « Oui » (l'ignorer ne change rien).
 * 2. Sans réponse, à la fin de sa durée de récolte (comptée depuis la première récolte notée) ou à la fin de ses
 *    mois de récolte, au premier des deux, sa ligne d'Aujourd'hui devient une seule fois « Tes radis sont-ils
 *    tous récoltés ? ».
 * 3. Après « Oui » : « Ton pot est libre », trois choix au plus (ressemer, une plante de saison qui tient dans ce
 *    pot, laisser le pot vide ou au repos).
 * La réponse et le jour de la question sont gardés avec les autres mises en sommeil du téléphone
 * (`ReminderSnooze`), comme « Pas besoin cette année ». Logique pure.
 */
import { MONTH_LONG, type CatalogPlant, type Month, type OnboardingAnswers } from "../plants/catalog";
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { agree, bareName, byForm, capitalize, ofBare, partitive, possessive } from "../plants/grammar";
import { guideModelFor, isSowing } from "../plants/guide";
import { DEFAULT_HARVEST_DAYS } from "../plants/harvest-once";
import { endsWithSeason, freesItsPot, isHarvestedOnce } from "../plants/season-end";
import { seasonalSuggestions } from "../plants/suggestions";
import type { ReminderSnooze } from "../reminders/reminder-actions";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { dayKey, inGroundSince, startEventId, type ResolvedPlant } from "./garden-logic";

const DAY_MS = 86_400_000;
/** La réponse et la question restent en mémoire un an : bien plus qu'une saison de récolte. */
const KEEP_DAYS = 400;

export { endsWithSeason, freesItsPot, isHarvestedOnce, seasonFrostText } from "../plants/season-end";

// --- Les phrases ---------------------------------------------------------------------------------------

/** « Radis récoltés : noté · Tout récolté ? », « Ail récolté : noté · Tout récolté ? » */
export function harvestedToastText(entry: CatalogPlant) {
  return `${bareName(entry)} ${agree(entry, "récolté")} : noté · Tout récolté ?`;
}

/** « Tes radis sont-ils tous récoltés ? », « Ton ail est-il tout récolté ? », « Tes carottes sont-elles toutes récoltées ? » */
export function harvestQuestion(entry: CatalogPlant) {
  const verb = byForm(entry, "est-il tout récolté", "est-elle toute récoltée", "sont-ils tous récoltés", "sont-elles toutes récoltées");
  return `${capitalize(possessive(entry))} ${verb} ?`;
}

/** Sous la question : ce qui se passe si on répond oui. */
export const HARVEST_QUESTION_DETAIL = "Si oui, Balco te propose quoi mettre dans le pot. Sinon, rien ne change.";

/** « Ta saison de basilic est finie ? », « Ta saison de tomates cerises est finie ? » : la même phrase pour toutes. */
export const seasonQuestion = (entry: Pick<CatalogPlant, "label">) => `Ta saison ${ofBare(entry)} est finie ?`;

/** Sous la question de fin de saison : la relance, une seule fois, deux semaines plus tard. */
export const seasonQuestionDetail = (again: boolean) =>
  again ? "Si oui, Balco te propose quoi mettre dans le pot. Sinon, Balco ne te le redemandera plus." : "Si oui, Balco te propose quoi mettre dans le pot. Pas encore ? Balco te le redemandera dans deux semaines.";

/** Le conseil de la feuille « Ton pot est libre » en fin de saison. */
export const SEASON_END_TIP = "Coupe les tiges au ras de la terre et laisse les racines : elles nourrissent le pot.";

/** « Radis récoltés », « Saison de basilic finie » : ce qui libère le pot. */
export const potFreedBy = (entry: CatalogPlant) => (isHarvestedOnce(entry) ? `${bareName(entry)} ${agree(entry, "récolté")}` : `Saison ${ofBare(entry)} finie`);

/** La ligne d'Aujourd'hui d'une plante dont le pot attend un choix. */
export const FREE_POT_TITLE = "Ton pot est libre";
export const freePotSubtitle = (entry: CatalogPlant) => `${potFreedBy(entry)} · que veux-tu y mettre ?`;

// --- La mémoire du téléphone ---------------------------------------------------------------------------

const ASKED = "harvest-asked:";
const SEASON_ASKED = "season-asked:";
const SEASON_FROST = "season-frost:";
const DONE = "harvest-done:";
const keep = (now: Date) => new Date(now.getTime() + KEEP_DAYS * DAY_MS).toISOString();

/** `answeredOn` : le jour du « Oui » (absent pour une réponse notée avant qu'on garde le jour). */
/** `harvest-done:<plante>:<jour>` (ou l'ancienne forme, sans le jour). */
const isDoneKey = (key: string, plantId: string) => key === `${DONE}${plantId}` || key.startsWith(`${DONE}${plantId}:`);

/**
 * `askedOn` : jour de la question « Tout récolté ? » ; `seasonAsked` : jours de « Ta saison … est finie ? » (la
 * question et sa relance) ; `frostOn` : soir de gel annoncé qui finit la saison d'une frileuse.
 */
export type HarvestEndState = { askedOn?: string; answered: boolean; answeredOn?: string; seasonAsked?: string[]; frostOn?: string };

/** `<prefixe><plante>:<jour>` → [plante, jour]. */
const keyParts = (key: string, prefix: string) => [key.slice(prefix.length, key.lastIndexOf(":")), key.slice(key.lastIndexOf(":") + 1)] as const;

/** Plante → jour où la question a été posée, et « Oui » répondu. */
export function harvestEndStates(snoozes: ReminderSnooze[], now: Date) {
  const states = new Map<string, HarvestEndState>();
  for (const snooze of snoozes) {
    if (new Date(snooze.until).getTime() <= now.getTime()) continue;
    if (snooze.key.startsWith(DONE)) {
      const rest = snooze.key.slice(DONE.length);
      const split = rest.lastIndexOf(":");
      const plantId = split > 0 ? rest.slice(0, split) : rest;
      states.set(plantId, { ...states.get(plantId), answered: true, answeredOn: split > 0 ? rest.slice(split + 1) : undefined });
    } else if (snooze.key.startsWith(SEASON_ASKED)) {
      const [plantId, day] = keyParts(snooze.key, SEASON_ASKED);
      const state = states.get(plantId);
      states.set(plantId, { ...state, answered: state?.answered ?? false, seasonAsked: [...(state?.seasonAsked ?? []), day].sort() });
    } else if (snooze.key.startsWith(SEASON_FROST)) {
      const [plantId, day] = keyParts(snooze.key, SEASON_FROST);
      const state = states.get(plantId);
      // Le premier soir de gel compte : c'est lui qui a fini la saison.
      states.set(plantId, { ...state, answered: state?.answered ?? false, frostOn: state?.frostOn && state.frostOn < day ? state.frostOn : day });
    } else if (snooze.key.startsWith(ASKED)) {
      const [plantId, day] = [snooze.key.slice(ASKED.length, snooze.key.lastIndexOf(":")), snooze.key.slice(snooze.key.lastIndexOf(":") + 1)];
      states.set(plantId, { ...states.get(plantId), answered: states.get(plantId)?.answered ?? false, askedOn: day });
    }
  }
  return states;
}

/** La question est posée aujourd'hui : elle ne reviendra pas les jours suivants. */
export function markHarvestAsked(snoozes: ReminderSnooze[], plantId: string, now: Date): ReminderSnooze[] {
  if (snoozes.some((snooze) => snooze.key.startsWith(`${ASKED}${plantId}:`))) return snoozes;
  return [...snoozes, { key: `${ASKED}${plantId}:${dayKey(now)}`, kind: "skip", until: keep(now) }];
}

/** « Ta saison … est finie ? » posée aujourd'hui (la première fois, ou sa relance). */
export function markSeasonAsked(snoozes: ReminderSnooze[], plantId: string, now: Date): ReminderSnooze[] {
  const key = `${SEASON_ASKED}${plantId}:${dayKey(now)}`;
  return snoozes.some((snooze) => snooze.key === key) ? snoozes : [...snoozes, { key, kind: "skip", until: keep(now) }];
}

/** Un soir de gel annoncé sous le seuil d'une annuelle frileuse : sa saison finit cette nuit. */
export function markSeasonFrost(snoozes: ReminderSnooze[], plantId: string, now: Date): ReminderSnooze[] {
  if (snoozes.some((snooze) => snooze.key.startsWith(`${SEASON_FROST}${plantId}:`))) return snoozes;
  return [...snoozes, { key: `${SEASON_FROST}${plantId}:${dayKey(now)}`, kind: "skip", until: keep(now) }];
}

/** « Oui, tout est récolté. » */
export function answerAllHarvested(snoozes: ReminderSnooze[], plantId: string, now: Date): ReminderSnooze[] {
  return [...snoozes.filter((snooze) => !isDoneKey(snooze.key, plantId)), { key: `${DONE}${plantId}:${dayKey(now)}`, kind: "skip", until: keep(now) }];
}

/** Ressemée : une nouvelle saison commence, la question pourra revenir. */
export function clearHarvestEnd(snoozes: ReminderSnooze[], plantId: string): ReminderSnooze[] {
  return snoozes.filter((snooze) => !isDoneKey(snooze.key, plantId) && ![ASKED, SEASON_ASKED, SEASON_FROST].some((prefix) => snooze.key.startsWith(`${prefix}${plantId}:`)));
}

// --- Quand poser la question ---------------------------------------------------------------------------

/** La fin (le 1ᵉʳ du mois suivant) de la période de récolte en cours à cette date, ou de la prochaine. */
export function harvestRunEnd(harvestMonths: number[], from: Date): Date | null {
  if (harvestMonths.length === 0 || harvestMonths.length === 12) return null;
  for (let offset = 0; offset < 24; offset += 1) {
    const date = new Date(from.getFullYear(), from.getMonth() + offset, 1);
    const month = date.getMonth() + 1;
    const next = (month % 12) + 1;
    if (harvestMonths.includes(month) && !harvestMonths.includes(next)) return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
  return null;
}

/** Les récoltes de la saison en cours : depuis qu'elle est en terre (sa dernière plantation notée). */
export function seasonHarvests(resolved: ResolvedPlant, events: MaintenanceEvent[]) {
  const since = inGroundSince(resolved.plant, events) ?? Number.POSITIVE_INFINITY;
  return events.filter((event) => event.plantId === resolved.plant.id && event.type === "harvest" && new Date(event.completedAt).getTime() >= since);
}

/** Le jour où la question devient due : fin de sa durée de récolte ou de ses mois de récolte, au premier des deux. */
export function harvestQuestionDate(resolved: ResolvedPlant, events: MaintenanceEvent[], climate?: ClimateInfo | null): Date | null {
  const { entry, plant } = resolved;
  if (!isHarvestedOnce(entry) || plant.toPlant) return null;
  const months = adaptToClimate(entry, climate).harvestMonths;
  const harvests = seasonHarvests(resolved, events).map((event) => new Date(event.completedAt).getTime());
  if (harvests.length === 0) {
    const since = inGroundSince(plant, events);
    return since === null ? null : harvestRunEnd(months, new Date(since));
  }
  const first = new Date(Math.min(...harvests));
  const window = new Date(first.getTime() + (entry.harvestOnceDays ?? DEFAULT_HARVEST_DAYS) * DAY_MS);
  const runEnd = harvestRunEnd(months, first);
  return runEnd && runEnd < window ? runEnd : window;
}

/** La question remplace aujourd'hui la ligne de la plante : jamais répondue, et pas déjà posée un autre jour. */
export function harvestQuestionDue(resolved: ResolvedPlant, events: MaintenanceEvent[], now: Date, state: HarvestEndState | undefined, climate?: ClimateInfo | null) {
  if (state?.answered) return false;
  if (state?.askedOn && state.askedOn !== dayKey(now)) return false;
  const date = harvestQuestionDate(resolved, events, climate);
  return date !== null && now.getTime() >= date.getTime();
}

/** La relance de « Ta saison … est finie ? » : une seule, deux semaines après la première question. */
const SEASON_RETRY_DAYS = 14;

/** Le jour où « Ta saison … est finie ? » devient due : le lendemain du soir de gel, sinon la fin de ses mois de récolte ou de floraison. */
export function seasonQuestionDate(resolved: ResolvedPlant, events: MaintenanceEvent[], state: HarvestEndState | undefined, climate?: ClimateInfo | null): Date | null {
  const { entry, plant } = resolved;
  if (!endsWithSeason(entry) || plant.toPlant) return null;
  const since = inGroundSince(plant, events);
  if (since === null) return null;
  const runEnd = harvestRunEnd(adaptToClimate(entry, climate).harvestMonths, new Date(since));
  if (state?.frostOn) {
    const [year, month, day] = state.frostOn.split("-").map(Number);
    const morningAfter = new Date(year, month - 1, day + 1);
    // Un gel noté avant la plantation de cette saison ne compte pas.
    if (morningAfter.getTime() > since) return runEnd && runEnd < morningAfter ? runEnd : morningAfter;
  }
  return runEnd;
}

/** Due aujourd'hui : jamais répondue, puis une seule relance deux semaines après la première question. */
export function seasonQuestionDue(resolved: ResolvedPlant, events: MaintenanceEvent[], now: Date, state: HarvestEndState | undefined, climate?: ClimateInfo | null) {
  if (state?.answered) return false;
  const date = seasonQuestionDate(resolved, events, state, climate);
  if (date === null || now.getTime() < date.getTime()) return false;
  const asked = state?.seasonAsked ?? [];
  const today = dayKey(now);
  if (asked.length === 0 || asked.includes(today)) return true;
  if (asked.length >= 2) return false;
  const [year, month, day] = asked[0].split("-").map(Number);
  return now.getTime() >= new Date(year, month - 1, day + SEASON_RETRY_DAYS).getTime();
}

/** La question d'aujourd'hui est-elle la relance ? */
export const isSeasonRetry = (state: HarvestEndState | undefined, now: Date) => (state?.seasonAsked ?? []).some((day) => day !== dayKey(now));

/** Après « Oui », tant qu'aucun choix n'est fait : le pot est libre (plus d'arrosage ni de récolte). */
/**
 * Feuille fermée sans choisir : la ligne « Ton pot est libre » reste le jour du « Oui » dans la liste, puis passe
 * dans les gestes pas urgents repliés jusqu'au choix.
 */
export const freePotIsQuiet = (state: HarvestEndState | undefined, now: Date) => state?.answeredOn !== dayKey(now);

export const potIsFree = (resolved: ResolvedPlant, state: HarvestEndState | undefined) => freesItsPot(resolved.entry) && !resolved.plant.toPlant && state?.answered === true;

// --- « Ton pot est libre » -----------------------------------------------------------------------------

export type FreePotChoice =
  | { kind: "restart"; key: string; label: string; detail: string }
  | { kind: "plant"; key: string; label: string; detail: string; entry: CatalogPlant }
  | { kind: "empty"; key: string; label: string; detail: string };

/** Octobre à février : le pot passe l'hiver au repos. */
const RESTING_MONTHS = [10, 11, 12, 1, 2];

/** « Ressemer des radis », « Replanter de l’ail » : selon la manière de la démarrer ce mois-ci (semis, plant, bulbe). */
export function restartLabel(entry: CatalogPlant, month: number, climate?: ClimateInfo | null) {
  return `${isSowing(guideModelFor(entry, month, climate)) ? "Ressemer" : "Replanter"} ${partitive(entry)}`;
}

/** « Semer la mâche », « Planter le thym » : comme les gestes du calendrier. */
function startLabel(entry: CatalogPlant, month: number, climate?: ClimateInfo | null) {
  return `${isSowing(guideModelFor(entry, month, climate)) ? "Semer" : "Planter"} ${entry.label}`;
}

/** Encore dans ses mois de semis ou de plantation (selon le climat de la ville) ? */
export function canRestart(entry: CatalogPlant, month: number, climate?: ClimateInfo | null) {
  const adapted = adaptToClimate(entry, climate);
  return adapted.sowMonths.includes(month as Month) || adapted.plantMonths.includes(month as Month);
}

export type FreePotOptions = { month: number; climate?: ClimateInfo | null; ownedCatalogIds?: string[]; seed?: string };

/**
 * Trois choix au plus : ressemer (seulement dans ses mois de semis ou de plantation), une ou deux plantes de
 * saison adaptées au balcon (soleil, espace, envies) et qui tiennent dans ce pot, puis laisser le pot vide
 * (au repos jusqu'au printemps d'octobre à février).
 */
export function freePotChoices(resolved: ResolvedPlant, answers: OnboardingAnswers | null, { month, climate, ownedCatalogIds = [], seed }: FreePotOptions): FreePotChoice[] {
  const { entry } = resolved;
  const choices: FreePotChoice[] = [];
  if (canRestart(entry, month, climate)) {
    choices.push({ kind: "restart", key: "restart", label: restartLabel(entry, month, climate), detail: "Dans le même pot, avec son pas-à-pas." });
  }
  const room = entry.potLiters;
  const plants = seasonalSuggestions(answers, { month, climate, ownedCatalogIds: [...ownedCatalogIds, entry.id], limit: 40, seed })
    .filter((suggestion) => suggestion.entry.potLiters <= room && suggestion.entry.id !== entry.id)
    .slice(0, choices.length > 0 ? 1 : 2);
  for (const suggestion of plants) {
    choices.push({ kind: "plant", key: `plant:${suggestion.entry.id}`, label: startLabel(suggestion.entry, month, climate), detail: suggestion.reason, entry: suggestion.entry });
  }
  const resting = RESTING_MONTHS.includes(month);
  choices.push({
    kind: "empty",
    key: "empty",
    label: resting ? "Laisser le pot au repos jusqu’au printemps" : "Laisser le pot vide",
    detail: resting ? `Balco te proposera quoi y semer en ${MONTH_LONG[2]}.` : "Tes récoltes restent dans ta progression.",
  });
  return choices;
}

// --- Ressemer : une nouvelle saison pour la même plante ------------------------------------------------

/** Les gestes qui ne se font qu'une fois par saison : le premier, puis éclaircir, sortir les plants, pincer. */
const SEASON_GESTURES = ["start", "thin", "outdoors", "pinch"];

/**
 * Ressemer la même plante : ses gestes « une fois par saison » sont rangés sous la date où ils ont été faits
 * (`<id>:start` → `<id>:start:2026-04-02`) pour que la nouvelle saison les redemande. Rien n'est perdu :
 * ils restent dans l'historique et la progression.
 */
export function archiveSeason(events: MaintenanceEvent[], plantId: string): { remove: string[]; add: MaintenanceEvent[] } {
  const ids = new Set(SEASON_GESTURES.map((kind) => (kind === "start" ? startEventId(plantId) : `${plantId}:${kind}`)));
  const done = events.filter((event) => ids.has(event.id));
  return { remove: done.map((event) => event.id), add: done.map((event) => ({ ...event, id: `${event.id}:${dayKey(new Date(event.completedAt))}` })) };
}
