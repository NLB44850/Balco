import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sun,
        tabBarInactiveTintColor: "#AFC0B2",
        tabBarLabelStyle: { fontSize: 9, fontWeight: "800", marginBottom: 2, letterSpacing: 0.15 },
        tabBarStyle: { height: 70 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: colors.foreground, borderTopColor: "#2A4A3B", borderTopWidth: 1, elevation: 0, shadowOpacity: 0 },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Jardin", tabBarIcon: ({ color }) => <IconSymbol size={22} name="leaf.fill" color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendrier", tabBarIcon: ({ color }) => <IconSymbol size={22} name="calendar.badge.clock" color={color} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Nora", tabBarIcon: ({ color }) => <IconSymbol size={22} name="message.fill" color={color} /> }} />
      <Tabs.Screen name="scanner" options={{ title: "Observer", tabBarIcon: ({ color }) => <IconSymbol size={22} name="camera.viewfinder" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Moi", tabBarIcon: ({ color }) => <IconSymbol size={22} name="person.crop.circle" color={color} /> }} />
    </Tabs>
  );
}
