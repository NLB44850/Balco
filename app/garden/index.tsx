import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { FadeIn } from "@/components/motion";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { eventsForPlant, plantDisplayName, plantStatus, relativeDay } from "@/lib/garden/garden-logic";
import { CATEGORY_LABELS, effortLabel, formatMonthRange } from "@/lib/plants/catalog";

export default function GardenScreen() {
  const colors = useColors();
  const router = useRouter();
  const { loaded, resolvedPlants, events, removePlant, renamePlant } = useGarden();
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const now = new Date();

  const saveNickname = async (plantId: string) => {
    await renamePlant(plantId, nicknameDraft);
    setEditingId(null);
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={({ pressed }) => [styles.backButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.backText, { color: colors.foreground }]}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.overline, { color: colors.terracotta }]}>MON BALCON</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{resolvedPlants.length > 0 ? `${resolvedPlants.length} plante${resolvedPlants.length > 1 ? "s" : ""}` : "Tes plantes"}</Text>
          </View>
        </View>

        {loaded && resolvedPlants.length === 0 && (
          <FadeIn delay={60} style={[styles.emptyCard, { backgroundColor: colors.cream }]}>
            <Text style={styles.emptyEmoji}>🪴</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ton balcon est encore vide.</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Ajoute les plantes que tu cultives (ou que tu veux cultiver) : Balco adaptera tes gestes du jour et tes rappels météo à chacune.</Text>
          </FadeIn>
        )}

        {resolvedPlants.map((resolved, index) => {
          const { plant, entry } = resolved;
          const status = plantStatus(resolved, events, now);
          const history = eventsForPlant(events, plant.id);
          const latest = history[0];
          const historyCount = history.length;
          const statusColor = status.tone === "watch" ? colors.terracotta : status.tone === "good" ? colors.success : colors.muted;
          const confirming = confirmRemoveId === plant.id;
          const editing = editingId === plant.id;
          return (
            <FadeIn key={plant.id} delay={60 + index * 40} style={[styles.plantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.plantTop}>
                <View style={[styles.emojiBubble, { backgroundColor: colors.leaf }]}><Text style={styles.emoji}>{entry.emoji}</Text></View>
                <View style={styles.plantCopy}>
                  {editing ? (
                    <TextInput value={nicknameDraft} onChangeText={setNicknameDraft} onSubmitEditing={() => void saveNickname(plant.id)} autoFocus placeholder={entry.name} placeholderTextColor={colors.muted} maxLength={40} returnKeyType="done" style={[styles.nicknameInput, { color: colors.foreground, borderColor: colors.border }]} />
                  ) : (
                    <Text style={[styles.plantName, { color: colors.foreground }]}>{plantDisplayName(resolved)}</Text>
                  )}
                  <Text style={[styles.plantMeta, { color: colors.muted }]}>{plant.nickname ? `${entry.name} · ` : ""}{CATEGORY_LABELS[entry.category]} · {effortLabel(entry)}</Text>
                </View>
                <Text style={[styles.status, { color: statusColor }]}>{status.label}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.leaf }]}><View style={[styles.fill, { width: `${Math.round(status.freshness * 100)}%`, backgroundColor: statusColor }]} /></View>
              <Text style={[styles.detail, { color: colors.muted }]}>{latest ? `${status.meta} · ${latest.note ?? "geste enregistré"}` : `Ajoutée ${relativeDay(new Date(plant.addedAt), now)} · pot conseillé ${entry.potLiters} L`}</Text>
              <Text style={[styles.detail, { color: colors.muted }]}>Récolte : {formatMonthRange(entry.harvestMonths)}</Text>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/garden/[id]", params: { id: plant.id } })} style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.actionText, { color: "#FFFFFF" }]}>Historique{historyCount ? ` (${historyCount})` : ""}</Text></Pressable>
                {editing ? (
                  <Pressable onPress={() => void saveNickname(plant.id)} style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.actionText, { color: colors.primary }]}>Enregistrer</Text></Pressable>
                ) : (
                  <Pressable onPress={() => { setEditingId(plant.id); setNicknameDraft(plant.nickname ?? ""); setConfirmRemoveId(null); }} style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.actionText, { color: colors.primary }]}>Renommer</Text></Pressable>
                )}
                <Pressable
                  onPress={() => (confirming ? void removePlant(plant.id).then(() => setConfirmRemoveId(null)) : setConfirmRemoveId(plant.id))}
                  style={({ pressed }) => [styles.actionButton, { backgroundColor: confirming ? colors.terracotta : colors.cream }, pressed && styles.pressed]}
                >
                  <Text style={[styles.actionText, { color: confirming ? "#FFFFFF" : colors.terracotta }]}>{confirming ? "Confirmer le retrait" : "Retirer"}</Text>
                </Pressable>
                {confirming && <Pressable onPress={() => setConfirmRemoveId(null)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}><Text style={[styles.actionText, { color: colors.muted }]}>Annuler</Text></Pressable>}
              </View>
            </FadeIn>
          );
        })}

        <Pressable accessibilityRole="button" onPress={() => router.push("/garden/add")} style={({ pressed }) => [styles.addButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}>
          <Text style={styles.addButtonText}>+ Ajouter une plante</Text>
        </Pressable>
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
  emptyCard: { borderRadius: 22, padding: 20, alignItems: "flex-start", gap: 6 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptyText: { fontSize: 13, lineHeight: 19 },
  plantCard: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 8 },
  plantTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiBubble: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 24 },
  plantCopy: { flex: 1 },
  plantName: { fontSize: 16, fontWeight: "800" },
  plantMeta: { fontSize: 11, marginTop: 2 },
  nicknameInput: { fontSize: 15, fontWeight: "700", borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  status: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  detail: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  actionButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontSize: 12, fontWeight: "800" },
  addButton: { borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  addButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
