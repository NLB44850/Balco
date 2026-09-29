import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";

import { FadeIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { EVENT_TYPE_LABELS, historyByDay, isScannerEvent, plantDisplayName, plantStatus, plantVariety, relativeDay } from "@/lib/garden/garden-logic";
import { CATEGORY_LABELS, effortLabel, formatMonthRange } from "@/lib/plants/catalog";

/** Fiche d'une plante : son état et tout son historique (gestes cochés, observations, diagnostics du scanner). */
export default function PlantScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loaded, resolvedPlants, events, removeEvent, setPlantVariety } = useGarden();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const now = new Date();
  const resolved = resolvedPlants.find((item) => item.plant.id === id);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/balcony"));

  const header = (overline: string, title: string) => (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={back} style={({ pressed }) => [styles.backButton, { borderColor: colors.border }, pressed && styles.pressed]}>
        <Text style={[styles.backText, { color: colors.foreground }]}>‹</Text>
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={[styles.overline, { color: colors.terracotta }]}>{overline}</Text>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );

  if (!resolved) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.content}>
          {header("MON BALCON", "Plante introuvable")}
          {loaded && <Text style={[styles.emptyText, { color: colors.muted }]}>Cette plante n’est plus sur ton balcon.</Text>}
        </View>
      </ScreenContainer>
    );
  }

  const { plant, entry } = resolved;
  const status = plantStatus(resolved, events, now);
  const days = historyByDay(events, plant.id, now);
  const count = days.reduce((total, day) => total + day.events.length, 0);
  const variety = plantVariety(resolved);
  const statusColor = status.tone === "watch" ? colors.terracotta : status.tone === "good" ? colors.success : colors.muted;

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {header("MA PLANTE", plantDisplayName(resolved))}

        <FadeIn delay={40} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.plantTop}>
            <View style={[styles.emojiBubble, { backgroundColor: colors.leaf }]}><Text style={styles.emoji}>{entry.emoji}</Text></View>
            <View style={styles.plantCopy}>
              <Text style={[styles.plantName, { color: colors.foreground }]}>{[plant.nickname ? entry.name : CATEGORY_LABELS[entry.category], variety?.name].filter(Boolean).join(" · ")}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>{effortLabel(entry)} · pot conseillé {entry.potLiters} L</Text>
            </View>
            <Text style={[styles.status, { color: statusColor }]}>{status.label}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.leaf }]}><View style={[styles.fill, { width: `${Math.round(status.freshness * 100)}%`, backgroundColor: statusColor }]} /></View>
          <Text style={[styles.meta, { color: colors.muted }]}>{status.meta} · ajoutée {relativeDay(new Date(plant.addedAt), now)}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>Récolte : {formatMonthRange(entry.harvestMonths)}</Text>
        </FadeIn>

        {entry.varieties.length > 0 && (
          <FadeIn delay={60} style={styles.varietySection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Variété</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>{variety ? variety.note : "Tu connais la variété de ton plant ? Choisis-la : Nora en tiendra compte dans ses conseils."}</Text>
            <View style={styles.chips}>
              {entry.varieties.map((item) => {
                const active = item.id === variety?.id;
                return (
                  <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => void setPlantVariety(plant.id, active ? undefined : item.id)} style={({ pressed }) => [styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surface }, pressed && styles.pressed]}>
                    <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.foreground }]}>{active ? "✓ " : ""}{item.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!variety && <Text style={[styles.meta, { color: colors.muted }]}>{entry.varieties.map((item) => `${item.name} : ${item.note}`).join("\n")}</Text>}
          </FadeIn>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historique{count > 0 ? ` · ${count}` : ""}</Text>

        {days.length === 0 && (
          <FadeIn delay={80} style={[styles.emptyCard, { backgroundColor: colors.cream }]}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Rien de noté pour l’instant.</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Coche tes gestes du jour sur l’accueil, ou note un diagnostic depuis le scanner : tout s’affichera ici.</Text>
          </FadeIn>
        )}

        {days.map((day, dayIndex) => (
          <FadeIn key={day.key} delay={80 + dayIndex * 30} style={styles.day}>
            <Text style={[styles.dayLabel, { color: colors.muted }]}>{day.label}</Text>
            {day.events.map((event) => {
              const type = EVENT_TYPE_LABELS[event.type];
              const scanner = isScannerEvent(event);
              const note = scanner ? event.note?.replace(/^Scanner : /, "") : event.note;
              const confirming = confirmDeleteId === event.id;
              return (
                <View key={event.id} style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={styles.eventIcon}>{scanner ? "📷" : type.icon}</Text>
                  <View style={styles.eventCopy}>
                    <Text style={[styles.eventTitle, { color: colors.foreground }]}>
                      {scanner ? "Diagnostic du scanner" : type.label}
                      <Text style={[styles.eventTime, { color: colors.muted }]}>  {new Date(event.completedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text>
                    </Text>
                    {!!note && note !== type.label && <Text style={[styles.eventNote, { color: colors.muted }]}>{note}</Text>}
                    <View style={styles.eventActions}>
                      <Pressable accessibilityRole="button" onPress={() => (confirming ? void removeEvent(event.id).then(() => setConfirmDeleteId(null)) : setConfirmDeleteId(event.id))} style={({ pressed }) => [pressed && styles.pressed]}>
                        <Text style={[styles.eventAction, { color: colors.terracotta }]}>{confirming ? "Confirmer la suppression" : "Supprimer"}</Text>
                      </Pressable>
                      {confirming && <Pressable onPress={() => setConfirmDeleteId(null)} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.eventAction, { color: colors.muted }]}>Annuler</Text></Pressable>}
                    </View>
                  </View>
                </View>
              );
            })}
          </FadeIn>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 40, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 26, fontWeight: "700", marginTop: -3 },
  headerCopy: { flex: 1 },
  overline: { fontSize: 9, letterSpacing: 1.05, fontWeight: "800" },
  title: { fontSize: 27, fontWeight: "800", letterSpacing: -0.7, marginTop: 3 },
  card: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 8 },
  plantTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiBubble: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 24 },
  plantCopy: { flex: 1 },
  plantName: { fontSize: 15, fontWeight: "800" },
  meta: { fontSize: 12, lineHeight: 17 },
  status: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  varietySection: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 6 },
  emptyCard: { borderRadius: 20, padding: 18, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyText: { fontSize: 13, lineHeight: 19 },
  day: { gap: 8 },
  dayLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  eventCard: { flexDirection: "row", gap: 12, borderRadius: 16, borderWidth: 1, padding: 13 },
  eventIcon: { fontSize: 20, marginTop: 1 },
  eventCopy: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 14, fontWeight: "800" },
  eventTime: { fontSize: 12, fontWeight: "600" },
  eventNote: { fontSize: 13, lineHeight: 19 },
  eventActions: { flexDirection: "row", gap: 14, marginTop: 2 },
  eventAction: { fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
