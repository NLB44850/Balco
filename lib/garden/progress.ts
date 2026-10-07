/**
 * La progression : ce que tes gestes ont permis (eau économisée, récoltes à venir), le chemin de
 * chaque plante depuis son arrivée, et les petites victoires à fêter juste après un geste.
 * Logique pure.
 */
import { MONTH_LONG, type Month } from "../plants/catalog";
import { capitalize, objectPronoun, stressedPronoun, subjectPronoun, verb } from "../plants/grammar";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { computeBadges, computeProgress, computeStats, dayKey, daysBetween, followedDays, isAvoidedWatering, plantDisplayName, type ResolvedPlant } from "./garden-logic";
import type { PlantPhoto } from "./photos";

const DAY_MS = 86_400_000;
/** Un arrosage de balcon mouille environ un cinquième du volume du pot. */
const WATERING_SHARE_OF_POT = 0.2;

// --- Eau économisée -------------------------------------------------------------

export { isAvoidedWatering } from "./garden-logic";

export function litersPerWatering(resolved: ResolvedPlant) {
  return Math.round(resolved.entry.potLiters * WATERING_SHARE_OF_POT * 10) / 10;
}

/** Arrosages évités grâce à la pluie et litres économisés, sur la période donnée. */
export function waterSaved(plants: ResolvedPlant[], events: MaintenanceEvent[], from: Date, to: Date) {
  const byId = new Map(plants.map((resolved) => [resolved.plant.id, resolved]));
  let avoided = 0;
  let liters = 0;
  for (const event of events) {
    const resolved = byId.get(event.plantId);
    const time = new Date(event.completedAt).getTime();
    if (!resolved || !isAvoidedWatering(event) || time < from.getTime() || time >= to.getTime()) continue;
    avoided += 1;
    liters += litersPerWatering(resolved);
  }
  return { avoided, liters: Math.round(liters * 10) / 10 };
}

/** « 1,5 L » */
export function formatLiters(liters: number) {
  return `${liters.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} L`;
}

// --- Récoltes à venir -------------------------------------------------------------

export type UpcomingHarvest = { resolved: ResolvedPlant; now: boolean; label: string };

/** Les plantes à récolter ce mois-ci, puis celles dont la récolte commence le mois prochain. */
export function upcomingHarvests(plants: ResolvedPlant[], now = new Date()): UpcomingHarvest[] {
  const month = (now.getMonth() + 1) as Month;
  const next = ((month % 12) + 1) as Month;
  const current = plants.filter(({ entry }) => entry.harvestMonths.includes(month)).map((resolved) => ({ resolved, now: true, label: "C’est le moment" }));
  const soon = plants
    .filter(({ entry }) => !entry.harvestMonths.includes(month) && entry.harvestMonths.includes(next))
    .map((resolved) => ({ resolved, now: false, label: `À partir de ${MONTH_LONG[next - 1]}` }));
  return [...current, ...soon];
}

// --- Progression d'une plante ---------------------------------------------------------

export type PlantStage = { label: string; detail: string };
export type PlantMilestone = { key: string; icon: string; label: string; date: string };

export type PlantProgress = {
  daysOnBalcony: number;
  gestures: number;
  waterings: number;
  harvests: number;
  photos: number;
  /** Gestes par semaine, des 8 dernières semaines (la plus ancienne d'abord, la semaine en cours en dernier). */
  weeks: number[];
  /** Semaines (sur ces 8) où la plante était déjà sur le balcon : les plus récentes. */
  trackedWeeks: number;
  /** Semaines soignées, parmi celles où elle était là. */
  activeWeeks: number;
  stage: PlantStage;
  milestones: PlantMilestone[];
};

const WEEKS = 8;

/** Mois (1–12) jusqu'au prochain mois de récolte, 0 si c'est ce mois-ci, null s'il n'y en a pas. */
function monthsToHarvest(harvestMonths: Month[], month: Month) {
  for (let offset = 0; offset < 12; offset += 1) {
    if (harvestMonths.includes((((month - 1 + offset) % 12) + 1) as Month)) return offset;
  }
  return null;
}

export function plantStage(resolved: ResolvedPlant, daysOnBalcony: number, now = new Date()): PlantStage {
  const { entry } = resolved;
  const month = (now.getMonth() + 1) as Month;
  const toHarvest = monthsToHarvest(entry.harvestMonths, month);
  if (toHarvest === 0) return { label: "En récolte", detail: `C’est la saison : récolte au fur et à mesure, ${subjectPronoun(entry)} ${verb(entry, "produira", "produiront")} davantage.` };
  if (daysOnBalcony < 21) return { label: `${capitalize(subjectPronoun(entry))} ${verb(entry, "s’installe", "s’installent")}`, detail: `${verb(entry, "Ses", "Leurs")} racines prennent leurs marques : garde la terre juste humide.` };
  if (entry.perennial && [12, 1, 2].includes(month)) return { label: "Au repos", detail: `${capitalize(subjectPronoun(entry))} ${verb(entry, "passe", "passent")} l’hiver au ralenti : peu d’eau, et ${subjectPronoun(entry)} ${verb(entry, "repartira", "repartiront")} au printemps.` };
  if (toHarvest !== null && toHarvest <= 2) {
    const start = MONTH_LONG[(((month - 1 + toHarvest) % 12) + 1) - 1];
    return { label: "Bientôt la récolte", detail: `Encore un peu de patience : premières récoltes en ${start}.` };
  }
  if (!entry.perennial && month >= 10 && (toHarvest === null || toHarvest > 4)) return { label: "Fin de saison", detail: `${verb(entry, "Sa", "Leur")} saison touche à sa fin : tu pourras ${objectPronoun(entry)} remplacer au printemps.` };
  return { label: "En croissance", detail: `${capitalize(subjectPronoun(entry))} ${verb(entry, "pousse", "poussent")} : tes gestes réguliers font toute la différence.` };
}

export function plantProgress(resolved: ResolvedPlant, events: MaintenanceEvent[], photos: PlantPhoto[], now = new Date()): PlantProgress {
  const id = resolved.plant.id;
  const own = events.filter((event) => event.plantId === id).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const addedAt = new Date(resolved.plant.addedAt);
  const daysOnBalcony = Number.isFinite(addedAt.getTime()) ? Math.max(0, daysBetween(addedAt, now)) : 0;

  const weeks = Array.from({ length: WEEKS }, () => 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  for (const event of own) {
    const index = WEEKS - 1 - Math.floor((end - new Date(event.completedAt).getTime()) / (7 * DAY_MS));
    if (index >= 0 && index < WEEKS) weeks[index] += 1;
  }
  // Une plante arrivée il y a 3 semaines ne se juge pas sur 8 : seules comptent les semaines où elle était là.
  const trackedWeeks = Number.isFinite(addedAt.getTime()) ? Math.min(WEEKS, Math.max(1, Math.ceil((end - addedAt.getTime()) / (7 * DAY_MS)))) : WEEKS;

  const milestones: PlantMilestone[] = [];
  if (Number.isFinite(addedAt.getTime())) milestones.push({ key: "added", icon: "🪴", label: "Arrivée sur ton balcon", date: resolved.plant.addedAt });
  const firstOf = (type: MaintenanceEvent["type"]) => own.find((event) => event.type === type);
  const firstHarvest = firstOf("harvest");
  if (firstHarvest) milestones.push({ key: "harvest", icon: "🧺", label: "Première récolte", date: firstHarvest.completedAt });
  const firstFeed = firstOf("fertilizing");
  if (firstFeed) milestones.push({ key: "feed", icon: "🌱", label: "Premier engrais", date: firstFeed.completedAt });
  const firstRepot = firstOf("repotting");
  if (firstRepot) milestones.push({ key: "repot", icon: "🪴", label: "Premier rempotage", date: firstRepot.completedAt });
  if (own.length >= 10) milestones.push({ key: "ten", icon: "✨", label: `10 gestes pour ${stressedPronoun(resolved.entry)}`, date: own[9].completedAt });
  const plantPhotos = photos.filter((photo) => photo.plantId === id);
  const firstPhoto = [...plantPhotos].sort((a, b) => a.takenAt.localeCompare(b.takenAt))[0];
  if (firstPhoto) milestones.push({ key: "photo", icon: "📷", label: "Première photo", date: firstPhoto.takenAt });
  milestones.sort((a, b) => b.date.localeCompare(a.date));

  return {
    daysOnBalcony,
    gestures: own.length,
    waterings: own.filter((event) => event.type === "watering").length,
    harvests: own.filter((event) => event.type === "harvest").length,
    photos: plantPhotos.length,
    weeks,
    trackedWeeks,
    activeWeeks: weeks.slice(WEEKS - trackedWeeks).filter((count) => count > 0).length,
    stage: plantStage(resolved, daysOnBalcony, now),
    milestones,
  };
}

/** « Soignée 3 semaines sur 4 depuis son arrivée », « Soignée 5 semaines sur les 8 dernières ». */
export function careWeeksLabel({ activeWeeks, trackedWeeks }: Pick<PlantProgress, "activeWeeks" | "trackedWeeks">) {
  if (trackedWeeks === 1) return activeWeeks > 0 ? "Soignée cette semaine" : "Ses soins de la semaine s’afficheront ici";
  if (activeWeeks === 0) return trackedWeeks < WEEKS ? "Depuis son arrivée : ses soins s’afficheront ici" : "Les 8 dernières semaines : ses soins s’afficheront ici";
  const weeksLabel = `Soignée ${activeWeeks} semaine${activeWeeks > 1 ? "s" : ""}`;
  return trackedWeeks < WEEKS ? `${weeksLabel} sur ${trackedWeeks} depuis son arrivée` : `${weeksLabel} sur les 8 dernières`;
}

/** « depuis 12 jours », « depuis 3 mois » */
export function sinceLabel(days: number) {
  if (days <= 0) return "depuis aujourd’hui";
  if (days < 60) return `depuis ${days} jour${days > 1 ? "s" : ""}`;
  return `depuis ${Math.round(days / 30)} mois`;
}

// --- Petites victoires -------------------------------------------------------------

const STREAK_STEPS = [3, 7, 14, 30, 60, 100];

/** `big` : fête en plein écran (nouveau badge, 1ʳᵉ récolte d'une plante) ; sinon, un mot dans le message du bas. */
export type Celebration = { kind: "badge" | "level" | "streak" | "harvest"; emoji: string; title: string; detail: string; big: boolean };

/**
 * Ce qu'un geste vient de débloquer : un badge, un niveau, une série de jours, une récolte. Seuls un
 * nouveau badge et la première récolte d'une plante se fêtent en grand ; le reste se dit en un mot dans
 * le message du bas (la ligne cochée a déjà son animation). Rien sinon.
 */
export function celebrationFor(plants: ResolvedPlant[], before: MaintenanceEvent[], after: MaintenanceEvent[], now = new Date(), past: ResolvedPlant[] = []): Celebration | null {
  const beforeStats = computeStats(plants, before, now, past);
  const afterStats = computeStats(plants, after, now, past);
  const beforeBadges = computeBadges(beforeStats);
  const afterBadges = computeBadges(afterStats);
  const badge = afterBadges.find((item, index) => item.unlocked && !beforeBadges[index].unlocked);
  if (badge) return { kind: "badge", emoji: "🏅", title: `Nouveau badge : ${badge.title}`, detail: `${badge.detail} : c’est fait, bravo !`, big: true };

  const beforeLevel = computeProgress(beforeStats, beforeBadges);
  const afterLevel = computeProgress(afterStats, afterBadges);
  if (afterLevel.level > beforeLevel.level) return { kind: "level", emoji: "🌟", title: `Niveau ${afterLevel.level}`, detail: `Te voilà ${afterLevel.levelTitle}. Ton balcon te dit merci !`, big: false };

  const streakBefore = followedDays(plants, before, now);
  const streakAfter = followedDays(plants, after, now);
  const step = STREAK_STEPS.find((days) => streakAfter >= days && streakBefore < days);
  if (step) return { kind: "streak", emoji: "🔥", title: `${step} jours de suite`, detail: "Ton balcon adore ta régularité.", big: false };

  const known = new Set(before.map((event) => event.id));
  for (const event of after) {
    if (known.has(event.id) || event.type !== "harvest") continue;
    const resolved = plants.find(({ plant }) => plant.id === event.plantId);
    if (!resolved) continue;
    const name = plantDisplayName(resolved);
    const first = !before.some((old) => old.plantId === event.plantId && old.type === "harvest");
    return first
      ? { kind: "harvest", emoji: "🧺", title: `Première récolte de ${name}`, detail: "Le plus beau moment du balcon. Bravo !", big: true }
      : { kind: "harvest", emoji: "🧺", title: `Récolte de ${name}`, detail: "Bon appétit ! Récolter souvent l’encourage à produire.", big: false };
  }
  return null;
}

/**
 * Comment fêter : en plein écran au plus une fois par jour (`lastBigDay` : le jour de la dernière grande
 * fête), sinon un mot devant le message du bas (« 🔥 3 jours de suite »). Rien à fêter : rien.
 */
export function celebrationStyle(celebration: Celebration | null, lastBigDay: string | null, now = new Date()): { big: boolean; line: string | null } {
  if (!celebration) return { big: false, line: null };
  if (celebration.big && lastBigDay !== dayKey(now)) return { big: true, line: null };
  return { big: false, line: `${celebration.emoji} ${celebration.title}` };
}

/** « 🔥 3 jours de suite · Arrose le thym : noté · +4 points » : le mot de la fête devant le message habituel. */
export function withCheer(line: string | null, text: string) {
  return line ? `${line} · ${text}` : text;
}

/** Pour les tests et l'affichage : le jour d'un jalon. */
export function milestoneDate(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (dayKey(date) === dayKey(now)) return "aujourd’hui";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }) });
}
