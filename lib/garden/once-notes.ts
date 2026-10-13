/**
 * Les explications dites une seule fois (« 1,5 L, c'est une grande bouteille d'eau… ») : gardées sur le téléphone une
 * fois montrées.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "balco.notes.seen.v1";

export async function loadSeenNotes(): Promise<string[]> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function markNoteSeen(key: string) {
  const seen = await loadSeenNotes();
  if (!seen.includes(key)) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, key]));
}
