/**
 * Les textes de Balco, en Onest (la police de la maquette). Chaque graisse est un fichier de
 * police à part : on choisit le bon fichier selon le fontWeight du style, puis on neutralise
 * fontWeight pour qu'Android ne rajoute pas un faux gras par-dessus.
 */
import { forwardRef } from "react";
import { Text as NativeText, TextInput as NativeTextInput, StyleSheet, type StyleProp, type TextInputProps, type TextProps, type TextStyle } from "react-native";

export const ONEST: Record<string, string> = {
  "100": "Onest_300Light",
  "200": "Onest_300Light",
  "300": "Onest_300Light",
  "400": "Onest_400Regular",
  normal: "Onest_400Regular",
  "500": "Onest_500Medium",
  "600": "Onest_600SemiBold",
  "700": "Onest_700Bold",
  bold: "Onest_700Bold",
  "800": "Onest_800ExtraBold",
  "900": "Onest_900Black",
};

/** Le style avec la bonne police Onest (sauf si l'écran en impose une autre). */
export function withOnest(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  const family = ONEST[String(flat.fontWeight ?? "400")] ?? ONEST["400"];
  return [style, { fontFamily: family, fontWeight: "normal" }];
}

export const Text = forwardRef<NativeText, TextProps>(function BalcoText({ style, ...props }, ref) {
  return <NativeText ref={ref} {...props} style={withOnest(style)} />;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function BalcoTextInput({ style, ...props }, ref) {
  return <NativeTextInput ref={ref} {...props} style={withOnest(style)} />;
});
