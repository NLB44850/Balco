import Constants from "expo-constants";
import { Platform } from "react-native";

import { Notifications } from "@/lib/notifications/module";

export type PushTokenResult =
  | { status: "ok"; token: string; platform: "ios" | "android" }
  | { status: "unavailable"; reason: "web" | "permission" | "no_project_id" | "error" };

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Récupère le token Expo de l'appareil, sans jamais demander la permission ici :
 * elle est demandée au moment où l'utilisateur active les rappels.
 */
export async function getDevicePushToken(): Promise<PushTokenResult> {
  if (!Notifications) return { status: "unavailable", reason: "web" };
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return { status: "unavailable", reason: "permission" };
  const projectId = easProjectId();
  if (!projectId) {
    // Sans projet EAS (`eas init`), Expo ne délivre pas de token : Balco garde les notifications locales.
    console.info("[push] EAS projectId missing: server push disabled, local reminders kept");
    return { status: "unavailable", reason: "no_project_id" };
  }
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: "ok", token: data, platform: Platform.OS === "ios" ? "ios" : "android" };
  } catch (error) {
    console.warn("[push] could not get Expo push token", error);
    return { status: "unavailable", reason: "error" };
  }
}
