import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_TOKEN_KEY = "balco.session-token.v1";
const USER_INFO_KEY = "balco.user-info.v1";

export type AuthUser = {
  id: number;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
};

// Sur le web, la session vit dans un cookie HttpOnly posé par le serveur : aucun jeton côté JavaScript.
export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string) {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function removeSessionToken() {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY).catch(() => undefined);
}

/** Copie locale de l'utilisateur : l'app sait qu'on est connecté même hors ligne. */
export async function getCachedUser(): Promise<AuthUser | null> {
  try {
    const stored = Platform.OS === "web" ? window.localStorage.getItem(USER_INFO_KEY) : await SecureStore.getItemAsync(USER_INFO_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function setCachedUser(user: AuthUser) {
  const value = JSON.stringify(user);
  if (Platform.OS === "web") window.localStorage.setItem(USER_INFO_KEY, value);
  else await SecureStore.setItemAsync(USER_INFO_KEY, value);
}

export async function clearCachedUser() {
  if (Platform.OS === "web") window.localStorage.removeItem(USER_INFO_KEY);
  else await SecureStore.deleteItemAsync(USER_INFO_KEY).catch(() => undefined);
}
