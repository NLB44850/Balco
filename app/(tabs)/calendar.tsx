import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FadeIn, PopIn } from "@/components/motion";
import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
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

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader
          title="Saisons"
          subtitle={showingIdeas ? "Idées de saison pour ton balcon" : `${resolvedPlants.length} plante${resolvedPlants.length > 1 ? "s" : ""} suivie${resolvedPlants.length > 1 ? "s" : ""}`}
        />

        <PopIn delay={60}>
          <View style={[glass.card, styles.climateCard]}>
            <View style={styles.climateTop}>
              <View style={styles.flex}>
                <Text style={[styles.climateLabel, { color: colors.muted }]}>{isLoading ? "Ton climat · chargement…" : "Ton climat, en direct"}</Text>
                <Text style={[styles.climateTitle, { color: colors.foreground }]}>{Math.round(weather.temperature)}° · {weather.summary}</Text>
                <Text style={[styles.climateMeta, { color: colors.muted }]}>Ressenti {Math.round(weather.apparentTemperature)}°</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Changer de ville, actuellement ${weather.city}`} onPress={() => setCityModalVisible(true)} style={({ pressed }) => [styles.cityButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.cityButtonText, { color: colors.primary }]}>⌖ {weather.city}</Text></Pressable>
            </View>
            <View style={styles.climateBottom}>
              <Text style={[styles.climateTip, { color: colors.foreground }]}>{weather.isFallback || !climate ? "Paris par défaut : choisis ta ville pour des dates justes." : climateSummary(climate)}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Actualiser la météo" hitSlop={8} onPress={() => void refresh()} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.refreshText, { color: colors.primary }]}>↻</Text></Pressable>
            </View>
          </View>
        </PopIn>

        {weatherAlerts.map((alert) => (
          <FadeIn key={alert.key} delay={100} style={[glass.card, styles.alertCard]}>
            <Text style={[styles.alertLabel, { color: alert.cause === "heat" ? colors.warning : colors.frost }]}>{alert.priority === "normal" ? "Météo du jour" : "Alerte météo"}</Text>
            <Text style={[styles.alertTitle, { color: colors.foreground }]}>{alert.title}</Text>
            <Text style={[styles.alertBody, { color: colors.muted }]}>{alert.body}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)")} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.actionLinkText, { color: colors.primary }]}>Voir sur Aujourd’hui ›</Text></Pressable>
          </FadeIn>
        ))}

        <View style={[glass.soft, styles.viewToggle]}>
          {(["month", "season"] as const).map((option) => {
            const active = view === option;
            return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setView(option)} style={({ pressed }) => [styles.viewOption, active && styles.viewOptionActive, pressed && styles.pressed]}><Text style={[styles.viewOptionText, { color: active ? colors.foreground : colors.muted }]}>{option === "month" ? "Par mois" : "Par saison"}</Text></Pressable>;
          })}
        </View>


        {view === "season" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
            {seasons.map((item, index) => {
              const active = season.id === item.id;
              return <Pressable key={item.id} onPress={() => setSelectedSeason(item.id)} style={({ pressed }) => [styles.seasonItem, active ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}><Text style={[styles.monthText, { color: active ? "#FFFFFF" : colors.foreground }]}>{item.label}</Text>{index === 0 && <View style={[styles.monthDot, { backgroundColor: active ? "#FFFFFF" : colors.primary }]} />}</Pressable>;
            })}
          </ScrollView>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
          {months.map((month) => {
            const active = selectedMonth === month;
            return <Pressable key={month} onPress={() => setSelectedMonth(month)} style={({ pressed }) => [styles.monthItem, active ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}><Text style={[styles.monthText, { color: active ? "#FFFFFF" : colors.foreground }]}>{MONTH_SHORT[month - 1]}</Text>{month === currentMonth && <View style={[styles.monthDot, { backgroundColor: active ? "#FFFFFF" : colors.primary }]} />}</Pressable>;
          })}
        </ScrollView>
        )}

        <Text style={[styles.monthTitle, { color: colors.foreground }]}>{view === "season" ? `${{ spring: "Au printemps", summer: "En été", autumn: "En automne", winter: "En hiver" }[season.id]}, ton balcon` : `En ${MONTH_LONG[selectedMonth - 1]}, ton balcon`}</Text>
        <Text style={[styles.monthIntro, { color: colors.muted }]}>{showingIdeas ? "Ton balcon est vide : voici ce que tu pourrais cultiver. Ajoute une plante pour un calendrier sur mesure." : "Voici les gestes de saison pour les plantes de ton balcon."}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {[{ id: "all", label: "Toutes" }, ...subjects.map((subject) => ({ id: subject.id, label: `${subject.entry.emoji} ${subject.displayName}` }))].map(({ id, label }) => {
            const active = activeFilter === id;
            return <Pressable key={id} onPress={() => setSelectedPlant(id)} style={({ pressed }) => [styles.filterChip, active ? { backgroundColor: colors.foreground } : glass.soft, pressed && styles.pressed]}><Text style={[styles.filterText, { color: active ? "#FFFFFF" : colors.foreground }]}>{label}</Text></Pressable>;
          })}
        </ScrollView>

        <View style={styles.activityList}>
          {currentActivities.map((activity, index) => {
            const tone = activity.tone === "coral" ? colors.warning : colors.primary;
            return <FadeIn key={`${activeFilter}-${selectedMonth}-${activity.key}`} delay={180 + index * 70} style={styles.activityRow}><View style={styles.timeline}><View style={[styles.timelineDot, { backgroundColor: tone }]} />{index < currentActivities.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}</View><View style={[glass.card, styles.activityCard]}><View style={styles.activityTop}><Text style={[styles.activityType, { color: tone }]}>{activity.typeLabel}</Text><View style={[styles.activityTag, { backgroundColor: activity.tone === "coral" ? "#FBEADF" : colors.leaf }]}><Text style={[styles.activityTagText, { color: tone }]}>{activity.tag}</Text></View></View><Text style={[styles.activityTitle, { color: colors.foreground }]}>{activity.title}</Text>{view === "season" && activity.months && <Text style={[styles.activityWhen, { color: colors.primary }]}>{describeMonths(activity.months).replace(/^./, (letter) => letter.toUpperCase())}</Text>}<Text style={[styles.activityDescription, { color: colors.muted }]}>{activity.description}</Text>{showingIdeas ? (
              <Pressable onPress={() => void addPlant(activity.entry.id)} style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}><Text style={[styles.actionLinkText, { color: colors.primary }]}>+ Ajouter à mon balcon  →</Text></Pressable>
            ) : view === "month" && selectedMonth === currentMonth ? (
              <Pressable onPress={() => void toggleActivity(activity)} style={({ pressed }) => [styles.actionLink, pressed && styles.pressed]}><Text style={[styles.actionLinkText, { color: activityDone(activity, events, now) ? colors.success : colors.primary }]}>{activityDone(activity, events, now) ? (["sow", "plant", "repot"].includes(activity.kind) ? "✓ Noté ce mois-ci" : "✓ Noté aujourd’hui") : "Noter comme fait  →"}</Text></Pressable>
            ) : null}</View></FadeIn>;
          })}
          {currentActivities.length === 0 && <Text style={[styles.activityDescription, { color: colors.muted, textAlign: "center", paddingVertical: 18 }]}>{view === "season" ? `Rien de prévu ${{ spring: "au printemps", summer: "en été", autumn: "en automne", winter: "en hiver" }[season.id]} : tes plantes se reposent.` : `Rien de prévu en ${MONTH_LONG[selectedMonth - 1]} : tes plantes se reposent. Regarde les mois suivants.`}</Text>}
        </View>

        <View style={[glass.soft, styles.legendCard]}><Text style={[styles.legendIcon, { color: colors.primary }]}>✦</Text><View style={{ flex: 1 }}><Text style={[styles.legendTitle, { color: colors.foreground }]}>Le calendrier apprend avec toi.</Text><Text style={[styles.legendText, { color: colors.muted }]}>Chaque geste réalisé rend les prochaines recommandations plus personnelles.</Text></View></View>
      </ScrollView>

      <Modal visible={cityModalVisible} transparent animationType="slide" onRequestClose={() => setCityModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.surface }]}><View style={styles.modalHeader}><View><Text style={[styles.modalOverline, { color: colors.muted }]}>Ta ville</Text><Text style={[styles.modalTitle, { color: colors.foreground }]}>Où pousse ton jardin ?</Text></View><Pressable onPress={() => setCityModalVisible(false)} style={styles.closeButton}><Text style={[styles.closeText, { color: colors.muted }]}>×</Text></Pressable></View><Text style={[styles.modalIntro, { color: colors.muted }]}>Choisis une ville pour adapter la météo et les conseils de culture.</Text><TextInput value={cityQuery} onChangeText={setCityQuery} onSubmitEditing={() => void searchManualCity()} placeholder="Rechercher une ville…" placeholderTextColor={colors.muted} returnKeyType="search" style={[styles.cityInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} /><Pressable onPress={() => void searchManualCity()} style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.searchButtonText}>{citySearchLoading ? "Recherche…" : "Rechercher"}</Text></Pressable>{citySearchError && <Text style={[styles.searchError, { color: colors.error }]}>{citySearchError}</Text>}<View style={styles.resultList}>{cityResults.map((city) => <Pressable key={`${city.id}-${city.latitude}`} onPress={() => void chooseCity(city)} style={({ pressed }) => [styles.resultRow, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.resultName, { color: colors.foreground }]}>{city.name}</Text><Text style={[styles.resultMeta, { color: colors.muted }]}>{[city.admin1, city.country].filter(Boolean).join(" · ")}</Text></Pressable>)}</View><Pressable onPress={() => { setCityModalVisible(false); void requestDeviceLocation(); }} style={({ pressed }) => [styles.deviceLink, pressed && styles.pressed]}><Text style={[styles.deviceLinkText, { color: colors.primary }]}>⌖ Utiliser ma position actuelle</Text></Pressable></View></View>
      </Modal>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 30, gap: 18 },
  flex: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  overline: { fontSize: 9, letterSpacing: 1.05, fontWeight: "800" },
  title: { fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  cityButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  pin: { fontSize: 17, color: "#D47B63" },
  cityButtonText: { fontSize: 13, fontWeight: "700" },
  chevron: { fontSize: 16, marginLeft: 2, marginTop: -4 },
  refreshButton: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  refreshText: { fontSize: 20, fontWeight: "700" },
  alertCard: { padding: 15, gap: 5 },
  alertLabel: { fontSize: 13, fontWeight: "700" },
  alertOverline: { fontSize: 9, letterSpacing: 1.05, fontWeight: "800" },
  alertTitle: { fontSize: 16, fontWeight: "800" },
  alertBody: { fontSize: 13, lineHeight: 19 },
  viewToggle: { flexDirection: "row", padding: 4, gap: 4 },
  viewOptionActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  viewOption: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: "center" },
  viewOptionText: { fontSize: 14, fontWeight: "700" },
  seasonItem: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", minWidth: 84 },
  activityWhen: { fontSize: 12, fontWeight: "800" },
  climateCard: { padding: 16, gap: 12 },
  climateLabel: { fontSize: 13, fontWeight: "600" },
  climateTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  climateOverline: { color: "rgba(255,255,255,0.58)", fontSize: 9, letterSpacing: 1, fontWeight: "800" },
  climateTitle: { fontSize: 22, fontWeight: "800", marginTop: 3, letterSpacing: -0.4 },
  climateSun: { color: "#D5E96B", fontSize: 30 },
  climateBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  climateRange: { color: "#D5E96B", fontSize: 27, fontWeight: "300", letterSpacing: -0.6 },
  climateMeta: { fontSize: 13, marginTop: 2 },
  climateTip: { flex: 1, fontSize: 13, lineHeight: 18 },
  climateTipText: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionOverline: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sectionTitle: { fontSize: 19, fontWeight: "800", marginTop: 3 },
  plantsCount: { fontSize: 10, fontWeight: "800", marginBottom: 2 },
  monthsRow: { gap: 7, paddingVertical: 2 },
  monthItem: { minWidth: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  monthText: { fontSize: 13, fontWeight: "700" },
  monthDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  monthTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  monthIntro: { fontSize: 14, lineHeight: 20, marginTop: -12 },
  filtersRow: { gap: 8, paddingBottom: 2 },
  filterChip: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  filterText: { fontSize: 13, fontWeight: "600" },
  activityList: { gap: 12 },
  activityRow: { flexDirection: "row", gap: 10 },
  timeline: { width: 12, alignItems: "center" },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 18 },
  timelineLine: { width: 1, flex: 1, marginTop: 5 },
  activityCard: { flex: 1, padding: 14 },
  activityTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activityType: { fontSize: 11, letterSpacing: 0.6, fontWeight: "800" },
  activityTag: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 },
  activityTagText: { fontSize: 11, fontWeight: "700" },
  activityTitle: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  activityDescription: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  actionLink: { alignSelf: "flex-start", marginTop: 11 },
  actionLinkText: { fontSize: 13, fontWeight: "700" },
  legendCard: { flexDirection: "row", gap: 11, alignItems: "flex-start", borderRadius: 18, padding: 15 },
  legendIcon: { fontSize: 21 },
  legendTitle: { fontSize: 14, fontWeight: "700" },
  legendText: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18,22,20,0.35)" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32, minHeight: 390 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalOverline: { fontSize: 13, fontWeight: "600" },
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
