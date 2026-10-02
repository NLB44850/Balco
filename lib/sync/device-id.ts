/**
 * Identifiant de cet appareil, tiré au hasard la première fois puis gardé. Le serveur s'en sert pour
 * savoir quel téléphone sauvegarde le jardin d'un compte gratuit (un seul ; plusieurs avec Balco+).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export const DEVICE_ID_STORAGE_KEY = "balco.device.id.v1";

let cached: string | null = null;

export async function deviceId() {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored) return (cached = stored);
  } catch {
    // Stockage indisponible : un identifiant pour la session suffit.
  }
  cached = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, cached).catch(() => undefined);
  return cached;
}
