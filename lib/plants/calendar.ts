import { formatMonthRange, type CatalogPlant, type Month } from "./catalog";
import type { MaintenanceTaskType } from "../reminders/reminder-engine";

export type CalendarActivityKind = "sow" | "plant" | "harvest" | "care";

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
};

export type CalendarSubject = { id: string; entry: CatalogPlant; displayName: string };

const GENERIC_TASK_IDS = new Set(["check-soil", "observe", "harvest"]);

/** « Aujourd’hui, retire les gourmands des tomates. » → « Retire les gourmands des tomates » */
function taskHeadline(title: string) {
  const stripped = title.replace(/^Aujourd’hui,\s*/u, "").replace(/\.$/u, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function calendarActivities(subjects: CalendarSubject[], month: number): CalendarActivity[] {
  const activities: CalendarActivity[] = [];
  const m = month as Month;
  for (const { id, entry, displayName } of subjects) {
    const tag = displayName.toUpperCase();
    const base = { subjectId: id, entry, tag };
    if (entry.sowMonths.includes(m)) {
      activities.push({ ...base, key: `${id}:sow`, kind: "sow", typeLabel: "SEMIS", title: `Sème ${entry.label}`, description: `Période de semis : ${formatMonthRange(entry.sowMonths)}. Prévois un pot d’au moins ${entry.potLiters} L.`, tone: "lime", eventType: "observation" });
    }
    if (entry.plantMonths.includes(m)) {
      activities.push({ ...base, key: `${id}:plant`, kind: "plant", typeLabel: "PLANTATION", title: `Plante ou rempote ${entry.label}`, description: `Période de plantation : ${formatMonthRange(entry.plantMonths)}. Un terreau frais et un pot percé font la moitié du travail.`, tone: "coral", eventType: "observation" });
    }
    if (entry.harvestMonths.includes(m)) {
      activities.push({ ...base, key: `${id}:harvest`, kind: "harvest", typeLabel: "RÉCOLTE", title: `Récolte ${entry.label}`, description: entry.harvestTip, tone: "green", eventType: "harvest" });
    }
    for (const task of entry.tasks) {
      if (GENERIC_TASK_IDS.has(task.id) || !task.months?.includes(m)) continue;
      activities.push({ ...base, key: `${id}:${task.id}`, kind: "care", typeLabel: "ENTRETIEN", title: taskHeadline(task.title), description: task.instruction, tone: "lime", eventType: task.type });
    }
  }
  const order: Record<CalendarActivityKind, number> = { harvest: 0, care: 1, plant: 2, sow: 3 };
  return activities.sort((a, b) => order[a.kind] - order[b.kind]);
}

/** Les 12 prochains mois, en commençant par le mois courant (1-12). */
export function upcomingMonths(now = new Date()) {
  const current = now.getMonth();
  return Array.from({ length: 12 }, (_, offset) => ((current + offset) % 12) + 1);
}
