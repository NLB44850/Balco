import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(__dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("Balco MVP content", () => {
  it("exposes the four primary mobile screens", () => {
    const tabs = readProjectFile("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('name="index"');
    expect(tabs).toContain('name="assistant"');
    expect(tabs).toContain('name="scanner"');
    expect(tabs).toContain('name="profile"');
  });

  it("contains the requested gardening prototype content", () => {
    expect(readProjectFile("lib/plants/catalog.ts")).toContain("arrose ${label} si besoin");
    expect(readProjectFile("app/(tabs)/assistant.tsx")).toContain("Quoi planter en avril");
    expect(readProjectFile("app/(tabs)/scanner.tsx")).toContain("SOLUTION NATURELLE");
    expect(readProjectFile("lib/garden/garden-logic.ts")).toContain("Ami des Abeilles");
  });

  it("includes the warmer modern layer requested for the second iteration", () => {
    expect(readProjectFile("app/welcome.tsx")).toContain("On commence par");
    expect(readProjectFile("app/welcome.tsx")).toContain("BalcoIllustration");
    expect(readProjectFile("components/motion.tsx")).toContain("FadeIn");
    expect(readProjectFile("package.json")).toContain("expo-linear-gradient");
  });

  it("defines the personalized four-step onboarding", () => {
    const onboarding = readProjectFile("app/welcome.tsx");

    expect(onboarding).toContain("Je débute");
    expect(onboarding).toContain("Combien de soleil");
    expect(onboarding).toContain("Très ensoleillé");
    expect(onboarding).toContain("Quel espace veux-tu");
    expect(onboarding).toContain("Qu'aimerais-tu");
    expect(onboarding).toContain("Tomates cerises");
    expect(onboarding).toContain("balco.onboarding.preferences.v1");
    expect(onboarding).toContain("Créer mon balcon");
  });

  it("builds the home screen from the user's real garden", () => {
    const home = readProjectFile("app/(tabs)/index.tsx");

    expect(home).toContain("useGarden");
    expect(home).toContain("recommendPlants");
    expect(home).toContain("Voir les 73 plantes");
    expect(home).toContain("buildDailySession");
    expect(home).toContain("buildTodayList");
    expect(home).toContain("balconyStatus");
    expect(home).toContain("BottomSheet");
    expect(home).toContain("UndoToast");
    expect(home).toContain("Tes plantes");
    expect(home).toContain("eventForReminder");
    expect(home).toContain("addSnooze");
    expect(readProjectFile("components/today/undo-toast.tsx")).toContain("Annuler");
    expect(readProjectFile("lib/garden/garden-context.tsx")).toContain("balco.garden.plants.v1");
  });

  it("no longer ships placeholder identity or fixed dates", () => {
    const home = readProjectFile("app/(tabs)/index.tsx");
    const profile = readProjectFile("app/(tabs)/profile.tsx");
    const calendar = readProjectFile("app/(tabs)/calendar.tsx");

    for (const source of [home, profile, calendar]) {
      expect(source).not.toContain("Camille");
      expect(source).not.toContain("SAISON 01");
      expect(source).not.toContain("22 SEPTEMBRE");
    }
    expect(profile).toContain("computeBadges");
    expect(profile).not.toMatch(/>12<\/Text>/);
  });

  it("lets users manage their plants from the catalog", () => {
    expect(readProjectFile("app/garden/index.tsx")).toContain("removePlant");
    expect(readProjectFile("app/garden/add.tsx")).toContain("searchCatalog");
    expect(readProjectFile("app/_layout.tsx")).toContain("GardenProvider");
    expect(readProjectFile("app/welcome.tsx")).toContain("Redirect");
  });

  it("includes a personalized cultivation calendar", () => {
    const calendar = readProjectFile("app/(tabs)/calendar.tsx");

    expect(calendar).toContain("TON CLIMAT LOCAL · EN DIRECT");
    expect(calendar).toContain("calendarActivities");
    expect(calendar).toContain("selectedMonth");
    expect(calendar).toContain("Noter comme fait");
    expect(calendar).toContain("+ Ajouter à mon balcon");
    expect(readProjectFile("app/(tabs)/_layout.tsx")).toContain('name="calendar"');
  });

  it("includes live weather and foreground geolocation", () => {
    const weather = readProjectFile("hooks/use-local-weather.ts");

    expect(weather).toContain("requestForegroundPermissionsAsync");
    expect(weather).toContain("api.open-meteo.com/v1/forecast");
    expect(weather).toContain('hourly: "precipitation,precipitation_probability,wind_gusts_10m"');
    expect(weather).toContain('daily: "precipitation_sum,temperature_2m_min,temperature_2m_max,wind_gusts_10m_max"');
    expect(weather).toContain("buildSnapshot");
    expect(weather).toContain("decideReminder");
    expect(weather).toContain("reminderDecision");
    expect(weather).toContain("PARIS_COORDINATES");
    expect(weather).toContain("balco.location.preference.v1");
    expect(weather).toContain("geocoding-api.open-meteo.com/v1/search");
    expect(weather).toContain("selectCity");
    expect(readProjectFile("app/(tabs)/calendar.tsx")).toContain("Où pousse ton jardin ?");
    expect(readProjectFile("app.config.ts")).toContain("expo-location");
  });

  it("includes explicit local reminder notifications", () => {
    const notifications = readProjectFile("lib/reminders/local-notifications.ts");
    const home = readProjectFile("app/(tabs)/index.tsx");
    const layout = readProjectFile("app/_layout.tsx");
    const config = readProjectFile("app.config.ts");

    expect(notifications).toContain("requestLocalNotificationPermission");
    expect(notifications).toContain("cancelBalcoReminderNotifications");
    expect(notifications).toContain("BALCO_NOTIFICATION_CHANNEL_ID");
    expect(notifications).toContain("decisionId");
    expect(notifications).toContain("validUntil");
    expect(home).toContain("Activer");
    expect(home).toContain("scheduleLocalReminder");
    expect(notifications).toContain("preferredHour: 18");
    expect(layout).toContain("ReminderNotificationResponder");
    const responder = readProjectFile("components/reminder-notification-responder.tsx");
    expect(responder).toContain("addNotificationResponseReceivedListener");
    expect(responder).toContain("getLastNotificationResponseAsync");
    expect(notifications).toContain("setNotificationCategoryAsync");
    expect(notifications).toContain("sendTestNotification");
    expect(config).toContain('"expo-notifications"');
  });

  it("exposes reminder preferences and per-plant activation", () => {
    const profile = readProjectFile("app/(tabs)/profile.tsx");
    expect(profile).toContain("RAPPELS CONTEXTUELS");
    expect(profile).toContain("Seulement quand c’est utile");
    expect(profile).toContain("Plage calme");
    expect(profile).toContain("quietStartHour");
    expect(profile).toContain("quietEndHour");
    expect(profile).toContain("Début");
    expect(profile).toContain("Fin");
    expect(profile).toContain("togglePlant");
    expect(profile).toContain("enabledPlantIds");
    expect(profile).toContain("requestLocalNotificationPermission");
    expect(profile).toContain("clearAndDisableLocalReminders");
    expect(readProjectFile("lib/reminders/reminder-actions.ts")).toContain("isQuietHour");
    expect(profile).toContain("Envoyer une notification de test");
  });

  it("supports grouped reminders for several garden plants", () => {
    const home = readProjectFile("app/(tabs)/index.tsx");
    const card = readProjectFile("components/contextual-reminder-card.tsx");
    expect(home).toContain("reminderDecisions");
    expect(home).toContain("groupReminders");
    expect(home).toContain("decideReminders");
    expect(card).toContain("onComplete");
    expect(card).toContain("onSnooze");
    expect(card).toContain("Pas aujourd’hui");
  });

  it("keeps the Balco nature palette in the theme tokens", () => {
    const theme = readProjectFile("theme.config.js");

    expect(theme).toContain("terracotta");
    expect(theme).toContain("leaf");
    expect(theme).toContain("cream");
    expect(existsSync(resolve(projectRoot, "theme.config.d.ts"))).toBe(true);
  });
});
