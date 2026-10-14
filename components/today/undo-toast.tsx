import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/ui/typography";

import { useColors } from "@/hooks/use-colors";

/** `actionLabel` : le bouton à la place de « Annuler » (« Oui » après la récolte d'une plante récoltée en une fois). */
export type ToastMessage = { id: number; text: string; onUndo?: () => void; actionLabel?: string };

type UndoToastProps = { message: ToastMessage | null; onDone: () => void; bottom?: number };

const VISIBLE_MS = 5000;
/** Une question (« Tout récolté ? » avec « Oui ») reste plus longtemps : on a le temps de lire et de répondre. */
const QUESTION_VISIBLE_MS = 9000;

/**
 * Confirme une action (« Arrosage du thym noté ») et propose de l'annuler pendant 5 secondes. Le bouton est une vraie
 * pastille d'au moins 44 points de haut (retour du 14/10 : « Oui » trop petit et caché par la barre d'Android). Dans
 * une feuille du bas (fenêtre plein écran), passer `bottom` avec la marge du bas du téléphone.
 */
export function UndoToast({ message, onDone, bottom = 16 }: UndoToastProps) {
  const colors = useColors();
  const translate = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (!message) return;
    translate.setValue(80);
    Animated.spring(translate, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }).start();
    const timer = setTimeout(onDone, message.actionLabel ? QUESTION_VISIBLE_MS : VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onDone, translate]);

  if (!message) return null;
  return (
    <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, { bottom, backgroundColor: colors.foreground, transform: [{ translateY: translate }] }]}>
      <Text style={styles.text} numberOfLines={3}>{message.text}</Text>
      {message.onUndo && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message.actionLabel ?? "Annuler"}
          onPress={() => { message.onUndo?.(); onDone(); }}
          hitSlop={8}
          style={({ pressed }) => [styles.action, message.actionLabel ? { backgroundColor: colors.primary } : styles.actionQuiet, pressed && styles.pressed]}
        >
          <Text style={[styles.actionText, { color: message.actionLabel ? "#FFFFFF" : colors.foreground }]}>{message.actionLabel ?? "Annuler"}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", left: 16, right: 16, borderRadius: 14, paddingLeft: 16, paddingRight: 10, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  text: { flex: 1, color: "#FFFFFF", fontSize: 14, lineHeight: 19, fontWeight: "600" },
  action: { minHeight: 44, minWidth: 64, borderRadius: 22, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  actionQuiet: { backgroundColor: "#FFFFFF" },
  actionText: { fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.8 },
});
