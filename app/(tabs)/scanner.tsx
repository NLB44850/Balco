import { afterColon } from "@/lib/plants/grammar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/button";
import { NaturalRemedyCard } from "@/components/natural-remedy-card";
import { remedyFor } from "@/lib/plants/natural-remedies";
import { Text } from "@/components/ui/typography";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { CAMERA_INTERRUPTED_MESSAGE, takeCameraInterrupted } from "@/lib/ai/camera-interrupt";
import { onPendingPhoto, photoPreviewUri, takePendingPhoto, type PendingPhoto } from "@/lib/ai/pending-photo";
import { pickPlantPhoto, type PreparedPhoto } from "@/lib/ai/photo";
import { quotaLabel } from "@/lib/ai/quota-text";
import { useGarden } from "@/lib/garden/garden-context";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { getCatalogPlant } from "@/lib/plants/catalog";
import { PLANS, plusQuotaHint } from "@/lib/plans";
import { deviceId as loadDeviceId } from "@/lib/sync/device-id";
import { aiErrorText, SCAN_CONNECTION_LOST } from "@/lib/ai/error-text";
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

/** Ce que donne une analyse, montré à qui n'a plus d'analyse sans compte : on voit ce qu'on gagne. */
const EXAMPLE = {
  name: "Basilic",
  health: "À surveiller",
  summary: "Les feuilles du bas jaunissent : la terre reste trop humide.",
  actions: ["Laisse sécher la terre sur 2 cm avant d’arroser", "Vide la soucoupe après chaque arrosage"],
};

const TIPS = ["Une photo nette, sans bouger", "À la lumière du jour, sans flash", "La feuille abîmée bien visible, dessus et dessous"];
const CONFIDENCE = { high: "Confiance élevée", medium: "Confiance moyenne", low: "Confiance faible" } as const;

/** Ce qui reste dans l'historique de la plante : le constat et les gestes conseillés (500 caractères au plus côté serveur). */
function scannerNote(diagnosis: Diagnosis) {
  const actions = diagnosis.actions.map((action) => action.title).join(" · ");
  const remedy = remedyFor(diagnosis.problem);
  return `Scanner : ${afterColon(diagnosis.summary)}${actions ? ` À faire : ${afterColon(actions)}.` : ""}${remedy ? ` Traitement naturel : ${remedy.name}.` : ""}`.slice(0, 480);
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { account, resolvedPlants, addPlant, logEvent } = useGarden();
  const { addPhoto } = usePlantPhotos();
  const status = trpc.ai.status.useQuery(undefined, { enabled: account.signedIn, retry: false });
  const utils = trpc.useUtils();
  // Sans compte : une analyse offerte par appareil, comptée par le serveur.
  const [device, setDevice] = useState<string | null>(null);
  useEffect(() => {
    void loadDeviceId().then(setDevice);
  }, []);
  const guestStatus = trpc.ai.guestStatus.useQuery({ deviceId: device ?? "" }, { enabled: !account.signedIn && !!device, retry: false });
  const signedDiagnose = trpc.ai.diagnose.useMutation({ onSuccess: () => void utils.ai.status.invalidate() });
  const guestDiagnose = trpc.ai.diagnoseGuest.useMutation({ onSuccess: () => void utils.ai.guestStatus.invalidate() });
  const diagnose = account.signedIn ? signedDiagnose : guestDiagnose;
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);

  const scan = status.data?.scan;
  const noScansLeft = scan ? scan.remaining <= 0 : false;
  const diagnosis: Diagnosis | undefined = diagnose.data?.diagnosis;
  const entry = diagnosis?.catalogId ? getCatalogPlant(diagnosis.catalogId) : undefined;
  // Étape 8b : le problème reconnu par Observer ouvre le traitement naturel vérifié de Balco.
  const remedy = remedyFor(diagnosis?.problem);
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
    if (account.signedIn) signedDiagnose.mutate({ imageBase64: photo.base64 });
    else if (device) guestDiagnose.mutate({ imageBase64: photo.base64, deviceId: device });
  };

  const restart = () => {
    setPhoto(null);
    setSavedNote(false);
    setNotice(null);
    diagnose.reset();
  };

  // Observer reste monté en arrière-plan (c'est un onglet caché) : en le quittant, on repart de zéro
  // pour retrouver la prise de vue au retour. Seule exception, une analyse encore en cours : son
  // résultat (déjà décompté) attend au retour, et sera effacé en quittant la fois suivante.
  const pending = useRef(false);
  pending.current = diagnose.isPending;
  const restartRef = useRef(restart);
  restartRef.current = restart;
  const receiveRef = useRef((fromHome: PendingPhoto) => {
    restartRef.current();
    if (fromHome.status === "ok") setPhoto(fromHome.photo);
    else setNotice("Ta photo n’a pas pu être préparée. Reprends-la, ou choisis-la dans ta galerie.");
  });
  useFocusEffect(
    useCallback(() => {
      // Page rechargée par le navigateur pendant la prise de vue : on explique quoi faire.
      if (takeCameraInterrupted()) setNotice(CAMERA_INTERRUPTED_MESSAGE);
      // Photo prise depuis le bouton appareil photo de l'accueil : prête à analyser (en arrivant, ou dès
      // qu'elle arrive si Observer est déjà ouvert).
      const fromHome = takePendingPhoto();
      if (fromHome) receiveRef.current(fromHome);
      const unsubscribe = onPendingPhoto((photo) => receiveRef.current(photo));
      return () => {
        unsubscribe();
        if (!pending.current) restartRef.current();
      };
    }, []),
  );

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

  const monthly = PLANS.free.aiQuota.scan > 1 ? `${PLANS.free.aiQuota.scan} analyses offertes chaque mois` : "une analyse offerte chaque mois";
  const guest = guestStatus.data;
  const guestUsed = !account.signedIn && guest?.available !== false && !guest?.paused && guest?.scanLeft === false;
  /** Un message à la place de la prise de vue : analyse sans compte utilisée, pas encore disponible, en pause, plus d'analyse ce mois-ci. */
  const blocker = !account.signedIn
    ? guest?.available === false
      ? { title: "Bientôt disponible", text: "L’analyse des photos arrive dans une prochaine mise à jour." }
      : guest?.paused && !diagnosis
        ? { title: "L’analyse fait une pause", text: guest.paused }
        : guestUsed && !diagnosis
          ? { title: "Ton analyse offerte est utilisée", text: `Crée ton compte gratuit : ${monthly}, et Balco garde chaque diagnostic dans la fiche de ta plante.`, example: true, action: { label: "Créer mon compte", onPress: () => router.push("/login") } }
          : null
    : status.data?.available === false
      ? { title: "Bientôt disponible", text: "L’analyse des photos arrive dans une prochaine mise à jour." }
      : status.data?.paused && !diagnosis
        ? { title: "L’analyse fait une pause", text: status.data.paused }
      : noScansLeft && !diagnosis
        ? { title: "Tes analyses du mois sont utilisées", text: `En attendant, pose ta question à Nora ou regarde tes feuilles de près : le dessous, les tiges et la terre.${status.data?.plan === "free" ? ` ${plusQuotaHint("scan")}` : ""}`, action: { label: "Demander à Nora", onPress: () => router.push("/(tabs)/assistant") }, plus: status.data?.plan === "free" }
        : null;

  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Observer" subtitle={account.signedIn && scan ? quotaLabel(scan) : !account.signedIn && guest?.scanLeft ? "1 analyse offerte, sans compte" : "Une photo, et Nora te dit quoi faire"} />

        {blocker ? (
          <View style={[glass.card, styles.card]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{blocker.title}</Text>
            <Text style={[styles.text, { color: colors.muted }]}>{blocker.text}</Text>
            {"example" in blocker && blocker.example && (
              <View accessibilityLabel="Exemple de résultat" style={[styles.example, { borderColor: colors.border }]}>
                <Text style={[styles.small, { color: colors.muted }]}>Exemple de résultat</Text>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>{EXAMPLE.name} · <Text style={{ color: colors.warning }}>{EXAMPLE.health}</Text></Text>
                <Text style={[styles.small, { color: colors.foreground }]}>{EXAMPLE.summary}</Text>
                {EXAMPLE.actions.map((action, index) => <Text key={action} style={[styles.small, { color: colors.muted }]}>{index + 1}. {action}</Text>)}
              </View>
            )}
            {blocker.action && (
              <Button label={blocker.action.label} onPress={blocker.action.onPress} />
            )}
            {/* Étape 10 : la 2ᵉ photo du mois ouvre l'écran Balco+. */}
            {"plus" in blocker && blocker.plus && (
              <Button variant="link" center label="Découvrir Balco+" onPress={() => router.push({ pathname: "/plus", params: { from: "photo" } })} />
            )}
          </View>
        ) : (
          !diagnosis && (
            <View style={[glass.card, styles.card]}>
              {/* La zone photo : vide, elle ouvre l'appareil photo ; pleine, elle montre la photo à analyser. Deux vues
                  distinctes (clé) : sur Android, la zone qui perdait sa bordure pointillée n'affichait plus rien dedans. */}
              <Pressable key={photo ? "photo" : "empty"} accessibilityRole="button" accessibilityLabel={photo ? "Photo à analyser" : "Prendre une photo"} disabled={!!photo || busy} onPress={() => void choose("camera")} style={[styles.shot, !photo && { backgroundColor: colors.leaf, borderColor: "rgba(31,122,77,0.35)", borderStyle: "dashed", borderWidth: 1.5 }]}>
                {photo ? (
                  <>
                    {/* expo-image, avec les données de la photo : le fichier en cache restait vide sur Android pour la photo prise depuis l'accueil. */}
                    <Image key={photo.uri} source={{ uri: photoPreviewUri(photo) }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
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
                <Button label={busy ? "Analyse en cours…" : "Analyser cette photo"} disabled={busy} onPress={analyze} />
              ) : (
                <Button label="Prendre une photo" icon={<IconSymbol name="camera.fill" size={18} color="#FFFFFF" />} onPress={() => void choose("camera")} />
              )}
              {!busy && (
                <Button variant="secondary" label={photo ? "Choisir une autre photo" : "Choisir dans ma galerie"} icon={<IconSymbol name="photo.on.rectangle" size={18} color={colors.foreground} />} onPress={() => void choose("library")} />
              )}
            </View>
          )
        )}

        {notice && <Text accessibilityRole="alert" style={[styles.notice, { color: colors.warning }]}>{notice}</Text>}
        {diagnose.error && <Text accessibilityRole="alert" style={[styles.notice, { color: colors.error }]}>{aiErrorText(diagnose.error, SCAN_CONNECTION_LOST)}</Text>}

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
                  {photo && <Image source={{ uri: photoPreviewUri(photo) }} style={styles.resultPhoto} contentFit="cover" accessibilityIgnoresInvertColors />}
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
                {remedy && <NaturalRemedyCard remedy={remedy} edible={entry?.category !== "flower"} />}
                {!remedy && !!diagnosis.naturalRemedy && (
                  <View style={[styles.remedy, { backgroundColor: colors.leaf }]}>
                    <Text style={[styles.actionTitle, { color: colors.primary }]}>🌿 Solution naturelle</Text>
                    <Text style={[styles.text, { color: colors.foreground }]}>{diagnosis.naturalRemedy}</Text>
                  </View>
                )}
                {diagnosis.seeExpert && <Text style={[styles.text, { color: colors.warning, fontWeight: "600" }]}>Ce problème mérite un œil expert : montre ta plante (ou cette photo) en jardinerie.</Text>}
                {entry && !owned && (
                  <Button label={`Ajouter ${entry.name.toLowerCase()} à mon balcon`} onPress={() => void addPlant(entry.id)} />
                )}
                {owned && (
                  <Button label={savedNote ? "✓ Noté dans sa fiche" : `Noter dans la fiche de ${ownedName}`} disabled={savedNote} onPress={() => void saveObservation()} />
                )}
                {owned && savedNote && (
                  <Button variant="link" center label={`Voir la fiche de ${ownedName}`} onPress={() => router.push({ pathname: "/garden/[id]", params: { id: owned.plant.id } })} />
                )}
              </>
            )}
            {!account.signedIn ? (
              <View style={[styles.remedy, { backgroundColor: colors.leaf }]}>
                <Text style={[styles.actionTitle, { color: colors.primary }]}>Garde ce diagnostic</Text>
                <Text style={[styles.small, { color: colors.foreground }]}>Avec un compte gratuit : {monthly}, le suivi de tes plantes et Nora qui répond à tes questions.</Text>
                <Button label="Créer mon compte gratuit" onPress={() => router.push("/login")} />
              </View>
            ) : (
              <Button variant="secondary" label="Observer une autre plante" onPress={restart} />
            )}
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
  example: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4, backgroundColor: "rgba(255,255,255,0.6)" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
