import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
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

/** Huit petites feuilles qui jaillissent du rond coché. */
const SPARKS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
  const distance = index % 2 ? 26 : 34;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, angle };
});

export function TodayRow({ icon, tone, title, subtitle, done, onToggle, onOpen, checkLabel, picture }: TodayRowProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const wasDone = useRef(done);

  // Retour immédiat : le rond « rebondit », une onde et des petites feuilles en jaillissent, la ligne s'illumine.
  useEffect(() => {
    if (done && !wasDone.current) {
      scale.setValue(0.4);
      burst.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 7, stiffness: 240 }),
        Animated.timing(burst, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
    wasDone.current = done;
  }, [burst, done, scale]);

  const flash = burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
  const ringScale = burst.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const ringOpacity = burst.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.55, 0] });
  const sparkOpacity = burst.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] });
  const sparkScale = burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.1, 0.5] });

  const toneColor = tone === "frost" || tone === "rain" || tone === "storm" || tone === "wind" ? colors.frost : tone === "heat" ? colors.terracotta : colors.primary;
  const alert = tone === "frost" || tone === "storm" || tone === "wind" || tone === "heat";

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Animated.View pointerEvents="none" style={[styles.flash, { backgroundColor: colors.leaf, opacity: flash }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}, détail`} onPress={onOpen} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        {picture ?? <View style={[styles.icon, { backgroundColor: alert ? colors.frostSoft : colors.surface }]}><Text style={[styles.iconText, alert && { color: toneColor }]}>{icon}</Text></View>}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: done ? colors.muted : colors.foreground }, done && styles.doneTitle]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.subtitle, { color: alert && !done ? toneColor : colors.muted }, alert && !done && styles.subtitleStrong]} numberOfLines={1}>{subtitle}</Text>
        </View>
      </Pressable>
      {onToggle ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={checkLabel ?? (done ? "Annuler ce geste" : "Marquer comme fait")} onPress={onToggle} hitSlop={12} style={styles.checkZone}>
          <View pointerEvents="none" style={styles.burst}>
            <Animated.View style={[styles.ring, { borderColor: colors.primary, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            {SPARKS.map((spark, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.spark,
                  {
                    backgroundColor: index % 2 ? "#4FA673" : colors.primary,
                    opacity: sparkOpacity,
                    transform: [
                      { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, spark.x] }) },
                      { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, spark.y] }) },
                      { rotate: `${spark.angle}rad` },
                      { scale: sparkScale },
                    ],
                  },
                ]}
              />
            ))}
          </View>
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
  flash: { position: "absolute", left: -12, right: -12, top: 0, bottom: 0, borderRadius: 12 },
  burst: { position: "absolute", right: 15, top: 15, width: 0, height: 0, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  spark: { position: "absolute", width: 11, height: 6, borderRadius: 3 },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  chevron: { fontSize: 24, fontWeight: "300", paddingLeft: 12 },
  checkMark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.6 },
});
