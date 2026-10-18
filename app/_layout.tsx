import "@/global.css";
import { GlobalToast } from "@/components/global-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Onest_300Light, Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold, Onest_900Black, useFonts } from "@expo-google-fonts/onest";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { ReminderNotificationResponder } from "@/components/reminder-notification-responder";
import { AppUpdater } from "@/hooks/use-app-updates";
import { GardenProvider } from "@/lib/garden/garden-context";
import { DayPlanProvider } from "@/hooks/use-day-plan";
import { PlantPhotosProvider } from "@/lib/garden/photos-context";
import { DATE_SIMULATION_AVAILABLE, loadDateSimulation } from "@/hooks/use-date-simulation";
import { OpeningScreen } from "@/components/opening-screen";

// L'écran de démarrage (le pot de Balco sur fond vert) reste jusqu'au premier affichage : l'accueil le prolonge.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

const ONEST = { Onest_300Light, Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold, Onest_900Black };
const useOnestFonts: () => [boolean, Error | null] = Platform.OS === "web" ? () => useFonts(ONEST) : () => [true, null];

// Un écran qui plante affiche « Oups, Réessayer » au lieu de fermer l'app (components/oops-screen.tsx).
export { OopsScreen as ErrorBoundary } from "@/components/oops-screen";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets] = useState<EdgeInsets>(initialInsets);
  const [frame] = useState<Rect>(initialFrame);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());
  // La police Onest (maquette « règles d'expérience ») : intégrée à l'app sur le téléphone (plugin expo-font,
  // app.config.ts), chargée au démarrage sur le web. En cas d'échec, l'app garde celle du téléphone.
  const [fontsLoaded, fontError] = useOnestFonts();
  // Version de test : le jour simulé (« Faire comme si on était le… ») est relu avant le premier écran.
  const [clockReady, setClockReady] = useState(!DATE_SIMULATION_AVAILABLE);
  useEffect(() => {
    if (!clockReady) void loadDateSimulation().then(() => setClockReady(true));
  }, [clockReady]);
  const starting = (!fontsLoaded && !fontError) || !clockReady;
  useEffect(() => {
    if (!starting) void SplashScreen.hideAsync().catch(() => undefined);
  }, [starting]);

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <GardenProvider>
          <DayPlanProvider>
          <PlantPhotosProvider>
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={{ presentation: "modal" }} />
            <Stack.Screen name="garden/index" />
            <Stack.Screen name="garden/add" />
            <Stack.Screen name="garden/[id]" />
            <Stack.Screen name="week" />
            <Stack.Screen name="diagnostic" />
            <Stack.Screen name="shopping" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="credits" />
            <Stack.Screen name="illustrations" />
            <Stack.Screen name="guide/[catalogId]" />
            <Stack.Screen name="vacation" />
            <Stack.Screen name="helper-note" />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen name="plus" />
          </Stack>
          <StatusBar style="dark" />
          <GlobalToast />
          <ReminderNotificationResponder />
          <AppUpdater />
          <OpeningScreen />
          </PlantPhotosProvider>
          </DayPlanProvider>
          </GardenProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  // Quelques dixièmes de seconde au lancement : on attend la police pour ne pas voir les textes changer.
  if (starting) return null;

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
