/**
 * « À anticiper » (Aujourd'hui toute l'année) : le prochain geste qui demande de se préparer, 3 à 6 semaines à
 * l'avance, pour les plantes du balcon et les envies du printemps. Rien à cocher : on annonce le geste et ce
 * qu'il faut prévoir (godets, terreau, un pot plus grand). Une seule annonce, la plus proche. Logique pure.
 */
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { formatMonthRange, getCatalogPlant, MONTH_LONG, sowsIndoors, type CatalogPlant, type Month } from "../plants/catalog";
import { ofLabel, potCareFor, potSizes, type CalendarSubject } from "../plants/calendar";
import { ofBare } from "../plants/grammar";
import { plantDisplayName, potHistory, type ResolvedPlant } from "./garden-logic";
import type { MaintenanceEvent } from "../reminders/reminder-engine";

export type AnticipationKind = "sow-indoor" | "sow" | "plant" | "repot";

export type Anticipation = {
  key: string;
  kind: AnticipationKind;
  entry: CatalogPlant;
  /** La plante du balcon concernée ; absente pour une envie du printemps. */
  plantId?: string;
  /** Le mois du geste, pour le pas-à-pas (« Ce qu'il te faut »). */
  month: Month;
  /** Début du mois du geste. */
  startsOn: Date;
  /** « Dans 4 semaines », « En novembre ». */
  when: string;
  /** « Semis de tomates cerises au chaud ». */
  title: string;
  /** « Prépare des godets et du terreau. » */
  prepare: string;
  /** La période du geste, pour la feuille du bas. */
  detail: string;
};

const DAY_MS = 86_400_000;
/** On regarde de 3 à 6 semaines devant. */
export const ANTICIPATE_FROM_DAYS = 21;
export const ANTICIPATE_TO_DAYS = 42;

const KIND_ORDER: Record<AnticipationKind, number> = { "sow-indoor": 0, sow: 1, plant: 2, repot: 3 };

/** Les mois (après le mois en cours) qui chevauchent la fenêtre de 3 à 6 semaines, avec leur premier jour. */
export function anticipationMonths(now: Date): Array<{ month: Month; startsOn: Date }> {
  const from = new Date(now.getTime() + ANTICIPATE_FROM_DAYS * DAY_MS);
  const to = new Date(now.getTime() + ANTICIPATE_TO_DAYS * DAY_MS);
  const months: Array<{ month: Month; startsOn: Date }> = [];
  for (let offset = 1; offset <= 2; offset += 1) {
    const startsOn = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const endsOn = new Date(startsOn.getFullYear(), startsOn.getMonth() + 1, 1);
    if (endsOn.getTime() > from.getTime() && startsOn.getTime() <= to.getTime()) months.push({ month: (startsOn.getMonth() + 1) as Month, startsOn });
  }
  return months;
}

/** « Dans 4 semaines » quand le mois commence dans 3 semaines ou plus, sinon « En novembre ». */
export function whenText(startsOn: Date, now: Date) {
  const days = Math.round((startsOn.getTime() - now.getTime()) / DAY_MS);
  if (days >= ANTICIPATE_FROM_DAYS) return `Dans ${Math.round(days / 7)} semaines`;
  return `En ${MONTH_LONG[startsOn.getMonth()]}`;
}

type Candidate = Omit<Anticipation, "when"> & { rank: number };

/** Le premier geste d'une plante pas encore en terre (ou d'une envie) au mois `month`, s'il n'est pas déjà possible. */
function startCandidate(catalogEntry: CatalogPlant, month: Month, startsOn: Date, current: Month, climate: ClimateInfo | null | undefined, plantId: string | undefined, rank: number): Candidate | null {
  const entry = adaptToClimate(catalogEntry, climate);
  // Déjà possible ce mois-ci : c'est sur Aujourd'hui (ou la carte du printemps), pas à anticiper.
  if (entry.sowMonths.includes(current) || entry.plantMonths.includes(current)) return null;
  const sow = entry.sowMonths.includes(month);
  const plant = entry.plantMonths.includes(month);
  if (!sow && !plant) return null;
  const key = `${plantId ?? catalogEntry.id}:${month}`;
  const base = { key, entry: catalogEntry, plantId, month, startsOn, rank };
  if (plant && (!sow || entry.sowMonths.length === 0)) {
    return { ...base, kind: "plant", title: `Plantation ${ofBare(entry)}`, prepare: `Il te faudra un pot d’au moins ${entry.potLiters} L et du terreau.`, detail: `Période de plantation : ${formatMonthRange(entry.plantMonths)}.` };
  }
  if (sowsIndoors(entry, month)) {
    return { ...base, kind: "sow-indoor", title: `Semis ${ofBare(entry)} au chaud`, prepare: "Prépare des godets et du terreau à semis.", detail: `Les graines se sèment à l’intérieur, près d’une fenêtre lumineuse, puis les plants sortent au balcon${entry.plantMonths.length > 0 ? ` en ${formatMonthRange(entry.plantMonths)}` : ""}.` };
  }
  return { ...base, kind: "sow", title: `Semis ${ofBare(entry)}`, prepare: `Prépare un pot d’au moins ${entry.potLiters} L et du terreau.`, detail: `Période de semis : ${formatMonthRange(entry.sowMonths)}.` };
}

export type AnticipateInput = {
  plants: ResolvedPlant[];
  events: MaintenanceEvent[];
  springWishes?: string[];
  now: Date;
  climate?: ClimateInfo | null;
  /** « Pas besoin cette année » (rempotage) : plante → jusqu'à quand. */
  repotSkips?: Map<string, string>;
};

/** L'annonce la plus proche, ou null si rien n'est prévu dans les 6 semaines. */
export function anticipate({ plants, events, springWishes = [], now, climate, repotSkips }: AnticipateInput): Anticipation | null {
  const current = (now.getMonth() + 1) as Month;
  const owned = new Set(plants.map(({ entry }) => entry.id));
  const candidates: Candidate[] = [];
  for (const { month, startsOn } of anticipationMonths(now)) {
    for (const resolved of plants) {
      // Une plante choisie mais pas encore en terre : son semis ou sa plantation.
      if (resolved.plant.toPlant) {
        const candidate = startCandidate(resolved.entry, month, startsOn, current, climate, resolved.plant.id, 0);
        if (candidate) candidates.push(candidate);
        continue;
      }
      // Une vivace installée dont le rempotage arrive : un pot plus grand à prévoir (pas la terre du dessus, rien à acheter).
      const subject: CalendarSubject = { id: resolved.plant.id, entry: resolved.entry, displayName: plantDisplayName(resolved), addedAt: resolved.plant.addedAt, ...potHistory(resolved.plant, events), repotSkippedUntil: repotSkips?.get(resolved.plant.id) };
      if (potCareFor(subject, resolved.entry, current, now) === null && potCareFor(subject, resolved.entry, month, now) === "repot") {
        const pot = potSizes(resolved.entry, subject.repots ?? 0);
        candidates.push({ key: `${resolved.plant.id}:repot:${month}`, kind: "repot", entry: resolved.entry, plantId: resolved.plant.id, month, startsOn, rank: 2, title: `Rempotage ${ofLabel(resolved.entry.label)}`, prepare: `Prévois un pot d’environ ${pot.next} L (${pot.nextWidthCm} cm de large) et du terreau neuf.`, detail: `À faire en ${formatMonthRange(resolved.entry.repotMonths)}, si la plante manque de place.` });
      }
    }
    // Les envies du printemps pas encore sur le balcon.
    for (const id of springWishes) {
      const entry = getCatalogPlant(id);
      if (!entry || owned.has(id)) continue;
      const candidate = startCandidate(entry, month, startsOn, current, climate, undefined, 1);
      if (candidate) candidates.push(candidate);
    }
  }
  const best = candidates.sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime() || a.rank - b.rank || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.entry.name.localeCompare(b.entry.name, "fr"))[0];
  if (!best) return null;
  const { rank: _rank, ...anticipation } = best;
  return { ...anticipation, when: whenText(best.startsOn, now) };
}
