import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { router } from "expo-router";

import { useAuth, type SignInResult } from "@/hooks/use-auth";
import type { OnboardingAnswers } from "@/lib/plants/catalog";
import { normalizeOnboarding } from "@/lib/garden/onboarding";
import type { MaintenanceEvent } from "@/lib/reminders/reminder-engine";
import {
  SERVER_PUSH_STORAGE_KEY,
  cancelBalcoReminderNotifications,
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  saveLocalReminderSettings,
  subscribeReminderSettings,
} from "@/lib/reminders/local-notifications";
import { deviceId } from "@/lib/sync/device-id";
import { getDevicePushToken } from "@/lib/sync/push-token";
import type { Plan } from "@/lib/plans";
import {
  applySnapshot,
  buildPush,
  emptyOutbox,
  locationChanged,
  markProfileDirty,
  markSettingsDirty,
  mergeOutbox,
  recordEvent,
  recordEventDeletion,
  recordPlant,
  seedOutbox,
  type LocalGardenState,
  type Outbox,
  type SyncLocation,
} from "@/lib/sync/sync-logic";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { activePlants, appendEvent, createGardenPlant, MAX_STORED_EVENTS, resolvePlants, startedPlantId, type GardenPlant, type ResolvedPlant } from "./garden-logic";
import { archiveSeason } from "./harvest-end";

export const GARDEN_PLANTS_STORAGE_KEY = "balco.garden.plants.v1";
export const GARDEN_EVENTS_STORAGE_KEY = "balco.garden.events.v1";
export const USER_PROFILE_STORAGE_KEY = "balco.user.profile.v1";
export const ONBOARDING_STORAGE_KEY = "balco.onboarding.preferences.v1";
export const SYNC_OUTBOX_STORAGE_KEY = "balco.sync.outbox.v1";
export const SYNC_META_STORAGE_KEY = "balco.sync.meta.v1";

const SYNC_DEBOUNCE_MS = 2000;

export type UserProfile = { firstName?: string };

type SyncMeta = { openId?: string; lastSyncedAt?: string; lastLocation?: SyncLocation };
type PushRegistration = { token: string; openId: string };

export type AccountState = {
  /** Connexion possible (toujours vrai depuis l'authentification maison ; gardé pour les écrans). */
  loginAvailable: boolean;
  signedIn: boolean;
  checking: boolean;
  name?: string | null;
  email?: string | null;
  /** « other-device » : compte gratuit dont le jardin est sauvegardé depuis un autre téléphone. */
  status: "idle" | "syncing" | "offline" | "other-device";
  lastSyncedAt?: string;
  serverPush: boolean;
  /** Forfait du compte, connu après la première synchro. */
  plan: Plan;
  /** Prix fondateur obtenu (premiers abonnés Balco+). */
  founder: boolean;
};

type GardenContextValue = {
  loaded: boolean;
  plants: GardenPlant[];
  resolvedPlants: ResolvedPlant[];
  /** Les plantes qui ont quitté le balcon : leurs gestes et leurs récoltes restent dans la progression. */
  pastPlants: ResolvedPlant[];
  events: MaintenanceEvent[];
  profile: UserProfile;
  onboarding: OnboardingAnswers | null;
  account: AccountState;
  /** `toPlant` : choisie mais pas encore en terre (son premier geste sera « Sème… » ou « Plante… »). */
  addPlant: (catalogId: string, options?: { toPlant?: boolean }) => Promise<GardenPlant>;
  removePlant: (plantId: string) => Promise<void>;
  /** Ressemer ou replanter la même plante (pot libre) : une nouvelle saison, elle repasse « à planter ». */
  restartPlant: (plantId: string) => Promise<void>;
  renamePlant: (plantId: string, nickname: string) => Promise<void>;
  setPlantVariety: (plantId: string, varietyId: string | undefined) => Promise<void>;
  logEvent: (event: MaintenanceEvent) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  reloadOnboarding: () => Promise<void>;
  /** Change une réponse de l'accueil (exposition, espace, envies…) depuis les réglages. */
  updateOnboarding: (patch: Partial<OnboardingAnswers>) => Promise<void>;
  reportLocation: (location: SyncLocation) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  /** Compte gratuit : la sauvegarde du jardin passe sur ce téléphone. */
  claimThisDevice: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  completeSignIn: (result: SignInResult) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const GardenContext = createContext<GardenContextValue | null>(null);

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[garden] could not persist ${key}`, error);
  }
}

export function GardenProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const utils = trpc.useUtils();
  const [loaded, setLoaded] = useState(false);
  const [allPlants, setAllPlants] = useState<GardenPlant[]>([]);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile>({});
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [syncStatus, setSyncStatus] = useState<AccountState["status"]>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);
  const [serverPush, setServerPush] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [founder, setFounder] = useState(false);
  /** La prochaine synchro demande la sauvegarde pour ce téléphone (compte gratuit, un seul appareil). */
  const claimDeviceRef = useRef(false);

  // Références à jour : la synchro tourne en arrière-plan et ne doit jamais lire un état périmé.
  const plantsRef = useRef(allPlants);
  const eventsRef = useRef(events);
  const profileRef = useRef(profile);
  const onboardingRef = useRef(onboarding);
  const outboxRef = useRef<Outbox>(emptyOutbox());
  const metaRef = useRef<SyncMeta>({});
  const locationRef = useRef<SyncLocation | null>(null);
  const loadedRef = useRef(false);
  const signedInRef = useRef(false);
  const openIdRef = useRef<string | undefined>(undefined);
  const syncingRef = useRef(false);
  const rerunRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runSyncRef = useRef<() => Promise<void>>(async () => {});

  signedInRef.current = auth.isAuthenticated;
  // Identifie le compte synchronisé : un changement de compte relance une fusion complète.
  openIdRef.current = auth.user ? `user:${auth.user.id}` : undefined;

  useEffect(() => {
    let active = true;
    Promise.all([
      readJson<GardenPlant[]>(GARDEN_PLANTS_STORAGE_KEY, []),
      readJson<MaintenanceEvent[]>(GARDEN_EVENTS_STORAGE_KEY, []),
      readJson<UserProfile>(USER_PROFILE_STORAGE_KEY, {}),
      readJson<OnboardingAnswers | null>(ONBOARDING_STORAGE_KEY, null).then(normalizeOnboarding),
      readJson<Outbox>(SYNC_OUTBOX_STORAGE_KEY, emptyOutbox()),
      readJson<SyncMeta>(SYNC_META_STORAGE_KEY, {}),
      readJson<PushRegistration | null>(SERVER_PUSH_STORAGE_KEY, null),
    ]).then(([storedPlants, storedEvents, storedProfile, storedOnboarding, storedOutbox, storedMeta, pushRegistration]) => {
      if (!active) return;
      plantsRef.current = Array.isArray(storedPlants) ? storedPlants : [];
      eventsRef.current = Array.isArray(storedEvents) ? storedEvents : [];
      profileRef.current = storedProfile ?? {};
      onboardingRef.current = storedOnboarding;
      outboxRef.current = { ...emptyOutbox(), ...storedOutbox };
      metaRef.current = storedMeta ?? {};
      setAllPlants(plantsRef.current);
      setEvents(eventsRef.current);
      setProfile(profileRef.current);
      setOnboarding(storedOnboarding);
      setLastSyncedAt(metaRef.current.lastSyncedAt);
      setServerPush(Boolean(pushRegistration));
      loadedRef.current = true;
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // --- Persistance --------------------------------------------------------------

  const savePlants = useCallback(async (next: GardenPlant[]) => {
    plantsRef.current = next;
    setAllPlants(next);
    await writeJson(GARDEN_PLANTS_STORAGE_KEY, next);
  }, []);

  const saveEvents = useCallback(async (next: MaintenanceEvent[]) => {
    eventsRef.current = next;
    setEvents(next);
    await writeJson(GARDEN_EVENTS_STORAGE_KEY, next);
  }, []);

  const saveProfile = useCallback(async (next: UserProfile) => {
    profileRef.current = next;
    setProfile(next);
    await writeJson(USER_PROFILE_STORAGE_KEY, next);
  }, []);

  const saveOnboarding = useCallback(async (incoming: OnboardingAnswers | null) => {
    const next = normalizeOnboarding(incoming);
    onboardingRef.current = next;
    setOnboarding(next);
    if (next) await writeJson(ONBOARDING_STORAGE_KEY, next);
    else await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY).catch(() => undefined);
  }, []);

  const saveMeta = useCallback(async (next: SyncMeta) => {
    metaRef.current = next;
    setLastSyncedAt(next.lastSyncedAt);
    await writeJson(SYNC_META_STORAGE_KEY, next);
  }, []);

  const setOutbox = useCallback((next: Outbox) => {
    outboxRef.current = next;
    void writeJson(SYNC_OUTBOX_STORAGE_KEY, next);
  }, []);

  // --- Synchronisation ------------------------------------------------------------

  const scheduleSync = useCallback((delay = SYNC_DEBOUNCE_MS) => {
    if (!signedInRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runSyncRef.current();
    }, delay);
  }, []);

  /** Note un changement local : il partira à la prochaine synchro (tout de suite si connecté). */
  const queue = useCallback((update: (outbox: Outbox) => Outbox) => {
    setOutbox(update(outboxRef.current));
    scheduleSync();
  }, [scheduleSync, setOutbox]);

  const ensurePushRegistration = useCallback(async (remindersEnabled: boolean, openId: string) => {
    if (!remindersEnabled) return;
    const existing = await readJson<PushRegistration | null>(SERVER_PUSH_STORAGE_KEY, null);
    if (existing?.openId === openId) return;
    const result = await getDevicePushToken();
    if (result.status !== "ok") return;
    await utils.client.reminders.registerPushToken.mutate({ token: result.token, platform: result.platform });
    await writeJson(SERVER_PUSH_STORAGE_KEY, { token: result.token, openId } satisfies PushRegistration);
    // Le serveur prend le relais : on retire les notifications locales pour éviter les doublons.
    await cancelBalcoReminderNotifications();
    setServerPush(true);
  }, [utils]);

  /** Le serveur n'envoie plus de rappels à ce téléphone : il retrouve ses notifications locales. */
  const dropPushRegistration = useCallback(async () => {
    const registration = await readJson<PushRegistration | null>(SERVER_PUSH_STORAGE_KEY, null);
    if (!registration) return;
    await utils.client.reminders.unregisterPushToken.mutate({ token: registration.token }).catch(() => undefined);
    await AsyncStorage.removeItem(SERVER_PUSH_STORAGE_KEY).catch(() => undefined);
    setServerPush(false);
  }, [utils]);

  const runSync = useCallback(async () => {
    const openId = openIdRef.current;
    if (!signedInRef.current || !loadedRef.current || !openId) return;
    if (syncingRef.current) {
      rerunRef.current = true;
      return;
    }
    syncingRef.current = true;
    setSyncStatus("syncing");
    let sent = outboxRef.current;
    try {
      const settings = await loadLocalReminderSettings();
      const localState = (currentSettings = settings): LocalGardenState => ({ plants: plantsRef.current, events: eventsRef.current, firstName: profileRef.current.firstName, onboarding: onboardingRef.current, settings: currentSettings });
      if (metaRef.current.openId !== openId) {
        // Premier passage de ce compte sur cet appareil : tout ce qui est local part vers le compte.
        // Se connecter ici fait de ce téléphone celui qui sauvegarde le jardin (compte gratuit).
        sent = mergeOutbox(seedOutbox(localState(), defaultLocalReminderSettings), sent);
        claimDeviceRef.current = true;
        await saveMeta({ openId });
      }
      setOutbox(emptyOutbox());
      const location = locationChanged(metaRef.current.lastLocation, locationRef.current) ? locationRef.current ?? undefined : undefined;

      const claimDevice = claimDeviceRef.current;
      const snapshot = await utils.client.reminders.sync.mutate({ ...buildPush(sent, localState(), location), deviceId: await deviceId(), claimDevice });
      if (claimDevice) claimDeviceRef.current = false;

      const latestSettings = await loadLocalReminderSettings();
      const applied = applySnapshot(snapshot, outboxRef.current, localState(latestSettings));
      await savePlants(applied.plants);
      await saveEvents(applied.events);
      if ((applied.firstName ?? undefined) !== profileRef.current.firstName) await saveProfile({ ...profileRef.current, firstName: applied.firstName });
      if (JSON.stringify(applied.onboarding) !== JSON.stringify(onboardingRef.current)) await saveOnboarding(applied.onboarding);
      const appliedSettings = { ...defaultLocalReminderSettings, ...applied.settings, vacation: applied.settings.vacation ?? null };
      if (JSON.stringify(appliedSettings) !== JSON.stringify(latestSettings)) await saveLocalReminderSettings(appliedSettings, "sync");
      await saveMeta({ openId, lastSyncedAt: snapshot.serverTime, lastLocation: location ?? metaRef.current.lastLocation });
      setSyncStatus("idle");
      setPlan(snapshot.access.plan);
      setFounder(snapshot.access.founder);
      if (snapshot.access.serverReminders) {
        await ensurePushRegistration(applied.settings.enabled, openId).catch((error) => console.warn("[push] registration failed", error));
      } else {
        // Forfait gratuit : le téléphone programme lui-même ses rappels, le serveur n'envoie rien.
        await dropPushRegistration();
      }
    } catch (error) {
      // Rien n'est perdu : la boîte d'envoi repartira à la prochaine synchro.
      setOutbox(mergeOutbox(sent, outboxRef.current));
      if (error instanceof TRPCClientError && error.data?.code === "CONFLICT") {
        // Compte gratuit sauvegardé depuis un autre téléphone : les changements restent ici.
        setSyncStatus("other-device");
        return;
      }
      setSyncStatus("offline");
      console.warn("[sync] failed, will retry", error);
    } finally {
      syncingRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        scheduleSync(0);
      }
    }
  }, [dropPushRegistration, ensurePushRegistration, saveMeta, saveOnboarding, savePlants, saveEvents, saveProfile, scheduleSync, setOutbox, utils]);

  runSyncRef.current = runSync;

  // Au lancement une fois connecté, puis à chaque retour au premier plan.
  useEffect(() => {
    if (loaded && auth.isAuthenticated) void runSync();
  }, [auth.isAuthenticated, loaded, runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") scheduleSync(0);
    });
    return () => subscription.remove();
  }, [scheduleSync]);

  useEffect(() => subscribeReminderSettings((_settings, source) => {
    if (source === "user") queue(markSettingsDirty);
  }), [queue]);

  // --- Actions -----------------------------------------------------------------------

  const addPlant = useCallback(async (catalogId: string, options: { toPlant?: boolean } = {}) => {
    const created = createGardenPlant(catalogId, new Date(), options);
    await savePlants([...plantsRef.current, created]);
    queue((outbox) => recordPlant(outbox, created));
    return created;
  }, [queue, savePlants]);

  const updatePlant = useCallback(async (plantId: string, patch: (plant: GardenPlant) => GardenPlant) => {
    const current = plantsRef.current.find((plant) => plant.id === plantId);
    if (!current) return;
    const next = { ...patch(current), updatedAt: new Date().toISOString() };
    await savePlants(plantsRef.current.map((plant) => (plant.id === plantId ? next : plant)));
    queue((outbox) => recordPlant(outbox, next));
  }, [queue, savePlants]);

  // L'historique d'une plante retirée est conservé : il reste utile si elle revient.
  const removePlant = useCallback((plantId: string) => updatePlant(plantId, (plant) => ({ ...plant, removedAt: new Date().toISOString() })), [updatePlant]);
  // Les gestes « une fois par saison » sont rangés sous leur date : la nouvelle saison les redemandera.
  const restartPlant = useCallback(async (plantId: string) => {
    const { remove, add } = archiveSeason(eventsRef.current, plantId);
    await saveEvents([...add, ...eventsRef.current.filter((event) => !remove.includes(event.id))].slice(0, MAX_STORED_EVENTS));
    queue((outbox) => add.reduce(recordEvent, remove.reduce(recordEventDeletion, outbox)));
    await updatePlant(plantId, (plant) => ({ ...plant, toPlant: true }));
  }, [queue, saveEvents, updatePlant]);
  const renamePlant = useCallback((plantId: string, nickname: string) => updatePlant(plantId, (plant) => ({ ...plant, nickname: nickname.trim() || undefined })), [updatePlant]);
  const setPlantVariety = useCallback((plantId: string, varietyId: string | undefined) => updatePlant(plantId, (plant) => ({ ...plant, varietyId })), [updatePlant]);

  const logEvent = useCallback(async (event: MaintenanceEvent) => {
    await saveEvents(appendEvent(eventsRef.current, event));
    queue((outbox) => recordEvent(outbox, event));
    // « Sème la mâche » coché : la plante est en terre.
    const started = startedPlantId(event.id);
    if (started && plantsRef.current.some((plant) => plant.id === started && plant.toPlant)) await updatePlant(started, (plant) => ({ ...plant, toPlant: false }));
  }, [queue, saveEvents, updatePlant]);

  const removeEvent = useCallback(async (eventId: string) => {
    await saveEvents(eventsRef.current.filter((event) => event.id !== eventId));
    queue((outbox) => recordEventDeletion(outbox, eventId));
    // Décoché (« Annuler ») : elle redevient à planter.
    const started = startedPlantId(eventId);
    if (started && plantsRef.current.some((plant) => plant.id === started && plant.toPlant === false)) await updatePlant(started, (plant) => ({ ...plant, toPlant: true }));
  }, [queue, saveEvents, updatePlant]);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    await saveProfile({ ...profileRef.current, ...patch });
    queue(markProfileDirty);
  }, [queue, saveProfile]);

  const reloadOnboarding = useCallback(async () => {
    const stored = normalizeOnboarding(await readJson<OnboardingAnswers | null>(ONBOARDING_STORAGE_KEY, null));
    onboardingRef.current = stored;
    setOnboarding(stored);
    queue(markProfileDirty);
  }, [queue]);

  const updateOnboarding = useCallback(async (patch: Partial<OnboardingAnswers>) => {
    await saveOnboarding({ ...(onboardingRef.current ?? {}), ...patch, skipped: false });
    queue(markProfileDirty);
  }, [queue, saveOnboarding]);

  const reportLocation = useCallback((location: SyncLocation) => {
    const changed = locationChanged(locationRef.current, location);
    locationRef.current = location;
    if (changed && locationChanged(metaRef.current.lastLocation, location)) scheduleSync();
  }, [scheduleSync]);

  const { refresh: refreshAuth, logout } = auth;
  const refreshAccount = useCallback(async () => {
    await refreshAuth();
  }, [refreshAuth]);

  const signIn = useCallback(async () => {
    router.push("/login");
  }, []);

  const { completeSignIn: completeAuthSignIn, deleteAccount: deleteServerAccount } = auth;
  const completeSignIn = useCallback((result: SignInResult) => completeAuthSignIn(result), [completeAuthSignIn]);

  const signOut = useCallback(async () => {
    const registration = await readJson<PushRegistration | null>(SERVER_PUSH_STORAGE_KEY, null);
    if (registration) {
      await utils.client.reminders.unregisterPushToken.mutate({ token: registration.token }).catch(() => undefined);
      await AsyncStorage.removeItem(SERVER_PUSH_STORAGE_KEY).catch(() => undefined);
      setServerPush(false);
    }
    await logout();
    // Le jardin reste sur l'appareil ; la prochaine connexion le fusionnera avec le compte choisi.
    setOutbox(emptyOutbox());
    await saveMeta({});
  }, [logout, saveMeta, setOutbox, utils]);

  /** Envoie tout de suite ce qui attend ; si un envoi est déjà en cours, attend sa fin puis renvoie le reste. */
  const syncNow = useCallback(async () => {
    for (let waited = 0; syncingRef.current && waited < 50; waited += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    await runSync();
  }, [runSync]);

  const claimThisDevice = useCallback(async () => {
    claimDeviceRef.current = true;
    await syncNow();
  }, [syncNow]);

  /**
   * Efface le compte et ses données sur le serveur (sauvegarde, échanges avec Nora). Le balcon reste sur ce
   * téléphone : l'app repasse sans compte, sans revenir à l'accueil, et les rappels redeviennent locaux.
   */
  const deleteAccount = useCallback(async () => {
    await deleteServerAccount();
    if (timerRef.current) clearTimeout(timerRef.current);
    await AsyncStorage.multiRemove([SYNC_OUTBOX_STORAGE_KEY, SYNC_META_STORAGE_KEY, SERVER_PUSH_STORAGE_KEY, "balco.assistant.history.v1"]).catch(() => undefined);
    outboxRef.current = emptyOutbox();
    metaRef.current = {};
    setOutbox(emptyOutbox());
    setLastSyncedAt(undefined);
    setServerPush(false);
  }, [deleteServerAccount, setOutbox]);

  const plants = useMemo(() => activePlants(allPlants), [allPlants]);
  const resolvedPlants = useMemo(() => resolvePlants(plants), [plants]);
  const pastPlants = useMemo(() => resolvePlants(allPlants.filter((plant) => plant.removedAt)), [allPlants]);
  const account = useMemo<AccountState>(() => ({
    loginAvailable: true,
    signedIn: auth.isAuthenticated,
    checking: auth.loading,
    name: auth.user?.name,
    email: auth.user?.email,
    status: syncStatus,
    lastSyncedAt,
    serverPush,
    plan,
    founder,
  }), [auth.isAuthenticated, auth.loading, auth.user?.email, auth.user?.name, founder, lastSyncedAt, plan, serverPush, syncStatus]);

  const value = useMemo<GardenContextValue>(
    () => ({ loaded, plants, resolvedPlants, pastPlants, events, profile, onboarding, account, addPlant, removePlant, restartPlant, renamePlant, setPlantVariety, logEvent, removeEvent, updateProfile, reloadOnboarding, updateOnboarding, reportLocation, signIn, signOut, syncNow, claimThisDevice, refreshAccount, completeSignIn, deleteAccount }),
    [loaded, plants, resolvedPlants, pastPlants, events, profile, onboarding, account, addPlant, removePlant, restartPlant, renamePlant, setPlantVariety, logEvent, removeEvent, updateProfile, reloadOnboarding, updateOnboarding, reportLocation, signIn, signOut, syncNow, claimThisDevice, refreshAccount, completeSignIn, deleteAccount],
  );

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden() {
  const context = useContext(GardenContext);
  if (!context) throw new Error("useGarden must be used inside <GardenProvider>");
  return context;
}
