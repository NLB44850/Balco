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
import type { GardenPlant } from "../garden/garden-logic";
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
};

export type SyncLocation = { city: string; latitude: number; longitude: number; timezone: string };

export type Outbox = {
  plants: Record<string, GardenPlant>;
  events: Record<string, MaintenanceEvent>;
  deletedEventIds: string[];
  profileDirty: boolean;
  settingsDirty: boolean;
};

export type LocalGardenState = {
  plants: GardenPlant[];
  events: MaintenanceEvent[];
  firstName?: string;
  onboarding: OnboardingAnswers | null;
  settings: SyncSettings;
};

export type SyncPushPayload = {
  profile?: { firstName: string | null; balcony: OnboardingAnswers | null };
  settings?: SyncSettings;
  location?: SyncLocation;
  plants: Array<GardenPlant & { updatedAt: string }>;
  events: MaintenanceEvent[];
  deletedEventIds: string[];
};

export type SyncSnapshotPayload = {
  profile: { firstName: string | null; balcony: OnboardingAnswers | null };
  settings: SyncSettings | null;
  plants: Array<GardenPlant & { updatedAt: string }>;
  events: MaintenanceEvent[];
  serverTime: string;
};

export function emptyOutbox(): Outbox {
  return { plants: {}, events: {}, deletedEventIds: [], profileDirty: false, settingsDirty: false };
}

export function isOutboxEmpty(outbox: Outbox) {
  return Object.keys(outbox.plants).length === 0 && Object.keys(outbox.events).length === 0 && outbox.deletedEventIds.length === 0 && !outbox.profileDirty && !outbox.settingsDirty;
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

/** Recombine une boîte envoyée sans succès avec les changements arrivés entre-temps (les plus récents gagnent). */
export function mergeOutbox(older: Outbox, newer: Outbox): Outbox {
  let merged: Outbox = { ...older, plants: { ...older.plants, ...newer.plants }, profileDirty: older.profileDirty || newer.profileDirty, settingsDirty: older.settingsDirty || newer.settingsDirty };
  for (const event of Object.values(newer.events)) merged = recordEvent(merged, event);
  for (const id of newer.deletedEventIds) merged = recordEventDeletion(merged, id);
  return merged;
}

function plantTimestamp(plant: GardenPlant) {
  return plant.updatedAt ?? plant.removedAt ?? plant.addedAt;
}

export function buildPush(outbox: Outbox, local: LocalGardenState, location?: SyncLocation): SyncPushPayload {
  return {
    ...(outbox.profileDirty ? { profile: { firstName: local.firstName?.trim() || null, balcony: local.onboarding } } : {}),
    ...(outbox.settingsDirty ? { settings: local.settings } : {}),
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
  };
}

export type AppliedSnapshot = {
  plants: GardenPlant[];
  events: MaintenanceEvent[];
  firstName?: string;
  onboarding: OnboardingAnswers | null;
  settings: SyncSettings;
};

/**
 * Remplace l'état local par l'état serveur, en réappliquant les changements faits
 * pendant l'appel réseau (`pending`), qui n'ont pas encore été envoyés.
 */
export function applySnapshot(snapshot: SyncSnapshotPayload, pending: Outbox, local: LocalGardenState, maxEvents = 1000): AppliedSnapshot {
  const plants = new Map<string, GardenPlant>(snapshot.plants.map((plant) => [plant.id, plant]));
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
    events: [...events.values()].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, maxEvents),
    firstName: pending.profileDirty ? local.firstName : snapshot.profile.firstName ?? undefined,
    // Le questionnaire d'un autre appareil remplace un questionnaire local ignoré ou absent.
    onboarding: pending.profileDirty ? local.onboarding : serverOnboarding ?? local.onboarding,
    settings: pending.settingsDirty || !snapshot.settings ? local.settings : snapshot.settings,
  };
}

/** N'envoie la position que si elle a vraiment changé (≈ 1 km), pour ne pas réécrire le profil à chaque synchro. */
export function locationChanged(previous: SyncLocation | null | undefined, next: SyncLocation | null | undefined) {
  if (!next) return false;
  if (!previous) return true;
  return previous.city !== next.city || previous.timezone !== next.timezone || Math.abs(previous.latitude - next.latitude) > 0.01 || Math.abs(previous.longitude - next.longitude) > 0.01;
}
