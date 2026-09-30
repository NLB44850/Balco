import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { pickPlantPhoto, type PreparedPhoto } from "@/lib/ai/photo";
import { quotaLabel } from "@/lib/ai/quota-text";
import { useGarden } from "@/lib/garden/garden-context";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { getCatalogPlant } from "@/lib/plants/catalog";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/routers";
import type { inferRouterOutputs } from "@trpc/server";

type Diagnosis = inferRouterOutputs<AppRouter>["ai"]["diagnose"]["diagnosis"];

const HEALTH = {
  healthy: { label: "En pleine forme", tone: "good" },
  needs_attention: { label: "À surveiller", tone: "watch" },
  sick: { label: "Besoin de soins", tone: "watch" },
  unknown: { label: "Diagnostic incertain", tone: "muted" },
} as const;

const TIPS = ["Une photo nette, sans bouger", "À la lumière du jour, sans flash", "La feuille abîmée bien visible, dessus et dessous"];
const CONFIDENCE = { high: "Confiance élevée", medium: "Confiance moyenne", low: "Confiance faible" } as const;

/** Ce qui reste dans l'historique de la plante : le constat et les gestes conseillés (500 caractères au plus côté serveur). */
function scannerNote(diagnosis: Diagnosis) {
  const actions = diagnosis.actions.map((action) => action.title).join(" · ");
  return `Scanner : ${diagnosis.summary}${actions ? ` À faire : ${actions}.` : ""}`.slice(0, 480);
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { account, resolvedPlants, addPlant, logEvent } = useGarden();
  const { addPhoto } = usePlantPhotos();
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
    // La photo rejoint le journal de la plante : on la verra grandir (et guérir) photo après photo.
    if (photo) await addPhoto(owned.plant.id, photo, "scanner").catch((error) => console.warn("[scanner] photo not kept", error));
    setSavedNote(true);
  };

  const busy = diagnose.isPending;
  const toneColor = (tone: "good" | "watch" | "muted") => (tone === "good" ? colors.primary : tone === "watch" ? colors.warning : colors.muted);
  const ownedName = owned ? owned.plant.nickname || owned.entry.name : "";

  /** Un message à la place de la prise de vue : pas connecté, pas encore disponible, plus d'analyse ce mois-ci. */
  const blocker = !account.signedIn
    ? { title: "3 analyses offertes chaque mois", text: "Crée ton compte gratuit pour reconnaître tes plantes et savoir quoi faire quand une feuille jaunit.", action: { label: "Se connecter", onPress: () => router.push("/login") } }
    : status.data?.available === false
      ? { title: "Bientôt disponible", text: "L’analyse des photos arrive dans une prochaine mise à jour." }
      : noScansLeft && !diagnosis
        ? { title: "Tes analyses du mois sont utilisées", text: "En attendant, pose ta question à Nora ou regarde tes feuilles de près : le dessous, les tiges et la terre.", action: { label: "Demander à Nora", onPress: () => router.push("/(tabs)/assistant") } }
        : null;

  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Observer" subtitle={account.signedIn && scan ? quotaLabel(scan) : "Une photo, et Nora te dit quoi faire"} />

        {blocker ? (
          <View style={[glass.card, styles.card]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{blocker.title}</Text>
            <Text style={[styles.text, { color: colors.muted }]}>{blocker.text}</Text>
            {blocker.action && (
              <Pressable accessibilityRole="button" onPress={blocker.action.onPress} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>{blocker.action.label}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          !diagnosis && (
            <View style={[glass.card, styles.card]}>
              {/* La zone photo : vide, elle ouvre l'appareil photo ; pleine, elle montre la photo à analyser. */}
              <Pressable accessibilityRole="button" accessibilityLabel={photo ? "Photo à analyser" : "Prendre une photo"} disabled={!!photo || busy} onPress={() => void choose("camera")} style={[styles.shot, !photo && { backgroundColor: colors.leaf, borderColor: "rgba(31,122,77,0.35)", borderStyle: "dashed", borderWidth: 1.5 }]}>
                {photo ? (
                  <>
                    <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
                    {busy && (
                      <View style={[StyleSheet.absoluteFill, styles.busy]}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.busyText}>Nora observe ta plante…</Text>
                      </View>
                    )}
                    {!busy && (
                      <Pressable accessibilityRole="button" accessibilityLabel="Retirer la photo" hitSlop={8} onPress={restart} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
                        <IconSymbol name="xmark" size={18} color={colors.foreground} />
                      </Pressable>
                    )}
                  </>
                ) : (
                  <>
                    <View style={[styles.shotIcon, { backgroundColor: colors.primary }]}><IconSymbol name="camera.fill" size={26} color="#FFFFFF" /></View>
                    <Text style={[styles.shotTitle, { color: colors.foreground }]}>Photographie ta plante</Text>
                    <Text style={[styles.shotText, { color: colors.muted }]}>La feuille abîmée de près, ou la plante entière pour la reconnaître.</Text>
                  </>
                )}
              </Pressable>

              {photo ? (
                <Pressable accessibilityRole="button" disabled={busy} onPress={analyze} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, busy && styles.disabled, pressed && styles.pressed]}>
                  <Text style={styles.primaryText}>{busy ? "Analyse en cours…" : "Analyser cette photo"}</Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => void choose("camera")} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <IconSymbol name="camera.fill" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Prendre une photo</Text>
                </Pressable>
              )}
              {!busy && (
                <Pressable accessibilityRole="button" onPress={() => void choose("library")} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                  <IconSymbol name="photo.on.rectangle" size={18} color={colors.primary} />
                  <Text style={[styles.secondaryText, { color: colors.primary }]}>{photo ? "Choisir une autre photo" : "Choisir dans ma galerie"}</Text>
                </Pressable>
              )}
            </View>
          )
        )}

        {notice && <Text accessibilityRole="alert" style={[styles.notice, { color: colors.warning }]}>{notice}</Text>}
        {diagnose.error && <Text accessibilityRole="alert" style={[styles.notice, { color: colors.error }]}>{diagnose.error.message}</Text>}

        {diagnosis ? (
          <View style={[glass.card, styles.card]}>
            {!diagnosis.isPlant ? (
              <>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Je ne vois pas de plante sur cette photo</Text>
                <Text style={[styles.text, { color: colors.muted }]}>{diagnosis.summary}</Text>
              </>
            ) : (
              <>
                <View style={styles.resultHeader}>
                  {photo && <Image source={{ uri: photo.uri }} style={styles.resultPhoto} accessibilityIgnoresInvertColors />}
                  <View style={styles.flex}>
                    <Text style={[styles.resultName, { color: colors.foreground }]}>{diagnosis.commonName || "Plante non identifiée"}</Text>
                    {!!diagnosis.scientificName && <Text style={[styles.scientific, { color: colors.muted }]}>{diagnosis.scientificName}</Text>}
                    <View style={styles.statusRow}>
                      <View style={[styles.dot, { backgroundColor: toneColor(HEALTH[diagnosis.health].tone) }]} />
                      <Text style={[styles.statusText, { color: toneColor(HEALTH[diagnosis.health].tone) }]}>{HEALTH[diagnosis.health].label}</Text>
                      <Text style={[styles.small, { color: colors.muted }]}>· {CONFIDENCE[diagnosis.confidence]}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.text, { color: colors.foreground }]}>{diagnosis.summary}</Text>
                {diagnosis.observations.length > 0 && (
                  <View style={styles.list}>{diagnosis.observations.map((observation, index) => <Text key={index} style={[styles.text, { color: colors.muted }]}>•  {observation}</Text>)}</View>
                )}
                {diagnosis.actions.length > 0 && (
                  <View style={styles.list}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>À faire</Text>
                    {diagnosis.actions.map((action, index) => (
                      <View key={index} style={styles.actionRow}>
                        <View style={[styles.actionNumber, { backgroundColor: colors.leaf }]}><Text style={[styles.actionNumberText, { color: colors.primary }]}>{index + 1}</Text></View>
                        <View style={styles.flex}>
                          <Text style={[styles.actionTitle, { color: colors.foreground }]}>{action.title}</Text>
                          <Text style={[styles.small, { color: colors.muted }]}>{action.detail}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {!!diagnosis.naturalRemedy && (
                  <View style={[styles.remedy, { backgroundColor: colors.leaf }]}>
                    <Text style={[styles.actionTitle, { color: colors.primary }]}>🌿 Solution naturelle</Text>
                    <Text style={[styles.text, { color: colors.foreground }]}>{diagnosis.naturalRemedy}</Text>
                  </View>
                )}
                {diagnosis.seeExpert && <Text style={[styles.text, { color: colors.warning, fontWeight: "600" }]}>Ce problème mérite un œil expert : montre ta plante (ou cette photo) en jardinerie.</Text>}
                {entry && !owned && (
                  <Pressable accessibilityRole="button" onPress={() => void addPlant(entry.id)} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                    <Text style={styles.primaryText}>Ajouter {entry.name.toLowerCase()} à mon balcon</Text>
                  </Pressable>
                )}
                {owned && (
                  <Pressable accessibilityRole="button" disabled={savedNote} onPress={() => void saveObservation()} style={({ pressed }) => [styles.primary, { backgroundColor: savedNote ? colors.leaf : colors.primary }, pressed && styles.pressed]}>
                    <Text style={[styles.primaryText, savedNote && { color: colors.primary }]}>{savedNote ? "✓ Noté dans sa fiche" : `Noter dans la fiche de ${ownedName}`}</Text>
                  </Pressable>
                )}
                {owned && savedNote && (
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/garden/[id]", params: { id: owned.plant.id } })} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                    <Text style={[styles.secondaryText, { color: colors.primary }]}>Voir la fiche de {ownedName} ›</Text>
                  </Pressable>
                )}
              </>
            )}
            <Pressable accessibilityRole="button" onPress={restart} style={({ pressed }) => [styles.outline, { borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>Observer une autre plante</Text>
            </Pressable>
            <Text style={[styles.small, { color: colors.muted, textAlign: "center" }]}>Diagnostic indicatif fait par une IA : en cas de doute, demande conseil en jardinerie.</Text>
          </View>
        ) : (
          !blocker && (
            <View style={styles.tips}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pour un bon diagnostic</Text>
              <View style={[glass.card, styles.tipsCard]}>
                {TIPS.map((tip, index) => (
                  <View key={tip} style={[styles.tipRow, index < TIPS.length - 1 && glass.line]}>
                    <View style={[styles.tipCheck, { backgroundColor: colors.leaf }]}><Text style={[styles.tipCheckText, { color: colors.primary }]}>✓</Text></View>
                    <Text style={[styles.text, styles.flex, { color: colors.foreground }]}>{tip}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.small, { color: colors.muted }]}>Nora propose toujours d’abord des gestes simples et des solutions naturelles.</Text>
            </View>
          )
        )}
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  flex: { flex: 1 },
  card: { padding: 16, gap: 12 },
  cardTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  text: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  shot: { height: 280, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  shotIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  shotTitle: { fontSize: 18, fontWeight: "800" },
  shotText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  busy: { backgroundColor: "rgba(18,22,20,0.45)", alignItems: "center", justifyContent: "center", gap: 12 },
  busyText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  remove: { position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)" },
  primary: { flexDirection: "row", gap: 8, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", textAlign: "center" },
  secondary: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  secondaryText: { fontSize: 15, fontWeight: "700" },
  outline: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  disabled: { opacity: 0.6 },
  notice: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  tips: { gap: 10 },
  tipsCard: { paddingHorizontal: 14 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  tipCheck: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tipCheckText: { fontSize: 14, fontWeight: "800" },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  resultPhoto: { width: 64, height: 64, borderRadius: 16 },
  resultName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  scientific: { fontSize: 13, fontStyle: "italic", marginTop: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: "700" },
  list: { gap: 8 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionNumberText: { fontSize: 14, fontWeight: "800" },
  actionTitle: { fontSize: 15, fontWeight: "700" },
  remedy: { borderRadius: 14, padding: 14, gap: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
