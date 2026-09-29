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

  // Quatre onglets. « Moi » s'ouvre depuis l'avatar en haut de chaque écran,
  // et « Observer » (le scanner) depuis Nora et depuis la fiche d'une plante.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
        tabBarStyle: { height: 64 + bottomPadding, paddingTop: 6, paddingBottom: bottomPadding, backgroundColor: "rgba(255,255,255,0.96)", borderTopColor: colors.border, borderTopWidth: 1, elevation: 0, shadowOpacity: 0 },
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd’hui", tabBarIcon: ({ color }) => <IconSymbol size={24} name="checklist" color={color} /> }} />
      <Tabs.Screen name="balcony" options={{ title: "Balcon", tabBarIcon: ({ color }) => <IconSymbol size={24} name="camera.macro" color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "Saisons", tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar.badge.clock" color={color} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Nora", tabBarIcon: ({ color }) => <IconSymbol size={24} name="message.fill" color={color} /> }} />
      <Tabs.Screen name="scanner" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="profile" options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}
