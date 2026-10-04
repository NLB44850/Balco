import { useEffect, useMemo, useRef } from "react";
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Affiché par-dessus la feuille (message « Annuler », fête), qui sinon le cacherait. */
  overlay?: React.ReactNode;
};

/** Au-delà de ce glissement vers le bas (ou d'un geste rapide), la feuille se replie. */
const CLOSE_DISTANCE = 90;

/**
 * Feuille qui monte du bas pour un détail. On la ferme en touchant le fond, avec le « × », ou en la
 * glissant vers le bas (depuis la poignée, ou depuis le contenu quand il est tout en haut). Elle ne
 * dépasse jamais l'écran : un contenu trop long défile à l'intérieur.
 */
export function BottomSheet({ visible, onClose, children, overlay }: BottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const drag = useRef(new Animated.Value(0)).current;
  const scrollTop = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      scrollTop.current = 0;
    }
  }, [drag, visible]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Un glissement vertical vers le bas replie la feuille, sauf si le contenu doit d'abord remonter.
        onMoveShouldSetPanResponderCapture: (_, gesture) => scrollTop.current <= 0 && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
        onPanResponderMove: (_, gesture) => drag.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > CLOSE_DISTANCE || gesture.vy > 0.9) {
            Animated.timing(drag, { toValue: height, duration: 180, useNativeDriver: true }).start(() => closeRef.current());
          } else {
            Animated.spring(drag, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [drag, height],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.backdrop} />
        <Animated.View
          {...pan.panHandlers}
          style={[styles.sheet, { backgroundColor: colors.background, maxHeight: height - insets.top - 48, transform: [{ translateY: drag }] }]}
        >
          <View style={styles.header}>
            <View style={[styles.grab, { backgroundColor: colors.border }]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" hitSlop={10} onPress={onClose} style={({ pressed }) => [styles.close, { backgroundColor: colors.surface }, pressed && styles.pressed]}>
              <Text style={[styles.closeText, { color: colors.foreground }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrollTop.current = event.nativeEvent.contentOffset.y;
            }}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          >
            {children}
          </ScrollView>
        </Animated.View>
        {overlay}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18, 22, 20, 0.4)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { height: 44, alignItems: "center", justifyContent: "center" },
  grab: { width: 40, height: 5, borderRadius: 3 },
  close: { position: "absolute", right: 14, top: 8, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 20, fontWeight: "600", marginTop: -2 },
  content: { paddingHorizontal: 20, gap: 14 },
  pressed: { opacity: 0.6 },
});
