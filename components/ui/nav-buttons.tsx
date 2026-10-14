/**
 * Le « × » et la flèche de retour de Balco (chantier « Cohérence », règle 6) : les mêmes partout.
 * `floating` : sur une photo (fiche plante), dans un rond blanc qui reste lisible.
 */
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

type NavButtonProps = { onPress: () => void; accessibilityLabel?: string; floating?: boolean; style?: StyleProp<ViewStyle> };

export function CloseButton({ onPress, accessibilityLabel = "Fermer", floating, style }: NavButtonProps) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.close, { backgroundColor: floating ? "rgba(255,255,255,0.92)" : colors.surface }, floating && styles.shadow, pressed && styles.pressed, style]}>
      <Text style={[styles.closeText, { color: colors.foreground }]}>×</Text>
    </Pressable>
  );
}

export function BackButton({ onPress, accessibilityLabel = "Retour", floating, style }: NavButtonProps) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.back, floating && [styles.floating, styles.shadow], pressed && styles.pressed, style]}>
      <IconSymbol name="chevron.left" size={26} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  close: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 20, fontWeight: "600", marginTop: -2 },
  back: { marginLeft: -8, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  floating: { marginLeft: 0, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.92)" },
  shadow: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  pressed: { opacity: 0.6 },
});
