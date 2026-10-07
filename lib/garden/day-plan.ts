/**
 * Le plan du jour de chaque plante : la seule source de « quoi faire aujourd'hui ». Aujourd'hui, la carte
 * Balcon, la fiche plante et les pastilles d'état le lisent toutes, pour toujours dire la même chose.
 *
 * Les gestes d'une plante sont rangés dans un ordre unique : alerte météo, arrosage, récolte, plantation
 * (ou semis, rempotage), engrais, entretien. Le classement ignore les gestes notés aujourd'hui : cocher un
 * geste le marque « fait » sans faire changer la liste sous le doigt. Logique pure.
 */
import { followUpsFor } from "./follow-ups";
import { FREE_POT_TITLE, freePotIsQuiet, freePotSubtitle, HARVEST_QUESTION_DETAIL, harvestQuestion, harvestQuestionDue, potIsFree, type HarvestEndState } from "./harvest-end";
import { activityDone, calendarActivities, eventForActivity, startActivity, type CalendarActivity, type CalendarSubject } from "../plants/calendar";
import { tasksForMonth, type CareTask } from "../plants/catalog";
import type { ClimateInfo } from "../plants/climate";
import { eventForReminder } from "../reminders/reminder-actions";
import type { MaintenanceEvent, ReminderDecision } from "../reminders/reminder-engine";
import {
  dayKey,
  dayOfYear,
  eventForSessionTask,
  lastEventDate,
  plantDisplayName,
  potHistory,
  sessionEventId,
  startEventId,
  spacedTaskDue,
  startOfDay,
  type ResolvedPlant,
  type SessionTask,
} from "./garden-logic";

export type GestureKind = "alert" | "watering" | "harvest" | "season" | "fertilizing" | "care";

/** L'ordre de priorité, le même partout. */
export const GESTURE_ORDER: GestureKind[] = ["alert", "watering", "harvest", "season", "fertilizing", "care"];

export type GestureSource =
  | { type: "decision"; decision: ReminderDecision }
  | { type: "task"; task: SessionTask }
  | { type: "season"; activity: CalendarActivity }
  /** Après la récolte d'une plante récoltée en une fois : la question « Tout récolté ? », puis le pot libre. */
  | { type: "harvest-end"; stage: "question" | "free"; resolved: ResolvedPlant; quiet?: boolean };

export type PlanGesture = {
  key: string;
  kind: GestureKind;
  plantId: string;
  /** « Arrose le basilic », « Récolte le thym », « Gel cette nuit : protège le basilic ». */
  title: string;
  /** Comment faire, en une phrase. */
  instruction: string;
  minutes: number;
  done: boolean;
  /** L'événement qui le marque fait aujourd'hui (pour l'annuler). */
  doneEventId?: string;
  source: GestureSource;
};

/**
 * L'état d'une plante, une couleur par sens : vert = en forme, orange = à surveiller (un geste pressant,
 * chaleur, vent, orage), bleu = gel ou pluie annoncés, gris = nouvelle (aucun soin noté).
 */
export type PlantTone = "good" | "watch" | "weather" | "new";
export type PlantDayStatus = { tone: PlantTone; label: string };

export type PlantDay = {
  resolved: ResolvedPlant;
  /** Tous les gestes du jour, dans l'ordre de priorité. */
  gestures: PlanGesture[];
  /** Le premier : celui que montrent la carte Balcon et la fiche. */
  first: PlanGesture | null;
  status: PlantDayStatus;
};

export type DayPlanInput = {
  plants: ResolvedPlant[];
  events: MaintenanceEvent[];
  now: Date;
  /** Les conseils météo à montrer (après « Pas aujourd'hui » et « Dans 3 h »). */
  decisions?: ReminderDecision[];
  /** Tous les conseils du moment, même mis en sommeil : une soif reportée ne revient pas en arrosage. */
  allDecisions?: ReminderDecision[];
  climate?: ClimateInfo | null;
  /** Plantes à planter dont le premier geste attend samedi (« Rappelle-moi samedi »). */
  postponed?: Set<string>;
  /** « Pas besoin cette année » : plante → date jusqu'à laquelle son rempotage est écarté. */
  repotSkips?: Map<string, string>;
  /** Plantes récoltées en une fois : question déjà posée (quel jour), « Oui » répondu (lib/garden/harvest-end.ts). */
  harvestEnds?: Map<string, HarvestEndState>;
};

/** L'état d'une plante choisie mais pas encore en terre (Balcon, fiche). */
export const TO_PLANT_LABEL = "À planter";

const STATUS_LABEL: Record<PlantTone, string> = { good: "En forme", watch: "À surveiller", weather: "Météo", new: "Nouvelle" };

/** Ce que veut dire chaque couleur, pour la légende. */
export const STATUS_LEGEND: Array<{ tone: PlantTone; text: string }> = [
  { tone: "good", text: "en forme" },
  { tone: "watch", text: "à surveiller" },
  { tone: "weather", text: "gel ou pluie annoncés" },
];

function headline(title: string) {
  const stripped = title.replace(/^Aujourd’hui,\s*/u, "").replace(/\.$/u, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function taskGesture(kind: GestureKind, resolved: ResolvedPlant, task: CareTask, now: Date, eventIds: Set<string>): PlanGesture {
  const eventId = sessionEventId(resolved.plant.id, task.id, now);
  const done = eventIds.has(eventId);
  return {
    key: `task:${eventId}`,
    kind,
    plantId: resolved.plant.id,
    title: headline(task.title),
    instruction: task.instruction,
    minutes: task.minutes,
    done,
    doneEventId: done ? eventId : undefined,
    source: { type: "task", task: { resolved, task, eventId, done } },
  };
}

function decisionGesture(kind: GestureKind, decision: ReminderDecision): PlanGesture {
  return {
    key: `decision:${decision.plantId}:${decision.cause ?? decision.taskType}`,
    kind,
    plantId: decision.plantId,
    title: decision.title,
    instruction: decision.body,
    minutes: 3,
    done: false,
    source: { type: "decision", decision },
  };
}

const isWeatherAlert = (decision: ReminderDecision) => decision.cause !== undefined && decision.cause !== "thirst";

function statusOf(resolved: ResolvedPlant, gestures: PlanGesture[], events: MaintenanceEvent[]): PlantDayStatus {
  const pending = gestures.filter((gesture) => !gesture.done);
  const alerts = pending.filter((gesture) => gesture.kind === "alert").map((gesture) => (gesture.source.type === "decision" ? gesture.source.decision.cause : undefined));
  if (alerts.includes("frost")) return { tone: "weather", label: "Gel annoncé" };
  if (alerts.includes("rain")) return { tone: "weather", label: "Pluie annoncée" };
  if (alerts.length > 0 || pending.some((gesture) => gesture.kind === "watering")) return { tone: "watch", label: STATUS_LABEL.watch };
  if (!events.some((event) => event.plantId === resolved.plant.id)) return { tone: "new", label: STATUS_LABEL.new };
  return { tone: "good", label: STATUS_LABEL.good };
}

export function planDay({ plants, events, now, decisions = [], allDecisions = decisions, climate, postponed, repotSkips, harvestEnds }: DayPlanInput): PlantDay[] {
  const today = startOfDay(now);
  const todayKey = dayKey(now);
  const month = now.getMonth() + 1;
  const eventIds = new Set(events.map((event) => event.id));
  // Pluie ou orage annoncés : on ne dit d'arroser aucune plante, même une fois l'alerte cochée.
  const rainComing = allDecisions.some((decision) => decision.cause === "rain" || decision.cause === "storm");
  const subjectOf = (resolved: ResolvedPlant): CalendarSubject => ({ id: resolved.plant.id, entry: resolved.entry, displayName: plantDisplayName(resolved), addedAt: resolved.plant.addedAt, toPlant: resolved.plant.toPlant, ...potHistory(resolved.plant, events), repotSkippedUntil: repotSkips?.get(resolved.plant.id) });
  const subjects = plants.filter((resolved) => !resolved.plant.toPlant).map(subjectOf);
  const seasonByPlant = new Map<string, CalendarActivity[]>();
  for (const activity of calendarActivities(subjects, month, { climate, now })) {
    if (!["sow", "plant", "repot"].includes(activity.kind)) continue;
    seasonByPlant.set(activity.subjectId, [...(seasonByPlant.get(activity.subjectId) ?? []), activity]);
  }

  return plants.map((resolved, index) => {
    const plantId = resolved.plant.id;
    const gestures: PlanGesture[] = [];
    const startGesture = (done: boolean, eventId?: string): PlanGesture => {
      const activity = startActivity(subjectOf(resolved), month, { climate });
      return { key: `season:${activity.key}`, kind: "season", plantId, title: activity.title, instruction: activity.description, minutes: 10, done, doneEventId: eventId, source: { type: "season", activity } };
    };

    // À planter : pas encore en terre, un seul geste (« Sème la mâche », « Plante la lavande »).
    if (resolved.plant.toPlant) {
      // Reporté à samedi : rien sur Aujourd'hui d'ici là.
      if (postponed?.has(plantId)) return { resolved, gestures: [], first: null, status: { tone: "new" as const, label: TO_PLANT_LABEL } };
      const first = startGesture(false);
      return { resolved, gestures: [first], first, status: { tone: "new" as const, label: TO_PLANT_LABEL } };
    }
    // Récoltée en une fois : le pot libre attend un choix, ou la question « Tout récolté ? » remplace sa ligne.
    const harvestEnd = harvestEnds?.get(plantId);
    if (potIsFree(resolved, harvestEnd)) {
      const first: PlanGesture = { key: `harvest-end:${plantId}:free`, kind: "harvest", plantId, title: FREE_POT_TITLE, instruction: freePotSubtitle(resolved.entry), minutes: 2, done: false, source: { type: "harvest-end", stage: "free", resolved, quiet: freePotIsQuiet(harvestEnd, now) } };
      return { resolved, gestures: [first], first, status: { tone: "new" as const, label: "Pot libre" } };
    }
    if (harvestQuestionDue(resolved, events, now, harvestEnd, climate)) {
      const first: PlanGesture = { key: `harvest-end:${plantId}:question`, kind: "harvest", plantId, title: harvestQuestion(resolved.entry), instruction: HARVEST_QUESTION_DETAIL, minutes: 1, done: false, source: { type: "harvest-end", stage: "question", resolved } };
      return { resolved, gestures: [first], first, status: { tone: "good" as const, label: STATUS_LABEL.good } };
    }
    const own = decisions.filter((decision) => decision.plantId === plantId);
    const ownAll = allDecisions.filter((decision) => decision.plantId === plantId);

    // 1. Alertes météo (gel, orage, vent, chaleur, pluie).
    for (const decision of own.filter(isWeatherAlert)) gestures.push(decisionGesture("alert", decision));

    // 2. Arrosage : déjà fait aujourd'hui, demandé par la météo (soif), ou dû selon son rythme.
    const tasks = tasksForMonth(resolved.entry, month).filter((task) => !task.everyDays || spacedTaskDue(resolved, task, events, today));
    const wateringTask = tasks.find((task) => task.type === "watering");
    const wateredToday = events.find((event) => event.plantId === plantId && event.type === "watering" && dayKey(new Date(event.completedAt)) === todayKey);
    const thirst = own.find((decision) => decision.cause === "thirst");
    const thirstSnoozed = ownAll.some((decision) => decision.cause === "thirst" || decision.cause === "heat") && !thirst;
    const lastWatering = lastEventDate(events, plantId, "watering", today);
    const wateringDue = !lastWatering || today.getTime() - lastWatering.getTime() >= resolved.entry.care.wateringIntervalHours * 3_600_000;
    if (wateredToday) {
      // Arrosée aujourd'hui : la ligne reste, cochée, même quand le conseil météo qui l'a demandée s'est tu.
      const task = wateringTask ?? { id: "check-soil", type: "watering" as const, title: `Arrose ${resolved.entry.label}`, instruction: "Enfonce un doigt sur 2 cm : arrose doucement au pied seulement si la terre est sèche.", minutes: 3, doneTitle: "Arrosage noté.", doneText: "" };
      gestures.push({ ...taskGesture("watering", resolved, task, now, eventIds), done: true, doneEventId: wateredToday.id });
    } else if (!rainComing && !own.some((decision) => decision.cause === "heat")) {
      if (thirst) gestures.push(decisionGesture("watering", thirst));
      else if (wateringTask && wateringDue && !thirstSnoozed) gestures.push(taskGesture("watering", resolved, wateringTask, now, eventIds));
    }

    // 3. Récolte.
    for (const task of tasks.filter((candidate) => candidate.type === "harvest")) gestures.push(taskGesture("harvest", resolved, task, now, eventIds));

    // 4. Semée ou plantée aujourd'hui : son premier geste reste, coché.
    const started = events.find((event) => event.id === startEventId(plantId));
    if (started && dayKey(new Date(started.completedAt)) === todayKey) gestures.push(startGesture(true, started.id));

    // Plantation, semis, rempotage du mois, puis les gestes de suite d'un semis ou d'une plantation
    // (éclaircir, sortir les plants, pincer). Déjà notés avant aujourd'hui : ils ne reviennent pas.
    const followUps = followUpsFor(resolved, events, now, climate);
    const doneFollowUps = (["thin", "outdoors", "pinch"] as const)
      .map((kind) => events.find((event) => event.id === `${plantId}:${kind}` && dayKey(new Date(event.completedAt)) === todayKey))
      .filter((event): event is MaintenanceEvent => Boolean(event))
      .map((event) => ({ key: `${plantId}:${event.id.split(":").at(-1)}`, kind: "care" as const, subjectId: plantId, entry: resolved.entry, typeLabel: "", title: event.note ?? "Geste fait", description: "", tag: "", tone: "lime" as const, eventType: event.type, followUp: event.id.split(":").at(-1) as "thin" }));
    // Semée ou plantée ce mois-ci par son premier geste : pas de « Sème… » ou « Plante… » en plus ce mois-là.
    const startedThisMonth = started !== undefined && new Date(started.completedAt).getMonth() === now.getMonth() && new Date(started.completedAt).getFullYear() === now.getFullYear();
    const season = (seasonByPlant.get(plantId) ?? []).filter((activity) => !(startedThisMonth && (activity.kind === "sow" || activity.kind === "plant")));
    for (const activity of [...season, ...followUps, ...doneFollowUps]) {
      if (activityDone(activity, events, now)) {
        const event = eventForActivity(activity, now);
        const logged = events.find((candidate) => candidate.id === event.id);
        if (!logged || dayKey(new Date(logged.completedAt)) !== todayKey) continue;
        gestures.push({ key: `season:${activity.key}`, kind: "season", plantId, title: activity.title, instruction: activity.description, minutes: 10, done: true, doneEventId: logged.id, source: { type: "season", activity } });
      } else {
        gestures.push({ key: `season:${activity.key}`, kind: "season", plantId, title: activity.title, instruction: activity.description, minutes: 10, done: false, source: { type: "season", activity } });
      }
    }

    // 5. Engrais, quand il est dû.
    for (const task of tasks.filter((candidate) => candidate.type === "fertilizing")) gestures.push(taskGesture("fertilizing", resolved, task, now, eventIds));

    // 6. Entretien : un seul par jour, qui tourne d'un jour à l'autre.
    const care = tasks.filter((task) => !["watering", "harvest", "fertilizing"].includes(task.type));
    if (care.length > 0) gestures.push(taskGesture("care", resolved, care[(dayOfYear(now) + index) % care.length], now, eventIds));

    return { resolved, gestures, first: gestures[0] ?? null, status: statusOf(resolved, gestures, events) };
  });
}

/** Le plan d'une plante, ou une journée vide si elle n'y est pas. */
export function dayOf(plan: PlantDay[], plantId: string) {
  return plan.find((day) => day.resolved.plant.id === plantId) ?? null;
}

/** L'événement à noter quand on fait ce geste. */
export function eventForGesture(gesture: PlanGesture, now: Date): MaintenanceEvent {
  if (gesture.source.type === "task") return eventForSessionTask(gesture.source.task, now);
  if (gesture.source.type === "season") return eventForActivity(gesture.source.activity, now);
  // La question de fin de récolte et le pot libre ne se cochent pas : ils ouvrent « Ton pot est libre ».
  if (gesture.source.type === "harvest-end") throw new Error("La fin de récolte ne se note pas comme un geste");
  return eventForReminder(gesture.source.decision, now);
}

/** La ligne courte d'une carte Balcon : le premier geste, « fait », ou rien à faire. */
export function gestureLine(day: PlantDay | null) {
  if (!day?.first) return "Rien à faire aujourd’hui";
  return day.first.done ? "✓ Fait aujourd’hui" : day.first.title;
}
