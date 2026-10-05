/**
 * La liste « Aujourd'hui » de l'accueil : alertes météo, puis le geste du jour de chaque plante tiré du
 * plan du jour (le même que Balcon et la fiche), en une seule liste à cocher, avec l'état du balcon.
 * Logique pure.
 */
import { activityGroupSummary, type CalendarActivity } from "../plants/calendar";
import { soilCheckDepthCm, soilCheckText } from "../plants/catalog";
import { eventForReminder } from "../reminders/reminder-actions";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import type { ReminderGroup } from "../reminders/reminder-groups";
import { GESTURE_ORDER, type GestureKind, type PlantDay } from "./day-plan";
import { dayKey, plantDisplayName, type SessionTask } from "./garden-logic";
import { isAvoidedWatering } from "./progress";

export type TodayTone = "frost" | "heat" | "rain" | "storm" | "wind" | "water" | "care" | "season";

/** Ce que toutes les lignes ont en commun : le type de geste (pour l'ordre et le regroupement) et la plante. */
type TodayBase = { key: string; tone: TodayTone; icon: string; title: string; subtitle: string; gesture: GestureKind; plantName?: string };

export type TodayItem =
  | (TodayBase & { kind: "alert"; done: false; group: ReminderGroup })
  | (TodayBase & { kind: "task"; done: boolean; task: SessionTask })
  | (TodayBase & { kind: "season"; done: boolean; activity: CalendarActivity });

/**
 * Une ligne de l'écran : un geste seul, les arrosages regroupés (« Vérifie la terre de 3 plantes », qui
 * s'ouvre sur la feuille du bas), ou les gestes pas urgents repliés (« 2 autres gestes, pas urgents »).
 */
export type TodayLine =
  | { type: "item"; key: string; item: TodayItem }
  | { type: "watering"; key: "watering"; title: string; subtitle: string; done: boolean; items: TodayItem[] }
  | { type: "more"; key: "more"; title: string; subtitle: string; items: TodayItem[] };

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
      return "";
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
      return { kind: "alert", key: `alert:${group.key}`, ...look, title: group.title, subtitle: alertSubtitle(group), gesture: "alert", done: false, group };
    });
  const rows: Array<{ item: TodayItem; rank: number }> = [];
  for (const day of plan) {
    const gesture = day.gestures.find((candidate) => candidate.kind !== "alert");
    if (!gesture) continue;
    const rank = KIND_RANK[gesture.kind];
    const source = gesture.source;
    const common = { gesture: gesture.kind, plantName: plantDisplayName(day.resolved) };
    if (source.type === "decision") {
      const group = groups.find((candidate) => candidate.decisions.some((decision) => decision.plantId === source.decision.plantId && decision.cause === source.decision.cause));
      if (!group) continue;
      // Le titre dit l'action (« Arrose le basilic ») ; le sous-titre, comment vérifier.
      rows.push({ rank, item: { kind: "alert", key: `alert:${group.key}`, ...common, ...ALERT_LOOK.thirst, title: group.title, subtitle: soilCheckText(soilCheckDepthCm(day.resolved.entry)), done: false, group } });
    } else if (source.type === "task") {
      const item = source.task;
      rows.push({
        rank,
        item: {
          kind: "task",
          key: `task:${item.eventId}`,
          ...common,
          tone: gesture.kind === "watering" ? "water" : "care",
          icon: TASK_ICONS[item.task.type] ?? "•",
          title: gesture.title,
          subtitle: gesture.kind === "watering" ? soilCheckText(soilCheckDepthCm(item.resolved.entry)) : `${plantDisplayName(item.resolved)} · ${item.task.minutes} min`,
          done: gesture.done,
          task: { ...item, done: gesture.done, eventId: gesture.doneEventId ?? item.eventId },
        },
      });
    } else {
      rows.push({ rank, item: { kind: "season", key: `season:${source.activity.key}`, ...common, tone: "season", icon: source.activity.entry.emoji, title: gesture.title, subtitle: "De saison · à faire ce mois-ci", done: gesture.done, activity: source.activity } });
    }
  }
  const sorted = rows.sort((a, b) => a.rank - b.rank).map(({ item }) => item);
  return [...alerts, ...sorted.filter((item) => !item.done), ...sorted.filter((item) => item.done)];
}

export type TodayAlert = Extract<TodayItem, { kind: "alert" }>;

/** Une alerte météo (gel, orage, vent, chaleur, pluie), par opposition à la soif d'une plante. */
export function isWeatherBanner(item: TodayItem): item is TodayAlert {
  return item.kind === "alert" && item.group.cause !== undefined && item.group.cause !== "thirst";
}

/** La pluie dit seulement de ne pas arroser : rien à cocher, le bandeau informe. */
export function isInfoBanner(item: TodayItem) {
  return isWeatherBanner(item) && item.group.action === "skip";
}

/**
 * En haut d'Aujourd'hui, les alertes météo en bandeaux (gel, orage, vent, chaleur : un bouton
 * « C'est fait » ; pluie : un simple message) ; en dessous, la liste des gestes à cocher.
 */
export function splitTodayList(items: TodayItem[]): { banners: TodayAlert[]; rest: TodayItem[] } {
  return { banners: items.filter(isWeatherBanner), rest: items.filter((item) => !isWeatherBanner(item)) };
}

/**
 * Les jours de pluie, l'arrosage évité est compté tout seul (plus besoin de cocher) : un événement par
 * plante et par jour, à noter s'il ne l'est pas encore. Il sert à l'eau économisée de Ma semaine.
 */
export function rainSavingsToLog(banners: TodayAlert[], events: MaintenanceEvent[], now: Date): MaintenanceEvent[] {
  const known = new Set(events.map((event) => event.id));
  return banners
    .filter((banner) => banner.group.cause === "rain" && banner.group.action === "skip")
    .flatMap((banner) => banner.group.decisions.map((decision) => eventForReminder(decision, now)))
    .filter((event) => !known.has(event.id));
}

/** Au-delà de ce nombre de lignes à faire, l'engrais et l'entretien se replient. */
export const MAX_TODAY_LINES = 5;
const NOT_URGENT: GestureKind[] = ["fertilizing", "care"];

/**
 * La liste telle qu'elle s'affiche : alertes, arrosages regroupés dès qu'il y en a deux (une seule ligne
 * « Vérifie la terre de N plantes »), récoltes et gestes de saison, puis, au-delà de 5 lignes à faire,
 * l'engrais et l'entretien repliés sous « X autres gestes, pas urgents ». Ce qui est fait passe à la fin.
 * Alertes, arrosages et récoltes restent toujours visibles.
 */
export function layoutTodayList(items: TodayItem[]): TodayLine[] {
  const waterings = items.filter((item) => item.gesture === "watering");
  const grouped = waterings.length >= 2;
  const single = (item: TodayItem): TodayLine => ({ type: "item", key: item.key, item });
  const loose = items.filter((item) => !(grouped && item.gesture === "watering"));
  const pending = loose.filter((item) => !item.done);

  let group: Extract<TodayLine, { type: "watering" }> | null = null;
  if (grouped) {
    const doneCount = waterings.filter((item) => item.done).length;
    const names = activityGroupSummary(waterings.map((item) => item.plantName ?? item.title));
    group = {
      type: "watering",
      key: "watering",
      title: `Vérifie la terre de ${waterings.length} plantes`,
      subtitle: doneCount > 0 ? `${doneCount} sur ${waterings.length} faites · ${names}` : `Sèche ? Arrose · ${names}`,
      done: doneCount === waterings.length,
      items: waterings,
    };
  }

  const alerts = pending.filter((item) => item.gesture === "alert").map(single);
  const others = pending.filter((item) => item.gesture !== "alert");
  const lines: TodayLine[] = [...alerts, ...(group && !group.done ? [group] : []), ...others.map(single)];
  const folded = others.filter((item) => NOT_URGENT.includes(item.gesture));
  if (lines.length > MAX_TODAY_LINES && folded.length > 0) {
    const kept = lines.filter((line) => line.type !== "item" || !folded.includes(line.item));
    kept.push({
      type: "more",
      key: "more",
      title: folded.length > 1 ? `${folded.length} autres gestes, pas urgents` : "1 autre geste, pas urgent",
      subtitle: activityGroupSummary(folded.map((item) => item.plantName ?? item.title)),
      items: folded,
    });
    lines.splice(0, lines.length, ...kept);
  }
  return [...lines, ...(group?.done ? [group] : []), ...loose.filter((item) => item.done).map(single)];
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
  // L'arrosage évité grâce à la pluie est compté tout seul : ce n'est pas un geste de la journée.
  const doneToday = new Set(events.filter((event) => dayKey(new Date(event.completedAt)) === today && !isAvoidedWatering(event)).map((event) => event.id)).size;
  const remaining = items.filter((item) => !item.done && !isInfoBanner(item)).length;
  const evening = now.getHours() >= 17;
  const total = remaining + doneToday;
  const progress = total === 0 ? 0 : doneToday / total;
  if (remaining > 0) {
    return { label: `${remaining} geste${remaining > 1 ? "s" : ""} ${now.getHours() >= 15 ? "avant ce soir" : "aujourd’hui"}`, remaining, doneToday, progress, allDone: false };
  }
  if (doneToday > 0) return { label: evening ? "prêt pour la nuit" : "à jour pour aujourd’hui", remaining, doneToday, progress: 1, allDone: true };
  return { label: "rien à faire aujourd’hui", remaining, doneToday, progress: 0, allDone: true };
}
