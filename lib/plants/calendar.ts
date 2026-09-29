import { dayKey, sessionEventId } from "../garden/garden-logic";
import type { MaintenanceEvent, MaintenanceTaskType } from "../reminders/reminder-engine";
import { formatMonthRange, MONTH_LONG, type CatalogPlant, type Month } from "./catalog";
import { adaptToClimate, type ClimateInfo } from "./climate";

export type CalendarActivityKind = "sow" | "plant" | "repot" | "harvest" | "care";

export type CalendarActivity = {
  key: string;
  kind: CalendarActivityKind;
  /** Plante concernée : id d'instance pour une plante du balcon, id catalogue pour une idée. */
  subjectId: string;
  entry: CatalogPlant;
  typeLabel: string;
  title: string;
  description: string;
  tag: string;
  tone: "green" | "coral" | "lime";
  eventType: MaintenanceTaskType;
  /** Geste du catalogue (entretien) : le même que dans la session du jour de l'accueil. */
  taskId?: string;
  /** Vue par saison : les mois de la saison où l'activité a lieu. */
  months?: Month[];
};

export type CalendarSubject = { id: string; entry: CatalogPlant; displayName: string };
export type CalendarOptions = { climate?: ClimateInfo | null };

const GENERIC_TASK_IDS = new Set(["check-soil", "observe", "harvest"]);
const ORDER: Record<CalendarActivityKind, number> = { harvest: 0, care: 1, repot: 2, plant: 3, sow: 4 };

/** « Aujourd’hui, retire les gourmands des tomates. » → « Retire les gourmands des tomates » */
function taskHeadline(title: string) {
  const stripped = title.replace(/^Aujourd’hui,\s*/u, "").replace(/\.$/u, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function calendarActivities(subjects: CalendarSubject[], month: number, options: CalendarOptions = {}): CalendarActivity[] {
  const activities: CalendarActivity[] = [];
  const m = month as Month;
  for (const { id, entry: catalogEntry, displayName } of subjects) {
    // Les semis et plantations des plantes frileuses suivent le climat local (Midi plus tôt, montagne plus tard).
    const entry = adaptToClimate(catalogEntry, options.climate);
    const tag = displayName.toUpperCase();
    const base = { subjectId: id, entry, tag };
    if (entry.sowMonths.includes(m)) {
      activities.push({ ...base, key: `${id}:sow`, kind: "sow", typeLabel: "SEMIS", title: `Sème ${entry.label}`, description: `Période de semis : ${formatMonthRange(entry.sowMonths)}. Prévois un pot d’au moins ${entry.potLiters} L.`, tone: "lime", eventType: "observation" });
    }
    // Une vivace déjà en pot se rempote plutôt qu'elle ne se replante : un seul geste le même mois.
    const repotsThisMonth = entry.repotMonths.includes(m);
    if (entry.plantMonths.includes(m) && !(entry.perennial && repotsThisMonth)) {
      activities.push({ ...base, key: `${id}:plant`, kind: "plant", typeLabel: "PLANTATION", title: `Plante ${entry.label}`, description: `Période de plantation : ${formatMonthRange(entry.plantMonths)}. Un terreau frais et un pot percé font la moitié du travail.`, tone: "coral", eventType: "observation" });
    }
    if (repotsThisMonth) {
      activities.push({ ...base, key: `${id}:repot`, kind: "repot", typeLabel: "REMPOTAGE", title: `Rempote ${entry.label}`, description: `Terreau neuf et pot un peu plus grand (au moins ${entry.potLiters} L), à faire en ${formatMonthRange(entry.repotMonths)}. Si le pot est déjà grand, remplace juste les 5 cm de terre du dessus.`, tone: "coral", eventType: "repotting" });
    }
    if (entry.harvestMonths.includes(m)) {
      activities.push({ ...base, key: `${id}:harvest`, kind: "harvest", typeLabel: "RÉCOLTE", title: `Récolte ${entry.label}`, description: entry.harvestTip, tone: "green", eventType: "harvest" });
    }
    for (const task of entry.tasks) {
      if (GENERIC_TASK_IDS.has(task.id) || !task.months?.includes(m)) continue;
      activities.push({ ...base, key: `${id}:${task.id}`, kind: "care", typeLabel: "ENTRETIEN", title: taskHeadline(task.title), description: task.instruction, tone: "lime", eventType: task.type, taskId: task.id });
    }
  }
  return activities.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Identifiant du geste noté depuis le calendrier. Un entretien porte le même que dans la session du jour
 * (cocher d'un côté coche l'autre) ; un semis, une plantation ou un rempotage se note une fois par mois.
 */
export function activityEventId(activity: CalendarActivity, now: Date) {
  if (activity.kind === "care" && activity.taskId) return sessionEventId(activity.subjectId, activity.taskId, now);
  if (activity.kind === "harvest") return `${activity.subjectId}:calendar-harvest:${dayKey(now)}`;
  return `${activity.subjectId}:calendar-${activity.kind}:${monthKey(now)}`;
}

export function activityDone(activity: CalendarActivity, events: MaintenanceEvent[], now: Date) {
  const id = activityEventId(activity, now);
  return events.some((event) => event.id === id);
}

export function eventForActivity(activity: CalendarActivity, now: Date): MaintenanceEvent {
  return { id: activityEventId(activity, now), plantId: activity.subjectId, type: activity.eventType, completedAt: now.toISOString(), source: "manual", note: activity.title };
}

/** Pour l'accueil : les semis, plantations et rempotages du mois pas encore notés. */
export function seasonalToDo(subjects: CalendarSubject[], events: MaintenanceEvent[], now: Date, options: CalendarOptions = {}) {
  return calendarActivities(subjects, now.getMonth() + 1, options).filter((activity) => ["sow", "plant", "repot"].includes(activity.kind) && !activityDone(activity, events, now));
}

// --- Saisons -------------------------------------------------------------------

export type Season = { id: "spring" | "summer" | "autumn" | "winter"; label: string; months: Month[] };

export const SEASONS: Season[] = [
  { id: "spring", label: "Printemps", months: [3, 4, 5] },
  { id: "summer", label: "Été", months: [6, 7, 8] },
  { id: "autumn", label: "Automne", months: [9, 10, 11] },
  { id: "winter", label: "Hiver", months: [12, 1, 2] },
];

/** Les quatre saisons, en commençant par la saison en cours. */
export function upcomingSeasons(now = new Date()) {
  const month = (now.getMonth() + 1) as Month;
  const start = SEASONS.findIndex((season) => season.months.includes(month));
  return [...SEASONS.slice(start), ...SEASONS.slice(0, start)];
}

/** Les activités d'une saison, une fois chacune, avec les mois où elles ont lieu (« avril–mai »). */
export function seasonActivities(subjects: CalendarSubject[], season: Season, options: CalendarOptions = {}): CalendarActivity[] {
  const byKey = new Map<string, CalendarActivity>();
  for (const month of season.months) {
    for (const activity of calendarActivities(subjects, month, options)) {
      const existing = byKey.get(activity.key);
      if (existing) existing.months = [...(existing.months ?? []), month];
      else byKey.set(activity.key, { ...activity, months: [month] });
    }
  }
  return [...byKey.values()].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}

/** « en avril et mai », « en juin », « de juin à août ». */
export function describeMonths(months: Month[]) {
  const names = months.map((month) => MONTH_LONG[month - 1]);
  if (names.length === 1) return `en ${names[0]}`;
  if (names.length === 2) return `en ${names[0]} et ${names[1]}`;
  return `de ${names[0]} à ${names.at(-1)}`;
}

/** Les 12 prochains mois, en commençant par le mois courant (1-12). */
export function upcomingMonths(now = new Date()) {
  const current = now.getMonth();
  return Array.from({ length: 12 }, (_, offset) => ((current + offset) % 12) + 1);
}
