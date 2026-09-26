import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Adresse de l'API Balco.
 * - EXPO_PUBLIC_API_BASE_URL si défini (builds mobiles, ex. https://api.balco.app) ;
 * - web : même origine, l'API sert aussi l'app web (sauf en dev sur le port 8081 → API sur 3000) ;
 * - mobile en développement : l'ordinateur qui fait tourner Expo, port 3000.
 */
export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname, port } = window.location;
    return port === "8081" ? `${protocol}//${hostname}:3000` : "";
  }

  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  return devHost ? `http://${devHost}:3000` : "";
}
