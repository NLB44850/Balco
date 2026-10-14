/**
 * Le bouton de Balco (chantier « Cohérence », règles dans docs/chantier-coherence.md). Quatre sortes, partout les mêmes :
 * - `primary` : vert plein, l'action principale de l'écran ou de la feuille (une seule) ;
 * - `secondary` : encadré, une action à côté de la principale ;
 * - `link` : texte vert suivi de « › », pour aller voir quelque chose ;
 * - `remove` : encadré, texte rouge : retirer quelque chose qu'on peut remettre (« Annuler » dans le message du bas) ;
 * - `danger` : rouge plein, seulement pour ce qu'on ne peut pas récupérer (supprimer son compte).
 * `small` : la même chose en petite pastille, dans une carte ou une ligne. Plus de bouton noir. Texte à l'infinitif (« Ajouter une plante »).
 */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

export type ButtonVariant = "primary" | "secondary" | "remove" | "link" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Un emoji ou une icône devant le texte. */
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Lien : sans le « › » final (rare : un lien qui ne mène nulle part, comme « Revenir au texte de Balco »). */
  noChevron?: boolean;
  /** Lien : centré sous un bouton (par défaut aligné à gauche). */
  center?: boolean;
  /** Petite pastille dans une carte ou une ligne (« Ajouter », « Choisir ma ville ») au lieu d'un bouton pleine largeur. */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = "primary", icon, disabled, accessibilityLabel, noChevron, center, small, style }: ButtonProps) {
  const colors = useColors();
  if (variant === "link") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (noChevron ? label : `${label} ›`)}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [styles.link, center && styles.center, disabled && styles.disabled, pressed && styles.pressedLink, style]}
      >
        <Text style={[styles.linkText, { color: colors.primary }]}>
          {label}
          {noChevron ? "" : " ›"}
        </Text>
      </Pressable>
    );
  }
  const filled = variant === "primary" || variant === "danger";
  const background = variant === "primary" ? colors.primary : variant === "danger" ? colors.error : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, small && styles.small, { backgroundColor: background }, !filled && { borderColor: colors.border, borderWidth: 1.5 }, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      <View style={styles.row}>
        {icon}
        <Text style={[styles.text, small && styles.smallText, { color: filled ? "#FFFFFF" : variant === "remove" ? colors.error : colors.foreground }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Le même retour au toucher pour tout ce qui se touche (cartes, lignes, pastilles). */
export const PRESSED = { opacity: 0.78, transform: [{ scale: 0.98 }] } as const;

const styles = StyleSheet.create({
  button: { borderRadius: 16, minHeight: 52, paddingHorizontal: 18, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  small: { borderRadius: 999, minHeight: 36, paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start" },
  smallText: { fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  text: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  link: { alignSelf: "flex-start", paddingVertical: 6 },
  center: { alignSelf: "center" },
  linkText: { fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  pressed: PRESSED,
  pressedLink: { opacity: 0.6 },
});
