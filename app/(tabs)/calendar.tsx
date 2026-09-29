import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { FadeIn, PopIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { type CityResult, useLocalWeather } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { careProfileFor, plantDisplayName } from "@/lib/garden/garden-logic";
import {
  activityDone,
  calendarActivities,
  describeMonths,
  eventForActivity,
  seasonActivities,
  upcomingMonths,
  upcomingSeasons,
  type CalendarActivity,
  type CalendarSubject,
} from "@/lib/plants/calendar";
import { MONTH_LONG, MONTH_SHORT, recommendPlants } from "@/lib/plants/catalog";
import { climateSummary, climateZoneFor } from "@/lib/plants/climate";
import { decideReminders } from "@/lib/reminders/reminder-engine";
import { groupReminders } from "@/lib/reminders/reminder-groups";

type PlantFilter = "all" | string;
const TONE_TAG_BACKGROUND = { coral: "cream", green: "leaf", lime: "leaf" } as const;

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const { weather, weatherSnapshot, isLoading, refresh, requestDeviceLocation, searchCities, selectCity } = useLocalWeather();
  const { resolvedPlants, events, onboarding, addPlant, logEvent, removeEvent, reportLocation } = useGarden();
  const now = useMemo(() => new Date(), []);

  // Une ville choisie ici doit aussi servir aux rappels envoyés par le serveur.
  useEffect(() => {
    if (weather.isFallback) return;
    reportLocation({ city: weather.city, latitude: weather.latitude, longitude: weather.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" });
  }, [reportLocation, weather.city, weather.isFallback, weather.latitude, weather.longitude]);
  const currentMonth = now.getMonth() + 1;
  const months = useMemo(() => upcomingMonths(now), [now]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedPlant, setSelectedPlant] = useState<PlantFilter>("all");
  const [view, setView] = useState<"month" | "season">("month");
  const seasons = useMemo(() => upcomingSeasons(now), [now]);
  const [selectedSeason, setSelectedSeason] = useState(seasons[0].id);
  // Climat de la ville choisie : dates des plantes frileuses décalées (Midi plus tôt, montagne plus tard).
  const climate = useMemo(() => (weather.isFallback ? null : climateZoneFor(weather.latitude, weather.longitude, weatherSnapshot.elevationM)), [weather.isFallback, weather.latitude, weather.longitude, weatherSnapshot.elevationM]);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const [citySearchError, setCitySearchError] = useState<string | null>(null);
  // Sans plante au balcon, le calendrier montre des idées adaptées plutôt qu'un écran vide.
  const showingIdeas = resolvedPlants.length === 0;
  const subjects = useMemo<CalendarSubject[]>(
    () => showingIdeas
      ? recommendPlants(onboarding, { month: currentMonth }).slice(0, 4).map((entry) => ({ id: entry.id, entry, displayName: entry.name }))
      : resolvedPlants.map((resolved) => ({ id: resolved.plant.id, entry: resolved.entry, displayName: plantDisplayName(resolved) })),
    [currentMonth, onboarding, resolvedPlants, showingIdeas],
  );
  const activeFilter = selectedPlant === "all" || subjects.some((subject) => subject.id === selectedPlant) ? selectedPlant : "all";
  const filteredSubjects = useMemo(() => (activeFilter === "all" ? subjects : subjects.filter((subject) => subject.id === activeFilter)), [activeFilter, subjects]);
  const season = seasons.find((item) => item.id === selectedSeason) ?? seasons[0];
  const currentActivities = useMemo(
    () => (view === "season" ? seasonActivities(filteredSubjects, season, { climate }) : calendarActivities(filteredSubjects, selectedMonth, { climate })),
    [climate, filteredSubjects, season, selectedMonth, view],
  );

  // Alertes météo du moment (gel, orage, vent, chaleur, pluie), une par cause, pour les plantes du balcon.
  const weatherAlerts = useMemo(() => {
    if (weather.isFallback || resolvedPlants.length === 0) return [];
    const decisions = decideReminders(resolvedPlants.map((resolved) => ({ plant: careProfileFor(resolved), history: events, weather: weatherSnapshot, settings: { enabled: true } })));
    return groupReminders(decisions).filter((group) => group.cause && group.cause !== "thirst");
  }, [events, resolvedPlants, weather.isFallback, weatherSnapshot]);

  const toggleActivity = async (activity: CalendarActivity) => {
    const today = new Date();
    const event = eventForActivity(activity, today);
    if (activityDone(activity, events, today)) {
      await removeEvent(event.id);
      return;
    }
    await logEvent(event);
  };

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
            <View style={styles.climateBottom}><View><Text style={styles.climateRange}>{Math.round(weather.temperature)}° / {Math.round(weather.apparentTemperature)}°</Text><Text style={styles.climateMeta}>température / ressenti</Text></View><View style={[styles.climateTip, { backgroundColor: `${colors.sun}22` }]}><Text style={[styles.climateTipText, { color: colors.sun }]}>{weather.isFallback || !climate ? "Paris par défaut · active ta position" : climateSummary(climate)}</Text></View></View>
          </LinearGradient>
        </PopIn>

        {weatherAlerts.map((alert) => (
          <FadeIn key={alert.key} delay={140} style={[styles.alertCard, { backgroundColor: colors.cream, borderColor: alert.priority === "normal" ? colors.border : colors.terracotta }]}>
            <Text style={[styles.alertOverline, { color: colors.terracotta }]}>{alert.priority === "normal" ? "MÉTÉO DU JOUR" : "ALERTE MÉTÉO"}</Text>
            <Text style={[styles.alertTitle, { color: colors.foreground }]}>{alert.title}</Text>
            <Text style={[styles.alertBody, { color: colors.muted }]}>{alert.body}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)")} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.actionLinkText, { color: colors.primary }]}>Voir les gestes sur l’accueil  →</Text></Pressable>
          </FadeIn>
        ))}

        <View style={[styles.viewToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["month", "season"] as const).map((option) => {
            const active = view === option;
            return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setView(option)} style={({ pressed }) => [styles.viewOption, active && { backgroundColor: colors.foreground }, pressed && styles.pressed]}><Text style={[styles.viewOptionText, { color: active ? colors.sun : colors.foreground }]}>{option === "month" ? "Par mois" : "Par saison"}</Text></Pressable>;
          })}
        </View>

        <View style={styles.sectionHead}><View><Text style={[styles.sectionOverline, { color: colors.terracotta }]}>{MONTH_LONG[currentMonth - 1].toUpperCase()} {now.getFullYear()} → {MONTH_LONG[(currentMonth + 10) % 12].toUpperCase()}</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ton rythme de culture</Text></View><Text style={[styles.plantsCount, { color: colors.primary }]}>{showingIdeas ? "idées de saison" : `${resolvedPlants.length} plante${resolvedPlants.length > 1 ? "s" : ""} suivie${resolvedPlants.length > 1 ? "s" : ""}`}</Text></View>

        {view === "season" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
            {seasons.map((item, index) => {
              const active = season.id === item.id;
              return <Pressable key={item.id} onPress={() => setSelectedSeason(item.id)} style={({ pressed }) => [styles.seasonItem, active && { backgroundColor: colors.foreground }, pressed && styles.pressed]}><Text style={[styles.monthText, { color: active ? colors.sun : colors.muted }]}>{item.label}</Text>{index === 0 && <View style={[styles.monthDot, { backgroundColor: active ? colors.sun : colors.terracotta }]} />}</Pressable>;
            })}
          </ScrollView>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
          {months.map((month) => {
            const active = selectedMonth === month;
            return <Pressable key={month} onPress={() => setSelectedMonth(month)} style={({ pressed }) => [styles.monthItem, active && { backgroundColor: colors.foreground }, pressed && styles.pressed]}><Text style={[styles.monthText, { color: active ? colors.sun : colors.muted }]}>{MONTH_SHORT[month - 1]}</Text>{month === currentMonth && <View style={[styles.monthDot, { backgroundColor: active ? colors.sun : colors.terracotta }]} />}</Pressable>;
          })}
        </ScrollView>
        )}

        <Text style={[styles.monthTitle, { color: colors.foreground }]}>{view === "season" ? `${{ spring: "Au printemps", summer: "En été", autumn: "En automne", winter: "En hiver" }[season.id]}, ton balcon` : `En ${MONTH_LONG[selectedMonth - 1]}, ton balcon`}</Text>
        <Text style={[styles.monthIntro, { color: colors.muted }]}>{showingIdeas ? "Ton balcon est vide : voici ce que tu pourrais cultiver. Ajoute une plante pour un calendrier sur mesure." : "Voici les gestes de saison pour les plantes de ton balcon."}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {[{ id: "all", label: "Toutes" }, ...subjects.map((subject) => ({ id: subject.id, label: `${subject.entry.emoji} ${subject.displayName}` }))].map(({ id, label }) => {
            const active = activeFilter === id;
            return <Pressable key={id} onPress={() => setSelectedPlant(id)} style={({ pressed }) => [styles.filterChip, { borderColor: active ? colors.foreground : colors.border, backgroundColor: active ? colors.foreground : colors.surface }, pressed && styles.pressed]}><Text style={[styles.filterText, { color: active ? colors.sun : colors.foreground }]}>{label}</Text></Pressable>;
          })}
        </ScrollView>

        <View style={styles.activityList}>
          {currentActivities.map((activity, index) => {
            const tone = activity.tone === "coral" ? colors.terracotta : activity.tone === "lime" ? colors.success : colors.primary;
            return <FadeIn key={`${activeFilter}-${selectedMonth}-${activity.key}`} delay={180 + index * 70} style={styles.activityRow}><View style={styles.timeline}><View style={[styles.timelineDot, { backgroundColor: tone }]} />{index < currentActivities.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}</View><View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.activityTop}><Text style={[styles.activityType, { color: tone }]}>{activity.typeLabel}</Text><View style={[styles.activityTag, { backgroundColor: colors[TONE_TAG_BACKGROUND[activity.tone]] }]}><Text style={[styles.activityTagText, { color: tone }]}>{activity.tag}</Text></View></View><Text style={[styles.activityTitle, { color: colors.foreground }]}>{activity.title}</Text>{view === "season" && activity.months && <Text style={[styles.activityWhen, { color: colors.primary }]}>{describeMonths(activity.months).replace(/^./, (letter) => letter.toUpperCase())}</Text>}<Text style={[styles.activityDescription, { color: colors.muted }]}>{activity.description}</Text>{showingIdeas ? (
              <Pressable onPress={() => void addPlant(activity.entry.id)} style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}><Text style={[styles.actionLinkText, { color: colors.primary }]}>+ Ajouter à mon balcon  →</Text></Pressable>
            ) : view === "month" && selectedMonth === currentMonth ? (
              <Pressable onPress={() => void toggleActivity(activity)} style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}><Text style={[styles.actionLinkText, { color: activityDone(activity, events, now) ? colors.success : colors.primary }]}>{activityDone(activity, events, now) ? (["sow", "plant", "repot"].includes(activity.kind) ? "✓ Noté ce mois-ci" : "✓ Noté aujourd’hui") : "Noter comme fait  →"}</Text></Pressable>
            ) : null}</View></FadeIn>;
          })}
          {currentActivities.length === 0 && <Text style={[styles.activityDescription, { color: colors.muted, textAlign: "center", paddingVertical: 18 }]}>{view === "season" ? `Rien de prévu ${{ spring: "au printemps", summer: "en été", autumn: "en automne", winter: "en hiver" }[season.id]} : tes plantes se reposent.` : `Rien de prévu en ${MONTH_LONG[selectedMonth - 1]} : tes plantes se reposent. Regarde les mois suivants.`}</Text>}
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
  alertCard: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 5 },
  alertOverline: { fontSize: 9, letterSpacing: 1.05, fontWeight: "800" },
  alertTitle: { fontSize: 16, fontWeight: "800" },
  alertBody: { fontSize: 13, lineHeight: 19 },
  viewToggle: { flexDirection: "row", borderWidth: 1, borderRadius: 16, padding: 4, gap: 4 },
  viewOption: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: "center" },
  viewOptionText: { fontSize: 12, fontWeight: "800" },
  seasonItem: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, alignItems: "center", minWidth: 84 },
  activityWhen: { fontSize: 12, fontWeight: "800" },
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
