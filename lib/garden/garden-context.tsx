import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { OnboardingAnswers } from "@/lib/plants/catalog";
import type { MaintenanceEvent } from "@/lib/reminders/reminder-engine";
import { appendEvent, createGardenPlant, resolvePlants, type GardenPlant, type ResolvedPlant } from "./garden-logic";

export const GARDEN_PLANTS_STORAGE_KEY = "balco.garden.plants.v1";
export const GARDEN_EVENTS_STORAGE_KEY = "balco.garden.events.v1";
export const USER_PROFILE_STORAGE_KEY = "balco.user.profile.v1";
export const ONBOARDING_STORAGE_KEY = "balco.onboarding.preferences.v1";

export type UserProfile = { firstName?: string };

type GardenContextValue = {
  loaded: boolean;
  plants: GardenPlant[];
  resolvedPlants: ResolvedPlant[];
  events: MaintenanceEvent[];
  profile: UserProfile;
  onboarding: OnboardingAnswers | null;
  addPlant: (catalogId: string) => Promise<GardenPlant>;
  removePlant: (plantId: string) => Promise<void>;
  renamePlant: (plantId: string, nickname: string) => Promise<void>;
  logEvent: (event: MaintenanceEvent) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  reloadOnboarding: () => Promise<void>;
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
  const [loaded, setLoaded] = useState(false);
  const [plants, setPlants] = useState<GardenPlant[]>([]);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile>({});
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  // Références à jour pour enchaîner plusieurs actions sans état périmé.
  const plantsRef = useRef(plants);
  const eventsRef = useRef(events);
  const profileRef = useRef(profile);

  const reloadOnboarding = useCallback(async () => {
    setOnboarding(await readJson<OnboardingAnswers | null>(ONBOARDING_STORAGE_KEY, null));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      readJson<GardenPlant[]>(GARDEN_PLANTS_STORAGE_KEY, []),
      readJson<MaintenanceEvent[]>(GARDEN_EVENTS_STORAGE_KEY, []),
      readJson<UserProfile>(USER_PROFILE_STORAGE_KEY, {}),
      readJson<OnboardingAnswers | null>(ONBOARDING_STORAGE_KEY, null),
    ]).then(([storedPlants, storedEvents, storedProfile, storedOnboarding]) => {
      if (!active) return;
      plantsRef.current = Array.isArray(storedPlants) ? storedPlants : [];
      eventsRef.current = Array.isArray(storedEvents) ? storedEvents : [];
      profileRef.current = storedProfile ?? {};
      setPlants(plantsRef.current);
      setEvents(eventsRef.current);
      setProfile(profileRef.current);
      setOnboarding(storedOnboarding);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const savePlants = useCallback(async (next: GardenPlant[]) => {
    plantsRef.current = next;
    setPlants(next);
    await writeJson(GARDEN_PLANTS_STORAGE_KEY, next);
  }, []);

  const saveEvents = useCallback(async (next: MaintenanceEvent[]) => {
    eventsRef.current = next;
    setEvents(next);
    await writeJson(GARDEN_EVENTS_STORAGE_KEY, next);
  }, []);

  const addPlant = useCallback(async (catalogId: string) => {
    const created = createGardenPlant(catalogId);
    await savePlants([...plantsRef.current, created]);
    return created;
  }, [savePlants]);

  // L'historique d'une plante retirée est conservé : il reste utile si elle revient et pour la future synchro.
  const removePlant = useCallback((plantId: string) => savePlants(plantsRef.current.filter((plant) => plant.id !== plantId)), [savePlants]);

  const renamePlant = useCallback(
    (plantId: string, nickname: string) => savePlants(plantsRef.current.map((plant) => (plant.id === plantId ? { ...plant, nickname: nickname.trim() || undefined } : plant))),
    [savePlants],
  );

  const logEvent = useCallback((event: MaintenanceEvent) => saveEvents(appendEvent(eventsRef.current, event)), [saveEvents]);
  const removeEvent = useCallback((eventId: string) => saveEvents(eventsRef.current.filter((event) => event.id !== eventId)), [saveEvents]);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const next = { ...profileRef.current, ...patch };
    profileRef.current = next;
    setProfile(next);
    await writeJson(USER_PROFILE_STORAGE_KEY, next);
  }, []);

  const resolvedPlants = useMemo(() => resolvePlants(plants), [plants]);

  const value = useMemo<GardenContextValue>(
    () => ({ loaded, plants, resolvedPlants, events, profile, onboarding, addPlant, removePlant, renamePlant, logEvent, removeEvent, updateProfile, reloadOnboarding }),
    [loaded, plants, resolvedPlants, events, profile, onboarding, addPlant, removePlant, renamePlant, logEvent, removeEvent, updateProfile, reloadOnboarding],
  );

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden() {
  const context = useContext(GardenContext);
  if (!context) throw new Error("useGarden must be used inside <GardenProvider>");
  return context;
}
