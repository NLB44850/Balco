/**
 * Réponses de l'utilisateur à un rappel (« Fait », « Dans 3 h », « Pas aujourd'hui ») et choix
 * de la prochaine notification locale. Logique pure : aucun accès au stockage ni aux notifications.
 */
import { dayKey } from "../garden/garden-logic";
import type { MaintenanceEvent, ReminderDecision } from "./reminder-engine";
import { groupReminders, type ReminderGroup } from "./reminder-groups";
import { WEATHER_ALERT_CAUSES } from "./alert-cause";

export { alertCauseOf, type WeatherAlertCause } from "./alert-cause";

/** « later » : on en reparle dans quelques heures ; « skip » : plus rien aujourd'hui. */
export type ReminderResponse = "done" | "later" | "skip";
export type ReminderSnooze = { key: string; kind: "later" | "skip"; until: string };

export type ReminderTiming = {
  preferredHour: number;
  preferredMinute: number;
  quietStartHour: number;
  quietEndHour: number;
};

export const LATER_DELAY_HOURS = 3;
const HOUR_MS = 60 * 60 * 1000;

type DecisionRef = Pick<ReminderDecision, "plantId" | "taskType">;

export function reminderKey({ plantId, taskType }: DecisionRef) {
  return `${plantId}:${taskType}`;
}

export function isQuietHour(hour: number, timing: Pick<ReminderTiming, "quietStartHour" | "quietEndHour">) {
  const { quietStartHour: start, quietEndHour: end } = timing;
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/** Prochaine heure de rappel préférée après `from`, en sautant la plage calme. */
export function nextPreferredDate(timing: ReminderTiming, from: Date) {
  const trigger = new Date(from);
  trigger.setHours(timing.preferredHour, timing.preferredMinute, 0, 0);
  if (trigger.getTime() <= from.getTime()) trigger.setDate(trigger.getDate() + 1);
  if (isQuietHour(trigger.getHours(), timing)) trigger.setDate(trigger.getDate() + 1);
  return trigger;
}

/** Jusqu'à quand un rappel reste en sommeil. « Dans 3 h » ne réveille jamais pendant la plage calme. */
export function snoozeUntil(kind: ReminderSnooze["kind"], timing: ReminderTiming, now: Date) {
  if (kind === "skip") {
    const tomorrow = new Date(now);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return nextPreferredDate(timing, tomorrow);
  }
  const later = new Date(now.getTime() + LATER_DELAY_HOURS * HOUR_MS);
  if (!isQuietHour(later.getHours(), timing)) return later;
  const wake = new Date(later);
  wake.setHours(timing.quietEndHour, 0, 0, 0);
  if (wake.getTime() <= later.getTime()) wake.setDate(wake.getDate() + 1);
  return wake;
}

export function activeSnoozes(snoozes: ReminderSnooze[], now: Date) {
  return snoozes.filter((snooze) => new Date(snooze.until).getTime() > now.getTime());
}

export function addSnooze(snoozes: ReminderSnooze[], decision: DecisionRef, kind: ReminderSnooze["kind"], timing: ReminderTiming, now: Date): ReminderSnooze[] {
  const key = reminderKey(decision);
  const next = { key, kind, until: snoozeUntil(kind, timing, now).toISOString() };
  return [...activeSnoozes(snoozes, now).filter((snooze) => snooze.key !== key), next];
}

/**
 * Un geste noté depuis un conseil météo, puis décoché : le conseil se réveille (sinon « Arrose la
 * menthe » ne reviendrait plus de la journée). Sans effet pour un geste qui ne vient pas d'un conseil.
 */
export function wakeSnoozeFor(snoozes: ReminderSnooze[], event: MaintenanceEvent): ReminderSnooze[] {
  if (event.source !== "reminder") return snoozes;
  const key = reminderKey({ plantId: event.plantId, taskType: event.type });
  return snoozes.filter((snooze) => snooze.key !== key);
}

/** Les rappels à montrer maintenant : ceux que l'utilisateur n'a pas mis en sommeil. */
export function withoutSnoozed<T extends DecisionRef>(decisions: T[], snoozes: ReminderSnooze[], now: Date): T[] {
  const sleeping = new Set(activeSnoozes(snoozes, now).map((snooze) => snooze.key));
  return decisions.filter((decision) => !sleeping.has(reminderKey(decision)));
}

/**
 * La notification locale à programmer : la plus proche dans le temps, à l'heure préférée,
 * ou au réveil d'un « Dans 3 h ». Les décisions sont supposées triées par urgence (decideReminders).
 */
export function planNotification(decisions: ReminderDecision[], snoozes: ReminderSnooze[], timing: ReminderTiming, now: Date): { decision: ReminderDecision; date: Date } | null {
  const sleeping = new Map(activeSnoozes(snoozes, now).map((snooze) => [snooze.key, snooze]));
  let best: { decision: ReminderDecision; date: Date } | null = null;
  for (const decision of decisions) {
    const snooze = sleeping.get(reminderKey(decision));
    const date = snooze?.kind === "later" ? new Date(snooze.until) : nextPreferredDate(timing, snooze ? new Date(snooze.until) : now);
    if (date.getTime() >= new Date(decision.validUntil).getTime()) continue;
    if (!best || date.getTime() < best.date.getTime()) best = { decision, date };
  }
  return best;
}

/**
 * Le geste enregistré quand l'utilisateur répond « Fait » (depuis l'app ou la notification). Pour le gel, la chaleur,
 * le vent et l'orage, la cause entre dans l'identifiant : gel et vent le même soir ne s'écrasent plus.
 */
export function eventForReminder(decision: DecisionRef & Pick<ReminderDecision, "action" | "title" | "cause">, now: Date): MaintenanceEvent {
  const cause = decision.cause && (WEATHER_ALERT_CAUSES as readonly string[]).includes(decision.cause) ? `${decision.cause}:` : "";
  return {
    id: `reminder:${decision.plantId}:${decision.taskType}:${cause}${dayKey(now)}`,
    plantId: decision.plantId,
    // Suivre un « n'arrose pas » compte comme une observation, pas comme un arrosage.
    type: decision.action === "skip" ? "observation" : decision.taskType,
    completedAt: now.toISOString(),
    source: "reminder",
    note: decision.title,
  };
}

/**
 * L'alerte à envoyer pour la notification prévue : le conseil choisi et tous ceux de même cause météo
 * encore d'actualité à cette heure-là (une seule notification « gel » pour toutes les plantes).
 */
export function planGroupedNotification(decisions: ReminderDecision[], snoozes: ReminderSnooze[], timing: ReminderTiming, now: Date): { group: ReminderGroup; date: Date } | null {
  const plan = planNotification(decisions, snoozes, timing, now);
  if (!plan) return null;
  const awake = withoutSnoozed(decisions, snoozes, plan.date);
  const group = groupReminders(awake.includes(plan.decision) ? awake : [plan.decision, ...awake]).find((candidate) => candidate.decisions.includes(plan.decision));
  return group ? { group, date: plan.date } : null;
}

