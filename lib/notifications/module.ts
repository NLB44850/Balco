import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

/**
 * Pourquoi les notifications sont indisponibles sur cet appareil, ou null si elles marchent.
 * - web : un navigateur ne reçoit pas les notifications de l'app ;
 * - expo-go-android : Expo Go ne prend plus en charge expo-notifications sur Android depuis le SDK 53
 *   (il faut une version de développement, cf. docs/deploiement.md).
 */
export const notificationsUnavailableReason: "web" | "expo-go-android" | null =
  Platform.OS === "web" ? "web" : Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? "expo-go-android" : null;

/** expo-notifications, chargé seulement là où il fonctionne : son simple import affiche une erreur dans Expo Go sur Android. */
export const Notifications: NotificationsModule | null = notificationsUnavailableReason
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("expo-notifications") as NotificationsModule);
