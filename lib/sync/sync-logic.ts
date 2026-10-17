/**
 * Synchronisation du jardin : logique pure, sans React Native, pour rester testable.
 *
 * Protocole :
 *  1. chaque modification locale est notée dans une « boîte d'envoi » (outbox) ;
 *  2. une synchro envoie le contenu de la boîte, puis le serveur renvoie l'état complet ;
 *  3. l'état serveur remplace l'état local, sauf les modifications faites pendant l'appel,
 *     qui sont réappliquées par-dessus et partiront à la synchro suivante.
 *
 * Le serveur fait donc foi : un geste annulé ou une plante retirée sur un appareil
 * disparaît aussi des autres, au lieu de réapparaître à la fusion.
 */
import { mergeAwards, type Awards } from "../garden/awards";
import { capEvents, MAX_STORED_EVENTS, type GardenPlant } from "../garden/garden-logic";
import type { Vacation } from "../garden/vacation";
import type { OnboardingAnswers } from "../plants/catalog";
import type { MaintenanceEvent } from "../reminders/reminder-engine";

export type SyncSettings = {
  enabled: boolean;
  preferredHour: number;
  preferredMinute: number;
  quietStartHour: number;
  quietEndHour: number;
  skipWateringWhenRainExpected: boolean;
  maxNormalRemindersPerDay: number;
  enabledPlantIds: string[];
  vacation?: Vacation | null;
};

export type SyncLocation = { city: string; latitude: number; longitude: number; timezone: string };

export type Outbox = {
  plants: Record<string, GardenPlant>;
  events: Record<string, MaintenanceEvent>;
  deletedEventIds: string[];
  profileDirty: boolean;
  settingsDirty: boolean;
  /** Un badge a été obtenu depuis la dernière synchro : le carnet complet repart (le serveur fait l'union). */
  awardsDirty?: boolean;
};

export type LocalGardenState = {
  plants: GardenPlant[];
  events: MaintenanceEvent[];
  firstName?: string;
  onboarding: OnboardingAnswers | null;
  settings: SyncSettings;
  awards?: Awards;
};

export type SyncPushPayload = {
  profile?: { firstName: string | null; balcony: OnboardingAnswers | null };
  settings?: SyncSettings;
  location?: SyncLocation;
  plants: (GardenPlant & { updatedAt: string })[];
  events: MaintenanceEvent[];
  deletedEventIds: string[];
  awards?: Awards;
};

export type SyncSnapshotPayload = {
  profile: { firstName: string | null; balcony: OnboardingAnswers | null };
  settings: SyncSettings | null;
  plants: (GardenPlant & { updatedAt: string })[];
  events: MaintenanceEvent[];
  /** Absent d'un serveur plus ancien. */
  awards?: Awards;
  serverTime: string;
};

export function emptyOutbox(): Outbox {
  return { plants: {}, events: {}, deletedEventIds: [], profileDirty: false, settingsDirty: false, awardsDirty: false };
}

export function isOutboxEmpty(outbox: Outbox) {
  return Object.keys(outbox.plants).length === 0 && Object.keys(outbox.events).length === 0 && outbox.deletedEventIds.length === 0 && !outbox.profileDirty && !outbox.settingsDirty && !outbox.awardsDirty;
}

export function recordPlant(outbox: Outbox, plant: GardenPlant): Outbox {
  return { ...outbox, plants: { ...outbox.plants, [plant.id]: plant } };
}

export function recordEvent(outbox: Outbox, event: MaintenanceEvent): Outbox {
  return { ...outbox, events: { ...outbox.events, [event.id]: event }, deletedEventIds: outbox.deletedEventIds.filter((id) => id !== event.id) };
}

export function recordEventDeletion(outbox: Outbox, eventId: string): Outbox {
  const { [eventId]: _removed, ...events } = outbox.events;
  return { ...outbox, events, deletedEventIds: outbox.deletedEventIds.includes(eventId) ? outbox.deletedEventIds : [...outbox.deletedEventIds, eventId] };
}

export function markProfileDirty(outbox: Outbox): Outbox {
  return { ...outbox, profileDirty: true };
}

export function markSettingsDirty(outbox: Outbox): Outbox {
  return { ...outbox, settingsDirty: true };
}

export function markAwardsDirty(outbox: Outbox): Outbox {
  return { ...outbox, awardsDirty: true };
}

/** Recombine une boîte envoyée sans succès avec les changements arrivés entre-temps (les plus récents gagnent). */
export function mergeOutbox(older: Outbox, newer: Outbox): Outbox {
  let merged: Outbox = { ...older, plants: { ...older.plants, ...newer.plants }, profileDirty: older.profileDirty || newer.profileDirty, settingsDirty: older.settingsDirty || newer.settingsDirty, awardsDirty: Boolean(older.awardsDirty || newer.awardsDirty) };
  for (const event of Object.values(newer.events)) merged = recordEvent(merged, event);
  for (const id of newer.deletedEventIds) merged = recordEventDeletion(merged, id);
  return merged;
}

function plantTimestamp(plant: GardenPlant) {
  return plant.updatedAt ?? plant.removedAt ?? plant.addedAt;
}

/**
 * L'heure de la modification d'une plante, toujours après la précédente. Le serveur garde la modification la plus
 * récente : une plante ajoutée à une date simulée dans le futur (Réglages → Version de test) avait une date plus
 * récente que son retrait, qui était alors ignoré (retour du 14/10 : Nora voyait encore des plantes retirées).
 */
export function nextUpdatedAt(plant: GardenPlant, now = Date.now()) {
  const stamps = [plant.updatedAt, plant.removedAt, plant.addedAt].map((value) => (value ? Date.parse(value) : NaN)).filter(Number.isFinite);
  return new Date(Math.max(now, ...stamps.map((stamp) => stamp + 1))).toISOString();
}

/**
 * Renvoie une fois toutes les plantes du téléphone, datées de maintenant : répare un serveur resté sur une plante
 * retirée (date simulée, ou sauvegarde depuis un autre téléphone entre-temps). Le téléphone fait foi.
 */
export function resendPlants(plants: GardenPlant[], now = Date.now()): Outbox {
  return plants.reduce((outbox, plant) => recordPlant(outbox, { ...plant, updatedAt: nextUpdatedAt(plant, now) }), emptyOutbox());
}

/** Ce que le serveur accepte en une synchro (server/reminders-router.ts) : au-delà, le reste part au tour suivant. */
export const PUSH_LIMITS = { plants: 200, events: 1000, deletedEventIds: 1000 } as const;

/**
 * Un paquet envoyable, et ce qui attendra le tour suivant. Sans ce découpage, un téléphone resté longtemps hors ligne
 * (ou un premier envoi de tout l'historique) dépassait la limite du serveur et sa synchro était refusée à chaque fois.
 */
export function takeBatch(outbox: Outbox): { batch: Outbox; rest: Outbox | null } {
  const plants = Object.entries(outbox.plants);
  const events = Object.entries(outbox.events);
  if (plants.length <= PUSH_LIMITS.plants && events.length <= PUSH_LIMITS.events && outbox.deletedEventIds.length <= PUSH_LIMITS.deletedEventIds) return { batch: outbox, rest: null };
  return {
    batch: { ...outbox, plants: Object.fromEntries(plants.slice(0, PUSH_LIMITS.plants)), events: Object.fromEntries(events.slice(0, PUSH_LIMITS.events)), deletedEventIds: outbox.deletedEventIds.slice(0, PUSH_LIMITS.deletedEventIds) },
    rest: { ...emptyOutbox(), plants: Object.fromEntries(plants.slice(PUSH_LIMITS.plants)), events: Object.fromEntries(events.slice(PUSH_LIMITS.events)), deletedEventIds: outbox.deletedEventIds.slice(PUSH_LIMITS.deletedEventIds) },
  };
}

/** Une boîte d'envoi relue du téléphone : une donnée abîmée devient une boîte vide plutôt qu'un plantage. */
export function readOutbox(stored: unknown): Outbox {
  if (!stored || typeof stored !== "object") return emptyOutbox();
  const value = stored as Partial<Outbox>;
  const isRecord = (item: unknown): item is Record<string, never> => Boolean(item) && typeof item === "object" && !Array.isArray(item);
  return {
    plants: isRecord(value.plants) ? Object.fromEntries(Object.entries(value.plants).filter(([, plant]) => isStoredPlant(plant))) : {},
    events: isRecord(value.events) ? Object.fromEntries(Object.entries(value.events).filter(([, event]) => isStoredEvent(event))) : {},
    deletedEventIds: Array.isArray(value.deletedEventIds) ? value.deletedEventIds.filter((id): id is string => typeof id === "string") : [],
    profileDirty: value.profileDirty === true,
    settingsDirty: value.settingsDirty === true,
    awardsDirty: value.awardsDirty === true,
  };
}

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/** Une plante relue du téléphone a au moins son identifiant, sa plante du catalogue et sa date d'arrivée. */
export function isStoredPlant(value: unknown): value is GardenPlant {
  const plant = value as Partial<GardenPlant> | null;
  return Boolean(plant) && typeof plant === "object" && isString(plant!.id) && isString(plant!.catalogId) && isString(plant!.addedAt);
}

/** Un geste relu du téléphone a au moins son identifiant, sa plante, son type et sa date. */
export function isStoredEvent(value: unknown): value is MaintenanceEvent {
  const event = value as Partial<MaintenanceEvent> | null;
  return Boolean(event) && typeof event === "object" && isString(event!.id) && isString(event!.plantId) && isString(event!.type) && isString(event!.completedAt) && !Number.isNaN(Date.parse(event!.completedAt!));
}

/** Mêmes gestes, dans le même ordre ? (Comparaison rapide : la synchro ne réécrit rien quand rien n'a changé.) */
export function sameEvents(a: MaintenanceEvent[], b: MaintenanceEvent[]) {
  if (a.length !== b.length) return false;
  return a.every((event, index) => {
    const other = b[index];
    return event.id === other.id && event.completedAt === other.completedAt && event.type === other.type && event.plantId === other.plantId && event.note === other.note && event.source === other.source;
  });
}

/** Mêmes plantes, dans le même ordre, avec les mêmes champs ? */
export function samePlants(a: GardenPlant[], b: GardenPlant[]) {
  return a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
}

export function buildPush(outbox: Outbox, local: LocalGardenState, location?: SyncLocation): SyncPushPayload {
  return {
    ...(outbox.profileDirty ? { profile: { firstName: local.firstName?.trim() || null, balcony: local.onboarding } } : {}),
    ...(outbox.settingsDirty ? { settings: local.settings } : {}),
    ...(outbox.awardsDirty && local.awards && Object.keys(local.awards).length > 0 ? { awards: local.awards } : {}),
    ...(location ? { location } : {}),
    plants: Object.values(outbox.plants).map((plant) => ({ ...plant, updatedAt: plantTimestamp(plant) })),
    events: Object.values(outbox.events),
    deletedEventIds: outbox.deletedEventIds,
  };
}

/**
 * Première synchro d'un appareil avec un compte : tout ce qui existe localement part,
 * le serveur fusionne avec ce qu'il connaît déjà (un autre téléphone, par exemple).
 * Les réglages ne partent que si l'utilisateur les a touchés : sinon les valeurs par défaut
 * d'un nouveau téléphone écraseraient celles choisies sur l'ancien.
 */
export function seedOutbox(local: LocalGardenState, defaultSettings: SyncSettings): Outbox {
  let outbox = emptyOutbox();
  for (const plant of local.plants) outbox = recordPlant(outbox, plant);
  for (const event of local.events) outbox = recordEvent(outbox, event);
  const hasProfile = Boolean(local.firstName?.trim()) || Boolean(local.onboarding && !local.onboarding.skipped);
  return {
    ...outbox,
    profileDirty: hasProfile,
    settingsDirty: JSON.stringify(local.settings) !== JSON.stringify(defaultSettings),
    awardsDirty: Object.keys(local.awards ?? {}).length > 0,
  };
}

export type AppliedSnapshot = {
  plants: GardenPlant[];
  events: MaintenanceEvent[];
  firstName?: string;
  onboarding: OnboardingAnswers | null;
  settings: SyncSettings;
  /** Union du carnet local et de celui du serveur : un badge obtenu sur un téléphone se retrouve sur l'autre. */
  awards: Awards;
};

/**
 * Remplace l'état local par l'état serveur, en réappliquant les changements faits
 * pendant l'appel réseau (`pending`), qui n'ont pas encore été envoyés.
 */
export function applySnapshot(snapshot: SyncSnapshotPayload, pending: Outbox, local: LocalGardenState, maxEvents = MAX_STORED_EVENTS): AppliedSnapshot {
  // La même modification des deux côtés : la copie du téléphone fait foi. Un serveur pas encore à jour (une demande de
  // fusion testée avant d'être en ligne) ne renvoie pas les champs qu'il ignore, comme le choix pour l'hiver (16/10).
  const localPlants = new Map(local.plants.map((plant) => [plant.id, plant]));
  const plants = new Map<string, GardenPlant>(
    snapshot.plants.map((plant) => {
      const mine = localPlants.get(plant.id);
      return [plant.id, mine && plantTimestamp(mine) === plantTimestamp(plant) ? mine : plant];
    }),
  );
  for (const plant of Object.values(pending.plants)) {
    const server = plants.get(plant.id);
    if (!server || plantTimestamp(plant) >= plantTimestamp(server)) plants.set(plant.id, plant);
  }

  const deleted = new Set(pending.deletedEventIds);
  const events = new Map<string, MaintenanceEvent>();
  for (const event of snapshot.events) if (!deleted.has(event.id)) events.set(event.id, event);
  for (const event of Object.values(pending.events)) events.set(event.id, event);

  const serverOnboarding = snapshot.profile.balcony;
  return {
    // Ordre d'ajout conservé pour l'affichage.
    plants: [...plants.values()].sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
    events: capEvents([...events.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt)), maxEvents),
    firstName: pending.profileDirty ? local.firstName : snapshot.profile.firstName ?? undefined,
    // Le questionnaire d'un autre appareil remplace un questionnaire local ignoré ou absent.
    onboarding: pending.profileDirty ? local.onboarding : serverOnboarding ?? local.onboarding,
    settings: pending.settingsDirty || !snapshot.settings ? local.settings : snapshot.settings,
    awards: mergeAwards(local.awards ?? {}, snapshot.awards ?? {}),
  };
}

/** N'envoie la position que si elle a vraiment changé (≈ 1 km), pour ne pas réécrire le profil à chaque synchro. */
export function locationChanged(previous: SyncLocation | null | undefined, next: SyncLocation | null | undefined) {
  if (!next) return false;
  if (!previous) return true;
  return previous.city !== next.city || previous.timezone !== next.timezone || Math.abs(previous.latitude - next.latitude) > 0.01 || Math.abs(previous.longitude - next.longitude) > 0.01;
}
