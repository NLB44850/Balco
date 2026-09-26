import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { PopIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  clearAndDisableLocalReminders,
  defaultLocalReminderSettings,
  loadLocalReminderSettings,
  requestLocalNotificationPermission,
  saveLocalReminderSettings,
  type LocalReminderSettings,
} from "@/lib/reminders/local-notifications";

type Badge = { id: string; title: string; detail: string; icon: string; tone: string; unlocked: boolean };

const badges: Badge[] = [
  { id: "bees", title: "Ami des Abeilles", detail: "3 plantes mellifères", icon: "✺", tone: "#F5D27C", unlocked: true },
  { id: "water", title: "Zéro Gâchis d'Eau", detail: "5 arrosages économes", icon: "◌", tone: "#B9DCD3", unlocked: true },
  { id: "bio", title: "Bio-Défenseur", detail: "2 soins naturels", icon: "♧", tone: "#DCE8DD", unlocked: true },
  { id: "plate", title: "Du Balcon à l'Assiette", detail: "Récolte ta première tomate", icon: "♡", tone: "#F0D2C5", unlocked: false },
];

const reminderPlants = [
  { id: "tomates-cerises", label: "Tomates cerises", icon: "🍅" },
  { id: "basilic-&-menthe", label: "Basilic & menthe", icon: "🌿" },
  { id: "menthe", label: "Menthe", icon: "🌱" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const [reminderSettings, setReminderSettings] = useState<LocalReminderSettings>(defaultLocalReminderSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    loadLocalReminderSettings().then((settings) => {
      setReminderSettings(settings);
      setSettingsLoaded(true);
    });
  }, []);

  const updateReminderSettings = async (patch: Partial<LocalReminderSettings>) => {
    const next = { ...reminderSettings, ...patch };
    setReminderSettings(next);
    await saveLocalReminderSettings(next);
  };

  const toggleReminders = async () => {
    if (reminderSettings.enabled) {
      await clearAndDisableLocalReminders();
      setReminderSettings((current) => ({ ...current, enabled: false }));
      return;
    }
    const granted = await requestLocalNotificationPermission();
    if (!granted) {
      Alert.alert("Notifications désactivées", "Autorise les notifications dans les réglages de ton téléphone pour recevoir les conseils Balco.");
      return;
    }
    await updateReminderSettings({ enabled: true, enabledPlantIds: reminderPlants.map((plant) => plant.id) });
  };

  const togglePlant = async (plantId: string) => {
    const enabledPlantIds = reminderSettings.enabledPlantIds.includes(plantId)
      ? reminderSettings.enabledPlantIds.filter((id) => id !== plantId)
      : [...reminderSettings.enabledPlantIds, plantId];
    await updateReminderSettings({ enabledPlantIds });
  };

  const header = useMemo(() => (
    <>
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.terracotta }]}><Text style={styles.avatarText}>CM</Text></View>
        <View style={styles.profileCopy}><Text style={[styles.profileName, { color: colors.foreground }]}>Camille Martin</Text><Text style={[styles.profileMeta, { color: colors.muted }]}>Paris · balcon sud-est</Text></View>
        <Pressable onPress={() => Alert.alert("Réglages", "Les réglages du profil arrivent bientôt.")} style={({ pressed }) => [styles.settingsButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.settingsText, { color: colors.foreground }]}>⚙</Text></Pressable>
      </View>
      <LinearGradient colors={[colors.primary, "#5B9670"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.impactHero}>
        <View style={styles.impactHeroTop}><View><Text style={styles.impactHeroEyebrow}>MON IMPACT ÉCO</Text><Text style={styles.impactHeroTitle}>Jardinier·ère en herbe</Text></View><Text style={styles.impactHeroScore}>68</Text></View>
        <View style={styles.heroProgressTrack}><View style={[styles.heroProgressFill, { width: "68%" }]} /></View>
        <View style={styles.impactHeroBottom}><Text style={styles.impactHeroCaption}>32 points avant le niveau suivant</Text><Text style={styles.impactHeroLevel}>NIVEAU 2</Text></View>
      </LinearGradient>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>12</Text><Text style={[styles.statLabel, { color: colors.muted }]}>gestes faits</Text></View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>4</Text><Text style={[styles.statLabel, { color: colors.muted }]}>jours de suite</Text></View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>{unlockedCount}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>badges</Text></View>
      </View>
      <View style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.reminderCardHeader}>
          <View style={styles.reminderCardCopy}><Text style={[styles.sectionEyebrow, { color: colors.terracotta }]}>RAPPELS CONTEXTUELS</Text><Text style={[styles.reminderCardTitle, { color: colors.foreground }]}>Seulement quand c’est utile</Text><Text style={[styles.reminderCardText, { color: colors.muted }]}>Balco croise la météo et ton dernier geste.</Text></View>
          <Pressable disabled={!settingsLoaded} onPress={() => void toggleReminders()} style={({ pressed }) => [styles.toggle, { backgroundColor: reminderSettings.enabled ? colors.primary : colors.border }, pressed && styles.pressed]}><View style={[styles.toggleKnob, reminderSettings.enabled && styles.toggleKnobOn]} /></Pressable>
        </View>
        <View style={styles.reminderOptionRow}><Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Rappel préféré</Text><View style={styles.timeChoices}>{[17, 18, 19].map((hour) => <Pressable key={hour} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ preferredHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.preferredHour === hour ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour}h30</Text></Pressable>)}</View></View>
        <View style={styles.quietBlock}><View><Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Plage calme</Text><Text style={[styles.reminderOptionHint, { color: colors.muted }]}>Aucune notification pendant ces heures</Text></View><Text style={[styles.reminderQuietValue, { color: colors.primary }]}>{reminderSettings.quietStartHour} → {reminderSettings.quietEndHour} h</Text></View>
        <View style={styles.quietChoices}><View style={styles.quietChoiceGroup}><Text style={[styles.quietChoiceLabel, { color: colors.muted }]}>Début</Text><View style={styles.timeChoices}>{[20, 21, 22].map((hour) => <Pressable key={`start-${hour}`} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ quietStartHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.quietStartHour === hour ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour} h</Text></Pressable>)}</View></View><View style={styles.quietChoiceGroup}><Text style={[styles.quietChoiceLabel, { color: colors.muted }]}>Fin</Text><View style={styles.timeChoices}>{[7, 8, 9].map((hour) => <Pressable key={`end-${hour}`} disabled={!reminderSettings.enabled} onPress={() => void updateReminderSettings({ quietEndHour: hour })} style={[styles.timeChoice, { backgroundColor: reminderSettings.quietEndHour === hour ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={[styles.timeChoiceText, { color: colors.primary }]}>{hour} h</Text></Pressable>)}</View></View></View>
        <Text style={[styles.reminderOptionLabel, { color: colors.foreground }]}>Plantes concernées</Text>
        <View style={styles.plantToggles}>{reminderPlants.map((plant) => { const enabled = reminderSettings.enabledPlantIds.includes(plant.id); return <Pressable key={plant.id} disabled={!reminderSettings.enabled} onPress={() => void togglePlant(plant.id)} style={[styles.plantToggle, { backgroundColor: enabled ? colors.leaf : colors.cream, opacity: reminderSettings.enabled ? 1 : 0.5 }]}><Text style={styles.plantToggleIcon}>{plant.icon}</Text><Text style={[styles.plantToggleText, { color: colors.foreground }]}>{plant.label}</Text><Text style={[styles.plantToggleCheck, { color: enabled ? colors.primary : colors.muted }]}>{enabled ? "✓" : "·"}</Text></Pressable>; })}</View>
      </View>
      <View style={styles.badgeHeading}><View><Text style={[styles.sectionEyebrow, { color: colors.terracotta }]}>PETITES VICTOIRES</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes badges éco</Text></View><Text style={[styles.badgeCount, { color: colors.primary }]}>{unlockedCount}/4</Text></View>
    </>
  ), [colors, unlockedCount]);

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.badgeRow}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => Alert.alert(item.title, item.unlocked ? item.detail : "Encore 1 geste pour débloquer ce badge.")} style={({ pressed }) => [styles.badgeCard, { backgroundColor: item.unlocked ? colors.surface : "#F0EEE8", borderColor: item.unlocked ? colors.border : "#E3E0D8" }, pressed && styles.pressed]}>
            <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? item.tone : "#E4E1D9" }]}><Text style={[styles.badgeIconText, { color: item.unlocked ? colors.foreground : "#A8AAA4" }]}>{item.unlocked ? item.icon : "·"}</Text></View>
            <Text style={[styles.badgeTitle, { color: item.unlocked ? colors.foreground : colors.muted }]}>{item.title}</Text>
            <Text style={[styles.badgeDetail, { color: item.unlocked ? colors.muted : "#A8AAA4" }]}>{item.unlocked ? item.detail : "À débloquer"}</Text>
            {item.unlocked && <PopIn delay={180} style={[styles.unlockedMark, { backgroundColor: colors.leaf }]}><Text style={[styles.unlockedMarkText, { color: colors.primary }]}>✓</Text></PopIn>}
          </Pressable>
        )}
        ListFooterComponent={<View style={[styles.footerCard, { backgroundColor: colors.cream }]}><Text style={styles.footerIcon}>♧</Text><View style={styles.footerCopy}><Text style={[styles.footerTitle, { color: colors.foreground }]}>Chaque geste compte.</Text><Text style={[styles.footerText, { color: colors.muted }]}>Invite un proche à faire pousser quelque chose.</Text></View><Text style={[styles.footerArrow, { color: colors.terracotta }]}>›</Text></View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 30 },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: { width: 53, height: 53, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  profileCopy: { flex: 1, marginLeft: 13 },
  profileName: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  profileMeta: { fontSize: 12, marginTop: 4 },
  settingsButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  settingsText: { fontSize: 17 },
  impactHero: { borderRadius: 25, padding: 19, shadowColor: "#2E6B4D", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  impactHeroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  impactHeroEyebrow: { color: "rgba(255,255,255,0.64)", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  impactHeroTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", marginTop: 5 },
  impactHeroScore: { color: "#FFFFFF", fontSize: 40, lineHeight: 41, fontWeight: "300", letterSpacing: -1 },
  heroProgressTrack: { height: 8, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", marginTop: 20 },
  heroProgressFill: { height: 8, borderRadius: 5, backgroundColor: "#F5D27C" },
  impactHeroBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  impactHeroCaption: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  impactHeroLevel: { color: "#F5D27C", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 14, marginBottom: 27 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 17, paddingVertical: 13, alignItems: "center" },
  statValue: { fontSize: 21, fontWeight: "800" },
  statLabel: { fontSize: 10, marginTop: 3 },
  reminderCard: { borderRadius: 21, borderWidth: 1, padding: 15, marginBottom: 25, gap: 14 },
  reminderCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  reminderCardCopy: { flex: 1 },
  reminderCardTitle: { fontSize: 17, fontWeight: "800", marginTop: 4 },
  reminderCardText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  toggle: { width: 47, height: 28, borderRadius: 15, padding: 3, justifyContent: "center" },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" },
  toggleKnobOn: { alignSelf: "flex-end" },
  reminderOptionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  reminderOptionLabel: { fontSize: 12, fontWeight: "800" },
  reminderOptionHint: { fontSize: 10, marginTop: 3 },
  reminderQuietValue: { fontSize: 12, fontWeight: "800" },
  quietBlock: { gap: 9 },
  quietChoices: { flexDirection: "row", gap: 12 },
  quietChoiceGroup: { flex: 1, gap: 5 },
  quietChoiceLabel: { fontSize: 10, fontWeight: "700" },
  timeChoices: { flexDirection: "row", gap: 6 },
  timeChoice: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  timeChoiceText: { fontSize: 10, fontWeight: "800" },
  plantToggles: { gap: 7, marginTop: -6 },
  plantToggle: { borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  plantToggleIcon: { fontSize: 16 },
  plantToggleText: { flex: 1, fontSize: 11, fontWeight: "700" },
  plantToggleCheck: { fontSize: 16, fontWeight: "900" },
  badgeHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 13 },
  sectionEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  sectionTitle: { fontSize: 21, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  badgeCount: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  badgeRow: { gap: 12, marginBottom: 12 },
  badgeCard: { flex: 1, minHeight: 164, borderRadius: 21, borderWidth: 1, padding: 14, position: "relative", shadowColor: "#9B7D67", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  badgeIcon: { width: 47, height: 47, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badgeIconText: { fontSize: 25, fontWeight: "700" },
  badgeTitle: { fontSize: 13, lineHeight: 16, fontWeight: "800", marginTop: 13 },
  badgeDetail: { fontSize: 10, lineHeight: 14, marginTop: 5 },
  unlockedMark: { width: 19, height: 19, borderRadius: 10, position: "absolute", right: 11, top: 11, alignItems: "center", justifyContent: "center" },
  unlockedMarkText: { fontSize: 12, fontWeight: "800" },
  footerCard: { borderRadius: 20, padding: 15, flexDirection: "row", alignItems: "center", marginTop: 8 },
  footerIcon: { color: "#C56D52", fontSize: 28 },
  footerCopy: { flex: 1, marginLeft: 12 },
  footerTitle: { fontSize: 13, fontWeight: "800" },
  footerText: { fontSize: 11, marginTop: 4 },
  footerArrow: { fontSize: 28, fontWeight: "300" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
