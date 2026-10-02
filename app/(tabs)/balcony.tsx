/**
 * Onglet « Balcon » : tes plantes en grandes cartes photo, comme des annonces. Sur chaque carte,
 * ta dernière photo, un point de couleur pour son état et le geste du jour. Toucher une carte
 * ouvre sa fiche ; sans photo, un toucher sur « Ajoute ta photo » suffit.
 */
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { usePlantPhotoCapture } from "@/components/photo-source-sheet";
import { PlantPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { plantDisplayName, plantStatus, type ResolvedPlant } from "@/lib/garden/garden-logic";
import { nextGesture, STATUS_LABELS } from "@/lib/garden/photos";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { headline } from "@/lib/garden/today";

const GAP = 12;

export default function BalconyScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loaded, resolvedPlants, events } = useGarden();
  const { covers } = usePlantPhotos();
  const [gridWidth, setGridWidth] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const showToast = useCallback((text: string, onUndo?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, onUndo });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);
  const capture = usePlantPhotoCapture(showToast);

  const now = new Date();
  const watching = resolvedPlants.filter((resolved) => plantStatus(resolved, events, now).tone === "watch").length;
  const subtitle = resolvedPlants.length === 0
    ? "Ajoute ta première plante"
    : `${resolvedPlants.length} plante${resolvedPlants.length > 1 ? "s" : ""}${watching ? ` · ${watching} à surveiller` : " · toutes en forme"}`;
  const cardWidth = gridWidth > 0 ? (gridWidth - GAP) / 2 : 0;
  const onGridLayout = (event: LayoutChangeEvent) => setGridWidth(event.nativeEvent.layout.width);

  const toneColor = (tone: "good" | "watch" | "new") => (tone === "watch" ? colors.warning : tone === "good" ? colors.primary : colors.muted);

  const card = (resolved: ResolvedPlant) => {
    const { plant } = resolved;
    const name = plantDisplayName(resolved);
    const status = plantStatus(resolved, events, now);
    const gesture = nextGesture(resolved, events, now);
    const hasPhoto = covers.has(plant.id);
    const line = !gesture ? "Rien à faire aujourd’hui" : gesture.done ? "✓ Fait aujourd’hui" : headline(gesture.task.title);
    return (
      <Pressable
        key={plant.id}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${STATUS_LABELS[status.tone]}, voir la fiche`}
        onPress={() => router.push({ pathname: "/garden/[id]", params: { id: plant.id } })}
        style={({ pressed }) => [{ width: cardWidth }, styles.card, pressed && styles.pressed]}
      >
        <PlantPicture resolved={resolved} style={[styles.picture, { height: cardWidth * 1.2 }]}>
          <View style={styles.statusChip}>
            <View style={[styles.dot, { backgroundColor: toneColor(status.tone) }]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>{STATUS_LABELS[status.tone]}</Text>
          </View>
          {!hasPhoto && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter une photo de ${name}`} hitSlop={6} onPress={() => capture.ask(plant.id, name)} style={({ pressed }) => [styles.addPhoto, pressed && styles.pressed]}>
              <IconSymbol name="camera.fill" size={15} color={colors.primary} />
              <Text style={[styles.addPhotoText, { color: colors.primary }]}>Ta photo</Text>
            </Pressable>
          )}
        </PlantPicture>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.line, { color: gesture && !gesture.done ? colors.foreground : colors.muted }]} numberOfLines={2}>{line}</Text>
      </Pressable>
    );
  };

  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader title="Balcon" subtitle={subtitle} />

        {loaded && resolvedPlants.length === 0 && (
          <View style={[glass.card, styles.empty]}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ton balcon est encore vide</Text>
            <Text style={[styles.small, { color: colors.muted }]}>Ajoute les plantes que tu cultives ou que tu veux cultiver : Balco adapte tes gestes du jour et tes alertes météo à chacune.</Text>
          </View>
        )}

        {resolvedPlants.length > 0 && (
          <View style={styles.grid} onLayout={onGridLayout}>
            {cardWidth > 0 && resolvedPlants.map(card)}
          </View>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.push("/garden/add")} style={({ pressed }) => [styles.cta, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
          <Text style={[styles.ctaText, { color: colors.background }]}>Ajouter une plante</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/scanner")} style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, pressed && styles.pressed]}>
          <Text style={[styles.secondaryText, { color: colors.foreground }]}>📷  Observer une plante avec Nora</Text>
        </Pressable>
      </ScrollView>
      {capture.sheet}
      <UndoToast message={toast} onDone={hideToast} />
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  empty: { padding: 20, gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  small: { fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, rowGap: 18 },
  card: { gap: 4 },
  picture: { borderRadius: 18, marginBottom: 4 },
  statusChip: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.9)" },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontSize: 12, fontWeight: "700" },
  addPhoto: { position: "absolute", bottom: 8, left: 8, right: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.9)" },
  addPhotoText: { fontSize: 13, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "700" },
  line: { fontSize: 13, lineHeight: 18 },
  cta: { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontSize: 15, fontWeight: "700" },
  secondary: { borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, backgroundColor: "rgba(255,255,255,0.6)" },
  secondaryText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
