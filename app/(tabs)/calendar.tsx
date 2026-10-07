/**
 * Onglet « Saisons » : ton calendrier, à lire. Les gestes de saison de tes plantes (semis, plantation,
 * rempotage, récolte, entretien), rangés par type (« À récolter · 5 plantes ») pour que la liste reste
 * courte, mois par mois ou saison par saison. Rien ne s'y coche : les gestes du mois se font depuis
 * Aujourd'hui (le détail y renvoie). Sous la liste, « À semer ou planter en … » propose des plantes de
 * saison pour ton balcon, à ajouter d'un « + ».
 */
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CityPicker } from "@/components/city-picker";
import { LightScreen } from "@/components/light-screen";
import { PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { SeasonalSuggestions } from "@/components/seasonal-suggestions";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { TODAY_ROW_PICTURE, TodayRow } from "@/components/today/today-row";
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useDayPlan } from "@/hooks/use-day-plan";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { skippedRepots } from "@/lib/garden/repot-skip";
import { dayKey, plantDisplayName, potHistory, type ResolvedPlant } from "@/lib/garden/garden-logic";
import {
  ACTIVITY_KIND_LABELS,
  activityDoneLabel,
  activityDoneSoFar,
  activityGroupSummary,
  activityGroupTitle,
  calendarActivities,
  describeMonths,
  groupActivities,
  seasonActivities,
  upcomingMonths,
  upcomingSeasons,
  type ActivityGroup,
  type ActivityGroupKind,
  type CalendarActivity,
  type CalendarSubject,
} from "@/lib/plants/calendar";
import { describeSowing, formatMonthRange, MONTH_LONG, MONTH_SHORT } from "@/lib/plants/catalog";
import { nextSuggestionMonth, seasonalStarters, seasonalSuggestions, seasonSuggestions, suggestionActionLabel, type SeasonalSuggestion } from "@/lib/plants/suggestions";
import { climateSummary, climateZoneFor } from "@/lib/plants/climate";
import type { ReminderSnooze } from "@/lib/reminders/reminder-actions";
import { loadReminderSnoozes, subscribeReminderSnoozes } from "@/lib/reminders/local-notifications";

type PlantFilter = "all" | string;

const KIND_ICONS: Record<CalendarActivity["kind"], string> = { sow: "🌱", plant: "🪴", repot: "🪴", harvest: "🧺", care: "✂" };
const GROUP_ICONS: Record<ActivityGroupKind, string> = { ...KIND_ICONS, fertilize: "🌿" };
const SEASON_IN: Record<"spring" | "summer" | "autumn" | "winter", string> = { spring: "au printemps", summer: "en été", autumn: "en automne", winter: "en hiver" };
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // La météo et les alertes du plan du jour : les mêmes qu'Aujourd'hui (une alerte traitée là-bas disparaît ici).
  const { weather, weatherSnapshot, isLoading, refresh, requestDeviceLocation, searchCities, selectCity, visibleGroups } = useDayPlan();
  const { resolvedPlants, events, onboarding, addPlant, removePlant, reportLocation } = useGarden();
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
  const [groupKey, setGroupKey] = useState<ActivityGroupKind | null>(null);
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
  // Sans plante au balcon, le calendrier montre des idées adaptées plutôt qu'un écran vide.
  const showingIdeas = resolvedPlants.length === 0;
  // Les idées : seulement ce qui se sème ou se plante ce mois-ci, dans le climat de la ville.
  const starters = useMemo(() => (showingIdeas ? seasonalStarters(onboarding, { month: currentMonth, climate, limit: 4 }) : null), [climate, currentMonth, onboarding, showingIdeas]);
  // Les alertes déjà traitées sur Aujourd'hui (« Fait », « Pas aujourd'hui », « Dans 3 h ») ne s'affichent plus ici.
  const [snoozes, setSnoozes] = useState<ReminderSnooze[]>([]);
  useEffect(() => {
    void loadReminderSnoozes().then(setSnoozes);
    return subscribeReminderSnoozes(setSnoozes);
  }, []);

  // « Pas besoin cette année » (Aujourd'hui) : le rempotage laisse la place à la terre du dessus.
  const repotSkips = useMemo(() => skippedRepots(snoozes, now), [now, snoozes]);
  const subjects = useMemo<CalendarSubject[]>(
    () => starters
      ? starters.plants.map((entry) => ({ id: entry.id, entry, displayName: entry.name }))
      : resolvedPlants.map((resolved) => ({ id: resolved.plant.id, entry: resolved.entry, displayName: plantDisplayName(resolved), addedAt: resolved.plant.addedAt, toPlant: resolved.plant.toPlant, ...potHistory(resolved.plant, events), repotSkippedUntil: repotSkips.get(resolved.plant.id) })),
    [events, repotSkips, resolvedPlants, starters],
  );
  const resolvedById = useMemo(() => new Map<string, ResolvedPlant>(resolvedPlants.map((resolved) => [resolved.plant.id, resolved])), [resolvedPlants]);
  const activeFilter = selectedPlant === "all" || subjects.some((subject) => subject.id === selectedPlant) ? selectedPlant : "all";
  const filteredSubjects = useMemo(() => (activeFilter === "all" ? subjects : subjects.filter((subject) => subject.id === activeFilter)), [activeFilter, subjects]);
  const season = seasons.find((item) => item.id === selectedSeason) ?? seasons[0];
  // Vue par saison : ses mois, à partir de maintenant pour la saison en cours (septembre est passé).
  const seasonMonths = useMemo(() => {
    const start = season.id === seasons[0].id ? season.months.indexOf(currentMonth as (typeof season.months)[number]) : -1;
    return start > 0 ? season.months.slice(start) : season.months;
  }, [currentMonth, season, seasons]);
  const currentActivities = useMemo(
    () => (view === "season" ? seasonActivities(filteredSubjects, { ...season, months: seasonMonths }, { climate, now }) : calendarActivities(filteredSubjects, selectedMonth, { climate, now })),
    [climate, filteredSubjects, now, season, seasonMonths, selectedMonth, view],
  );
  // Le mois en cours : ses gestes se font depuis Aujourd'hui (le détail y renvoie).
  const thisMonth = !showingIdeas && view === "month" && selectedMonth === currentMonth;
  // Rien ne se coche ici, mais ce qui est déjà fait (sur Aujourd'hui ou la fiche) se voit, et passe en bas.
  const isDone = (activity: CalendarActivity) => thisMonth && activityDoneSoFar(activity, events, new Date());
  const ordered = [...currentActivities.filter((activity) => !isDone(activity)), ...currentActivities.filter(isDone)];
  const sheetActivity = currentActivities.find((activity) => activity.key === sheetKey) ?? null;
  // Rangés par type de geste, sauf quand on regarde une seule plante (on veut alors tout son détail).
  const grouped = !showingIdeas && activeFilter === "all";
  const groups = grouped ? groupActivities(ordered) : [];
  const sheetGroup = useMemo(() => (groupKey ? groupActivities(currentActivities).find((group) => group.key === groupKey) ?? null : null), [currentActivities, groupKey]);

  // Quoi semer ou planter le mois choisi, parmi ce qui convient au balcon et qu'on n'a pas encore.
  // Elles changent chaque jour (même tirage que l'« Idée du mois » d'Aujourd'hui).
  const suggestionOptions = useMemo(() => ({ month: selectedMonth, climate, ownedCatalogIds: resolvedPlants.map((resolved) => resolved.entry.id), limit: 4, seed: dayKey(now) }), [climate, now, resolvedPlants, selectedMonth]);
  const suggestions = useMemo(() => (showingIdeas ? [] : seasonalSuggestions(onboarding, suggestionOptions)), [onboarding, showingIdeas, suggestionOptions]);
  // Rien à proposer parce que tout ce qui convient est déjà sur le balcon (pas un mois calme).
  const allOwned = useMemo(() => suggestions.length === 0 && !showingIdeas && seasonalSuggestions(onboarding, { ...suggestionOptions, ownedCatalogIds: [] }).length > 0, [onboarding, showingIdeas, suggestionOptions, suggestions.length]);
  const nextMonth = useMemo(() => (suggestions.length === 0 && !showingIdeas ? nextSuggestionMonth(onboarding, suggestionOptions) : null), [onboarding, showingIdeas, suggestionOptions, suggestions.length]);
  const seasonIdeas = useMemo(
    () => (view === "season" && !showingIdeas ? seasonSuggestions(onboarding, { months: seasonMonths, climate, ownedCatalogIds: suggestionOptions.ownedCatalogIds, limit: 4, seed: dayKey(now) }) : []),
    [climate, now, onboarding, seasonMonths, showingIdeas, suggestionOptions.ownedCatalogIds, view],
  );
  const [sheetSuggestion, setSheetSuggestion] = useState<SeasonalSuggestion | null>(null);

  // Alertes météo du moment (gel, orage, vent, chaleur, pluie), une par cause : exactement celles d'Aujourd'hui
  // (mêmes plantes, sans celles à planter ni les pots libres, mêmes « C'est fait » et « Pas aujourd'hui »).
  const weatherAlerts = useMemo(() => visibleGroups.filter((group) => group.cause && group.cause !== "thirst"), [visibleGroups]);

  /** Le geste du mois se fait sur Aujourd'hui : on y va. */
  const openToday = () => router.push("/(tabs)");

  const addSuggestion = async ({ entry }: SeasonalSuggestion) => {
    // Une idée de saison : choisie, à semer ou planter (premier geste sur Aujourd'hui).
    const created = await addPlant(entry.id, { toPlant: true });
    showToast(`Ajouté à ton balcon : ${entry.name}`, () => void removePlant(created.id));
  };

  const addIdea = async (activity: CalendarActivity) => {
    await addPlant(activity.entry.id, { toPlant: true });
    showToast(`${activity.entry.name} ajouté à ton balcon`);
  };

  const picture = (activity: CalendarActivity) => {
    const resolved = resolvedById.get(activity.subjectId);
    return resolved ? <PlantPicture resolved={resolved} style={TODAY_ROW_PICTURE} /> : undefined;
  };
  const rowSubtitle = (activity: CalendarActivity) => {
    if (isDone(activity)) return activityDoneLabel(activity);
    const when = view === "season" && activity.months ? capitalize(describeMonths(activity.months)) : null;
    const subject = subjects.find((item) => item.id === activity.subjectId)?.displayName;
    return [activity.eventType === "fertilizing" ? "Engrais" : ACTIVITY_KIND_LABELS[activity.kind], when ?? subject].filter(Boolean).join(" · ");
  };
  const periodLabel = view === "season" ? SEASON_IN[season.id] : `en ${MONTH_LONG[selectedMonth - 1]}`;
  const groupSubtitle = (group: ActivityGroup) => {
    // L'entretien réunit des gestes différents : on les nomme ; ailleurs, les plantes suffisent.
    const names = group.key === "care" ? group.activities.map((activity) => activity.title) : group.activities.map((activity) => subjects.find((item) => item.id === activity.subjectId)?.displayName ?? activity.entry.name);
    const summary = activityGroupSummary(names);
    const done = group.activities.filter(isDone).length;
    return done > 0 ? `${done} sur ${group.activities.length} déjà fait${done > 1 ? "s" : ""} · ${summary}` : summary;
  };
  const memberSubtitle = (activity: CalendarActivity) => {
    if (isDone(activity)) return activityDoneLabel(activity);
    const subject = subjects.find((item) => item.id === activity.subjectId)?.displayName ?? activity.entry.name;
    return view === "season" && activity.months ? `${subject} · ${describeMonths(activity.months)}` : subject;
  };
  const activityRow = (activity: CalendarActivity) => (
    <TodayRow
      key={`${activeFilter}-${view}-${activity.key}`}
      icon={showingIdeas ? activity.entry.emoji : KIND_ICONS[activity.kind]}
      picture={picture(activity)}
      tone="season"
      title={activity.title}
      subtitle={rowSubtitle(activity)}
      done={isDone(activity)}
      onOpen={() => setSheetKey(activity.key)}
    />
  );
  const climateLine = weather.isFallback || !climate ? "Paris par défaut : choisis ta ville pour des dates justes." : climateSummary(climate);

  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader
          title="Saisons"
          subtitle={showingIdeas ? "Idées de saison pour ton balcon" : `${resolvedPlants.length} plante${resolvedPlants.length > 1 ? "s" : ""} suivie${resolvedPlants.length > 1 ? "s" : ""}`}
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
          <Text style={[styles.text, { color: colors.muted }]}>{showingIdeas ? `Ton balcon est vide : voici ce que tu pourrais cultiver. Ajoute une plante pour un calendrier sur mesure.${starters?.notice ? ` ${starters.notice}` : ""}` : `Ton calendrier : ce qui t’attend dans les prochains mois.${thisMonth ? " Les gestes de ce mois se font depuis Aujourd’hui." : ""}`}</Text>
        </View>

        {ordered.length > 0 && (
          <View style={[glass.card, styles.list]}>
            {grouped
              ? groups.map((group) => {
                if (group.activities.length === 1) return activityRow(group.activities[0]);
                return <TodayRow key={`group-${view}-${group.key}`} icon={GROUP_ICONS[group.key]} tone="season" title={activityGroupTitle(group)} subtitle={groupSubtitle(group)} done={group.activities.every(isDone)} onOpen={() => setGroupKey(group.key)} />;
              })
              : ordered.map(activityRow)}
          </View>
        )}
        {ordered.length === 0 && <Text style={[styles.text, styles.empty, { color: colors.muted }]}>Rien de prévu {periodLabel} : tes plantes se reposent.{view === "month" ? " Regarde les mois suivants." : ""}</Text>}

        {view === "month" && !showingIdeas && (
          <SeasonalSuggestions month={selectedMonth} current={selectedMonth === currentMonth} suggestions={suggestions} nextMonth={nextMonth} allOwned={allOwned} onAdd={(suggestion) => void addSuggestion(suggestion)} onOpen={setSheetSuggestion} />
        )}
        {view === "season" && !showingIdeas && (
          <SeasonalSuggestions month={seasonMonths[0]} heading={`À semer ou planter ${SEASON_IN[season.id]}`} periodName={SEASON_IN[season.id]} showMonth current={season.id === seasons[0].id} suggestions={seasonIdeas} onAdd={(suggestion) => void addSuggestion(suggestion)} onOpen={setSheetSuggestion} />
        )}
      </ScrollView>

      <BottomSheet visible={sheetActivity !== null} onClose={() => setSheetKey(null)}>
        {sheetActivity && (() => {
          const resolved = resolvedById.get(sheetActivity.subjectId);
          return (
            <View style={styles.sheet}>
              <Text style={[styles.sheetKind, { color: colors.primary }]}>{sheetActivity.eventType === "fertilizing" ? "Engrais" : ACTIVITY_KIND_LABELS[sheetActivity.kind]}{sheetActivity.months ? ` · ${describeMonths(sheetActivity.months)}` : ` · ${periodLabel}`}</Text>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{sheetActivity.title}</Text>
              <Text style={[styles.sheetBody, { color: colors.muted }]}>{sheetActivity.description}</Text>
              {showingIdeas ? (
                <Pressable accessibilityRole="button" onPress={() => { setSheetKey(null); void addIdea(sheetActivity); }} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.ctaText, { color: "#FFFFFF" }]}>+ Ajouter à mon balcon</Text></Pressable>
              ) : isDone(sheetActivity) ? (
                <Text style={[styles.small, { color: colors.primary }]}>{activityDoneLabel(sheetActivity)} : c’est noté sur Aujourd’hui.</Text>
              ) : thisMonth ? (
                <Pressable accessibilityRole="button" onPress={() => { setSheetKey(null); openToday(); }} style={({ pressed }) => [styles.cta, { backgroundColor: colors.foreground }, pressed && styles.pressed]}><Text style={[styles.ctaText, { color: colors.background }]}>Le faire sur Aujourd’hui</Text></Pressable>
              ) : (
                <Text style={[styles.small, { color: colors.muted }]}>Le moment venu, Balco te le proposera sur Aujourd’hui.</Text>
              )}
              {resolved && (
                <Pressable accessibilityRole="button" onPress={() => { setSheetKey(null); router.push({ pathname: "/garden/[id]", params: { id: resolved.plant.id } }); }} style={styles.sheetLink}><Text style={[styles.link, { color: colors.primary }]}>Voir la fiche de {plantDisplayName(resolved)}</Text></Pressable>
              )}
            </View>
          );
        })()}
      </BottomSheet>

      <BottomSheet
        visible={sheetGroup !== null}
        onClose={() => setGroupKey(null)}
        overlay={<UndoToast message={toast} onDone={hideToast} />}
      >
        {sheetGroup && (
          <View style={styles.sheet}>
            <Text style={[styles.sheetKind, { color: colors.primary }]}>{capitalize(periodLabel)}</Text>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{sheetGroup.label} {periodLabel}</Text>
            <Text style={[styles.sheetBody, { color: colors.muted }]}>{thisMonth ? "Ces gestes se font depuis Aujourd’hui, plante par plante. Touche une ligne pour le détail." : "Le moment venu, Balco te les proposera sur Aujourd’hui. Touche une ligne pour le détail."}</Text>
            <View>
              {sheetGroup.activities.map((activity) => (
                <TodayRow
                  key={`sheet-${activity.key}`}
                  icon={KIND_ICONS[activity.kind]}
                  picture={picture(activity)}
                  tone="season"
                  title={activity.title}
                  subtitle={memberSubtitle(activity)}
                  done={isDone(activity)}
                  onOpen={() => {
                    // La feuille du geste s'ouvre une fois celle du groupe repliée.
                    setGroupKey(null);
                    setTimeout(() => setSheetKey(activity.key), 320);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={sheetSuggestion !== null} onClose={() => setSheetSuggestion(null)}>
        {sheetSuggestion && (
          <View style={styles.sheet}>
            <Text style={[styles.sheetKind, { color: colors.primary }]}>{suggestionActionLabel(sheetSuggestion)} en {MONTH_LONG[sheetSuggestion.month - 1]}</Text>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{sheetSuggestion.title}</Text>
            <Text style={[styles.sheetBody, { color: colors.muted }]}>{sheetSuggestion.entry.pitch}</Text>
            <Text style={[styles.small, { color: colors.foreground }]}>
              {[
                sheetSuggestion.entry.sowMonths.length > 0 ? `🌱 Semis : ${describeSowing(sheetSuggestion.entry)}` : null,
                sheetSuggestion.entry.plantMonths.length > 0 ? `🪴 Plantation : ${formatMonthRange(sheetSuggestion.entry.plantMonths)}` : null,
                `${sheetSuggestion.entry.category === "flower" ? "🌸 Floraison" : "🧺 Récolte"} : ${formatMonthRange(sheetSuggestion.entry.harvestMonths)}`,
                `🪣 Pot d’au moins ${sheetSuggestion.entry.potLiters} L`,
              ].filter(Boolean).join("\n")}
            </Text>
            {sheetSuggestion.lastChance && <Text style={[styles.small, { color: colors.terracotta }]}>C’est le dernier mois pour le faire cette année.</Text>}
            <Pressable accessibilityRole="button" onPress={() => { const suggestion = sheetSuggestion; setSheetSuggestion(null); void addSuggestion(suggestion); }} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.ctaText, { color: "#FFFFFF" }]}>+ Ajouter à mon balcon</Text></Pressable>
          </View>
        )}
      </BottomSheet>

      <CityPicker visible={cityModalVisible} onClose={() => setCityModalVisible(false)} searchCities={searchCities} selectCity={selectCity} requestDeviceLocation={requestDeviceLocation} />
      {/* Pendant que la feuille d'un groupe est ouverte, le message s'affiche par-dessus elle. */}
      {sheetGroup === null && <UndoToast message={toast} onDone={hideToast} />}
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
  sheet: { gap: 12 },
  sheetKind: { fontSize: 13, fontWeight: "700" },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, lineHeight: 27 },
  sheetBody: { fontSize: 15, lineHeight: 22 },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontSize: 16, fontWeight: "700" },
  sheetLink: { alignItems: "center", paddingVertical: 4 },
  link: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
