/**
 * La liste « Aujourd'hui » de l'accueil : alertes météo, gestes du jour et gestes de saison
 * réunis en une seule liste à cocher, avec l'état du balcon (combien de gestes restent).
 * Logique pure.
 */
import type { CalendarActivity } from "../plants/calendar";
import type { MaintenanceEvent, ReminderDecision } from "../reminders/reminder-engine";
import type { ReminderGroup } from "../reminders/reminder-groups";
import { dayKey, plantDisplayName, type SessionTask } from "./garden-logic";

export type TodayTone = "frost" | "heat" | "rain" | "storm" | "wind" | "water" | "care" | "season";

export type TodayItem =
  | { kind: "alert"; key: string; tone: TodayTone; icon: string; title: string; subtitle: string; done: false; group: ReminderGroup }
  | { kind: "task"; key: string; tone: TodayTone; icon: string; title: string; subtitle: string; done: boolean; task: SessionTask }
  | { kind: "season"; key: string; tone: TodayTone; icon: string; title: string; subtitle: string; done: false; activity: CalendarActivity };

export type BalconyStatus = { label: string; remaining: number; doneToday: number; progress: number; allDone: boolean };

const ALERT_LOOK: Record<string, { tone: TodayTone; icon: string }> = {
  frost: { tone: "frost", icon: "❄" },
  storm: { tone: "storm", icon: "⛈" },
  wind: { tone: "wind", icon: "💨" },
  rain: { tone: "rain", icon: "🌧" },
  heat: { tone: "heat", icon: "☀" },
  thirst: { tone: "water", icon: "💧" },
};

const TASK_ICONS: Record<string, string> = { watering: "💧", observation: "🔎", pruning: "✂", protection: "🛡", harvest: "🧺", repotting: "🪴", fertilizing: "🌱" };

/** « Aujourd’hui, retire les gourmands des tomates. » → « Retire les gourmands des tomates » */
export function headline(title: string) {
  const stripped = title.replace(/^Aujourd’hui,\s*/u, "").replace(/\.$/u, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function clock(date: Date) {
  return `${date.getHours()} h ${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Une ligne courte sous le titre d'une alerte : l'échéance et le chiffre qui compte. */
function alertSubtitle(group: ReminderGroup) {
  const value = group.value;
  switch (group.cause) {
    case "frost":
      return value === undefined ? "Avant la nuit" : `Avant la nuit · jusqu’à ${value} °C`;
    case "storm":
      return "Orage en cours ou imminent";
    case "wind":
      return value === undefined ? "Vent fort" : `Rafales jusqu’à ${value} km/h`;
    case "rain":
      return value === undefined ? "Pluie prévue" : `${value} mm de pluie prévus d’ici 12 h`;
    case "heat":
      return value === undefined ? "Forte chaleur" : `Jusqu’à ${value} °C · ce soir ou demain tôt`;
    default:
      return "Seulement si la terre est sèche";
  }
}

type BuildTodayInput = {
  groups: ReminderGroup[];
  session: SessionTask[];
  seasonal: CalendarActivity[];
  rainExpected?: boolean;
  /** Tous les conseils du moment, même ceux déjà cochés ou reportés (« Pas aujourd'hui »). */
  decisions?: Array<Pick<ReminderDecision, "plantId" | "cause">>;
  /** Les plantes déjà arrosées aujourd'hui (par exemple en cochant l'alerte chaleur). */
  wateredToday?: string[];
};

export function buildTodayList({ groups, session, seasonal, rainExpected = false, decisions = [], wateredToday = [] }: BuildTodayInput): TodayItem[] {
  // Une alerte de soif ou de chaleur remplace le geste d'arrosage générique de la même plante, et
  // quand la pluie ou l'orage arrive on ne dit pas « arrose le basilic » juste sous l'alerte, même une
  // fois l'alerte cochée (« Compris ») ou reportée. Une plante déjà arrosée aujourd'hui non plus.
  const all = [...groups.flatMap((group) => group.decisions), ...decisions];
  const thirsty = new Set([...all.filter((decision) => decision.cause === "thirst" || decision.cause === "heat").map((decision) => decision.plantId), ...wateredToday]);
  const rainComing = rainExpected || all.some((decision) => decision.cause === "rain" || decision.cause === "storm");
  const alerts: TodayItem[] = groups.map((group) => {
    const look = ALERT_LOOK[group.cause ?? "thirst"] ?? ALERT_LOOK.thirst;
    return { kind: "alert", key: `alert:${group.key}`, ...look, title: group.title, subtitle: alertSubtitle(group), done: false, group };
  });
  const tasks: TodayItem[] = session
    .filter((item) => !(item.task.type === "watering" && !item.done && (rainComing || thirsty.has(item.resolved.plant.id))))
    .map((item) => ({
      kind: "task",
      key: `task:${item.eventId}`,
      tone: item.task.type === "watering" ? "water" : "care",
      icon: TASK_ICONS[item.task.type] ?? "•",
      title: headline(item.task.title),
      subtitle: `${plantDisplayName(item.resolved)} · ${item.task.minutes} min`,
      done: item.done,
      task: item,
    }));
  const season: TodayItem[] = seasonal.map((activity) => ({
    kind: "season",
    key: `season:${activity.key}`,
    tone: "season",
    icon: activity.entry.emoji,
    title: activity.title,
    subtitle: "De saison · à faire ce mois-ci",
    done: false,
    activity,
  }));
  // Ce qui presse d'abord (alertes), puis le reste à faire, puis ce qui est déjà fait.
  return [...alerts, ...tasks.filter((item) => !item.done), ...season, ...tasks.filter((item) => item.done)];
}

/** Le sous-titre d'un geste déjà fait : l'heure à laquelle il a été noté. */
export function doneSubtitle(item: TodayItem, events: MaintenanceEvent[]) {
  if (item.kind !== "task") return item.subtitle;
  const event = events.find((candidate) => candidate.id === item.task.eventId);
  return event ? `Fait à ${clock(new Date(event.completedAt))}` : item.subtitle;
}

/** « Ton balcon · 2 gestes avant ce soir », « prêt pour la nuit »… et l'avancement de la journée. */
export function balconyStatus(items: TodayItem[], events: MaintenanceEvent[], now: Date): BalconyStatus {
  const today = dayKey(now);
  const doneToday = new Set(events.filter((event) => dayKey(new Date(event.completedAt)) === today).map((event) => event.id)).size;
  const remaining = items.filter((item) => !item.done).length;
  const evening = now.getHours() >= 17;
  const total = remaining + doneToday;
  const progress = total === 0 ? 0 : doneToday / total;
  if (remaining > 0) {
    return { label: `${remaining} geste${remaining > 1 ? "s" : ""} ${now.getHours() >= 15 ? "avant ce soir" : "aujourd’hui"}`, remaining, doneToday, progress, allDone: false };
  }
  if (doneToday > 0) return { label: evening ? "prêt pour la nuit" : "à jour pour aujourd’hui", remaining, doneToday, progress: 1, allDone: true };
  return { label: "rien à faire aujourd’hui", remaining, doneToday, progress: 0, allDone: true };
}
