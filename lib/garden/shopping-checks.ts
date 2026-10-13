/**
 * Les coches de la liste de courses, gardées sur le téléphone (rien à synchroniser : on coche en magasin). Une coche
 * s'efface d'elle-même après 45 jours, pour que la liste de la saison suivante reparte vide.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "balco.shopping.checked.v1";
const KEEP_DAYS = 45;

type Checks = Record<string, string>;

/** Les articles cochés il y a moins de 45 jours. Logique pure. */
export function activeChecks(checks: Checks, now: Date) {
  const limit = now.getTime() - KEEP_DAYS * 86_400_000;
  return new Set(Object.entries(checks).filter(([, at]) => new Date(at).getTime() >= limit).map(([id]) => id));
}

export async function loadShoppingChecks(): Promise<Checks> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Checks) : {};
  } catch {
    return {};
  }
}

export async function saveShoppingChecks(checks: Checks) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
}
