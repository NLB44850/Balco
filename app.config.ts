// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

/**
 * Identifiant de l'app sur l'App Store et le Play Store, au format « domaine inversé »
 * (ex. fr.monentreprise.balco). Il ne pourra plus changer après la première publication.
 */
const bundleId = process.env.APP_BUNDLE_ID || "com.app.balco";
// Schéma des liens profonds (balco://…) : retour de connexion Google, ouverture depuis une notification.
const scheme = "balco";
// Projet EAS (expo.dev) : nécessaire pour construire l'app, pour les notifications push serveur et les mises à jour.
// EAS_PROJECT_ID permet de pointer vers un autre projet sans modifier ce fichier.
const projectId = process.env.EAS_PROJECT_ID || "1b50fb7f-c9be-4d63-8fd1-d2ff99b8653d";

const config: ExpoConfig = {
  // Nom sous l'icône : court, sinon iOS le tronque. Le nom long reste celui de la fiche des stores.
  name: "Balco",
  slug: "balco",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme,
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["POST_NOTIFICATIONS"],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-apple-authentication",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        cameraPermission: "Balco utilise l’appareil photo pour analyser tes plantes.",
        photosPermission: "Balco accède à tes photos pour analyser une plante que tu as déjà photographiée.",
        // Pas de vidéo dans Balco : aucune demande d'accès au micro.
        microphonePermission: false,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Balco utilise ta position pour adapter la météo et les conseils de culture.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  extra: { eas: { projectId } },
  // Mises à jour sans réinstaller (EAS Update) : l'app télécharge le nouveau code publié sur son canal (eas.json).
  // Une mise à jour n'arrive que sur les APK de la même version : changer `version` dès qu'on ajoute un module natif,
  // une permission ou un plugin (il faut alors un nouvel APK, docs/deploiement-railway.md).
  runtimeVersion: { policy: "appVersion" },
  updates: { url: `https://u.expo.dev/${projectId}`, checkAutomatically: "NEVER", fallbackToCacheTimeout: 0 },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
