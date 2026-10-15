/**
 * Fiche d'une plante, « photo d'abord » comme une annonce : ta photo datée en grand, l'état en un
 * point de couleur, trois pastilles (soleil, pot, depuis quand), le prochain geste en un bouton,
 * puis tes photos et tout l'historique (gestes, observations, diagnostics de Nora).
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { FadeIn } from "@/components/motion";
import { usePlantPhotoCapture } from "@/components/photo-source-sheet";
import { PlantPicture, stockPhoto } from "@/components/plant-picture";
import { ScreenContainer } from "@/components/screen-container";
import { useCelebration } from "@/components/today/celebration";
import { useFreePot } from "@/components/free-pot-sheet";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { UndoToast, useUndoToast } from "@/components/today/undo-toast";
import { SettingRow, SettingsGroup, SheetHeading } from "@/components/settings/rows";
import { showGlobalToast } from "@/lib/ui/global-toast";
import type { MaintenanceEvent } from "@/lib/reminders/reminder-engine";
import { careWeeksLabel, celebrationFor, milestoneDate, plantProgress, sinceLabel, withCheer } from "@/lib/garden/progress";
import { endsWithSeason, harvestedToastText, isHarvestedOnce } from "@/lib/garden/harvest-end";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/nav-buttons";
import { Check } from "@/components/ui/check";
import { Text, TextInput } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { EVENT_TYPE_LABELS, POINTS_PER_GESTURE, isScannerEvent, plantDisplayName, plantStatus, plantVariety } from "@/lib/garden/garden-logic";
import { growingSince, journalByDay, photoDateLabel, photosForPlant, sunlightLabel } from "@/lib/garden/photos";
import { dayOf, eventForGesture, STATUS_LEGEND } from "@/lib/garden/day-plan";
import { useDayPlan } from "@/hooks/use-day-plan";
import { addSnooze, wakeSnoozeFor } from "@/lib/reminders/reminder-actions";
import { saveReminderSnoozes } from "@/lib/reminders/local-notifications";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { CATEGORY_LABELS, formatMonthRange } from "@/lib/plants/catalog";
import { guideLinkText } from "@/lib/plants/guide";
import { REPOTTING } from "@/lib/plants/repotting";
import { now as clockNow } from "@/lib/clock";
import { bloomEvent, canMarkBloom, herbariumKey } from "@/lib/garden/herbarium";
import { byForm } from "@/lib/plants/grammar";
import { PotSizeSheet } from "@/components/pot-size-sheet";
import { PotSheetCard } from "@/components/pot-sheet-card";
import { WateringCoachCard } from "@/components/watering-coach-card";
import { potSizeOf } from "@/lib/plants/pot-size";
import { potLabel } from "@/lib/plants/pot-sheet";


/** Le graphique des semaines s'affiche à partir de 2 semaines soignées (une seule barre ne compare rien). */
const MIN_CHART_WEEKS = 2;

const clock = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function PlantScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, pot } = useLocalSearchParams<{ id: string; /** « 1 » : ouvrir « Dans quel pot ? » (carte « Vérifie tes pots »). */ pot?: string }>();
  const { loaded, resolvedPlants, pastPlants, events, awards, markAwardsSeen, logEvent, removeEvent, removePlant, restorePlant, renamePlant, setPlantVariety, setPlantPotSize } = useGarden();
  const { plan, ready, snoozes, reminderSettings, climate, coach, isPlus } = useDayPlan();
  const { photos, removePhoto, restorePhoto, forgetPhotoFile } = usePlantPhotos();
  const [shownPhotoId, setShownPhotoId] = useState<string | null>(null);
  // Un geste de l'historique touché : sa feuille du bas (« Supprimer ce geste »).
  const [openEvent, setOpenEvent] = useState<MaintenanceEvent | null>(null);
  const [nameSheet, setNameSheet] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [potSheet, setPotSheet] = useState(pot === "1");
  const { toast, show, hide: hideToast } = useUndoToast();
  const { celebrate, overlay: celebration } = useCelebration();
  const scrollRef = useRef<ScrollView>(null);
  const showToast = useCallback((text: string, onUndo?: () => void, actionLabel?: string) => show({ text, onUndo, actionLabel }), [show]);
  // Après la récolte d'une plante récoltée en une fois. Pot vidé ou donné à une autre plante : la fiche se ferme.
  const freePot = useFreePot({ climate, onDone: (text, kind) => (kind === "restart" ? showToast(text) : back()), overlay: <><UndoToast message={toast} onDone={hideToast} bottom={insets.bottom + 16} />{celebration}</> });
  const capture = usePlantPhotoCapture(showToast);
  const now = clockNow();
  const resolved = resolvedPlants.find((item) => item.plant.id === id);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/balcony"));

  const roundButton = (label: string, icon: "camera.fill", onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
      <IconSymbol name={icon} size={19} color={colors.foreground} />
    </Pressable>
  );

  if (!resolved) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.missing}>
          <BackButton floating onPress={back} />
          <Text style={[styles.name, { color: colors.foreground }]}>Plante introuvable</Text>
          {loaded && <Text style={[styles.text, { color: colors.muted }]}>Cette plante n’est plus sur ton balcon.</Text>}
        </View>
      </ScreenContainer>
    );
  }

  const { plant, entry } = resolved;
  const name = plantDisplayName(resolved);
  // État et prochain geste : le plan du jour, le même qu'Aujourd'hui et la carte Balcon.
  const day = dayOf(plan, plant.id);
  const status = day?.status ?? { tone: "new" as const, label: "Nouvelle" };
  const lastCare = plantStatus(resolved, events, now).meta.replace("Dernier soin · ", "dernier soin ");
  const potShown = potLabel(entry, potSizeOf(plant));
  const statusColor = status.tone === "weather" ? colors.frost : status.tone === "watch" ? colors.warning : status.tone === "good" ? colors.primary : colors.muted;
  const variety = plantVariety(resolved);
  const gesture = day?.first ?? null;
  // Le geste du pot de ce mois (rempoter ou terre du dessus) : le pas-à-pas de la fiche le suit.
  const potGesture = day?.gestures.find((candidate) => candidate.source.type === "season" && candidate.source.activity.kind === "repot");
  const potTask = potGesture?.source.type === "season" && potGesture.source.activity.topdress ? "topdress" : "repot";
  const followUpGesture = day?.gestures.find((candidate) => !candidate.done && candidate.source.type === "season" && candidate.source.activity.followUp);
  const followUpTask = followUpGesture?.source.type === "season" ? followUpGesture.source.activity.followUp ?? null : null;
  const gestureEvent = gesture?.done ? events.find((event) => event.id === gesture.doneEventId) : undefined;
  const plantPhotos = photosForPlant(photos, plant.id);
  const shown = plantPhotos.find((photo) => photo.id === shownPhotoId) ?? plantPhotos[0] ?? null;
  const days = journalByDay(events, photos, plant.id, now);
  const count = days.reduce((total, day) => total + day.events.length, 0);
  const progress = plantProgress(resolved, events, photos, now);
  const busiestWeek = Math.max(1, ...progress.weeks);
  const totals = [
    progress.gestures ? `${progress.gestures} geste${progress.gestures > 1 ? "s" : ""}` : null,
    progress.waterings ? `${progress.waterings} arrosage${progress.waterings > 1 ? "s" : ""}` : null,
    progress.harvests ? `${progress.harvests} récolte${progress.harvests > 1 ? "s" : ""}` : null,
    progress.photos ? `${progress.photos} photo${progress.photos > 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" · ");
  const heroHeight = Math.min(Math.round(width * 1.05), 460) + insets.top;

  const doGesture = async () => {
    if (!gesture || gesture.done) return;
    if (gesture.source.type === "harvest-end") return gesture.source.stage === "question" ? freePot.answerYes(plant.id) : freePot.openFreePot(plant.id);
    const moment = clockNow();
    const event = eventForGesture(gesture, moment);
    await logEvent(event);
    // Un conseil météo suivi se tait jusqu'à demain, ici comme sur Aujourd'hui.
    if (gesture.source.type === "decision") await saveReminderSnoozes(addSnooze(snoozes, gesture.source.decision, "skip", reminderSettings, moment));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const cheer = celebrate(celebrationFor(resolvedPlants, events, [event, ...events.filter((item) => item.id !== event.id)], moment, pastPlants, awards));
    if (gesture.source.type === "task" && gesture.source.task.task.type === "harvest" && isHarvestedOnce(entry)) {
      return showToast(withCheer(cheer, harvestedToastText(entry)), () => void freePot.answerYes(plant.id), "Oui");
    }
    showToast(withCheer(cheer, `${gesture.source.type === "task" ? gesture.source.task.task.doneTitle : `${gesture.title} : noté.`} +${POINTS_PER_GESTURE} points`), () => void removeEvent(event.id));
  };

  /** « Elle a fleuri » : une carte dans l'herbier (fleurs, pendant leurs mois de floraison). */
  const markBloom = async () => {
    const event = bloomEvent(resolved, clockNow());
    // Sa carte d'herbier est annoncée ici : pas besoin de la refêter sur Aujourd'hui.
    markAwardsSeen([herbariumKey(entry.id)]);
    await logEvent(event);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    showToast("🌿 Floraison notée dans ton herbier", () => void removeEvent(event.id));
  };

  const undoGesture = async () => {
    if (!gestureEvent) return;
    const previousSnoozes = snoozes;
    await removeEvent(gestureEvent.id);
    // Noté depuis un conseil météo : décoché, le conseil revient (ici comme sur Aujourd'hui).
    await saveReminderSnoozes(wakeSnoozeFor(snoozes, gestureEvent));
    showToast("Geste retiré de ta journée", () => { void logEvent(gestureEvent); void saveReminderSnoozes(previousSnoozes); });
  };

  const saveName = async () => {
    await renamePlant(plant.id, nameDraft);
    setNameSheet(false);
  };

  /** Retirée tout de suite, avec « Annuler » ; son fichier n'est effacé qu'au départ du message. */
  const removeShownPhoto = async () => {
    if (!shown) return;
    const photo = shown;
    await removePhoto(photo.id, { keepFile: true });
    setShownPhotoId(null);
    show({ text: "Photo retirée", onUndo: () => void restorePhoto(photo), onExpire: () => forgetPhotoFile(photo) });
  };

  /** Un geste de l'historique supprimé, avec « Annuler » (il revient tel quel). */
  const deleteEvent = async (event: MaintenanceEvent) => {
    setOpenEvent(null);
    await removeEvent(event.id);
    showToast("Geste supprimé de l’historique", () => void logEvent(event));
  };

  /** Retirée tout de suite ; « Annuler » sur Balcon, où l'on revient, la remet avec son historique. */
  const removeFromBalcony = async () => {
    await removePlant(plant.id);
    showGlobalToast({ text: `${name} ${byForm(entry, "retiré", "retirée", "retirés", "retirées")} de ton balcon`, onUndo: () => void restorePlant(plant.id) });
    back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* La photo d'abord. */}
        <PlantPicture resolved={resolved} photo={shown} hideEmoji style={{ height: heroHeight }}>
          {!shown && stockPhoto(entry.id) !== undefined && (
            <View style={styles.stockBar}>
              <View style={styles.exampleChip}>
                <Text style={[styles.dateText, { color: colors.foreground }]}>Photo d’exemple</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => capture.ask(plant.id, name)} style={({ pressed }) => [styles.heroCta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
                <Text style={styles.heroCtaText}>Ajouter une photo</Text>
              </Pressable>
            </View>
          )}
          {!shown && stockPhoto(entry.id) === undefined && (
            <View style={[styles.heroEmpty, { paddingTop: insets.top }]}>
              <Text style={styles.heroEmoji}>{entry.emoji}</Text>
              <Text style={[styles.heroEmptyText, { color: colors.primary }]}>Pas encore de photo de {name}</Text>
              <Pressable accessibilityRole="button" onPress={() => capture.ask(plant.id, name)} style={({ pressed }) => [styles.heroCta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
                <Text style={styles.heroCtaText}>Ajouter une photo</Text>
              </Pressable>
            </View>
          )}
          {shown && (
            <View style={styles.dateChip}>
              <Text style={[styles.dateText, { color: colors.foreground }]}>{photoDateLabel(shown.takenAt, now)}</Text>
            </View>
          )}
        </PlantPicture>
        <View style={[styles.heroBar, { top: insets.top + 8 }]}>
          <BackButton floating onPress={back} />
          {roundButton(`Ajouter une photo de ${name}`, "camera.fill", () => capture.ask(plant.id, name))}
        </View>

        <View style={[styles.body, { backgroundColor: colors.background }]}>
          <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
          <Text style={[styles.text, { color: colors.muted }]}>{[plant.nickname ? entry.name : null, variety?.name, CATEGORY_LABELS[entry.category]].filter(Boolean).join(" · ")}</Text>
          <View style={styles.statusRow}>
            {/* Tant que la météo n'est pas chargée, pas d'état qui changerait aussitôt. */}
            {ready && <View style={[styles.dot, { backgroundColor: statusColor }]} />}
            {ready && <Text style={[styles.statusText, { color: statusColor }]}>{status.label}</Text>}
            <Text style={[styles.text, { color: colors.muted }]}>{ready ? "· " : ""}{lastCare}</Text>
          </View>
          <Text accessibilityLabel={`Légende : ${STATUS_LEGEND.map((item) => item.text).join(", ")}`} style={[styles.legend, { color: colors.muted }]}>
            {STATUS_LEGEND.map((item, index) => (
              <Text key={item.tone}>
                {index > 0 ? "   " : ""}
                <Text style={{ color: item.tone === "weather" ? colors.frost : item.tone === "watch" ? colors.warning : colors.primary }}>●</Text> {item.text}
              </Text>
            ))}
          </Text>

          <View style={styles.pills}>
            <View style={[styles.fact, { backgroundColor: colors.surface }]}><Text style={[styles.factText, { color: colors.foreground }]}>☀️  {sunlightLabel(entry)}</Text></View>
            {/* Taille notée, ou celle que conseille sa fiche : la toucher ouvre le choix de la taille. */}
            <Pressable accessibilityRole="button" accessibilityLabel={`${potShown.text}, choisir la taille du pot`} onPress={() => setPotSheet(true)} style={({ pressed }) => [styles.fact, { backgroundColor: colors.surface }, pressed && styles.pressed]}>
              <Text style={[styles.factText, { color: potShown.chosen ? colors.foreground : colors.primary }]}>🪴  {potShown.text}</Text>
            </Pressable>
            <View style={[styles.fact, { backgroundColor: colors.surface }]}><Text style={[styles.factText, { color: colors.foreground }]}>🌱  {growingSince(plant.addedAt, now)}</Text></View>
          </View>

          {/* Le prochain geste, en un bouton. */}
          {ready && <FadeIn delay={40} style={[styles.next, { borderColor: colors.border }]}>
            {gesture && !gesture.done && (
              <>
                <Text style={[styles.kicker, { color: colors.primary }]}>Aujourd’hui · {gesture.minutes} min</Text>
                <Text style={[styles.nextTitle, { color: colors.foreground }]}>{gesture.title}</Text>
                <Text style={[styles.text, { color: colors.muted }]}>{gesture.instruction}</Text>
                <Button label={gesture.source.type === "harvest-end" ? (gesture.source.stage === "question" ? (endsWithSeason(entry) ? "Oui, la saison est finie" : "Oui, tout est récolté") : "Choisir quoi y mettre") : "C’est fait"} onPress={() => void doGesture()} style={styles.cta} />
              </>
            )}
            {gesture?.done && (
              <View style={styles.doneRow}>
                <Check checked shape="round" />
                <View style={styles.flex}>
                  <Text style={[styles.nextTitle, { color: colors.foreground }]}>{gesture.title}</Text>
                  <Text style={[styles.text, { color: colors.muted }]}>{gestureEvent ? `Fait à ${clock(gestureEvent.completedAt)}` : "Fait aujourd’hui"}</Text>
                </View>
                <Button small variant="secondary" label="Annuler" onPress={() => void undoGesture()} style={styles.okButton} />
              </View>
            )}
            {/* Le pas-à-pas : pour la planter, ou pour revoir comment elle l'a été. */}
            <Button variant="link" label={plant.toPlant ? "Pas à pas, avec ce qu’il te faut" : "Revoir le pas-à-pas"} onPress={() => router.push({ pathname: "/guide/[catalogId]", params: { catalogId: entry.id, plantId: plant.id } })} />
            {/* Éclaircir, pincer ou sortir les plants aujourd'hui : son pas-à-pas. */}
            {followUpTask && (
              <Button variant="link" noChevron label={guideLinkText(entry, followUpTask)} onPress={() => router.push({ pathname: "/guide/[catalogId]", params: { catalogId: entry.id, plantId: plant.id, task: followUpTask } })} />
            )}
            {/* Une vivace installée : le pas-à-pas du pot (celui du geste du jour s'il y en a un). */}
            {!plant.toPlant && REPOTTING[entry.id] && (
              <Button variant="link" noChevron label={guideLinkText(entry, potTask)} onPress={() => router.push({ pathname: "/guide/[catalogId]", params: { catalogId: entry.id, plantId: plant.id, task: potTask } })} />
            )}
            {canMarkBloom(resolved, events, now) && (
              <Button variant="link" label={`${byForm(entry, "Il a fleuri ?", "Elle a fleuri ?", "Ils ont fleuri ?", "Elles ont fleuri ?")} Note-le dans ton herbier`} onPress={() => void markBloom()} />
            )}
            {!gesture && (
              <>
                <Text style={[styles.nextTitle, { color: colors.foreground }]}>Rien à faire aujourd’hui</Text>
                <Text style={[styles.text, { color: colors.muted }]}>{name} se repose. Balco te dira quand revenir.</Text>
              </>
            )}
          </FadeIn>}

          {/* Son pot (Balco en tiendra compte : arrosage, terreau, poids) et sa fiche « Spécial pot ». */}
          {/* Le coach d'arrosage (Balco+), ou ce qu'il apportera (étape 6b). Pas pour une plante pas encore en terre. */}
          {!plant.toPlant && <WateringCoachCard advice={coach?.get(plant.id)} isPlus={isPlus} />}

          <PotSheetCard entry={entry} potSize={potSizeOf(plant)} onChoosePot={() => setPotSheet(true)} />

          {/* Tes photos : toucher une photo l'affiche en grand. */}
          {plantPhotos.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tes photos · {plantPhotos.length}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                <Pressable accessibilityRole="button" accessibilityLabel="Ajouter une photo" onPress={() => capture.ask(plant.id, name)} style={({ pressed }) => [styles.thumb, styles.addThumb, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                  <IconSymbol name="camera.fill" size={22} color={colors.primary} />
                </Pressable>
                {plantPhotos.map((photo) => (
                  <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={photoDateLabel(photo.takenAt, now)} onPress={() => setShownPhotoId(photo.id)} style={({ pressed }) => [pressed && styles.pressed]}>
                    <PlantPicture resolved={resolved} photo={photo} style={[styles.thumb, photo.id === shown?.id && { borderWidth: 2.5, borderColor: colors.primary }]} />
                  </Pressable>
                ))}
              </ScrollView>
              {shown && (
                <View style={styles.inlineRow}>
                  <Text style={[styles.small, styles.flex, { color: colors.muted }]}>{photoDateLabel(shown.takenAt, now)}</Text>
                  <Button small variant="remove" label="Retirer cette photo" onPress={() => void removeShownPhoto()} />
                </View>
              )}
            </View>
          )}

          {entry.varieties.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Variété</Text>
              <Text style={[styles.text, { color: colors.muted }]}>{variety ? variety.note : "Tu connais la variété de ton plant ? Choisis-la : Nora en tiendra compte dans ses conseils."}</Text>
              <View style={styles.pills}>
                {entry.varieties.map((item) => {
                  const active = item.id === variety?.id;
                  return (
                    <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => void setPlantVariety(plant.id, active ? undefined : item.id)} style={({ pressed }) => [styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.background }, pressed && styles.pressed]}>
                      <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.foreground }]}>{active ? "✓ " : ""}{item.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sa progression</Text>
            <View style={[styles.progress, { borderColor: colors.border }]}>
              <Text style={[styles.stage, { color: colors.primary }]}>{progress.stage.label}</Text>
              <Text style={[styles.text, { color: colors.muted }]}>{progress.stage.detail}</Text>
              <Text style={[styles.small, { color: colors.muted }]}>Sur ton balcon {sinceLabel(progress.daysOnBalcony)}{totals ? ` · ${totals}` : ""}</Text>
              {/* Le graphique des semaines seulement quand il y a de quoi comparer (une seule barre ne dit rien). */}
              {progress.activeWeeks >= MIN_CHART_WEEKS && (
                <View style={styles.bars} accessibilityLabel={careWeeksLabel(progress)}>
                  {progress.weeks.map((value, index) => (
                    <View key={index} style={styles.barSlot}>
                      {/* Avant son arrivée : pas de barre, ces semaines-là ne comptent pas. */}
                      {index >= progress.weeks.length - progress.trackedWeeks && <View style={[styles.bar, { height: value > 0 ? 8 + (value / busiestWeek) * 40 : 4, backgroundColor: value > 0 ? colors.primary : colors.leaf }]} />}
                    </View>
                  ))}
                </View>
              )}
              <Text style={[styles.small, { color: colors.muted }]}>{careWeeksLabel(progress)}</Text>
              {progress.milestones.slice(0, 4).map((milestone) => (
                <View key={milestone.key} style={styles.milestone}>
                  <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
                  <Text style={[styles.milestoneText, { color: colors.foreground }]}>{milestone.label}</Text>
                  <Text style={[styles.small, { color: colors.muted }]}>{milestoneDate(milestone.date, now)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historique{count > 0 ? ` · ${count} geste${count > 1 ? "s" : ""}` : ""}</Text>
            <Text style={[styles.small, { color: colors.muted }]}>Récolte : {formatMonthRange(entry.harvestMonths)}</Text>
            {days.length === 0 && (
              <Text style={[styles.text, { color: colors.muted }]}>Rien de noté pour l’instant. Coche tes gestes sur l’accueil ou ici, prends une photo de temps en temps : tout s’affichera ici, jour par jour.</Text>
            )}
            {days.map((day) => (
              <View key={day.key} style={styles.day}>
                <Text style={[styles.dayLabel, { color: colors.muted }]}>{day.label}</Text>
                {day.photos.length > 0 && (
                  <View style={styles.dayPhotos}>
                    {day.photos.map((photo) => (
                      <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel="Voir cette photo en grand" onPress={() => { setShownPhotoId(photo.id); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}>
                        <PlantPicture resolved={resolved} photo={photo} style={styles.dayThumb} />
                      </Pressable>
                    ))}
                  </View>
                )}
                {day.events.map((event) => {
                  const type = EVENT_TYPE_LABELS[event.type];
                  const scanner = isScannerEvent(event);
                  const note = scanner ? event.note?.replace(/^Scanner : /, "") : event.note;
                  return (
                    <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`${scanner ? "Diagnostic de Nora" : type.label} à ${clock(event.completedAt)}, détail`} onPress={() => setOpenEvent(event)} style={({ pressed }) => [styles.event, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
                      <View style={[styles.eventIcon, { backgroundColor: colors.surface }]}><Text style={styles.eventIconText}>{scanner ? "📷" : type.icon}</Text></View>
                      <View style={styles.flex}>
                        <Text style={[styles.eventTitle, { color: colors.foreground }]}>
                          {scanner ? "Diagnostic de Nora" : type.label}
                          <Text style={[styles.small, { color: colors.muted }]}>  {clock(event.completedAt)}</Text>
                        </Text>
                        {!!note && note !== type.label && <Text style={[styles.small, { color: colors.muted }]} numberOfLines={2}>{note}</Text>}
                      </View>
                      <Text style={[styles.eventChevron, { color: colors.muted }]}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Son nom et la retirer du balcon : des lignes comme dans Réglages. */}
          <View style={styles.section}>
            <SettingsGroup title="Ta plante">
              <SettingRow key="name" label="Son nom" value={plant.nickname?.trim() || "Pas de surnom"} onPress={() => { setNameDraft(plant.nickname ?? ""); setNameSheet(true); }} />
              <SettingRow key="remove" label="Retirer du balcon" subtitle="Tu pourras annuler juste après. Son historique est gardé." danger onPress={() => void removeFromBalcony()} />
            </SettingsGroup>
          </View>
        </View>
      </ScrollView>
      {capture.sheet}
      {freePot.sheet}
      <BottomSheet visible={nameSheet} onClose={() => setNameSheet(false)}>
        <SheetHeading title="Son nom" intro={`Un surnom pour ${byForm(entry, "le", "la", "les", "les")} reconnaître (« ${entry.name} du salon »). Vide : ${entry.name}.`} />
        <TextInput value={nameDraft} onChangeText={setNameDraft} onSubmitEditing={() => void saveName()} accessibilityLabel="Son nom" placeholder={entry.name} placeholderTextColor={colors.muted} maxLength={40} returnKeyType="done" autoFocus style={[styles.sheetInput, { borderColor: colors.border, color: colors.foreground }]} />
        <Button label="Enregistrer" onPress={() => void saveName()} style={styles.sheetButton} />
      </BottomSheet>
      <BottomSheet visible={openEvent !== null} onClose={() => setOpenEvent(null)}>
        {openEvent && (
          <View style={styles.sheet}>
            <Text style={[styles.kicker, { color: colors.primary }]}>{isScannerEvent(openEvent) ? "📷  Diagnostic de Nora" : `${EVENT_TYPE_LABELS[openEvent.type].icon}  ${EVENT_TYPE_LABELS[openEvent.type].label}`}</Text>
            <Text style={[styles.nextTitle, { color: colors.foreground }]}>{days.find((day) => day.events.some((event) => event.id === openEvent.id))?.label ?? "Ce jour-là"} à {clock(openEvent.completedAt)}</Text>
            {!!openEvent.note && <Text style={[styles.text, { color: colors.muted }]}>{isScannerEvent(openEvent) ? openEvent.note.replace(/^Scanner : /, "") : openEvent.note}</Text>}
            <Button variant="remove" label="Supprimer ce geste" onPress={() => void deleteEvent(openEvent)} />
          </View>
        )}
      </BottomSheet>
      <PotSizeSheet entry={entry} visible={potSheet} onClose={() => setPotSheet(false)} value={potSizeOf(plant)} onPick={(size) => { setPotSheet(false); void setPlantPotSize(plant.id, size); }} />
      {!freePot.isOpen && <UndoToast message={toast} onDone={hideToast} bottom={insets.bottom + 16} />}
      {!freePot.isOpen && celebration}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { padding: 20, gap: 12 },
  heroEmpty: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 14 },
  heroEmoji: { fontSize: 96, lineHeight: 120 },
  heroEmptyText: { fontSize: 15, fontWeight: "600" },
  heroCta: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 13 },
  heroCtaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  heroBar: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  exampleChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.9)" },
  stockBar: { position: "absolute", left: 16, right: 16, bottom: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateChip: { position: "absolute", left: 16, bottom: 36, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.9)" },
  dateText: { fontSize: 13, fontWeight: "700" },
  body: { marginTop: -22, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 22, gap: 10 },
  name: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8 },
  text: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 13, lineHeight: 18 },
  legend: { fontSize: 12, marginTop: -4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: "700" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  fact: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  factText: { fontSize: 13, fontWeight: "600" },
  next: { marginTop: 10, borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 },
  kicker: { fontSize: 13, fontWeight: "700" },
  nextTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, lineHeight: 24 },
  cta: { marginTop: 6 },
  okButton: { alignSelf: "center" },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  section: { marginTop: 18, gap: 10 },
  progress: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 6 },
  stage: { fontSize: 17, fontWeight: "800" },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 52, marginTop: 8 },
  barSlot: { flex: 1, justifyContent: "flex-end" },
  bar: { borderRadius: 4 },
  milestone: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 6 },
  milestoneIcon: { fontSize: 17, width: 24, textAlign: "center" },
  milestoneText: { flex: 1, fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  strip: { gap: 10, paddingRight: 8 },
  thumb: { width: 76, height: 92, borderRadius: 14 },
  addThumb: { borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: "700" },
  day: { gap: 4, marginTop: 6 },
  dayLabel: { fontSize: 13, fontWeight: "700" },
  dayPhotos: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 4 },
  dayThumb: { width: 64, height: 64, borderRadius: 12 },
  event: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  eventIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  eventIconText: { fontSize: 17 },
  eventTitle: { fontSize: 15, fontWeight: "700" },
  eventChevron: { fontSize: 20, alignSelf: "center" },
  sheet: { gap: 12 },
  sheetInput: { fontSize: 17, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 },
  sheetButton: { marginTop: 14 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
