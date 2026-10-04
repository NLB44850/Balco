/**
 * La liste « Aujourd'hui » de l'accueil : alertes météo, puis le geste du jour de chaque plante tiré du
 * plan du jour (le même que Balcon et la fiche), en une seule liste à cocher, avec l'état du balcon.
 * Logique pure.
 */
import type { CalendarActivity } from "../plants/calendar";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import type { ReminderGroup } from "../reminders/reminder-groups";
import { GESTURE_ORDER, type GestureKind, type PlantDay } from "./day-plan";
import { dayKey, plantDisplayName, type SessionTask } from "./garden-logic";

export type TodayTone = "frost" | "heat" | "rain" | "storm" | "wind" | "water" | "care" | "season";

export type TodayItem =
  | { kind: "alert"; key: string; tone: TodayTone; icon: string; title: string; subtitle: string; done: false; group: ReminderGroup }
  | { kind: "task"; key: string; tone: TodayTone; icon: string; title: string; subtitle: string; done: boolean; task: SessionTask }
  | { kind: "season"; key: string; tone: TodayTone; icon: string; title: string; subtitle: string; done: boolean; activity: CalendarActivity };

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
  /** Les conseils météo à montrer, regroupés (une alerte par cause, une soif par plante). */
  groups: ReminderGroup[];
  /** Le plan du jour de chaque plante (lib/garden/day-plan.ts), la même source que Balcon et la fiche. */
  plan: PlantDay[];
};

const KIND_RANK = Object.fromEntries(GESTURE_ORDER.map((kind, index) => [kind, index])) as Record<GestureKind, number>;

/**
 * Les alertes météo d'abord, puis une ligne par plante au plus : son premier geste hors alerte (arrosage,
 * récolte, plantation, engrais, entretien), dans cet ordre ; ce qui est déjà fait passe à la fin.
 */
export function buildTodayList({ groups, plan }: BuildTodayInput): TodayItem[] {
  const alerts: TodayItem[] = groups
    .filter((group) => group.cause && group.cause !== "thirst")
    .map((group) => {
      const look = ALERT_LOOK[group.cause ?? "thirst"] ?? ALERT_LOOK.thirst;
      return { kind: "alert", key: `alert:${group.key}`, ...look, title: group.title, subtitle: alertSubtitle(group), done: false, group };
    });
  const rows: Array<{ item: TodayItem; rank: number }> = [];
  for (const day of plan) {
    const gesture = day.gestures.find((candidate) => candidate.kind !== "alert");
    if (!gesture) continue;
    const rank = KIND_RANK[gesture.kind];
    const source = gesture.source;
    if (source.type === "decision") {
      const group = groups.find((candidate) => candidate.decisions.some((decision) => decision.plantId === source.decision.plantId && decision.cause === source.decision.cause));
      if (!group) continue;
      rows.push({ rank, item: { kind: "alert", key: `alert:${group.key}`, ...ALERT_LOOK.thirst, title: group.title, subtitle: alertSubtitle(group), done: false, group } });
    } else if (source.type === "task") {
      const item = source.task;
      rows.push({
        rank,
        item: {
          kind: "task",
          key: `task:${item.eventId}`,
          tone: gesture.kind === "watering" ? "water" : "care",
          icon: TASK_ICONS[item.task.type] ?? "•",
          title: gesture.title,
          subtitle: `${plantDisplayName(item.resolved)} · ${item.task.minutes} min`,
          done: gesture.done,
          task: { ...item, done: gesture.done, eventId: gesture.doneEventId ?? item.eventId },
        },
      });
    } else {
      rows.push({ rank, item: { kind: "season", key: `season:${source.activity.key}`, tone: "season", icon: source.activity.entry.emoji, title: gesture.title, subtitle: "De saison · à faire ce mois-ci", done: gesture.done, activity: source.activity } });
    }
  }
  const sorted = rows.sort((a, b) => a.rank - b.rank).map(({ item }) => item);
  return [...alerts, ...sorted.filter((item) => !item.done), ...sorted.filter((item) => item.done)];
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
