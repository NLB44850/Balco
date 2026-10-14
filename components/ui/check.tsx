/**
 * La case de Balco (chantier « Cohérence », règle 6) : la même taille partout.
 * - `round` : un geste fait (Aujourd'hui, préparatifs des vacances, étapes du pas-à-pas) ;
 * - `square` : une option qu'on choisit, plusieurs possibles (plantes suivies, « Me le reproposer au printemps », envies) ;
 * - `radio` : un seul choix possible parmi plusieurs (rond avec un point, comme dans Réglages).
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

export const CHECK_SIZE = 28;

export function Check({ checked, shape = "square", style }: { checked: boolean; shape?: "round" | "square" | "radio"; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.check,
        shape === "square" ? styles.square : styles.round,
        { borderColor: checked ? colors.primary : "rgba(18,22,20,0.22)", backgroundColor: checked && shape !== "radio" ? colors.primary : "rgba(255,255,255,0.6)" },
        style,
      ]}
    >
      {checked && (shape === "radio" ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : <Text style={styles.mark}>✓</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  check: { width: CHECK_SIZE, height: CHECK_SIZE, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  round: { borderRadius: CHECK_SIZE / 2 },
  square: { borderRadius: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  mark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: -1 },
});
