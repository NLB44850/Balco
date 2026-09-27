import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { pickPlantPhoto, type PreparedPhoto } from "@/lib/ai/photo";
import { quotaLabel } from "@/lib/ai/quota-text";
import { useGarden } from "@/lib/garden/garden-context";
import { getCatalogPlant } from "@/lib/plants/catalog";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/routers";
import type { inferRouterOutputs } from "@trpc/server";

type Diagnosis = inferRouterOutputs<AppRouter>["ai"]["diagnose"]["diagnosis"];

const HEALTH = {
  healthy: { label: "EN PLEINE FORME", emoji: "🌿" },
  needs_attention: { label: "À SURVEILLER", emoji: "🔍" },
  sick: { label: "BESOIN DE SOINS", emoji: "🩹" },
  unknown: { label: "DIAGNOSTIC INCERTAIN", emoji: "❔" },
} as const;
const CONFIDENCE = { high: "Confiance élevée", medium: "Confiance moyenne", low: "Confiance faible" } as const;

/** Ce qui reste dans l'historique de la plante : le constat et les gestes conseillés (500 caractères au plus côté serveur). */
function scannerNote(diagnosis: Diagnosis) {
  const actions = diagnosis.actions.map((action) => action.title).join(" · ");
  return `Scanner : ${diagnosis.summary}${actions ? ` À faire : ${actions}.` : ""}`.slice(0, 480);
}

export default function ScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { account, resolvedPlants, addPlant, logEvent } = useGarden();
  const status = trpc.ai.status.useQuery(undefined, { enabled: account.signedIn, retry: false });
  const utils = trpc.useUtils();
  const diagnose = trpc.ai.diagnose.useMutation({ onSuccess: () => void utils.ai.status.invalidate() });
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);

  const scan = status.data?.scan;
  const noScansLeft = scan ? scan.remaining <= 0 : false;
  const diagnosis: Diagnosis | undefined = diagnose.data?.diagnosis;
  const entry = diagnosis?.catalogId ? getCatalogPlant(diagnosis.catalogId) : undefined;
  const owned = entry ? resolvedPlants.find((resolved) => resolved.entry.id === entry.id) : undefined;

  const choose = async (source: "camera" | "library") => {
    setNotice(null);
    try {
      const result = await pickPlantPhoto(source);
      if (result.status === "denied") setNotice("Autorise l’appareil photo dans les réglages du téléphone, ou choisis une photo dans ta galerie.");
      if (result.status === "ok") {
        setPhoto(result.photo);
        setSavedNote(false);
        diagnose.reset();
      }
    } catch {
      setNotice("Impossible d’ouvrir cette photo. Essaie avec une autre.");
    }
  };

  const analyze = () => {
    if (!photo) return;
    setSavedNote(false);
    diagnose.mutate({ imageBase64: photo.base64 });
  };

  const restart = () => {
    setPhoto(null);
    setSavedNote(false);
    diagnose.reset();
  };

  const saveObservation = async () => {
    if (!owned || !diagnosis) return;
    await logEvent({ id: `scan:${owned.plant.id}:${Date.now()}`, plantId: owned.plant.id, type: "observation", completedAt: new Date().toISOString(), source: "manual", note: scannerNote(diagnosis) });
    setSavedNote(true);
  };

  const canScan = account.signedIn && status.data?.available !== false && !noScansLeft;
  const frameLabel = diagnose.isPending ? "ANALYSE EN COURS" : photo ? "PHOTO PRÊTE" : "PRÊT À SCANNER";

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.terracotta }]}>OBSERVE, COMPRENDS, AGIS</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Scanner IA</Text>
          </View>
          <View style={[styles.aiPill, { backgroundColor: colors.leaf }]}><Text style={[styles.aiPillText, { color: colors.primary }]}>IA ✦</Text></View>
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Une photo pour identifier une pousse ou prendre soin d’une feuille malade.</Text>
        {account.signedIn && scan && <Text style={[styles.quota, { color: noScansLeft ? colors.terracotta : colors.primary }]}>{quotaLabel(scan)}</Text>}

        <View style={styles.cameraFrame}>
          {photo && <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Photo à analyser" />}
          {photo && <View style={[StyleSheet.absoluteFill, styles.photoShade]} />}
          <View style={styles.cameraTopRow}>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>{frameLabel}</Text></View>
            {photo && !diagnose.isPending && <Pressable onPress={restart} accessibilityLabel="Retirer la photo"><Text style={styles.cameraHint}>✕</Text></Pressable>}
          </View>
          <View style={styles.focusArea}>
            <View style={[styles.corner, styles.cornerTL]} /><View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} /><View style={[styles.corner, styles.cornerBR]} />
            {diagnose.isPending ? <ActivityIndicator size="large" color="#FFFFFF" /> : !photo && <Text style={styles.leafPreview}>🌿</Text>}
            {!photo && <Text style={styles.focusLabel}>{canScan ? "Photographie une feuille ou la plante entière" : account.signedIn ? " " : "Connecte-toi pour analyser tes plantes"}</Text>}
            {diagnose.isPending && <Text style={styles.focusLabel}>Nora observe les feuilles…</Text>}
          </View>
          <View style={styles.cameraBottomRow}>
            <Pressable disabled={!canScan || diagnose.isPending} onPress={() => void choose("library")} accessibilityLabel="Choisir dans la galerie" style={({ pressed }) => [styles.galleryButton, !canScan && styles.disabled, pressed && styles.pressed]}><Text style={styles.galleryIcon}>▧</Text></Pressable>
            {photo && !diagnose.isPending && !diagnosis ? (
              <Pressable onPress={analyze} accessibilityRole="button" style={({ pressed }) => [styles.analyzeButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={styles.analyzeText}>Analyser</Text></Pressable>
            ) : (
              <Pressable disabled={!canScan || diagnose.isPending} onPress={() => void choose("camera")} accessibilityRole="button" accessibilityLabel="Prendre une photo" style={({ pressed }) => [styles.shutterOuter, !canScan && styles.disabled, pressed && styles.pressed]}><View style={[styles.shutterInner, { backgroundColor: colors.terracotta }]} /></Pressable>
            )}
            <View style={styles.flashButton} />
          </View>
        </View>

        {notice && <Text style={[styles.notice, { color: colors.terracotta }]}>{notice}</Text>}
        {diagnose.error && <Text accessibilityRole="alert" style={[styles.notice, { color: colors.error }]}>{diagnose.error.message}</Text>}

        {!account.signedIn ? (
          <View style={[styles.helperCard, { backgroundColor: colors.cream }]}>
            <Text style={styles.helperIcon}>✦</Text>
            <View style={styles.helperCopy}>
              <Text style={[styles.helperTitle, { color: colors.foreground }]}>3 analyses offertes chaque mois.</Text>
              <Text style={[styles.helperText, { color: colors.muted }]}>Crée ton compte gratuit pour identifier tes plantes et savoir quoi faire quand une feuille jaunit.</Text>
              <Pressable onPress={() => router.push("/login")} style={({ pressed }) => [styles.inlineButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={styles.inlineButtonText}>Se connecter</Text></Pressable>
            </View>
          </View>
        ) : status.data?.available === false ? (
          <View style={[styles.helperCard, { backgroundColor: colors.cream }]}><Text style={styles.helperIcon}>✦</Text><View style={styles.helperCopy}><Text style={[styles.helperTitle, { color: colors.foreground }]}>Le scanner arrive bientôt.</Text><Text style={[styles.helperText, { color: colors.muted }]}>Il sera disponible dans une prochaine mise à jour.</Text></View></View>
        ) : diagnosis ? (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {!diagnosis.isPlant ? (
              <>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>Je ne vois pas de plante sur cette photo.</Text>
                <Text style={[styles.resultDescription, { color: colors.muted }]}>{diagnosis.summary}</Text>
              </>
            ) : (
              <>
                <View style={styles.resultHeader}>
                  <View style={[styles.resultIcon, { backgroundColor: colors.leaf }]}><Text style={styles.resultEmoji}>{entry?.emoji ?? HEALTH[diagnosis.health].emoji}</Text></View>
                  <View style={styles.resultTitleWrap}>
                    <Text style={[styles.resultKicker, { color: diagnosis.health === "healthy" ? colors.success : diagnosis.health === "sick" ? colors.terracotta : colors.primary }]}>{HEALTH[diagnosis.health].label}</Text>
                    <Text style={[styles.resultTitle, { color: colors.foreground }]}>{diagnosis.commonName || "Plante non identifiée"}</Text>
                    {!!diagnosis.scientificName && <Text style={[styles.scientific, { color: colors.muted }]}>{diagnosis.scientificName}</Text>}
                  </View>
                  <Text style={[styles.resultConfidence, { color: diagnosis.confidence === "high" ? colors.success : colors.muted }]}>{CONFIDENCE[diagnosis.confidence]}</Text>
                </View>
                <Text style={[styles.resultDescription, { color: colors.foreground }]}>{diagnosis.summary}</Text>
                {diagnosis.observations.length > 0 && (
                  <View style={styles.list}>{diagnosis.observations.map((observation, index) => <Text key={index} style={[styles.listItem, { color: colors.muted }]}>•  {observation}</Text>)}</View>
                )}
                {diagnosis.actions.length > 0 && (
                  <View style={styles.actions}>
                    <Text style={[styles.solutionTitle, { color: colors.primary }]}>À FAIRE</Text>
                    {diagnosis.actions.map((action, index) => (
                      <View key={index} style={styles.actionRow}>
                        <View style={[styles.actionNumber, { backgroundColor: colors.leaf }]}><Text style={[styles.actionNumberText, { color: colors.primary }]}>{index + 1}</Text></View>
                        <View style={styles.flex}><Text style={[styles.actionTitle, { color: colors.foreground }]}>{action.title}</Text><Text style={[styles.actionDetail, { color: colors.muted }]}>{action.detail}</Text></View>
                      </View>
                    ))}
                  </View>
                )}
                {!!diagnosis.naturalRemedy && (
                  <View style={[styles.naturalSolution, { backgroundColor: colors.cream }]}>
                    <Text style={[styles.solutionTitle, { color: colors.terracotta }]}>SOLUTION NATURELLE</Text>
                    <Text style={[styles.solutionText, { color: colors.foreground }]}>{diagnosis.naturalRemedy}</Text>
                  </View>
                )}
                {diagnosis.seeExpert && <Text style={[styles.expert, { color: colors.terracotta }]}>Ce problème mérite un œil expert : montre ta plante (ou cette photo) en jardinerie.</Text>}
                {entry && !owned && (
                  <Pressable onPress={() => void addPlant(entry.id)} style={({ pressed }) => [styles.inlineButton, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}><Text style={styles.inlineButtonText}>+ Ajouter {entry.name.toLowerCase()} à mon balcon</Text></Pressable>
                )}
                {owned && savedNote && (
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/garden/[id]", params: { id: owned.plant.id } })} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.historyLink, { color: colors.primary }]}>Voir l’historique de {owned.plant.nickname || owned.entry.name.toLowerCase()}  ›</Text></Pressable>
                )}
                {owned && (
                  <Pressable disabled={savedNote} onPress={() => void saveObservation()} style={({ pressed }) => [styles.inlineButton, { backgroundColor: savedNote ? colors.leaf : colors.primary }, pressed && styles.pressed]}><Text style={[styles.inlineButtonText, savedNote && { color: colors.primary }]}>{savedNote ? "✓ Noté dans l’historique" : `Noter ce diagnostic pour ${owned.plant.nickname || owned.entry.name}`}</Text></Pressable>
                )}
              </>
            )}
            <Pressable onPress={restart} style={({ pressed }) => [styles.rescanButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.rescanText, { color: colors.primary }]}>Scanner une autre plante</Text></Pressable>
            <Text style={[styles.disclaimer, { color: colors.muted }]}>Diagnostic indicatif généré par une IA : en cas de doute, demande conseil en jardinerie.</Text>
          </View>
        ) : (
          <View style={[styles.helperCard, { backgroundColor: colors.cream }]}>
            <Text style={styles.helperIcon}>✦</Text>
            <View style={styles.helperCopy}><Text style={[styles.helperTitle, { color: colors.foreground }]}>{noScansLeft ? "Tes analyses du mois sont utilisées." : "Pas besoin d’être expert."}</Text><Text style={[styles.helperText, { color: colors.muted }]}>{noScansLeft ? "En attendant, pose tes questions à Nora ou observe tes feuilles de près : dessous, tiges et terre." : "Balco privilégie toujours les soins naturels et les gestes qui respectent le vivant. Pour un bon diagnostic : une photo nette, en lumière naturelle, avec la feuille abîmée bien visible."}</Text></View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 30 },
  flex: { flex: 1 },
  quota: { fontSize: 11, fontWeight: "800", marginTop: 8 },
  photoShade: { backgroundColor: "rgba(20,53,43,0.28)" },
  disabled: { opacity: 0.4 },
  analyzeButton: { borderRadius: 22, paddingHorizontal: 28, height: 56, alignItems: "center", justifyContent: "center" },
  analyzeText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  notice: { fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 12 },
  inlineButton: { alignSelf: "flex-start", borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  historyLink: { fontSize: 13, fontWeight: "800", textAlign: "center", paddingVertical: 4 },
  inlineButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  scientific: { fontSize: 11, fontStyle: "italic", marginTop: 2 },
  list: { marginTop: 8, gap: 4 },
  listItem: { fontSize: 12, lineHeight: 18 },
  actions: { marginTop: 14, gap: 10 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionNumber: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionNumberText: { fontSize: 12, fontWeight: "800" },
  actionTitle: { fontSize: 13, fontWeight: "800" },
  actionDetail: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  expert: { fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 12 },
  disclaimer: { fontSize: 10, lineHeight: 14, marginTop: 10, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.15 },
  title: { fontSize: 29, lineHeight: 34, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  aiPill: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14 },
  aiPillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 320 },
  cameraFrame: { height: 390, borderRadius: 28, backgroundColor: "#20372C", marginTop: 19, padding: 17, overflow: "hidden", shadowColor: "#2E6B4D", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  cameraTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E69A7E" },
  liveText: { color: "rgba(255,255,255,0.8)", fontSize: 8, fontWeight: "800", letterSpacing: 0.9 },
  cameraHint: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "700" },
  focusArea: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  leafPreview: { fontSize: 78, opacity: 0.9, transform: [{ rotate: "-12deg" }] },
  focusLabel: { color: "rgba(255,255,255,0.74)", fontSize: 11, fontWeight: "700", marginTop: 15 },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "rgba(255,255,255,0.85)" },
  cornerTL: { top: 47, left: 17, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  cornerTR: { top: 47, right: 17, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  cornerBL: { bottom: 47, left: 17, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 47, right: 17, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },
  cameraBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  galleryButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.13)" },
  galleryIcon: { color: "#FFFFFF", fontSize: 22 },
  shutterOuter: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: "rgba(255,255,255,0.82)", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 52, height: 52, borderRadius: 26 },
  flashButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.13)" },
  flashIcon: { color: "#FFFFFF", fontSize: 21 },
  helperCard: { borderRadius: 20, padding: 16, marginTop: 16, flexDirection: "row", gap: 12, alignItems: "flex-start", shadowColor: "#C56D52", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  helperIcon: { color: "#C56D52", fontSize: 25 },
  helperCopy: { flex: 1 },
  helperTitle: { fontSize: 14, fontWeight: "800" },
  helperText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  resultCard: { borderRadius: 22, padding: 16, marginTop: 16, borderWidth: 1 },
  resultHeader: { flexDirection: "row", alignItems: "center" },
  resultIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resultEmoji: { fontSize: 24 },
  resultTitleWrap: { flex: 1, marginLeft: 11 },
  resultKicker: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  resultTitle: { fontSize: 15, fontWeight: "800", marginTop: 3 },
  resultConfidence: { fontSize: 10, fontWeight: "800", maxWidth: 80, textAlign: "right" },
  resultDescription: { fontSize: 12, lineHeight: 18, marginTop: 13 },
  naturalSolution: { borderRadius: 14, padding: 12, marginTop: 13 },
  solutionTitle: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  solutionText: { fontSize: 12, lineHeight: 18, fontWeight: "600", marginTop: 4 },
  rescanButton: { borderWidth: 1, borderRadius: 13, paddingVertical: 11, alignItems: "center", marginTop: 12 },
  rescanText: { fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
