import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { FadeIn, PopIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { type CityResult, useLocalWeather } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";

type PlantKey = "Toutes" | "Tomates cerises" | "Basilic" | "Menthe";

const months = ["Sep", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août"];
const plantFilters: PlantKey[] = ["Toutes", "Tomates cerises", "Basilic", "Menthe"];
const activities: Record<PlantKey, { type: string; title: string; description: string; tag: string; tone: "green" | "coral" | "lime" }[]> = {
  Toutes: [
    { type: "MAINTENANT", title: "Arroser le basilic", description: "Au pied, seulement si la terre est sèche sur 2 cm.", tag: "3 MIN", tone: "coral" },
    { type: "CETTE SEMAINE", title: "Récolter les tomates cerises", description: "Cueille-les quand elles sont bien rouges et légèrement souples.", tag: "RÉCOLTE", tone: "green" },
    { type: "À PRÉVOIR", title: "Bouturer la menthe", description: "Une tige dans un verre d'eau suffit pour préparer l'automne.", tag: "15 MIN", tone: "lime" },
  ],
  "Tomates cerises": [
    { type: "CETTE SEMAINE", title: "Récolter les tomates cerises", description: "Cueille-les quand elles sont bien rouges et légèrement souples.", tag: "RÉCOLTE", tone: "green" },
    { type: "À PRÉVOIR", title: "Retirer les feuilles basses", description: "Aère le pied pour limiter l'humidité et les maladies.", tag: "5 MIN", tone: "lime" },
  ],
  Basilic: [
    { type: "MAINTENANT", title: "Arroser le basilic", description: "Au pied, seulement si la terre est sèche sur 2 cm.", tag: "3 MIN", tone: "coral" },
    { type: "À PRÉVOIR", title: "Pincer les fleurs", description: "Garde l'énergie de la plante dans les feuilles parfumées.", tag: "2 MIN", tone: "lime" },
  ],
  Menthe: [
    { type: "CETTE SEMAINE", title: "Bouturer la menthe", description: "Une tige dans un verre d'eau suffit pour préparer l'automne.", tag: "15 MIN", tone: "green" },
    { type: "À PRÉVOIR", title: "Rafraîchir le pot", description: "Coupe les tiges sèches et garde la terre légèrement humide.", tag: "5 MIN", tone: "lime" },
  ],
};

export default function CalendarScreen() {
  const colors = useColors();
  const { weather, isLoading, refresh, requestDeviceLocation, searchCities, selectCity } = useLocalWeather();
  const [selectedMonth, setSelectedMonth] = useState("Sep");
  const [selectedPlant, setSelectedPlant] = useState<PlantKey>("Toutes");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const [citySearchError, setCitySearchError] = useState<string | null>(null);
  const currentActivities = useMemo(() => activities[selectedPlant], [selectedPlant]);

  const searchManualCity = async () => {
    setCitySearchLoading(true);
    setCitySearchError(null);
    try {
      setCityResults(await searchCities(cityQuery));
    } catch (searchError) {
      setCitySearchError(searchError instanceof Error ? searchError.message : "Recherche indisponible.");
    } finally {
      setCitySearchLoading(false);
    }
  };

  const chooseCity = async (city: CityResult) => {
    await selectCity(city);
    setCityModalVisible(false);
    setCityQuery("");
    setCityResults([]);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <FadeIn delay={60}>
          <View style={styles.header}><View><Text style={[styles.overline, { color: colors.terracotta }]}>PLANIFIER · COMPRENDRE · CULTIVER</Text><Text style={[styles.title, { color: colors.foreground }]}>Calendrier</Text></View><View style={styles.headerActions}><Pressable onPress={() => setCityModalVisible(true)} style={({ pressed }) => [styles.cityButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed]}><Text style={styles.pin}>⌖</Text><Text style={[styles.cityButtonText, { color: colors.foreground }]}>{weather.city}</Text><Text style={[styles.chevron, { color: colors.primary }]}>⌄</Text></Pressable><Pressable onPress={() => void refresh()} style={({ pressed }) => [styles.refreshButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.refreshText, { color: colors.primary }]}>↻</Text></Pressable></View></View>
        </FadeIn>

        <PopIn delay={120}>
          <LinearGradient colors={[colors.foreground, "#376D50"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.climateCard}>
            <View style={styles.climateTop}><View><Text style={styles.climateOverline}>{isLoading ? "CLIMAT LOCAL · CHARGEMENT" : "TON CLIMAT LOCAL · EN DIRECT"}</Text><Text style={styles.climateTitle}>{weather.summary}</Text></View><Text style={styles.climateSun}>{weather.isDay ? "☀" : "☾"}</Text></View>
            <View style={styles.climateBottom}><View><Text style={styles.climateRange}>{Math.round(weather.temperature)}° / {Math.round(weather.apparentTemperature)}°</Text><Text style={styles.climateMeta}>température / ressenti</Text></View><View style={[styles.climateTip, { backgroundColor: `${colors.sun}22` }]}><Text style={[styles.climateTipText, { color: colors.sun }]}>{weather.isFallback ? "Paris par défaut · active ta position" : "Position utilisée pour tes conseils"}</Text></View></View>
          </LinearGradient>
        </PopIn>

        <View style={styles.sectionHead}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>SAISON 01 · 2026</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ton rythme de culture</Text></View><Text style={[styles.plantsCount, { color: colors.primary }]}>3 plantes suivies</Text></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: 250, y: 0 }} contentContainerStyle={styles.monthsRow}>
          {months.map((month) => {
            const active = selectedMonth === month;
            return <Pressable key={month} onPress={() => setSelectedMonth(month)} style={({ pressed }) => [styles.monthItem, active && { backgroundColor: colors.foreground }, pressed && styles.pressed]}><Text style={[styles.monthText, { color: active ? colors.sun : colors.muted }]}>{month}</Text>{month === "Sep" && <View style={[styles.monthDot, { backgroundColor: active ? colors.sun : colors.terracotta }]} />}</Pressable>;
          })}
        </ScrollView>

        <Text style={[styles.monthTitle, { color: colors.foreground }]}>En {selectedMonth === "Sep" ? "septembre" : selectedMonth.toLowerCase()}, ton balcon</Text>
        <Text style={[styles.monthIntro, { color: colors.muted }]}>Voici les actions adaptées à ton climat et aux plantes que tu as choisies.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {plantFilters.map((plant) => {
            const active = selectedPlant === plant;
            return <Pressable key={plant} onPress={() => setSelectedPlant(plant)} style={({ pressed }) => [styles.filterChip, { borderColor: active ? colors.foreground : colors.border, backgroundColor: active ? colors.foreground : colors.surface }, pressed && styles.pressed]}><Text style={[styles.filterText, { color: active ? colors.sun : colors.foreground }]}>{plant}</Text></Pressable>;
          })}
        </ScrollView>

        <View style={styles.activityList}>
          {currentActivities.map((activity, index) => {
            const tone = activity.tone === "coral" ? colors.terracotta : activity.tone === "lime" ? colors.success : colors.primary;
            return <FadeIn key={`${selectedPlant}-${activity.title}`} delay={180 + index * 70} style={styles.activityRow}><View style={styles.timeline}><View style={[styles.timelineDot, { backgroundColor: tone }]} />{index < currentActivities.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}</View><View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.activityTop}><Text style={[styles.activityType, { color: tone }]}>{activity.type}</Text><View style={[styles.activityTag, { backgroundColor: activity.tone === "coral" ? colors.cream : colors.leaf }]}><Text style={[styles.activityTagText, { color: tone }]}>{activity.tag}</Text></View></View><Text style={[styles.activityTitle, { color: colors.foreground }]}>{activity.title}</Text><Text style={[styles.activityDescription, { color: colors.muted }]}>{activity.description}</Text><Pressable onPress={() => {}} style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}><Text style={[styles.actionLinkText, { color: colors.primary }]}>Ajouter à ma session  →</Text></Pressable></View></FadeIn>;
          })}
        </View>

        <View style={[styles.legendCard, { backgroundColor: colors.cream }]}><Text style={styles.legendIcon}>✦</Text><View style={{ flex: 1 }}><Text style={[styles.legendTitle, { color: colors.foreground }]}>Le calendrier apprend avec toi.</Text><Text style={[styles.legendText, { color: colors.muted }]}>Chaque geste réalisé rend les prochaines recommandations plus personnelles.</Text></View></View>
      </ScrollView>

      <Modal visible={cityModalVisible} transparent animationType="slide" onRequestClose={() => setCityModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.surface }]}><View style={styles.modalHeader}><View><Text style={[styles.modalOverline, { color: colors.terracotta }]}>PERSONNALISER BALCO</Text><Text style={[styles.modalTitle, { color: colors.foreground }]}>Où pousse ton jardin ?</Text></View><Pressable onPress={() => setCityModalVisible(false)} style={styles.closeButton}><Text style={[styles.closeText, { color: colors.muted }]}>×</Text></Pressable></View><Text style={[styles.modalIntro, { color: colors.muted }]}>Choisis une ville pour adapter la météo et les conseils de culture.</Text><TextInput value={cityQuery} onChangeText={setCityQuery} onSubmitEditing={() => void searchManualCity()} placeholder="Rechercher une ville…" placeholderTextColor={colors.muted} returnKeyType="search" style={[styles.cityInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} /><Pressable onPress={() => void searchManualCity()} style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={styles.searchButtonText}>{citySearchLoading ? "Recherche…" : "Rechercher"}</Text></Pressable>{citySearchError && <Text style={[styles.searchError, { color: colors.error }]}>{citySearchError}</Text>}<View style={styles.resultList}>{cityResults.map((city) => <Pressable key={`${city.id}-${city.latitude}`} onPress={() => void chooseCity(city)} style={({ pressed }) => [styles.resultRow, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.resultName, { color: colors.foreground }]}>{city.name}</Text><Text style={[styles.resultMeta, { color: colors.muted }]}>{[city.admin1, city.country].filter(Boolean).join(" · ")}</Text></Pressable>)}</View><Pressable onPress={() => { setCityModalVisible(false); void requestDeviceLocation(); }} style={({ pressed }) => [styles.deviceLink, pressed && styles.pressed]}><Text style={[styles.deviceLinkText, { color: colors.primary }]}>⌖ Utiliser ma position actuelle</Text></Pressable></View></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 30, gap: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  overline: { fontSize: 9, letterSpacing: 1.05, fontWeight: "800" },
  title: { fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  cityButton: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  pin: { fontSize: 17, color: "#D47B63" },
  cityButtonText: { fontSize: 11, fontWeight: "800" },
  chevron: { fontSize: 16, marginLeft: 2, marginTop: -4 },
  refreshButton: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  refreshText: { fontSize: 18, fontWeight: "800" },
  climateCard: { borderRadius: 24, padding: 18, minHeight: 153 },
  climateTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  climateOverline: { color: "rgba(255,255,255,0.58)", fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  climateTitle: { color: "#FFF", fontSize: 19, fontWeight: "800", marginTop: 5 },
  climateSun: { color: "#D5E96B", fontSize: 30 },
  climateBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 22 },
  climateRange: { color: "#D5E96B", fontSize: 27, fontWeight: "300", letterSpacing: -0.6 },
  climateMeta: { color: "rgba(255,255,255,0.56)", fontSize: 9, marginTop: 2 },
  climateTip: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 8, maxWidth: 148 },
  climateTipText: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionOverline: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sectionTitle: { fontSize: 19, fontWeight: "800", marginTop: 3 },
  plantsCount: { fontSize: 10, fontWeight: "800", marginBottom: 2 },
  monthsRow: { gap: 7, paddingVertical: 2 },
  monthItem: { minWidth: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  monthText: { fontSize: 11, fontWeight: "800" },
  monthDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  monthTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, marginTop: -2 },
  monthIntro: { fontSize: 12, lineHeight: 18, marginTop: -11 },
  filtersRow: { gap: 8, paddingBottom: 2 },
  filterChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  filterText: { fontSize: 11, fontWeight: "800" },
  activityList: { gap: 12 },
  activityRow: { flexDirection: "row", gap: 10 },
  timeline: { width: 12, alignItems: "center" },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 18 },
  timelineLine: { width: 1, flex: 1, marginTop: 5 },
  activityCard: { flex: 1, borderWidth: 1, borderRadius: 19, padding: 14 },
  activityTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activityType: { fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  activityTag: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 },
  activityTagText: { fontSize: 9, fontWeight: "800" },
  activityTitle: { fontSize: 15, fontWeight: "800", marginTop: 11 },
  activityDescription: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  actionLink: { alignSelf: "flex-start", marginTop: 11 },
  actionLinkText: { fontSize: 11, fontWeight: "800" },
  legendCard: { flexDirection: "row", gap: 11, alignItems: "flex-start", borderRadius: 18, padding: 15 },
  legendIcon: { fontSize: 21, color: "#D47B63" },
  legendTitle: { fontSize: 13, fontWeight: "800" },
  legendText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,53,43,0.42)" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32, minHeight: 390 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalOverline: { fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  modalTitle: { fontSize: 23, fontWeight: "800", marginTop: 4 },
  closeButton: { padding: 2 },
  closeText: { fontSize: 28, lineHeight: 28, fontWeight: "300" },
  modalIntro: { fontSize: 12, lineHeight: 18, marginTop: 9, maxWidth: 310 },
  cityInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginTop: 18 },
  searchButton: { alignSelf: "flex-start", borderRadius: 13, paddingHorizontal: 15, paddingVertical: 11, marginTop: 10 },
  searchButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  searchError: { fontSize: 11, marginTop: 9 },
  resultList: { marginTop: 10 },
  resultRow: { borderBottomWidth: 1, paddingVertical: 10 },
  resultName: { fontSize: 14, fontWeight: "800" },
  resultMeta: { fontSize: 10, marginTop: 3 },
  deviceLink: { alignSelf: "flex-start", marginTop: 16 },
  deviceLinkText: { fontSize: 12, fontWeight: "800" },
});
