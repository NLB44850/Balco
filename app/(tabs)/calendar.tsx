/**
 * Onglet « Saisons » : les gestes de saison de tes plantes (semis, plantation, rempotage, récolte,
 * entretien), en une liste à cocher comme sur Aujourd'hui. Le mois en cours se coche ; les mois et
 * les saisons à venir se lisent. Le détail s'ouvre dans la feuille du bas, avec « Annuler » après
 * chaque geste, et « Tout est fait » quand le mois est bouclé.
 */
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { FadeIn } from "@/components/motion";
import { PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { TODAY_ROW_PICTURE, TodayRow } from "@/components/today/today-row";
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { glass } from "@/components/ui/glass";
import { Text, TextInput } from "@/components/ui/typography";
import { type CityResult, useLocalWeather } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { celebrationFor } from "@/lib/garden/progress";
import { careProfileFor, plantDisplayName, type ResolvedPlant } from "@/lib/garden/garden-logic";
import {
  ACTIVITY_KIND_LABELS,
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

const KIND_ICONS: Record<CalendarActivity["kind"], string> = { sow: "🌱", plant: "🪴", repot: "🪴", harvest: "🧺", care: "✂" };
const SEASON_IN: Record<"spring" | "summer" | "autumn" | "winter", string> = { spring: "au printemps", summer: "en été", autumn: "en automne", winter: "en hiver" };
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

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
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const showToast = (text: string, onUndo?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, onUndo });
  };
  const hideToast = useCallback(() => setToast(null), []);
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
  const resolvedById = useMemo(() => new Map<string, ResolvedPlant>(resolvedPlants.map((resolved) => [resolved.plant.id, resolved])), [resolvedPlants]);
  const activeFilter = selectedPlant === "all" || subjects.some((subject) => subject.id === selectedPlant) ? selectedPlant : "all";
  const filteredSubjects = useMemo(() => (activeFilter === "all" ? subjects : subjects.filter((subject) => subject.id === activeFilter)), [activeFilter, subjects]);
  const season = seasons.find((item) => item.id === selectedSeason) ?? seasons[0];
  const currentActivities = useMemo(
    () => (view === "season" ? seasonActivities(filteredSubjects, season, { climate }) : calendarActivities(filteredSubjects, selectedMonth, { climate })),
    [climate, filteredSubjects, season, selectedMonth, view],
  );
  // Seul le mois en cours se coche : on ne note pas un semis de mars en septembre.
  const checkable = !showingIdeas && view === "month" && selectedMonth === currentMonth;
  const doneCount = checkable ? currentActivities.filter((activity) => activityDone(activity, events, now)).length : 0;
  const allDone = checkable && currentActivities.length > 0 && doneCount === currentActivities.length;
  // Ce qui reste à faire d'abord, ce qui est fait ensuite (comme sur Aujourd'hui).
  const ordered = checkable ? [...currentActivities.filter((activity) => !activityDone(activity, events, now)), ...currentActivities.filter((activity) => activityDone(activity, events, now))] : currentActivities;
  const sheetActivity = currentActivities.find((activity) => activity.key === sheetKey) ?? null;

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
      const previous = events.find((item) => item.id === event.id);
      await removeEvent(event.id);
      showToast("Geste retiré", previous ? () => void logEvent(previous) : undefined);
      return;
    }
    await logEvent(event);
    const cheer = celebrationFor(resolvedPlants, events, [event, ...events.filter((item) => item.id !== event.id)]);
    showToast(cheer ?? `${activity.title} : noté`, () => void removeEvent(event.id));
  };

  const addIdea = async (activity: CalendarActivity) => {
    await addPlant(activity.entry.id);
    showToast(`${activity.entry.name} ajouté à ton balcon`);
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

  const picture = (activity: CalendarActivity) => {
    const resolved = resolvedById.get(activity.subjectId);
    return resolved ? <PlantPicture resolved={resolved} style={TODAY_ROW_PICTURE} /> : undefined;
  };
  const rowSubtitle = (activity: CalendarActivity) => {
    const when = view === "season" && activity.months ? capitalize(describeMonths(activity.months)) : null;
    const subject = subjects.find((item) => item.id === activity.subjectId)?.displayName;
    return [activity.eventType === "fertilizing" ? "Engrais" : ACTIVITY_KIND_LABELS[activity.kind], when ?? subject].filter(Boolean).join(" · ");
  };
  const periodLabel = view === "season" ? SEASON_IN[season.id] : `en ${MONTH_LONG[selectedMonth - 1]}`;
  const climateLine = weather.isFallback || !climate ? "Paris par défaut : choisis ta ville pour des dates justes." : climateSummary(climate);

  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader
          title="Saisons"
          subtitle={showingIdeas ? "Idées de saison pour ton balcon" : checkable && currentActivities.length > 0 ? `${currentActivities.length - doneCount} geste${currentActivities.length - doneCount > 1 ? "s" : ""} de saison ce mois-ci` : `${resolvedPlants.length} plante${resolvedPlants.length > 1 ? "s" : ""} suivie${resolvedPlants.length > 1 ? "s" : ""}`}
        />

        {/* Ton climat en une carte : la météo, la ville (à toucher pour changer), ce que ça change. */}
        <View style={[glass.card, styles.climate]}>
          <View style={styles.climateTop}>
            <View style={styles.flex}>
              <Text style={[styles.small, { color: colors.muted }]}>{isLoading ? "Ton climat · chargement…" : "Ton climat, en direct"}</Text>
              <Text style={[styles.climateTitle, { color: colors.foreground }]}>{Math.round(weather.temperature)}° · {weather.summary}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Changer de ville, actuellement ${weather.city}`} onPress={() => setCityModalVisible(true)} style={({ pressed }) => [styles.cityButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.cityButtonText, { color: colors.primary }]}>⌖ {weather.city}</Text></Pressable>
          </View>
          <View style={styles.climateBottom}>
            <Text style={[styles.small, styles.flex, { color: colors.foreground }]}>{climateLine}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualiser la météo" hitSlop={8} onPress={() => void refresh()} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.refreshText, { color: colors.primary }]}>↻</Text></Pressable>
          </View>
        </View>

        {weatherAlerts.length > 0 && (
          <View style={[glass.card, styles.list]}>
            {weatherAlerts.map((alert) => (
              <TodayRow key={alert.key} icon={alert.cause === "heat" ? "☀" : alert.cause === "rain" ? "🌧" : alert.cause === "wind" ? "💨" : alert.cause === "storm" ? "⛈" : "❄"} tone={alert.cause === "heat" ? "heat" : alert.cause === "storm" ? "storm" : alert.cause === "wind" ? "wind" : alert.cause === "rain" ? "rain" : "frost"} title={alert.title} subtitle="Alerte météo · à voir sur Aujourd’hui" done={false} onOpen={() => router.push("/(tabs)")} />
            ))}
          </View>
        )}

        <View style={[glass.soft, styles.viewToggle]}>
          {(["month", "season"] as const).map((option) => {
            const active = view === option;
            return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setView(option)} style={({ pressed }) => [styles.viewOption, active && styles.viewOptionActive, pressed && styles.pressed]}><Text style={[styles.viewOptionText, { color: active ? colors.foreground : colors.muted }]}>{option === "month" ? "Par mois" : "Par saison"}</Text></Pressable>;
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {view === "season"
            ? seasons.map((item, index) => {
              const active = season.id === item.id;
              return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedSeason(item.id)} style={({ pressed }) => [styles.seasonItem, active ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}><Text style={[styles.monthText, { color: active ? "#FFFFFF" : colors.foreground }]}>{item.label}</Text>{index === 0 && <View style={[styles.monthDot, { backgroundColor: active ? "#FFFFFF" : colors.primary }]} />}</Pressable>;
            })
            : months.map((month) => {
              const active = selectedMonth === month;
              return <Pressable key={month} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedMonth(month)} style={({ pressed }) => [styles.monthItem, active ? { backgroundColor: colors.primary } : glass.soft, pressed && styles.pressed]}><Text style={[styles.monthText, { color: active ? "#FFFFFF" : colors.foreground }]}>{MONTH_SHORT[month - 1]}</Text>{month === currentMonth && <View style={[styles.monthDot, { backgroundColor: active ? "#FFFFFF" : colors.primary }]} />}</Pressable>;
            })}
        </ScrollView>

        {subjects.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {[{ id: "all", label: "Toutes" }, ...subjects.map((subject) => ({ id: subject.id, label: subject.displayName }))].map(({ id, label }) => {
              const active = activeFilter === id;
              const resolved = resolvedById.get(id);
              return (
                <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedPlant(id)} style={({ pressed }) => [styles.filterChip, active ? { backgroundColor: colors.foreground } : glass.soft, pressed && styles.pressed]}>
                  {resolved && <PlantPicture resolved={resolved} style={styles.filterPicture} />}
                  <Text style={[styles.filterText, { color: active ? "#FFFFFF" : colors.foreground }]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.periodHead}>
          <Text style={[styles.periodTitle, { color: colors.foreground }]}>{capitalize(periodLabel)}</Text>
          <Text style={[styles.text, { color: colors.muted }]}>{showingIdeas ? "Ton balcon est vide : voici ce que tu pourrais cultiver. Ajoute une plante pour un calendrier sur mesure." : checkable ? "Coche ce que tu as fait : l’accueil le saura aussi." : "À venir : prépare-toi, rien à cocher pour l’instant."}</Text>
        </View>

        {allDone && (
          <FadeIn style={styles.allDone}>
            <Text style={styles.allDoneIcon}>🌿</Text>
            <Text style={[styles.allDoneTitle, { color: colors.foreground }]}>Tout est fait pour {MONTH_LONG[currentMonth - 1]}</Text>
            <Text style={[styles.allDoneText, { color: colors.muted }]}>Tes gestes de saison sont notés. Regarde le mois prochain pour t’organiser.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/week")} style={({ pressed }) => [styles.weekButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={styles.weekButtonText}>Voir ma semaine</Text>
            </Pressable>
          </FadeIn>
        )}

        {ordered.length > 0 && (
          <View style={[glass.card, styles.list]}>
            {ordered.map((activity) => {
              const done = checkable && activityDone(activity, events, now);
              return (
                <TodayRow
                  key={`${activeFilter}-${view}-${activity.key}`}
                  icon={showingIdeas ? activity.entry.emoji : KIND_ICONS[activity.kind]}
                  picture={picture(activity)}
                  tone="season"
                  title={activity.title}
                  subtitle={rowSubtitle(activity)}
                  done={done}
                  checkLabel={done ? "Annuler ce geste" : "Noter comme fait"}
                  onToggle={checkable ? () => void toggleActivity(activity) : undefined}
                  onOpen={() => setSheetKey(activity.key)}
                />
              );
            })}
          </View>
        )}
        {ordered.length === 0 && <Text style={[styles.text, styles.empty, { color: colors.muted }]}>Rien de prévu {periodLabel} : tes plantes se reposent.{view === "month" ? " Regarde les mois suivants." : ""}</Text>}
      </ScrollView>

      <BottomSheet visible={sheetActivity !== null} onClose={() => setSheetKey(null)}>
        {sheetActivity && (() => {
          const done = checkable && activityDone(sheetActivity, events, now);
          const resolved = resolvedById.get(sheetActivity.subjectId);
          return (
            <View style={styles.sheet}>
              <Text style={[styles.sheetKind, { color: colors.primary }]}>{sheetActivity.eventType === "fertilizing" ? "Engrais" : ACTIVITY_KIND_LABELS[sheetActivity.kind]}{sheetActivity.months ? ` · ${describeMonths(sheetActivity.months)}` : ` · ${periodLabel}`}</Text>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{sheetActivity.title}</Text>
              <Text style={[styles.sheetBody, { color: colors.muted }]}>{sheetActivity.description}</Text>
              {showingIdeas ? (
                <Pressable accessibilityRole="button" onPress={() => { setSheetKey(null); void addIdea(sheetActivity); }} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.ctaText, { color: "#FFFFFF" }]}>+ Ajouter à mon balcon</Text></Pressable>
              ) : checkable ? (
                <Pressable accessibilityRole="button" onPress={() => { setSheetKey(null); void toggleActivity(sheetActivity); }} style={({ pressed }) => [styles.cta, { backgroundColor: done ? colors.surface : colors.foreground }, pressed && styles.pressed]}><Text style={[styles.ctaText, { color: done ? colors.foreground : colors.background }]}>{done ? "Annuler ce geste" : "C’est fait"}</Text></Pressable>
              ) : (
                <Text style={[styles.small, { color: colors.muted }]}>Tu pourras le cocher le moment venu : Balco te le rappellera sur l’accueil.</Text>
              )}
              {resolved && (
                <Pressable accessibilityRole="button" onPress={() => { setSheetKey(null); router.push({ pathname: "/garden/[id]", params: { id: resolved.plant.id } }); }} style={styles.sheetLink}><Text style={[styles.link, { color: colors.primary }]}>Voir la fiche de {plantDisplayName(resolved)}</Text></Pressable>
              )}
            </View>
          );
        })()}
      </BottomSheet>

      <Modal visible={cityModalVisible} transparent animationType="slide" onRequestClose={() => setCityModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.surface }]}><View style={styles.modalHeader}><View><Text style={[styles.modalOverline, { color: colors.muted }]}>Ta ville</Text><Text style={[styles.modalTitle, { color: colors.foreground }]}>Où pousse ton jardin ?</Text></View><Pressable onPress={() => setCityModalVisible(false)} style={styles.closeButton}><Text style={[styles.closeText, { color: colors.muted }]}>×</Text></Pressable></View><Text style={[styles.modalIntro, { color: colors.muted }]}>Choisis une ville pour adapter la météo et les conseils de culture.</Text><TextInput value={cityQuery} onChangeText={setCityQuery} onSubmitEditing={() => void searchManualCity()} placeholder="Rechercher une ville…" placeholderTextColor={colors.muted} returnKeyType="search" style={[styles.cityInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} /><Pressable onPress={() => void searchManualCity()} style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.searchButtonText}>{citySearchLoading ? "Recherche…" : "Rechercher"}</Text></Pressable>{citySearchError && <Text style={[styles.searchError, { color: colors.error }]}>{citySearchError}</Text>}<View style={styles.resultList}>{cityResults.map((city) => <Pressable key={`${city.id}-${city.latitude}`} onPress={() => void chooseCity(city)} style={({ pressed }) => [styles.resultRow, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.resultName, { color: colors.foreground }]}>{city.name}</Text><Text style={[styles.resultMeta, { color: colors.muted }]}>{[city.admin1, city.country].filter(Boolean).join(" · ")}</Text></Pressable>)}</View><Pressable onPress={() => { setCityModalVisible(false); void requestDeviceLocation(); }} style={({ pressed }) => [styles.deviceLink, pressed && styles.pressed]}><Text style={[styles.deviceLinkText, { color: colors.primary }]}>⌖ Utiliser ma position actuelle</Text></Pressable></View></View>
      </Modal>      <UndoToast message={toast} onDone={hideToast} />
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 30, gap: 16 },
  flex: { flex: 1 },
  small: { fontSize: 13, lineHeight: 18 },
  text: { fontSize: 14, lineHeight: 20 },
  climate: { padding: 16, gap: 10 },
  climateTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  climateTitle: { fontSize: 20, fontWeight: "800", marginTop: 2, letterSpacing: -0.4 },
  climateBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  cityButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  cityButtonText: { fontSize: 13, fontWeight: "700" },
  refreshText: { fontSize: 20, fontWeight: "700" },
  list: { paddingHorizontal: 14 },
  viewToggle: { flexDirection: "row", padding: 4, gap: 4 },
  viewOption: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: "center" },
  viewOptionActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  viewOptionText: { fontSize: 14, fontWeight: "700" },
  pillsRow: { gap: 7, paddingVertical: 2 },
  monthItem: { minWidth: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  seasonItem: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", minWidth: 84 },
  monthText: { fontSize: 13, fontWeight: "700" },
  monthDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999, paddingLeft: 5, paddingRight: 13, paddingVertical: 5, minHeight: 36 },
  filterPicture: { width: 26, height: 26, borderRadius: 13 },
  filterText: { fontSize: 13, fontWeight: "600", paddingLeft: 4 },
  periodHead: { gap: 4 },
  periodTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  empty: { textAlign: "center", paddingVertical: 18 },
  allDone: { alignItems: "center", gap: 6, paddingVertical: 6 },
  allDoneIcon: { fontSize: 36 },
  allDoneTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  allDoneText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  weekButton: { marginTop: 8, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11 },
  weekButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  sheet: { gap: 12 },
  sheetKind: { fontSize: 13, fontWeight: "700" },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, lineHeight: 27 },
  sheetBody: { fontSize: 15, lineHeight: 22 },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontSize: 16, fontWeight: "700" },
  sheetLink: { alignItems: "center", paddingVertical: 4 },
  link: { fontSize: 14, fontWeight: "600" },
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
