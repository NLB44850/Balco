import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { PotSizeArt } from "@/components/pot-size-sheet";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { FirstPotsCard as Card } from "@/lib/garden/first-pots";
import type { PotSize } from "@/lib/plants/pot-size";

/**
 * « Vérifie le pot de 9 plantes » sur Aujourd'hui, juste après l'accueil (étape 3c) : une seule ligne, quel que soit le
 * nombre de plantes (14/10). Elle ouvre une feuille du bas : une ligne courte par plante, les pots à corriger d'abord,
 * chacune ouvre la fiche sur « Dans quel pot ? » ; « C'est bon » ferme la carte pour de bon.
 */
export function FirstPotsCard({ card, potSizes, onOpen, onDone }: { card: Card; potSizes: Record<string, PotSize>; onOpen: (plantId: string) => void; onDone: () => void }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const warn = card.lines.some((line) => line.tone === "small");
  const openPlant = (plantId: string) => {
    // La fiche s'ouvre une fois la feuille repliée.
    setOpen(false);
    setTimeout(() => onOpen(plantId), 320);
  };
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${card.title}, ${card.summary}`} onPress={() => setOpen(true)} style={({ pressed }) => [glass.card, styles.card, pressed && styles.pressed]}>
        <View style={[styles.icon, { backgroundColor: colors.leaf }]}><Text style={styles.iconText}>🪴</Text></View>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{card.title}</Text>
          <Text style={[styles.summary, { color: warn ? colors.warning : colors.muted }]} numberOfLines={1}>{card.summary}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{card.title}</Text>
          <Text style={[styles.sheetIntro, { color: colors.muted }]}>{card.intro}</Text>
          <View>
            {card.lines.map((line) => (
              <Pressable key={line.plantId} accessibilityRole="button" accessibilityLabel={`${line.name} : ${line.detail}`} onPress={() => openPlant(line.plantId)} style={({ pressed }) => [styles.line, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
                <PotSizeArt size={potSizes[line.plantId] ?? "unknown"} />
                <Text style={[styles.lineText, styles.flex]} numberOfLines={2}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{line.name}</Text>
                  <Text style={{ color: line.tone === "small" ? colors.warning : colors.muted }}>{`  ${line.detail}`}</Text>
                </Text>
                <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
              </Pressable>
            ))}
          </View>
          <Button label="C’est bon" onPress={() => { setOpen(false); onDone(); }} />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  flex: { flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 22 },
  title: { fontSize: 16, fontWeight: "700" },
  summary: { fontSize: 14, marginTop: 1 },
  chevron: { fontSize: 20 },
  sheet: { gap: 12 },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, lineHeight: 27 },
  sheetIntro: { fontSize: 15, lineHeight: 22 },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  lineText: { fontSize: 14, lineHeight: 19 },
  name: { fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
