import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";

import { useColors } from "@/hooks/use-colors";
import type { TodayTone } from "@/lib/garden/today";

type TodayRowProps = {
  icon: string;
  tone: TodayTone;
  title: string;
  subtitle: string;
  done: boolean;
  /** Absent : ligne à lire seulement (mois à venir), avec une flèche vers le détail. */
  onToggle?: () => void;
  onOpen: () => void;
  checkLabel?: string;
  /** La photo de la plante concernée, à la place de l'icône quand il y en a une. */
  picture?: React.ReactNode;
};

/** Une ligne de la liste du jour : toucher la ligne ouvre le détail, toucher le rond valide le geste. */
/** Le cadre de la photo passée dans `picture` : même taille que l'icône. */
export const TODAY_ROW_PICTURE = { width: 40, height: 40, borderRadius: 12 } as const;

export function TodayRow({ icon, tone, title, subtitle, done, onToggle, onOpen, checkLabel, picture }: TodayRowProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const wasDone = useRef(done);

  // Retour immédiat : le rond « rebondit » quand le geste vient d'être validé.
  useEffect(() => {
    if (done && !wasDone.current) {
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 220 }).start();
    }
    wasDone.current = done;
  }, [done, scale]);

  const toneColor = tone === "frost" || tone === "rain" || tone === "storm" || tone === "wind" ? colors.frost : tone === "heat" ? colors.terracotta : colors.primary;
  const alert = tone === "frost" || tone === "storm" || tone === "wind" || tone === "heat";

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}, détail`} onPress={onOpen} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        {picture ?? <View style={[styles.icon, { backgroundColor: alert ? colors.frostSoft : colors.surface }]}><Text style={[styles.iconText, alert && { color: toneColor }]}>{icon}</Text></View>}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: done ? colors.muted : colors.foreground }, done && styles.doneTitle]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.subtitle, { color: alert && !done ? toneColor : colors.muted }, alert && !done && styles.subtitleStrong]} numberOfLines={1}>{subtitle}</Text>
        </View>
      </Pressable>
      {onToggle ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={checkLabel ?? (done ? "Annuler ce geste" : "Marquer comme fait")} onPress={onToggle} hitSlop={12} style={styles.checkZone}>
          <Animated.View style={[styles.check, { borderColor: done ? colors.primary : "rgba(18,22,20,0.22)", backgroundColor: done ? colors.primary : "rgba(255,255,255,0.6)", transform: [{ scale }] }]}>
            {done && <Text style={styles.checkMark}>✓</Text>}
          </Animated.View>
        </Pressable>
      ) : (
        <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 18 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "600", lineHeight: 21 },
  doneTitle: { textDecorationLine: "line-through" },
  subtitle: { fontSize: 13 },
  subtitleStrong: { fontWeight: "600" },
  checkZone: { paddingLeft: 12 },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  chevron: { fontSize: 24, fontWeight: "300", paddingLeft: 12 },
  checkMark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.6 },
});
