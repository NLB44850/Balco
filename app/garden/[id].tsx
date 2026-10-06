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
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { careWeeksLabel, celebrationFor, milestoneDate, plantProgress, sinceLabel, withCheer } from "@/lib/garden/progress";
import { IconSymbol } from "@/components/ui/icon-symbol";
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

const clock = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function PlantScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loaded, resolvedPlants, events, logEvent, removeEvent, removePlant, renamePlant, setPlantVariety } = useGarden();
  const { plan, ready, snoozes, reminderSettings } = useDayPlan();
  const { photos, removePhoto } = usePlantPhotos();
  const [shownPhotoId, setShownPhotoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmPhotoId, setConfirmPhotoId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const { celebrate, overlay: celebration } = useCelebration();
  const scrollRef = useRef<ScrollView>(null);
  const showToast = useCallback((text: string, onUndo?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, onUndo });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);
  const capture = usePlantPhotoCapture(showToast);
  const now = new Date();
  const resolved = resolvedPlants.find((item) => item.plant.id === id);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/balcony"));

  const roundButton = (label: string, icon: "chevron.left" | "camera.fill", onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
      <IconSymbol name={icon} size={icon === "chevron.left" ? 26 : 19} color={colors.foreground} />
    </Pressable>
  );

  if (!resolved) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.missing}>
          {roundButton("Retour", "chevron.left", back)}
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
  const statusColor = status.tone === "weather" ? colors.frost : status.tone === "watch" ? colors.warning : status.tone === "good" ? colors.primary : colors.muted;
  const variety = plantVariety(resolved);
  const gesture = day?.first ?? null;
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
    const moment = new Date();
    const event = eventForGesture(gesture, moment);
    await logEvent(event);
    // Un conseil météo suivi se tait jusqu'à demain, ici comme sur Aujourd'hui.
    if (gesture.source.type === "decision") await saveReminderSnoozes(addSnooze(snoozes, gesture.source.decision, "skip", reminderSettings, moment));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const cheer = celebrate(celebrationFor(resolvedPlants, events, [event, ...events.filter((item) => item.id !== event.id)]));
    showToast(withCheer(cheer, `${gesture.source.type === "task" ? gesture.source.task.task.doneTitle : `${gesture.title} : noté.`} +${POINTS_PER_GESTURE} points`), () => void removeEvent(event.id));
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
    setEditingName(false);
  };

  const deleteShownPhoto = async () => {
    if (!shown) return;
    await removePhoto(shown.id);
    setConfirmPhotoId(null);
    setShownPhotoId(null);
    showToast("Photo retirée");
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
                <Text style={styles.heroCtaText}>Ajoute ta photo</Text>
              </Pressable>
            </View>
          )}
          {!shown && stockPhoto(entry.id) === undefined && (
            <View style={[styles.heroEmpty, { paddingTop: insets.top }]}>
              <Text style={styles.heroEmoji}>{entry.emoji}</Text>
              <Text style={[styles.heroEmptyText, { color: colors.primary }]}>Pas encore de photo de {name}</Text>
              <Pressable accessibilityRole="button" onPress={() => capture.ask(plant.id, name)} style={({ pressed }) => [styles.heroCta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
                <Text style={styles.heroCtaText}>Ajoute ta photo</Text>
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
          {roundButton("Retour", "chevron.left", back)}
          {roundButton(`Ajouter une photo de ${name}`, "camera.fill", () => capture.ask(plant.id, name))}
        </View>

        <View style={[styles.body, { backgroundColor: colors.background }]}>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput value={nameDraft} onChangeText={setNameDraft} onSubmitEditing={() => void saveName()} autoFocus placeholder={entry.name} placeholderTextColor={colors.muted} maxLength={40} returnKeyType="done" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
              <Pressable accessibilityRole="button" onPress={() => void saveName()} style={({ pressed }) => [styles.pill, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: "#FFFFFF" }]}>OK</Text></Pressable>
            </View>
          ) : (
            <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
          )}
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
            {[`☀️  ${sunlightLabel(entry)}`, `🪴  Pot de ${entry.potLiters} L`, `🌱  ${growingSince(plant.addedAt, now)}`].map((label) => (
              <View key={label} style={[styles.fact, { backgroundColor: colors.surface }]}><Text style={[styles.factText, { color: colors.foreground }]}>{label}</Text></View>
            ))}
          </View>

          {/* Le prochain geste, en un bouton. */}
          {ready && <FadeIn delay={40} style={[styles.next, { borderColor: colors.border }]}>
            {gesture && !gesture.done && (
              <>
                <Text style={[styles.kicker, { color: colors.primary }]}>Aujourd’hui · {gesture.minutes} min</Text>
                <Text style={[styles.nextTitle, { color: colors.foreground }]}>{gesture.title}</Text>
                <Text style={[styles.text, { color: colors.muted }]}>{gesture.instruction}</Text>
                <Pressable accessibilityRole="button" onPress={() => void doGesture()} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={styles.ctaText}>C’est fait</Text>
                </Pressable>
              </>
            )}
            {gesture?.done && (
              <View style={styles.doneRow}>
                <View style={[styles.check, { backgroundColor: colors.primary }]}><Text style={styles.checkMark}>✓</Text></View>
                <View style={styles.flex}>
                  <Text style={[styles.nextTitle, { color: colors.foreground }]}>{gesture.title}</Text>
                  <Text style={[styles.text, { color: colors.muted }]}>{gestureEvent ? `Fait à ${clock(gestureEvent.completedAt)}` : "Fait aujourd’hui"}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void undoGesture()} hitSlop={8}><Text style={[styles.link, { color: colors.muted }]}>Annuler</Text></Pressable>
              </View>
            )}
            {/* Le pas-à-pas : pour la planter, ou pour revoir comment elle l'a été. */}
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/guide/[catalogId]", params: { catalogId: entry.id, plantId: plant.id } })} style={({ pressed }) => [styles.guideLink, pressed && styles.pressed]}>
              <Text style={[styles.link, { color: colors.primary }]}>{plant.toPlant ? "Pas à pas, avec ce qu’il te faut ›" : "Revoir le pas-à-pas ›"}</Text>
            </Pressable>
            {!gesture && (
              <>
                <Text style={[styles.nextTitle, { color: colors.foreground }]}>Rien à faire aujourd’hui</Text>
                <Text style={[styles.text, { color: colors.muted }]}>{name} se repose. Balco te dira quand revenir.</Text>
              </>
            )}
          </FadeIn>}

          {/* Tes photos : toucher une photo l'affiche en grand. */}
          {plantPhotos.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tes photos · {plantPhotos.length}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                <Pressable accessibilityRole="button" accessibilityLabel="Ajouter une photo" onPress={() => capture.ask(plant.id, name)} style={({ pressed }) => [styles.thumb, styles.addThumb, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                  <IconSymbol name="camera.fill" size={22} color={colors.primary} />
                </Pressable>
                {plantPhotos.map((photo) => (
                  <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={photoDateLabel(photo.takenAt, now)} onPress={() => { setShownPhotoId(photo.id); setConfirmPhotoId(null); }} style={({ pressed }) => [pressed && styles.pressed]}>
                    <PlantPicture resolved={resolved} photo={photo} style={[styles.thumb, photo.id === shown?.id && { borderWidth: 2.5, borderColor: colors.primary }]} />
                  </Pressable>
                ))}
              </ScrollView>
              {shown && (
                <View style={styles.inlineRow}>
                  <Text style={[styles.small, styles.flex, { color: colors.muted }]}>{confirmPhotoId === shown.id ? "Retirer cette photo ?" : photoDateLabel(shown.takenAt, now)}</Text>
                  {confirmPhotoId === shown.id ? (
                    <>
                      <Pressable accessibilityRole="button" onPress={() => void deleteShownPhoto()} hitSlop={8}><Text style={[styles.link, { color: colors.error }]}>Retirer</Text></Pressable>
                      <Pressable accessibilityRole="button" onPress={() => setConfirmPhotoId(null)} hitSlop={8}><Text style={[styles.link, { color: colors.muted }]}>Garder</Text></Pressable>
                    </>
                  ) : (
                    <Pressable accessibilityRole="button" onPress={() => setConfirmPhotoId(shown.id)} hitSlop={8}><Text style={[styles.link, { color: colors.muted }]}>Retirer</Text></Pressable>
                  )}
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
              <View style={styles.bars} accessibilityLabel={careWeeksLabel(progress)}>
                {progress.weeks.map((value, index) => (
                  <View key={index} style={styles.barSlot}>
                    {/* Avant son arrivée : pas de barre, ces semaines-là ne comptent pas. */}
                    {index >= progress.weeks.length - progress.trackedWeeks && <View style={[styles.bar, { height: value > 0 ? 8 + (value / busiestWeek) * 40 : 4, backgroundColor: value > 0 ? colors.primary : colors.leaf }]} />}
                  </View>
                ))}
              </View>
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
                  const confirming = confirmDeleteId === event.id;
                  return (
                    <View key={event.id} style={[styles.event, { borderBottomColor: colors.border }]}>
                      <View style={[styles.eventIcon, { backgroundColor: colors.surface }]}><Text style={styles.eventIconText}>{scanner ? "📷" : type.icon}</Text></View>
                      <View style={styles.flex}>
                        <Text style={[styles.eventTitle, { color: colors.foreground }]}>
                          {scanner ? "Diagnostic de Nora" : type.label}
                          <Text style={[styles.small, { color: colors.muted }]}>  {clock(event.completedAt)}</Text>
                        </Text>
                        {!!note && note !== type.label && <Text style={[styles.small, { color: colors.muted }]}>{note}</Text>}
                        <View style={styles.inlineRow}>
                          <Pressable accessibilityRole="button" onPress={() => (confirming ? void removeEvent(event.id).then(() => setConfirmDeleteId(null)) : setConfirmDeleteId(event.id))} hitSlop={6}>
                            <Text style={[styles.smallLink, { color: confirming ? colors.error : colors.muted }]}>{confirming ? "Confirmer la suppression" : "Supprimer"}</Text>
                          </Pressable>
                          {confirming && <Pressable onPress={() => setConfirmDeleteId(null)} hitSlop={6}><Text style={[styles.smallLink, { color: colors.muted }]}>Annuler</Text></Pressable>}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Renommer ou retirer la plante, en bas de la fiche. */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {confirmRemove ? (
              <>
                <Text style={[styles.text, styles.flex, { color: colors.foreground }]}>Retirer {name} de ton balcon ?</Text>
                <Pressable accessibilityRole="button" onPress={() => void removePlant(plant.id).then(back)} style={({ pressed }) => [styles.pill, { backgroundColor: colors.error }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: "#FFFFFF" }]}>Retirer</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => setConfirmRemove(false)} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}><Text style={[styles.pillText, { color: colors.muted }]}>Annuler</Text></Pressable>
              </>
            ) : (
              <>
                <Pressable accessibilityRole="button" onPress={() => { setNameDraft(plant.nickname ?? ""); setEditingName(true); }} style={({ pressed }) => [styles.pill, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: colors.primary }]}>Renommer</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => setConfirmRemove(true)} style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: colors.error }]}>Retirer du balcon</Text></Pressable>
              </>
            )}
          </View>
        </View>
      </ScrollView>
      {capture.sheet}
      <UndoToast message={toast} onDone={hideToast} bottom={insets.bottom + 16} />
      {celebration}
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
  cta: { marginTop: 6, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  check: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  flex: { flex: 1 },
  link: { fontSize: 14, fontWeight: "700" },
  guideLink: { paddingVertical: 6 },
  smallLink: { fontSize: 12, fontWeight: "700" },
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
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, fontSize: 20, fontWeight: "700", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  pillText: { fontSize: 13, fontWeight: "700" },
  footer: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
