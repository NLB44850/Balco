/**
 * La page d'un événement de l'année (la Sainte-Catherine d'abord) : la citation, pourquoi c'est le moment, « Ce qui se
 * plante maintenant » (plantes du catalogue adaptées au balcon, ajoutées « à planter » avec leur pas-à-pas), un geste
 * de protection avec « C'est fait », et « Demander à Nora ». Données et logique : lib/events/events.ts.
 */
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { CatalogPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { UndoToast, type ToastMessage } from "@/components/today/undo-toast";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useDayPlan } from "@/hooks/use-day-plan";
import { coldMode, eventById, eventMoment, eventPlanted, eventPlantings, protectionDone, protectionEvents } from "@/lib/events/events";
import { useGarden } from "@/lib/garden/garden-context";
import { MONTH_LONG } from "@/lib/plants/catalog";

export default function EventScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const event = eventById(params.id ?? "");
  const { resolvedPlants, pastPlants, events, onboarding, addPlant, removePlant, logEvent, removeEvent } = useGarden();
  const { now, climate, allDecisions } = useDayPlan();
  const year = (event && eventMoment(now)?.event.id === event.id ? eventMoment(now)?.year : undefined) ?? now.getFullYear();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);
  const showToast = (text: string, onUndo?: () => void) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, onUndo });
  };

  // Les plantes du balcon déjà en terre ne sont plus proposées ; celles « à planter » le restent, avec leur pas-à-pas.
  const inGround = resolvedPlants.filter(({ plant }) => !plant.toPlant).map(({ entry }) => entry.id);
  const plantings = useMemo(() => (event ? eventPlantings(event, onboarding, { climate, owned: inGround }) : []), [climate, event, inGround.join(","), onboarding]); // eslint-disable-line react-hooks/exhaustive-deps
  const planted = event ? eventPlanted(event, year, [...resolvedPlants, ...pastPlants], events) : [];
  const cold = coldMode(climate, allDecisions.some((decision) => decision.cause === "frost"));
  const pots = resolvedPlants.filter(({ plant }) => !plant.toPlant);
  const protected_ = event ? protectionDone(event, year, events) : false;

  if (!event) {
    return (
      <LightScreen bottom>
        <View style={[styles.content, { paddingTop: insets.top + 14 }]}>
          <ScreenHeader back title="Événement" />
          <Text style={[styles.body, { color: colors.muted }]}>Cet événement n’existe plus.</Text>
        </View>
      </LightScreen>
    );
  }

  const add = async (catalogId: string, name: string) => {
    const created = await addPlant(catalogId, { toPlant: true });
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Ajouté à ton balcon : ${name}`, () => void removePlant(created.id));
  };
  const protect = async () => {
    const logged = protectionEvents(event, year, resolvedPlants, now);
    for (const item of logged) await logEvent(item);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("C’est noté : tes pots sont paillés", () => void (async () => {
      for (const item of logged) await removeEvent(item.id);
    })());
  };
  const guide = (catalogId: string, plantId?: string) => router.push({ pathname: "/guide/[catalogId]", params: { catalogId, ...(plantId ? { plantId } : {}) } });

  const plantingList = event.plantings && (
    <View style={[glass.card, styles.card]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{event.plantings.listTitle}</Text>
      {plantings.length === 0 && <Text style={[styles.body, { color: colors.muted }]}>Rien de nouveau à planter sur ton balcon ce mois-ci : tout ce qui convient y est déjà.</Text>}
      {plantings.map((entry) => {
        const waiting = resolvedPlants.find(({ plant, entry: owned }) => owned.id === entry.id && plant.toPlant);
        return (
          <View key={entry.id} style={[styles.row, { borderBottomColor: colors.border }]}>
            <CatalogPicture entry={entry} style={styles.picture} />
            <View style={styles.flex}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{entry.name}</Text>
              <Text style={[styles.rowText, { color: colors.muted }]}>{waiting ? "Sur ton balcon, à planter" : `Un pot d’au moins ${entry.potLiters} L`}</Text>
            </View>
            {waiting ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Pas à pas : ${entry.name}`} onPress={() => guide(entry.id, waiting.plant.id)} style={({ pressed }) => [styles.pill, { borderColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={[styles.pillText, { color: colors.primary }]}>Pas à pas ›</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${entry.name}`} onPress={() => void add(entry.id, entry.name)} style={({ pressed }) => [styles.pill, styles.pillFilled, { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={[styles.pillText, { color: "#FFFFFF" }]}>Ajouter</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {planted.length > 0 && <Text style={[styles.rowText, { color: colors.primary }]}>Déjà planté pour la {event.title.replace(/^La /u, "")} : {planted.length}</Text>}
    </View>
  );

  const protection = event.protection && (
    <View style={[glass.card, styles.card]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{event.protection.title}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{event.protection.text}</Text>
      {protected_ ? (
        <Text style={[styles.rowTitle, { color: colors.primary }]}>✓ C’est fait</Text>
      ) : pots.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`C’est fait : ${event.protection.title}`} onPress={() => void protect()} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>C’est fait</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title={event.title} subtitle={`Du ${event.start.day} au ${event.end.day} ${MONTH_LONG[event.end.month - 1]}`} />
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{event.emoji}</Text>
          {event.quote && <Text style={[styles.quote, { color: colors.foreground }]}>{event.quote}</Text>}
          <Text style={[styles.body, { color: colors.muted }]}>{event.explanation}</Text>
        </View>
        {cold && event.coldNote && <Text style={[styles.cold, { color: colors.frost, borderColor: colors.frost }]}>{event.coldNote}</Text>}
        {cold ? <>{protection}{plantingList}</> : <>{plantingList}{protection}</>}
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/(tabs)/assistant", params: { question: event.noraQuestion } })} style={({ pressed }) => [styles.nora, pressed && styles.pressed]}>
          <Text style={[styles.noraText, { color: colors.primary }]}>Demander à Nora ›</Text>
          <Text style={[styles.rowText, { color: colors.muted }]}>« {event.noraQuestion} »</Text>
        </Pressable>
      </ScrollView>
      <UndoToast message={toast} onDone={() => setToast(null)} />
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  hero: { alignItems: "center", gap: 10, paddingVertical: 6 },
  heroEmoji: { fontSize: 56 },
  quote: { fontSize: 19, fontWeight: "700", textAlign: "center", lineHeight: 26 },
  body: { fontSize: 15, lineHeight: 21 },
  cold: { fontSize: 15, lineHeight: 21, borderWidth: 1, borderRadius: 14, padding: 12 },
  card: { padding: 16, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  picture: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowText: { fontSize: 14, lineHeight: 19 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillFilled: {},
  pillText: { fontSize: 14, fontWeight: "700" },
  cta: { borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  nora: { alignItems: "center", gap: 4, paddingVertical: 10 },
  noraText: { fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
