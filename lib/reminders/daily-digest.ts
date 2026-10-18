/**
 * Tour de l'appli, étape 5 : les rappels des 7 prochains jours sur le téléphone. Sans Balco+, rien ne part du
 * serveur : si l'app reste fermée, seule la notification déjà programmée arrivait, puis plus rien. On prévoit donc,
 * à l'heure des rappels, un récapitulatif par jour (« 🌱 3 gestes pour ton balcon aujourd'hui ») tiré du plan de ce
 * jour-là, sans la météo (pas de prévision fiable plusieurs jours à l'avance). Ouvrir l'app refait tout le calcul.
 * Logique pure.
 */
import { dayKey } from "../garden/garden-logic";
import type { PlantDay } from "../garden/day-plan";
import { isQuietHour, type ReminderTiming } from "./reminder-actions";

export const DIGEST_DAYS = 7;
/** Le préfixe des notifications de récapitulatif, une par jour (`balco-daily:2026-10-19`). */
export const DIGEST_SOURCE = "balco-daily";
const LISTED = 2;

export type DailyDigest = { day: string; date: Date; title: string; body: string };

/** Le récapitulatif d'un jour : le premier geste à faire de chaque plante. Rien à faire, pas de notification. */
export function digestText(plan: PlantDay[]): { title: string; body: string } | null {
  const todo = plan.map((day) => day.gestures.find((gesture) => !gesture.done && gesture.kind !== "alert")).filter((gesture) => gesture !== undefined);
  if (todo.length === 0) return null;
  const title = todo.length === 1 ? "🌱 Un geste pour ton balcon aujourd’hui" : `🌱 ${todo.length} gestes pour ton balcon aujourd’hui`;
  const names = todo.slice(0, LISTED).map((gesture, index) => (index === 0 ? gesture.title : gesture.title.charAt(0).toLowerCase() + gesture.title.slice(1)));
  const others = todo.length - names.length;
  const body = others > 0 ? `${names.join(", ")} et ${others === 1 ? "1 autre geste" : `${others} autres gestes`}.` : `${names.join(" et ")}.`;
  return { title, body };
}

type PlanInput = {
  now: Date;
  timing: ReminderTiming;
  /** La notification du jour (conseil météo) déjà programmée : les récapitulatifs commencent le jour d'après. */
  nextReminder?: Date | null;
  /** Le plan d'un jour à venir (plan du jour sans météo). */
  planFor: (date: Date) => PlantDay[];
  /** Vacances : aucun rappel ces jours-là. */
  isAway?: (day: string) => boolean;
};

/** Les récapitulatifs à programmer : un par jour, à l'heure des rappels, jusqu'au 7ᵉ jour après aujourd'hui. */
export function planDailyDigests({ now, timing, nextReminder, planFor, isAway }: PlanInput): DailyDigest[] {
  // Le jour de la notification déjà prévue a son conseil : pas de récapitulatif en plus ce jour-là, ni avant.
  // Sans elle, aujourd'hui compte encore si l'heure des rappels n'est pas passée.
  const covered = nextReminder ? dayKey(nextReminder) : "";
  const digests: DailyDigest[] = [];
  for (let offset = 0; offset <= DIGEST_DAYS; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, timing.preferredHour, timing.preferredMinute);
    const day = dayKey(date);
    if (date.getTime() <= now.getTime() || day <= covered || isQuietHour(date.getHours(), timing) || isAway?.(day)) continue;
    const text = digestText(planFor(date));
    if (text) digests.push({ day, date, ...text });
  }
  return digests;
}
