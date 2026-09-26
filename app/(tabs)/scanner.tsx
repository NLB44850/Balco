import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function ScannerScreen() {
  const colors = useColors();
  const [scanned, setScanned] = useState(false);

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.terracotta }]}>OBSERVE, COMPRENDS, AGIS</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Scanner IA</Text>
          </View>
          <View style={[styles.aiPill, { backgroundColor: colors.leaf }]}><Text style={[styles.aiPillText, { color: colors.primary }]}>IA ✦</Text></View>
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Une photo pour identifier une pousse ou prendre soin d’une feuille malade.</Text>

        <View style={styles.cameraFrame}>
          <View style={styles.cameraTopRow}>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>PRÊT À SCANNER</Text></View>
            <Text style={styles.cameraHint}>×1</Text>
          </View>
          <View style={styles.focusArea}>
            <View style={[styles.corner, styles.cornerTL]} /><View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} /><View style={[styles.corner, styles.cornerBR]} />
            <Text style={styles.leafPreview}>🌿</Text>
            <Text style={styles.focusLabel}>{scanned ? "FEUILLE ANALYSÉE" : "Place ta plante dans le cadre"}</Text>
          </View>
          <View style={styles.cameraBottomRow}>
            <Pressable onPress={() => setScanned(false)} style={({ pressed }) => [styles.galleryButton, pressed && styles.pressed]}><Text style={styles.galleryIcon}>▧</Text></Pressable>
            <Pressable onPress={() => setScanned(true)} accessibilityRole="button" style={({ pressed }) => [styles.shutterOuter, pressed && styles.pressed]}><View style={[styles.shutterInner, { backgroundColor: colors.terracotta }]} /></Pressable>
            <Pressable onPress={() => {}} style={({ pressed }) => [styles.flashButton, pressed && styles.pressed]}><Text style={styles.flashIcon}>✧</Text></Pressable>
          </View>
        </View>

        {scanned ? (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.resultIcon, { backgroundColor: colors.leaf }]}><Text style={styles.resultEmoji}>🌱</Text></View>
              <View style={styles.resultTitleWrap}><Text style={[styles.resultKicker, { color: colors.primary }]}>DIAGNOSTIC DOUX</Text><Text style={[styles.resultTitle, { color: colors.foreground }]}>Basilic · petites taches</Text></View>
              <Text style={[styles.resultConfidence, { color: colors.success }]}>92%</Text>
            </View>
            <Text style={[styles.resultDescription, { color: colors.muted }]}>Rien d’inquiétant : ta plante a probablement eu trop d’eau sur les feuilles.</Text>
            <View style={[styles.naturalSolution, { backgroundColor: colors.cream }]}>
              <Text style={[styles.solutionTitle, { color: colors.terracotta }]}>SOLUTION NATURELLE</Text>
              <Text style={[styles.solutionText, { color: colors.foreground }]}>Retire les feuilles touchées, espace les arrosages et vaporise un peu de décoction d’ail.</Text>
            </View>
            <Pressable onPress={() => setScanned(false)} style={({ pressed }) => [styles.rescanButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.rescanText, { color: colors.primary }]}>Scanner une autre plante</Text></Pressable>
          </View>
        ) : (
          <View style={[styles.helperCard, { backgroundColor: colors.cream }]}>
            <Text style={styles.helperIcon}>✦</Text>
            <View style={styles.helperCopy}><Text style={[styles.helperTitle, { color: colors.foreground }]}>Pas besoin d’être expert.</Text><Text style={[styles.helperText, { color: colors.muted }]}>Balco privilégie toujours les soins naturels et les gestes qui respectent le vivant.</Text></View>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingTop: 16, paddingBottom: 18 },
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
  resultConfidence: { fontSize: 13, fontWeight: "800" },
  resultDescription: { fontSize: 12, lineHeight: 18, marginTop: 13 },
  naturalSolution: { borderRadius: 14, padding: 12, marginTop: 13 },
  solutionTitle: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  solutionText: { fontSize: 12, lineHeight: 18, fontWeight: "600", marginTop: 4 },
  rescanButton: { borderWidth: 1, borderRadius: 13, paddingVertical: 11, alignItems: "center", marginTop: 12 },
  rescanText: { fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
