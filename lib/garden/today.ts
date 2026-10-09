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
import { dayKey, plantDisplayName, type ResolvedPlant, type SessionTask } from "./garden-logic";
import { isAvoidedWatering } from "./progress";
import { endsWithSeason } from "../plants/season-end";

export type TodayTone = "frost" | "heat" | "rain" | "storm" | "wind" | "water" | "care" | "season";

/** Ce que toutes les lignes ont en commun : le type de geste (pour l'ordre et le regroupement) et la plante. */
/** `quiet` : toujours replié avec les gestes pas urgents, et pas compté dans ce qui reste à faire (pot libre de la veille). */
type TodayBase = { key: string; tone: TodayTone; icon: string; title: string; subtitle: string; gesture: GestureKind; plantName?: string; quiet?: boolean };

export type TodayItem =
  | (TodayBase & { kind: "alert"; done: false; group: ReminderGroup })
  | (TodayBase & { kind: "task"; done: boolean; task: SessionTask })
  | (TodayBase & { kind: "season"; done: boolean; activity: CalendarActivity })
  /** « Tes radis sont-ils tous récoltés ? » ou « Ton pot est libre » : la ligne ouvre la feuille du pot libre. */
  | (TodayBase & { kind: "harvest-end"; done: false; stage: "question" | "free"; resolved: ResolvedPlant });

/** Les gestes regroupés en une ligne dès qu'ils concernent deux plantes : les arrosages et les récoltes. */
export type GroupedGesture = "watering" | "harvest";

/**
 * Une ligne de l'écran : un geste seul, les arrosages ou les récoltes regroupés (« Vérifie la terre de 3 plantes »,
 * « Récolte ce qui est prêt sur 9 plantes », qui s'ouvrent sur la feuille du bas), ou les gestes pas urgents repliés
 * (« 2 autres gestes, pas urgents »).
 */
export type TodayLine =
  | { type: "item"; key: string; item: TodayItem }
  | { type: "group"; key: GroupedGesture; gesture: GroupedGesture; icon: string; tone: TodayTone; title: string; subtitle: string; done: boolean; items: TodayItem[] }
  | { type: "more"; key: "more"; title: string; subtitle: string; items: TodayItem[] };

const GROUP_LOOK: Record<GroupedGesture, { icon: string; tone: TodayTone; title: (count: number) => string; todo: string }> = {
  watering: { icon: "💧", tone: "water", title: (count) => `Vérifie la terre de ${count} plantes`, todo: "Sèche ? Arrose" },
  harvest: { icon: "🧺", tone: "care", title: (count) => `Récolte ce qui est prêt sur ${count} plantes`, todo: "Cueille ce qui est mûr" },
};

/** Une récolte à regrouper : pas la question « Tout récolté ? » ni le pot libre, qui ont leur propre ligne. */
function groupedAs(item: TodayItem): GroupedGesture | null {
  if (item.gesture === "watering") return "watering";
  if (item.gesture === "harvest" && item.kind !== "harvest-end" && !item.quiet) return "harvest";
  return null;
}

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
 * Les alertes météo d'abord, puis une ligne à faire par plante au plus : son premier geste hors alerte
 * encore à faire (arrosage, récolte, plantation / semis / rempotage, engrais, entretien), dans cet ordre.
 * Une fois ce geste fait, le suivant prend sa place : les gestes du mois se font tous depuis Aujourd'hui.
 * Ce qui est déjà fait aujourd'hui passe à la fin.
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
    const gestures = day.gestures.filter((candidate) => candidate.kind !== "alert");
    const next = gestures.find((candidate) => !candidate.done);
    for (const gesture of gestures.filter((candidate) => candidate.done || candidate === next)) {
      const item = rowFor(day, gesture, groups);
      if (item) rows.push({ rank: KIND_RANK[gesture.kind], item });
    }
  }
  const sorted = rows.sort((a, b) => a.rank - b.rank).map(({ item }) => item);
  return [...alerts, ...sorted.filter((item) => !item.done), ...sorted.filter((item) => item.done)];
}

/** La ligne d'un geste du plan du jour. */
function rowFor(day: PlantDay, gesture: PlantDay["gestures"][number], groups: ReminderGroup[]): TodayItem | null {
  const source = gesture.source;
  const common = { gesture: gesture.kind, plantName: plantDisplayName(day.resolved) };
  if (source.type === "decision") {
    const group = groups.find((candidate) => candidate.decisions.some((decision) => decision.plantId === source.decision.plantId && decision.cause === source.decision.cause));
    if (!group) return null;
    // Le titre dit l'action (« Arrose le basilic ») ; le sous-titre, comment vérifier.
    return { kind: "alert", key: `alert:${group.key}`, ...common, ...ALERT_LOOK.thirst, title: group.title, subtitle: soilCheckText(soilCheckDepthCm(day.resolved.entry)), done: false, group };
  }
  if (source.type === "task") {
    const item = source.task;
    return {
      kind: "task",
      key: `task:${item.eventId}`,
      ...common,
      tone: gesture.kind === "watering" ? "water" : "care",
      icon: TASK_ICONS[item.task.type] ?? "•",
      title: gesture.title,
      subtitle: gesture.kind === "watering" ? soilCheckText(soilCheckDepthCm(item.resolved.entry)) : `${plantDisplayName(item.resolved)} · ${item.task.minutes} min`,
      done: gesture.done,
      task: { ...item, done: gesture.done, eventId: gesture.doneEventId ?? item.eventId },
    };
  }
  if (source.type === "harvest-end") {
    return { kind: "harvest-end", key: gesture.key, ...common, tone: "care", icon: endsWithSeason(source.resolved.entry) ? "🍂" : "🧺", title: gesture.title, subtitle: gesture.instruction, done: false, stage: source.stage, resolved: source.resolved, ...(source.quiet ? { quiet: true } : {}) };
  }
  return { kind: "season", key: `season:${source.activity.key}`, ...common, tone: "season", icon: source.activity.entry.emoji, title: gesture.title, subtitle: "De saison · à faire ce mois-ci", done: gesture.done, activity: source.activity };
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
 * La liste telle qu'elle s'affiche : alertes, arrosages puis récoltes regroupés dès qu'il y en a deux (une seule ligne
 * « Vérifie la terre de N plantes », « Récolte ce qui est prêt sur N plantes »), gestes de saison, puis, au-delà de
 * 5 lignes à faire, l'engrais et l'entretien repliés sous « X autres gestes, pas urgents ». Ce qui est fait passe à
 * la fin. Alertes, arrosages et récoltes restent toujours visibles.
 */
export function layoutTodayList(items: TodayItem[]): TodayLine[] {
  const single = (item: TodayItem): TodayLine => ({ type: "item", key: item.key, item });
  const groups: Extract<TodayLine, { type: "group" }>[] = [];
  for (const gesture of ["watering", "harvest"] as const) {
    const members = items.filter((item) => groupedAs(item) === gesture);
    if (members.length < 2) continue;
    const look = GROUP_LOOK[gesture];
    const doneCount = members.filter((item) => item.done).length;
    const names = activityGroupSummary(members.map((item) => item.plantName ?? item.title));
    groups.push({
      type: "group",
      key: gesture,
      gesture,
      icon: look.icon,
      tone: look.tone,
      title: look.title(members.length),
      subtitle: doneCount > 0 ? `${doneCount} sur ${members.length} faites · ${names}` : `${look.todo} · ${names}`,
      done: doneCount === members.length,
      items: members,
    });
  }
  const inGroup = new Set(groups.flatMap((group) => group.items));
  const loose = items.filter((item) => !inGroup.has(item));
  const pending = loose.filter((item) => !item.done);

  const alerts = pending.filter((item) => item.gesture === "alert").map(single);
  const others = pending.filter((item) => item.gesture !== "alert");
  const quiet = others.filter((item) => item.quiet);
  const lines: TodayLine[] = [...alerts, ...groups.filter((group) => !group.done), ...others.map(single)];
  // Au-delà de 5 lignes (sans compter les lignes discrètes), l'engrais et l'entretien se replient aussi.
  const crowded = lines.length - quiet.length > MAX_TODAY_LINES;
  const folded = others.filter((item) => item.quiet || (crowded && NOT_URGENT.includes(item.gesture)));
  if (folded.length > 0) {
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
  return [...lines, ...groups.filter((group) => group.done), ...loose.filter((item) => item.done).map(single)];
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
  const remaining = items.filter((item) => !item.done && !item.quiet && !isInfoBanner(item)).length;
  const evening = now.getHours() >= 17;
  const total = remaining + doneToday;
  const progress = total === 0 ? 0 : doneToday / total;
  if (remaining > 0) {
    return { label: `${remaining} geste${remaining > 1 ? "s" : ""} ${now.getHours() >= 15 ? "avant ce soir" : "aujourd’hui"}`, remaining, doneToday, progress, allDone: false };
  }
  if (doneToday > 0) return { label: evening ? "prêt pour la nuit" : "à jour pour aujourd’hui", remaining, doneToday, progress: 1, allDone: true };
  return { label: "rien à faire aujourd’hui", remaining, doneToday, progress: 0, allDone: true };
}
