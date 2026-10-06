import { dayKey, sessionEventId, startEventId } from "../garden/garden-logic";
import type { MaintenanceEvent, MaintenanceTaskType } from "../reminders/reminder-engine";
import { describeSowing, formatMonthRange, MONTH_LONG, sowsIndoors, type CatalogPlant, type Month } from "./catalog";
import { adaptToClimate, type ClimateInfo } from "./climate";
import { sowsOnWindowsill } from "./indoor";
import { REPOTTING } from "./repotting";

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
  /** Premier geste d'une plante à planter : le cocher l'installe sur le balcon. */
  start?: true;
  /** Rempotage léger : changer les 5 cm de terre du dessus, sans changer de pot. */
  topdress?: true;
  /** Geste de suite (éclaircir, sortir les plants, pincer) : une seule fois par plante. */
  followUp?: "thin" | "outdoors" | "pinch";
};

/** Le type de geste, écrit simplement (sans capitales), pour les écrans. */
export const ACTIVITY_KIND_LABELS: Record<CalendarActivityKind, string> = { sow: "Semis", plant: "Plantation", repot: "Rempotage", harvest: "Récolte", care: "Entretien" };

/**
 * `addedAt` : arrivée de la plante sur le balcon (absente pour les idées d'un balcon vide).
 * `toPlant` : sur le balcon mais pas encore en terre ; ses semis et plantations restent proposés.
 */
export type CalendarSubject = {
  id: string;
  entry: CatalogPlant;
  displayName: string;
  addedAt?: string;
  toPlant?: boolean;
  /** Dans son pot depuis (dernier rempotage, sinon plantation, sinon arrivée) ; `potHistory` de garden-logic. */
  inPotSince?: string;
  /** Dernière fois qu'on a changé la terre du dessus. */
  lastTopdress?: string;
  /** Rempotages déjà notés : le pot a grandi d'un tiers à chacun. */
  repots?: number;
  /** « Pas besoin cette année » : pas de rempotage avant cette date (la terre du dessus à la place). */
  repotSkippedUntil?: string;
};
export type CalendarOptions = { climate?: ClimateInfo | null; now?: Date };

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
  for (const subject of subjects) {
    const { id, entry: catalogEntry, displayName, addedAt, toPlant } = subject;
    // Les semis et plantations des plantes frileuses suivent le climat local (Midi plus tôt, montagne plus tard).
    const entry = adaptToClimate(catalogEntry, options.climate);
    // Pas encore en terre : un seul geste, le même que sur Aujourd'hui (« Plante l'ail des ours »), au mois où il
    // est possible ; ni rempotage, ni récolte, ni entretien avant.
    if (toPlant) {
      if (entry.sowMonths.includes(m) || entry.plantMonths.includes(m)) activities.push(startActivity({ id, entry: catalogEntry, displayName, addedAt, toPlant }, m, options));
      continue;
    }
    const tag = displayName.toUpperCase();
    const base = { subjectId: id, entry, tag };
    // Une vivace déjà sur le balcon ne se ressème pas (une annuelle, si : radis, salades…).
    const installedPerennial = addedAt !== undefined && entry.perennial;
    if (entry.sowMonths.includes(m) && !installedPerennial) {
      // Semis précoce d'une plante frileuse : au chaud dans la maison, pas encore sur le balcon.
      const indoors = sowsIndoors(entry, m);
      const description = indoors
        ? `Sème en godets à l’intérieur, au chaud (18 à 22 °C), près d’une fenêtre lumineuse : il fait encore trop froid sur le balcon.${entry.plantMonths.length > 0 ? ` Installe les plants dehors en ${formatMonthRange(entry.plantMonths)}, dans un pot d’au moins ${entry.potLiters} L.` : ""}`
        : `Période de semis : ${describeSowing(entry)}. Prévois un pot d’au moins ${entry.potLiters} L.`;
      activities.push({ ...base, key: `${id}:sow`, kind: "sow", typeLabel: "SEMIS", title: indoors ? `Sème ${entry.label} au chaud` : `Sème ${entry.label}`, description, tone: "lime", eventType: "observation" });
    }
    // Installée sur le balcon : elle est plantée, plus de « Plante … ».
    const alreadyPlanted = addedAt !== undefined && !toPlant;
    if (entry.plantMonths.includes(m) && !alreadyPlanted) {
      activities.push({ ...base, key: `${id}:plant`, kind: "plant", typeLabel: "PLANTATION", title: `Plante ${entry.label}`, description: `Période de plantation : ${formatMonthRange(entry.plantMonths)}. Un terreau frais et un pot percé font la moitié du travail.`, tone: "coral", eventType: "observation" });
    }
    // Rempotage selon le besoin : jamais la première saison, puis à son rythme ; les autres années, la terre du dessus.
    const potCare = potCareFor(subject, entry, m, options.now ?? new Date());
    if (potCare === "repot") {
      activities.push({ ...base, key: `${id}:repot`, kind: "repot", typeLabel: "REMPOTAGE", title: `Rempote ${entry.label}`, description: repotDescription(entry, subject.repots ?? 0), tone: "coral", eventType: "repotting" });
    } else if (potCare === "topdress") {
      activities.push({ ...base, key: `${id}:topdress`, kind: "repot", typeLabel: "TERRE NEUVE", title: `Change la terre du dessus ${ofLabel(entry.label)}`, description: "Gratte les 5 cm de terre du dessus sans abîmer les racines, puis remets du terreau neuf. Pas besoin de changer de pot cette année.", tone: "coral", eventType: "repotting", topdress: true });
    }
    if (entry.harvestMonths.includes(m)) {
      activities.push({ ...base, key: `${id}:harvest`, kind: "harvest", typeLabel: "RÉCOLTE", title: `Récolte ${entry.label}`, description: entry.harvestTip, tone: "green", eventType: "harvest" });
    }
    for (const task of entry.tasks) {
      if (GENERIC_TASK_IDS.has(task.id) || !task.months?.includes(m)) continue;
      const feed = task.type === "fertilizing";
      const description = feed && task.everyDays && task.months ? `${task.instruction.replace(/ À refaire dans \d+ jours\.$/u, "")} Tous les ${task.everyDays} jours, ${formatMonthRange(task.months)}.` : task.instruction;
      activities.push({ ...base, key: `${id}:${task.id}`, kind: "care", typeLabel: feed ? "ENGRAIS" : "ENTRETIEN", title: taskHeadline(task.title), description, tone: "lime", eventType: task.type, taskId: task.id });
    }
  }
  return activities.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}

/**
 * Le premier geste d'une plante à planter : « Plante la lavande » si c'est le moment de la planter, sinon
 * « Sème la mâche » (au chaud si le semis du mois se fait à l'intérieur). Hors saison, le verbe suit ce que
 * la plante permet (plant acheté d'abord), et la description donne la bonne période.
 */
export function startActivity(subject: CalendarSubject, month: number, options: CalendarOptions = {}): CalendarActivity {
  const entry = adaptToClimate(subject.entry, options.climate);
  const m = month as Month;
  // L'hiver, sur le rebord intérieur (persil, cresson…) : il fait trop froid dehors.
  if (sowsOnWindowsill(entry, m)) {
    return {
      key: `${subject.id}:start`, kind: "sow", subjectId: subject.id, entry, typeLabel: "SEMIS", title: `Sème ${entry.label} à l’intérieur`,
      description: `Sur un rebord lumineux, dans la maison : un petit pot de terreau, les graines à peine recouvertes, la terre gardée humide. Il fait trop froid dehors : le pot sortira au balcon au printemps.`,
      tag: subject.displayName.toUpperCase(), tone: "lime", eventType: "observation", start: true,
    };
  }
  const plantNow = entry.plantMonths.includes(m);
  const sowNow = entry.sowMonths.includes(m);
  const kind: CalendarActivityKind = plantNow || (!sowNow && entry.plantMonths.length > 0) ? "plant" : "sow";
  const indoors = kind === "sow" && sowsIndoors(entry, m);
  const inSeason = kind === "plant" ? plantNow : sowNow;
  const period = kind === "plant" ? formatMonthRange(entry.plantMonths) : describeSowing(entry);
  const how =
    kind === "plant"
      ? `Installe-la dans un pot percé d’au moins ${entry.potLiters} L, avec un terreau frais, puis arrose bien.`
      : indoors
        ? `Sème en godets à l’intérieur, au chaud (18 à 22 °C), près d’une fenêtre lumineuse.${entry.plantMonths.length > 0 ? ` Installe les plants dehors en ${formatMonthRange(entry.plantMonths)}.` : ""}`
        : `Sème dans un pot d’au moins ${entry.potLiters} L de terreau fin, recouvre à peine et arrose en pluie fine.`;
  const description = inSeason ? how : `${how} Meilleure période : ${period}.`;
  const title = kind === "plant" ? `Plante ${entry.label}` : indoors ? `Sème ${entry.label} au chaud` : `Sème ${entry.label}`;
  return {
    key: `${subject.id}:start`,
    kind,
    subjectId: subject.id,
    entry,
    typeLabel: kind === "plant" ? "PLANTATION" : "SEMIS",
    title,
    description,
    tag: subject.displayName.toUpperCase(),
    tone: kind === "plant" ? "coral" : "lime",
    eventType: "observation",
    start: true,
  };
}

/** « du romarin », « de la menthe », « des fraisiers », « de l’ail des ours ». */
function ofLabel(label: string) {
  if (label.startsWith("le ")) return `du ${label.slice(3)}`;
  if (label.startsWith("les ")) return `des ${label.slice(4)}`;
  return `de ${label}`;
}

/** Il faut ce temps dans son pot avant le premier rempotage ou la première terre neuve. */
const FIRST_SEASON_MONTHS = 10;
const MONTH_MS = 30.44 * 86_400_000;

/**
 * Le soin du pot d'une vivace installée, ce mois-là : « repot » quand son rythme est atteint (tous les N ans),
 * « topdress » (changer la terre du dessus) les autres années, rien la première saison ni hors de ses mois.
 */
export function potCareFor(subject: Pick<CalendarSubject, "id" | "addedAt" | "toPlant" | "inPotSince" | "lastTopdress" | "repotSkippedUntil">, entry: CatalogPlant, month: number, now: Date): "repot" | "topdress" | null {
  const data = REPOTTING[entry.id];
  if (!entry.perennial || !data || subject.addedAt === undefined || subject.toPlant || !entry.repotMonths.includes(month as Month)) return null;
  // Le mois regardé : ce mois-ci, sinon sa prochaine occurrence (Saisons montre les mois à venir).
  const current = now.getMonth() + 1;
  const when = month === current ? now : new Date(now.getFullYear() + (month < current ? 1 : 0), month - 1, 15);
  const age = (when.getTime() - new Date(subject.inPotSince ?? subject.addedAt).getTime()) / MONTH_MS;
  if (age < FIRST_SEASON_MONTHS) return null;
  const skipped = subject.repotSkippedUntil !== undefined && when.getTime() < new Date(subject.repotSkippedUntil).getTime();
  if (age >= data.everyYears[0] * 12 - 2 && !skipped) return "repot";
  if (!data.topdress) return null;
  const sinceTopdress = subject.lastTopdress ? (when.getTime() - new Date(subject.lastTopdress).getTime()) / MONTH_MS : Infinity;
  return sinceTopdress >= FIRST_SEASON_MONTHS ? "topdress" : null;
}

/** Le signe qu'une plante manque de place, quand ses sources n'en donnent pas un à elle. */
export const GENERIC_REPOT_SIGN = "Des racines sortent par les trous du pot ? L’eau ressort tout de suite ? Elle manque de place.";

/** Le pot qu'elle a (celui conseillé, un tiers de plus à chaque rempotage) et celui à prendre. */
export function potSizes(entry: Pick<CatalogPlant, "potLiters">, repots: number) {
  const now = Math.round(entry.potLiters * (4 / 3) ** repots);
  const next = Math.max(now + 1, Math.round(now * (4 / 3)));
  return { now, next, nextWidthCm: potWidthCm(next) };
}

/** Largeur d'un pot à peu près aussi haut que large, en cm : c'est ce qu'on lit en magasin. */
export function potWidthCm(liters: number) {
  return Math.round(Math.cbrt((liters * 1000) / 0.707));
}

/** « Le signe… Si son pot fait environ 10 L, prends-en un d'environ 13 L (27 cm de large)… » */
export function repotDescription(entry: CatalogPlant, repots: number) {
  const sign = REPOTTING[entry.id]?.sign?.replace(/'/gu, "’") ?? GENERIC_REPOT_SIGN;
  const pot = potSizes(entry, repots);
  return `${sign} Si son pot fait environ ${pot.now} L, prends-en un d’environ ${pot.next} L (${pot.nextWidthCm} cm de large), avec du terreau neuf. À faire en ${formatMonthRange(entry.repotMonths)}.`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Identifiant du geste noté depuis le calendrier. Un entretien porte le même que dans la session du jour
 * (cocher d'un côté coche l'autre) ; un semis, une plantation ou un rempotage se note une fois par mois.
 */
export function activityEventId(activity: CalendarActivity, now: Date) {
  if (activity.topdress) return `${activity.subjectId}:calendar-topdress:${monthKey(now)}`;
  if (activity.start) return startEventId(activity.subjectId);
  if (activity.followUp) return `${activity.subjectId}:${activity.followUp}`;
  if (activity.kind === "care" && activity.taskId) return sessionEventId(activity.subjectId, activity.taskId, now);
  if (activity.kind === "harvest") return `${activity.subjectId}:calendar-harvest:${dayKey(now)}`;
  return `${activity.subjectId}:calendar-${activity.kind}:${monthKey(now)}`;
}

export function activityDone(activity: CalendarActivity, events: MaintenanceEvent[], now: Date) {
  const id = activityEventId(activity, now);
  return events.some((event) => event.id === id);
}

/**
 * Pour Saisons (à lire seulement) : ce geste du mois a-t-il déjà été fait, où que ce soit ? Une récolte
 * compte pour la journée (on récolte souvent), d'où qu'elle vienne (Aujourd'hui, la fiche) ; un
 * rempotage, pour le mois ; un semis, une plantation ou un entretien, comme sur Aujourd'hui.
 */
export function activityDoneSoFar(activity: CalendarActivity, events: MaintenanceEvent[], now: Date) {
  if (activityDone(activity, events, now)) return true;
  const today = dayKey(now);
  const month = monthKey(now);
  return events.some((event) => {
    if (event.plantId !== activity.subjectId) return false;
    const date = new Date(event.completedAt);
    if (activity.kind === "harvest") return event.type === "harvest" && dayKey(date) === today;
    if (activity.kind === "repot") return event.type === "repotting" && monthKey(date) === month;
    return false;
  });
}

/** « Faite aujourd'hui » pour une récolte, « fait ce mois-ci » pour le reste. */
export function activityDoneLabel(activity: CalendarActivity) {
  if (activity.kind === "harvest") return "✓ Faite aujourd’hui";
  if (activity.kind === "care") return "✓ Fait aujourd’hui";
  return activity.kind === "plant" || activity.kind === "repot" ? "✓ Faite ce mois-ci" : "✓ Fait ce mois-ci";
}

export function eventForActivity(activity: CalendarActivity, now: Date): MaintenanceEvent {
  return { id: activityEventId(activity, now), plantId: activity.subjectId, type: activity.eventType, completedAt: now.toISOString(), source: "manual", note: activity.title };
}

/** Pour l'accueil : les semis, plantations et rempotages du mois pas encore notés. */
export function seasonalToDo(subjects: CalendarSubject[], events: MaintenanceEvent[], now: Date, options: CalendarOptions = {}) {
  return calendarActivities(subjects, now.getMonth() + 1, { now, ...options }).filter((activity) => ["sow", "plant", "repot"].includes(activity.kind) && !activityDone(activity, events, now));
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

// --- Regroupement par type de geste (Saisons) ------------------------------------

/** L'engrais se range à part de l'entretien : c'est un geste à lui seul, avec son propre rythme. */
export type ActivityGroupKind = CalendarActivityKind | "fertilize";

export type ActivityGroup = { key: ActivityGroupKind; label: string; activities: CalendarActivity[] };

const GROUP_LABELS: Record<ActivityGroupKind, string> = { harvest: "À récolter", care: "Entretien", fertilize: "Engrais", repot: "À rempoter", plant: "À planter", sow: "À semer" };

export function activityGroupKind(activity: CalendarActivity): ActivityGroupKind {
  return activity.kind === "care" && activity.eventType === "fertilizing" ? "fertilize" : activity.kind;
}

/** Les gestes rangés par type, dans l'ordre de la liste (récoltes d'abord, semis à la fin). */
export function groupActivities(activities: CalendarActivity[]): ActivityGroup[] {
  const groups = new Map<ActivityGroupKind, ActivityGroup>();
  for (const activity of activities) {
    const key = activityGroupKind(activity);
    const group = groups.get(key) ?? { key, label: GROUP_LABELS[key], activities: [] };
    group.activities.push(activity);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** « À récolter · 5 plantes », « Entretien · 3 gestes ». */
export function activityGroupTitle(group: ActivityGroup) {
  const count = group.activities.length;
  // L'entretien regroupe des gestes différents, parfois plusieurs pour la même plante.
  const unit = group.key === "care" ? "geste" : "plante";
  return `${group.label} · ${count} ${unit}${count > 1 ? "s" : ""}`;
}

/** « basilic, menthe, thym et 2 autres » : de quoi reconnaître le groupe sans l'ouvrir. */
export function activityGroupSummary(names: string[], shown = 3) {
  const [first, ...others] = names;
  if (!first) return "";
  const listed = [first, ...others.slice(0, shown - 1).map((name) => name.charAt(0).toLowerCase() + name.slice(1))];
  const rest = names.length - listed.length;
  return `${listed.join(", ")}${rest > 0 ? ` et ${rest} autre${rest > 1 ? "s" : ""}` : ""}`;
}
