// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

/**
 * Identifiant de l'app sur le Play Store, au format « domaine inversé ». Choisi le 18/10 : fr.balco.app. Il ne pourra
 * plus changer après le premier envoi au Play Store. Les APK de test gardent l'ancien (com.app.balco, profils
 * « test » et « codespace » d'eas.json) : ils restent une app à part, à côté de la version du Play Store.
 */
const bundleId = process.env.APP_BUNDLE_ID || "fr.balco.app";
/** Les polices Onest, intégrées à l'app (pas de chargement au démarrage) ; le web les charge encore (app/_layout.tsx). */
const ONEST_WEIGHTS = ["300Light", "400Regular", "500Medium", "600SemiBold", "700Bold", "800ExtraBold", "900Black"];
// Schéma des liens profonds (balco://…) : retour de connexion Google, ouverture depuis une notification.
const scheme = "balco";
// Projet EAS (expo.dev) : nécessaire pour construire l'app, pour les notifications push serveur et les mises à jour.
// EAS_PROJECT_ID permet de pointer vers un autre projet sans modifier ce fichier.
const projectId = process.env.EAS_PROJECT_ID || "1b50fb7f-c9be-4d63-8fd1-d2ff99b8653d";

const config: ExpoConfig = {
  // Nom sous l'icône : court, sinon iOS le tronque. Le nom long reste celui de la fiche des stores.
  name: "Balco",
  slug: "balco",
  // 1.1.0 (18/10) : icône des notifications, polices intégrées, position approximative, appli allégée (R8).
  version: "1.1.0",
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
      backgroundColor: "#1F7A4D",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["POST_NOTIFICATIONS"],
    // La météo n'a besoin que de la ville : position approximative seulement (Play Store : moins de données demandées).
    blockedPermissions: ["android.permission.ACCESS_FINE_LOCATION"],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    // Petite icône blanche dans la barre du téléphone (sans elle, Android montre un carré blanc), teintée en vert.
    ["expo-notifications", { icon: "./assets/images/notification-icon.png", color: "#1F7A4D" }],
    ["expo-font", { fonts: ONEST_WEIGHTS.map((weight) => `./node_modules/@expo-google-fonts/onest/${weight}/Onest_${weight}.ttf`) }],
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
        backgroundColor: "#1F7A4D",
        dark: {
          backgroundColor: "#1F7A4D",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          // BALCO_ANDROID_ARCHS : l'APK de test construit sur GitHub ne vise que les téléphones récents (arm64-v8a),
          // deux fois moins long à construire (apk-github.yml).
          buildArchs: process.env.BALCO_ANDROID_ARCHS ? process.env.BALCO_ANDROID_ARCHS.split(",") : ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          // Appli plus légère : code et ressources inutilisés retirés (R8) dans les versions construites par EAS.
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // expo-notifications fournit cette règle sans l'appliquer lui-même : sans elle, R8 retire son code et plus
          // aucune notification ne part (vu le 19/10 sur l'APK 1.1.0 : « notification de test » sans effet).
          extraProguardRules: "-keep class expo.modules.notifications.** { *; }",
        },
      },
    ],
    "./plugins/with-android-build-memory",
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
