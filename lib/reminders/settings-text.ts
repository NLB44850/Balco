/**
 * Réglages → Rappels : les valeurs courtes des lignes (« 18 h 30 », « 21 h → 8 h », « 4 sur 5 », « Du 7 au
 * 13 oct. ») et la règle « l'heure du conseil ne tombe jamais dans la plage calme ». Logique pure.
 */
import type { Vacation } from "../garden/vacation";
import { isQuietHour } from "./reminder-actions";

type Timing = { preferredHour: number; preferredMinute: number; quietStartHour: number; quietEndHour: number };

/** Les heures du conseil du jour, toutes à la demie. */
export const REMINDER_HOURS = [8, 17, 18, 19];
export const QUIET_START_HOURS = [20, 21, 22];
export const QUIET_END_HOURS = [7, 8, 9];

export const hourText = (hour: number, minute = 0) => (minute > 0 ? `${hour} h ${String(minute).padStart(2, "0")}` : `${hour} h`);

/** « Le matin · 8 h 30 » dans la feuille, « 8 h 30 » au bout de la ligne. */
export function reminderHourChoice(hour: number, minute = 30) {
  return hour < 12 ? `Le matin · ${hourText(hour, minute)}` : hourText(hour, minute);
}

export const quietText = (settings: Pick<Timing, "quietStartHour" | "quietEndHour">) => `${hourText(settings.quietStartHour)} → ${hourText(settings.quietEndHour)}`;

/**
 * Nouvelle heure du conseil : si elle tombe dans la plage calme, la plage s'ajuste (fin juste avant le conseil du
 * matin, début juste après celui du soir) et `notice` le dit en une phrase.
 */
export function withReminderHour(settings: Timing, hour: number): { patch: Partial<Timing>; notice: string | null } {
  const next = { ...settings, preferredHour: hour };
  if (!isQuietHour(hour, next)) return { patch: { preferredHour: hour }, notice: null };
  const at = hourText(hour, settings.preferredMinute);
  if (hour < 12) {
    return { patch: { preferredHour: hour, quietEndHour: hour }, notice: `Ta plage calme finit maintenant à ${hourText(hour)}, pour que ton conseil arrive à ${at}.` };
  }
  return { patch: { preferredHour: hour, quietStartHour: hour + 1 }, notice: `Ta plage calme commence maintenant à ${hourText(hour + 1)}, pour que ton conseil arrive à ${at}.` };
}

/** Un choix de plage calme qui couvrirait l'heure du conseil n'est pas proposé. */
export function coversReminder(settings: Timing, patch: Partial<Pick<Timing, "quietStartHour" | "quietEndHour">>) {
  return isQuietHour(settings.preferredHour, { ...settings, ...patch });
}

/** « Toutes (5) », « 4 sur 5 », « Aucune plante » (balcon vide ou rien que des plantes sans rappel). */
export function followedText(eligibleIds: string[], enabledPlantIds: string[]) {
  if (eligibleIds.length === 0) return "Aucune plante";
  const followed = enabledPlantIds.length === 0 ? eligibleIds.length : eligibleIds.filter((id) => enabledPlantIds.includes(id)).length;
  return followed === eligibleIds.length ? `Toutes (${followed})` : `${followed} sur ${eligibleIds.length}`;
}

/** Les plantes suivies après un toucher : la liste vide veut dire « toutes ». */
export function toggleFollowed(eligibleIds: string[], enabledPlantIds: string[], plantId: string) {
  const current = enabledPlantIds.length === 0 ? eligibleIds : enabledPlantIds;
  const next = current.includes(plantId) ? current.filter((id) => id !== plantId) : [...current, plantId];
  return eligibleIds.every((id) => next.includes(id)) ? [] : next;
}

export const isFollowed = (enabledPlantIds: string[], plantId: string) => enabledPlantIds.length === 0 || enabledPlantIds.includes(plantId);

const SHORT_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const parseDay = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
};

/** Ligne « Mode vacances » : « Du 7 au 13 oct. », « Du 28 sept. au 3 oct. », « Non » sans absence à venir. */
export function vacationText(vacation: Pick<Vacation, "start" | "end"> | null | undefined, today: string) {
  if (!vacation || vacation.end < today) return "Non";
  const start = parseDay(vacation.start);
  const end = parseDay(vacation.end);
  const first = start.day === 1 ? "1er" : String(start.day);
  if (start.month === end.month && start.year === end.year) return `Du ${first} au ${end.day} ${SHORT_MONTHS[end.month - 1]}`;
  return `Du ${first} ${SHORT_MONTHS[start.month - 1]} au ${end.day} ${SHORT_MONTHS[end.month - 1]}`;
}
