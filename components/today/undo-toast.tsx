import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/ui/typography";

import { useColors } from "@/hooks/use-colors";

/** `actionLabel` : le bouton à la place de « Annuler » (« Oui » après la récolte d'une plante récoltée en une fois). */
export type ToastMessage = { id: number; text: string; onUndo?: () => void; actionLabel?: string };

type UndoToastProps = { message: ToastMessage | null; onDone: () => void; bottom?: number };

const VISIBLE_MS = 5000;

/** Confirme une action (« Arrosage du thym noté ») et propose de l'annuler pendant 5 secondes. */
export function UndoToast({ message, onDone, bottom = 16 }: UndoToastProps) {
  const colors = useColors();
  const translate = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (!message) return;
    translate.setValue(80);
    Animated.spring(translate, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }).start();
    const timer = setTimeout(onDone, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onDone, translate]);

  if (!message) return null;
  return (
    <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, { bottom, backgroundColor: colors.foreground, transform: [{ translateY: translate }] }]}>
      <Text style={styles.text} numberOfLines={2}>{message.text}</Text>
      {message.onUndo && (
        <Pressable accessibilityRole="button" onPress={() => { message.onUndo?.(); onDone(); }} hitSlop={10}>
          <Text style={[styles.undo, { color: colors.sun }]}>{message.actionLabel ?? "Annuler"}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", left: 16, right: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  text: { flex: 1, color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  undo: { fontSize: 14, fontWeight: "800" },
});
