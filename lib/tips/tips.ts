/**
 * La carte « Astuce de saison » d'Aujourd'hui : une nouvelle astuce par semaine, tirée de la banque (lib/tips/bank.ts),
 * filtrée par mois, climat, plantes du balcon et météo annoncée. Une astuce liée à une plante du balcon passe avant une
 * astuce générale ; jamais deux fois la même dans l'année. Une croix la masque jusqu'à la suivante. Pas d'IA : les
 * textes sont écrits et vérifiés à l'avance. Logique pure.
 */
import type { ClimateInfo, ClimateZone } from "../plants/climate";
import type { ReminderCause } from "../reminders/reminder-engine";
import { TIP_BANK } from "./bank";

export type TipCondition = "frost" | "heat" | "wind" | "rain";

export type Tip = {
  id: string;
  text: string;
  /** Mois où elle peut sortir (repère Paris). */
  months: number[];
  /** Ne sort que si l'une de ces plantes est sur le balcon. */
  plants?: string[];
  /** Plantes citées en exemple, sans condition (une idée à semer ou planter). */
  about?: string[];
  /** Ne sort que quand cette météo est annoncée. */
  condition?: TipCondition;
  /** `only` : réservée à ces climats ; `shift` : ses mois suivent le décalage de printemps du climat. */
  climates?: { only?: ClimateZone[]; shift?: boolean };
};

/** Ce que l'app garde sur le téléphone : l'astuce de la semaine, celles déjà montrées et la croix. */
export type TipState = { week?: string; tipId?: string; shown: Record<string, string>; dismissedWeek?: string };

export const emptyTipState = (): TipState => ({ shown: {} });

/** « 2026-W45 » : la semaine ISO (du lundi au dimanche). */
export function weekKey(date: Date) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Nombre de semaines entre deux clés (approximatif, assez pour « pas deux fois dans l'année »). */
function weeksBetween(a: string, b: string) {
  const parse = (key: string) => {
    const [year, week] = key.split("-W").map(Number);
    return year * 52.18 + week;
  };
  return Math.abs(parse(b) - parse(a));
}

const SPRING_MONTHS = new Set([2, 3, 4, 5, 6]);

/** Les mois d'une astuce dans ce climat : un mois plus tôt dans le Midi, un mois plus tard en montagne, au printemps. */
export function tipMonths(tip: Tip, climate?: ClimateInfo | null) {
  const shift = tip.climates?.shift && climate ? climate.springShift : 0;
  if (!shift) return tip.months;
  return tip.months.map((month) => (SPRING_MONTHS.has(month) ? Math.min(12, Math.max(1, month + shift)) : month));
}

export type TipInput = {
  now: Date;
  climate?: ClimateInfo | null;
  /** Ids catalogue des plantes du balcon. */
  owned: string[];
  /** Les causes météo annoncées en ce moment. */
  weather?: ReminderCause[];
  state: TipState;
  bank?: Tip[];
};

/** Les astuces possibles cette semaine, les plus pertinentes d'abord. */
export function eligibleTips({ now, climate, owned, weather = [], state, bank = TIP_BANK }: TipInput): Tip[] {
  const month = now.getMonth() + 1;
  const week = weekKey(now);
  const ownedSet = new Set(owned);
  return bank
    .filter((tip) => tipMonths(tip, climate).includes(month))
    .filter((tip) => !tip.climates?.only || (climate ? tip.climates.only.includes(climate.zone) : tip.climates.only.includes("temperate")))
    .filter((tip) => !tip.plants || tip.plants.some((id) => ownedSet.has(id)))
    .filter((tip) => !tip.condition || weather.includes(tip.condition))
    // Pas deux fois la même dans l'année (sauf celle de cette semaine).
    .filter((tip) => !state.shown[tip.id] || state.shown[tip.id] === week || weeksBetween(state.shown[tip.id], week) >= 50)
    .sort((a, b) => rank(b, ownedSet) - rank(a, ownedSet) || a.id.localeCompare(b.id));
}

/** Une astuce liée à une plante du balcon passe avant ; une astuce de météo annoncée aussi, elle ne vaut que maintenant. */
function rank(tip: Tip, owned: Set<string>) {
  return (tip.plants?.some((id) => owned.has(id)) ? 2 : 0) + (tip.condition ? 1 : 0);
}

/**
 * L'astuce de la semaine : celle déjà choisie cette semaine, sinon la plus pertinente parmi les possibles (tirée au
 * hasard de la semaine entre celles de même pertinence). Renvoie aussi l'état à garder. null : rien à montrer.
 */
export function tipOfTheWeek(input: TipInput): { tip: Tip | null; state: TipState } {
  const bank = input.bank ?? TIP_BANK;
  const week = weekKey(input.now);
  const { state } = input;
  if (state.week === week && state.tipId) {
    const kept = bank.find((tip) => tip.id === state.tipId) ?? null;
    if (kept) return { tip: kept, state };
  }
  const candidates = eligibleTips(input);
  if (candidates.length === 0) return { tip: null, state };
  const owned = new Set(input.owned);
  const best = rank(candidates[0], owned);
  const top = candidates.filter((tip) => rank(tip, owned) === best);
  const tip = top[hash(week) % top.length];
  return { tip, state: { ...state, week, tipId: tip.id, shown: { ...state.shown, [tip.id]: week } } };
}

/** Masquée d'une croix : elle revient… avec la suivante, la semaine d'après. */
export function tipHidden(state: TipState, now: Date) {
  return state.dismissedWeek === weekKey(now);
}

/** La question pour Nora, pré-remplie. */
export function tipQuestion(tip: Tip) {
  return `Peux-tu m’en dire plus sur cette astuce pour mon balcon : « ${tip.text} »`;
}

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619) >>> 0;
  return value;
}
