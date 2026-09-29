import { Redirect, Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const { loaded, onboarding } = useGarden();

  // Premier lancement (ou compte supprimé, questionnaire à refaire) : on passe par l'accueil.
  if (!loaded) return null;
  if (!onboarding) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
        tabBarStyle: { height: 64 + bottomPadding, paddingTop: 6, paddingBottom: bottomPadding, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1, elevation: 0, shadowOpacity: 0 },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd’hui", tabBarIcon: ({ color }) => <IconSymbol size={22} name="leaf.fill" color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendrier", tabBarIcon: ({ color }) => <IconSymbol size={22} name="calendar.badge.clock" color={color} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Nora", tabBarIcon: ({ color }) => <IconSymbol size={22} name="message.fill" color={color} /> }} />
      <Tabs.Screen name="scanner" options={{ title: "Observer", tabBarIcon: ({ color }) => <IconSymbol size={22} name="camera.viewfinder" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Moi", tabBarIcon: ({ color }) => <IconSymbol size={22} name="person.crop.circle" color={color} /> }} />
    </Tabs>
  );
}
