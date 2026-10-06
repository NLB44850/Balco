/**
 * Le pas-à-pas pour planter, facultatif : 1) « Ce qu'il te faut » (« J'ai déjà », « Partager ce qui manque »),
 * 2) une action par écran, illustrée, qu'on fait glisser, avec l'erreur à éviter à son étape, 3) « Et après ? »
 * et « C'est planté » (coche le premier geste de la plante, petite animation, pas de fête plein écran).
 * Entrées : le détail d'un geste « à planter » (Aujourd'hui), la fiche plante, et le catalogue (`mode=need` :
 * seulement « Ce qu'il te faut »). Logique dans lib/plants/guide.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuideIllustration } from "@/components/guide/illustrations";
import { LightScreen } from "@/components/light-screen";
import { PopIn } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { startEventId } from "@/lib/garden/garden-logic";
import { eventForActivity, startActivity } from "@/lib/plants/calendar";
import { getCatalogPlant } from "@/lib/plants/catalog";
import {
  emptyHave,
  guideModelFor,
  guideSteps,
  guideTitle,
  hasItem,
  isSowing,
  nextGestures,
  shareText,
  supplies,
  toggleHave,
  whatsNext,
  type HaveState,
} from "@/lib/plants/guide";

/** « J'ai déjà » : gardé sur le téléphone (objets communs pour toutes les plantes, le reste par plante). */
const HAVE_STORAGE_KEY = "balco.guide.have.v1";

type Phase = "need" | "steps" | "after";

export default function GuideScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ catalogId: string; plantId?: string; mode?: string }>();
  const entry = getCatalogPlant(params.catalogId ?? "");
  const { plants, events, logEvent } = useGarden();
  const plant = plants.find((candidate) => candidate.id === params.plantId && !candidate.removedAt);
  const needOnly = params.mode === "need";
  const month = new Date().getMonth() + 1;
  const model = entry ? guideModelFor(entry, month) : "sow-pot";
  const items = useMemo(() => (entry ? supplies(entry, model) : []), [entry, model]);
  const steps = useMemo(() => (entry ? guideSteps(entry, model) : []), [entry, model]);

  const [have, setHave] = useState<HaveState>(emptyHave);
  const [phase, setPhase] = useState<Phase>("need");
  const [index, setIndex] = useState(0);
  const [planted, setPlanted] = useState(false);
  const pager = useRef<ScrollView>(null);
  const pageWidth = Math.min(width, 520) - 40;

  useEffect(() => {
    AsyncStorage.getItem(HAVE_STORAGE_KEY)
      .then((stored) => stored && setHave({ ...emptyHave(), ...(JSON.parse(stored) as HaveState) }))
      .catch(() => undefined);
  }, []);

  if (!entry) return null;
  const missing = items.filter((item) => !hasItem(have, entry.id, item));

  const toggle = (itemIndex: number) => {
    const next = toggleHave(have, entry.id, items[itemIndex]);
    setHave(next);
    void AsyncStorage.setItem(HAVE_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const share = () => void Share.share({ message: shareText(entry, model, missing) }).catch(() => undefined);

  const goTo = (target: number) => {
    setIndex(target);
    pager.current?.scrollTo({ x: target * pageWidth, animated: true });
  };

  // « C'est planté » : le même geste que sur Aujourd'hui ; la plante passe « installée ».
  const canPlant = Boolean(plant?.toPlant) && !events.some((event) => event.id === startEventId(plant!.id));
  const markPlanted = async () => {
    if (!plant) return;
    const activity = startActivity({ id: plant.id, entry, displayName: plant.nickname?.trim() || entry.name, addedAt: plant.addedAt, toPlant: true }, month);
    await logEvent(eventForActivity(activity, new Date()));
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setPlanted(true);
    setTimeout(() => router.back(), 1400);
  };

  const subtitle = needOnly ? "Ce qu’il te faut" : phase === "steps" ? `Étape ${index + 1} sur ${steps.length}` : phase === "after" ? "Et après ?" : `${steps.length} étapes · ce qu’il te faut d’abord`;

  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]}>
        <ScreenHeader back title={guideTitle(entry, model)} subtitle={subtitle} />

        {phase === "need" && (
          <>
            <View style={[glass.card, styles.list]}>
              {items.map((item, itemIndex) => {
                const owned = hasItem(have, entry.id, item);
                return (
                  <View key={item.id} style={[styles.row, itemIndex < items.length - 1 && glass.line]}>
                    <View style={styles.flex}>
                      <Text style={[styles.itemLabel, { color: owned ? colors.muted : colors.foreground }, owned && styles.struck]}>{item.label}</Text>
                      {item.detail && <Text style={[styles.why, { color: colors.muted }]}>{item.detail}</Text>}
                    </View>
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: owned }} accessibilityLabel={`J’ai déjà : ${item.label}`} onPress={() => toggle(itemIndex)} hitSlop={6} style={({ pressed }) => [styles.have, { backgroundColor: owned ? colors.primary : "transparent", borderColor: owned ? colors.primary : colors.border }, pressed && styles.pressed]}>
                      <Text style={[styles.haveText, { color: owned ? "#FFFFFF" : colors.muted }]}>{owned ? "✓ J’ai" : "J’ai déjà"}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {missing.length > 0 ? (
              <Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => [styles.secondary, { borderColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Partager ce qui manque · {missing.length}</Text>
              </Pressable>
            ) : (
              <Text style={[styles.why, { color: colors.primary, textAlign: "center" }]}>Tu as tout ce qu’il faut.</Text>
            )}
            {!needOnly && (
              <Pressable accessibilityRole="button" onPress={() => setPhase("steps")} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.ctaText}>Commencer le pas-à-pas</Text>
              </Pressable>
            )}
          </>
        )}

        {phase === "steps" && (
          <>
            <ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth))}
              style={{ width: pageWidth }}
            >
              {steps.map((step, stepIndex) => (
                <View key={stepIndex} style={[styles.page, { width: pageWidth }]} accessibilityElementsHidden={stepIndex !== index} importantForAccessibility={stepIndex === index ? "auto" : "no-hide-descendants"}>
                  <View style={[glass.card, styles.art]}><GuideIllustration id={step.illustration} size={Math.min(220, pageWidth - 60)} /></View>
                  <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
                  {step.why && <Text style={[styles.why, { color: colors.muted }]}>{step.why}</Text>}
                  {step.mistake && <Text style={[styles.mistake, { color: colors.warning, borderColor: colors.warning }]}>{step.mistake}</Text>}
                </View>
              ))}
            </ScrollView>
            <View style={styles.dots}>{steps.map((_, dot) => <View key={dot} style={[styles.dot, { backgroundColor: dot === index ? colors.primary : colors.border }]} />)}</View>
            <View style={styles.nav}>
              <Pressable accessibilityRole="button" onPress={() => (index === 0 ? setPhase("need") : goTo(index - 1))} style={({ pressed }) => [styles.secondary, styles.flex, { borderColor: colors.border }, pressed && styles.pressed]}>
                <Text style={[styles.secondaryText, { color: colors.foreground }]}>Retour</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => (index >= steps.length - 1 ? setPhase("after") : goTo(index + 1))} style={({ pressed }) => [styles.cta, styles.flex, { backgroundColor: colors.primary, marginTop: 0 }, pressed && styles.pressed]}>
                <Text style={styles.ctaText}>{index >= steps.length - 1 ? "Et après ?" : "Suivant"}</Text>
              </Pressable>
            </View>
          </>
        )}

        {phase === "after" && (
          <>
            <View style={[glass.card, styles.after]}>
              <GuideIllustration id={isSowing(model) ? "sprouts" : "water-well"} size={140} />
              {[...whatsNext(entry, model), ...nextGestures(entry, model)].map((line) => (
                <Text key={line} style={[styles.afterLine, { color: colors.foreground }]}>{line}</Text>
              ))}
            </View>
            {planted ? (
              <PopIn style={styles.planted}>
                <View style={[styles.check, { backgroundColor: colors.primary }]}><Text style={styles.checkMark}>✓</Text></View>
                <Text style={[styles.itemLabel, { color: colors.primary }]}>{isSowing(model) ? "C’est semé" : "C’est planté"} : bien joué !</Text>
              </PopIn>
            ) : canPlant ? (
              <Pressable accessibilityRole="button" onPress={() => void markPlanted()} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.ctaText}>{isSowing(model) ? "C’est semé" : "C’est planté"}</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.cta, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
                <Text style={[styles.ctaText, { color: colors.background }]}>Fermer</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  flex: { flex: 1 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  itemLabel: { fontSize: 16, fontWeight: "700" },
  struck: { textDecorationLine: "line-through" },
  why: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  have: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  haveText: { fontSize: 13, fontWeight: "700" },
  page: { alignItems: "center", gap: 10 },
  art: { width: "100%", alignItems: "center", paddingVertical: 18 },
  stepText: { fontSize: 22, lineHeight: 28, fontWeight: "800", textAlign: "center", letterSpacing: -0.4, marginTop: 6 },
  mistake: { fontSize: 14, lineHeight: 20, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 4, alignSelf: "stretch" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  nav: { flexDirection: "row", gap: 10 },
  after: { alignItems: "center", gap: 10, padding: 18 },
  afterLine: { fontSize: 16, lineHeight: 23, textAlign: "center" },
  planted: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14 },
  check: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  cta: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondary: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  secondaryText: { fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
