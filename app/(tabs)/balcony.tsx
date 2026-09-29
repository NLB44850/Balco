/**
 * Onglet « Balcon » : tes plantes, leur état en un coup d'œil, et l'accès à leur fiche.
 * Renommer ou retirer une plante se fait sur la ligne, sans quitter l'écran.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { eventsForPlant, plantDisplayName, plantStatus, plantVariety, relativeDay } from "@/lib/garden/garden-logic";
import { CATEGORY_LABELS, formatMonthRange } from "@/lib/plants/catalog";

const STATUS_TEXT = { good: "En forme", watch: "À surveiller", new: "Nouvelle" } as const;

export default function BalconyScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loaded, resolvedPlants, events, removePlant, renamePlant } = useGarden();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const now = new Date();
  const watching = resolvedPlants.filter((resolved) => plantStatus(resolved, events, now).tone === "watch").length;
  const subtitle = resolvedPlants.length === 0
    ? "Ajoute ta première plante"
    : `${resolvedPlants.length} plante${resolvedPlants.length > 1 ? "s" : ""}${watching ? ` · ${watching} à surveiller` : " · toutes en forme"}`;

  const saveNickname = async (plantId: string) => {
    await renamePlant(plantId, nicknameDraft);
    setEditingId(null);
    setMenuId(null);
  };

  const closeMenu = () => {
    setMenuId(null);
    setConfirmRemoveId(null);
    setEditingId(null);
  };

  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader title="Balcon" subtitle={subtitle} />

        {loaded && resolvedPlants.length === 0 && (
          <View style={[glass.card, styles.empty]}>
            <Text style={styles.emptyEmoji}>🪴</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ton balcon est encore vide</Text>
            <Text style={[styles.small, { color: colors.muted }]}>Ajoute les plantes que tu cultives ou que tu veux cultiver : Balco adapte tes gestes du jour et tes alertes météo à chacune.</Text>
          </View>
        )}

        {resolvedPlants.length > 0 && (
          <View style={[glass.card, styles.list]}>
            {resolvedPlants.map((resolved, index) => {
              const { plant, entry } = resolved;
              const status = plantStatus(resolved, events, now);
              const history = eventsForPlant(events, plant.id);
              const tone = status.tone === "watch" ? colors.warning : status.tone === "good" ? colors.primary : colors.muted;
              const variety = plantVariety(resolved);
              const open = menuId === plant.id;
              const editing = editingId === plant.id;
              const confirming = confirmRemoveId === plant.id;
              return (
                <View key={plant.id} style={[styles.item, index < resolvedPlants.length - 1 && glass.line]}>
                  <View style={styles.row}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${plantDisplayName(resolved)}, ${STATUS_TEXT[status.tone]}, voir la fiche`} onPress={() => router.push({ pathname: "/garden/[id]", params: { id: plant.id } })} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
                      <View style={[styles.bubble, { backgroundColor: colors.leaf }]}>
                        <Text style={styles.emoji}>{entry.emoji}</Text>
                        <View style={[styles.dot, { backgroundColor: tone, borderColor: "#FFFFFF" }]} />
                      </View>
                      <View style={styles.copy}>
                        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{plantDisplayName(resolved)}</Text>
                        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
                          {[plant.nickname ? entry.name : null, variety?.name, CATEGORY_LABELS[entry.category]].filter(Boolean).join(" · ")}
                        </Text>
                        <Text style={[styles.meta, { color: tone }]} numberOfLines={1}>
                          {STATUS_TEXT[status.tone]} · {history[0] ? status.meta.replace("Dernier soin · ", "dernier soin ") : `ajoutée ${relativeDay(new Date(plant.addedAt), now)}`}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Options pour ${plantDisplayName(resolved)}`} hitSlop={10} onPress={() => (open ? closeMenu() : (closeMenu(), setMenuId(plant.id)))} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
                      <Text style={[styles.moreText, { color: colors.muted }]}>•••</Text>
                    </Pressable>
                  </View>

                  {open && (
                    <View style={styles.menu}>
                      {editing ? (
                        <View style={styles.editRow}>
                          <TextInput value={nicknameDraft} onChangeText={setNicknameDraft} onSubmitEditing={() => void saveNickname(plant.id)} autoFocus placeholder={entry.name} placeholderTextColor={colors.muted} maxLength={40} returnKeyType="done" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
                          <Pressable accessibilityRole="button" onPress={() => void saveNickname(plant.id)} style={({ pressed }) => [styles.pill, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: "#FFFFFF" }]}>Enregistrer</Text></Pressable>
                        </View>
                      ) : confirming ? (
                        <View style={styles.menuRow}>
                          <Text style={[styles.small, styles.flex, { color: colors.foreground }]}>Retirer {plantDisplayName(resolved)} et son historique ?</Text>
                          <Pressable accessibilityRole="button" onPress={() => void removePlant(plant.id).then(closeMenu)} style={({ pressed }) => [styles.pill, { backgroundColor: colors.error }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: "#FFFFFF" }]}>Retirer</Text></Pressable>
                          <Pressable accessibilityRole="button" onPress={() => setConfirmRemoveId(null)} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}><Text style={[styles.pillText, { color: colors.muted }]}>Annuler</Text></Pressable>
                        </View>
                      ) : (
                        <View style={styles.menuRow}>
                          <Text style={[styles.small, styles.flex, { color: colors.muted }]}>Récolte : {formatMonthRange(entry.harvestMonths)} · pot {entry.potLiters} L</Text>
                          <Pressable accessibilityRole="button" onPress={() => { setEditingId(plant.id); setNicknameDraft(plant.nickname ?? ""); }} style={({ pressed }) => [styles.pill, { backgroundColor: colors.leaf }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: colors.primary }]}>Renommer</Text></Pressable>
                          <Pressable accessibilityRole="button" onPress={() => setConfirmRemoveId(plant.id)} style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface }, pressed && styles.pressed]}><Text style={[styles.pillText, { color: colors.error }]}>Retirer</Text></Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.push("/garden/add")} style={({ pressed }) => [styles.cta, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
          <Text style={[styles.ctaText, { color: colors.background }]}>Ajouter une plante</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/scanner")} style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, pressed && styles.pressed]}>
          <Text style={[styles.secondaryText, { color: colors.foreground }]}>📷  Observer une plante avec Nora</Text>
        </Pressable>
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  empty: { padding: 20, gap: 6 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  small: { fontSize: 13, lineHeight: 19 },
  flex: { flex: 1 },
  list: { paddingHorizontal: 14 },
  item: { paddingVertical: 12, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  bubble: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 26 },
  dot: { position: "absolute", right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  copy: { flex: 1, gap: 1 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12.5 },
  more: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  menu: { paddingLeft: 64 },
  menuRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, fontSize: 15, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { fontSize: 13, fontWeight: "700" },
  cta: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontSize: 15, fontWeight: "700" },
  secondary: { borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, backgroundColor: "rgba(255,255,255,0.6)" },
  secondaryText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
