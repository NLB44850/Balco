import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/typography";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/use-colors";
import { dayKey } from "@/lib/garden/garden-logic";
import { celebrationStyle, type Celebration } from "@/lib/garden/progress";

export type CelebrationMessage = Celebration & { id: number };

type CelebrationBurstProps = { celebration: CelebrationMessage | null; onDone: () => void };

const VISIBLE_MS = 2800;
const PIECES = 28;
/** Les couleurs de l'app : le vert de marque, le vert tendre, l'orange chaud, et du blanc. */
const CONFETTI = ["#1F7A4D", "#B8E28A", "#D2642A", "#7FC29B", "#F2C94C"];

type Piece = { dx: number; dy: number; fall: number; spin: number; size: number; round: boolean; color: string; delay: number };

/** Un tirage stable pour une même fête (pas de confettis qui sautent à chaque rendu). */
function pieces(seed: number): Piece[] {
  let value = seed * 9301 + 49297;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  return Array.from({ length: PIECES }, (_, index) => {
    const angle = (index / PIECES) * Math.PI * 2 + random() * 0.4;
    const distance = 110 + random() * 120;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 60,
      fall: 120 + random() * 140,
      spin: (random() - 0.5) * 900,
      size: 7 + random() * 6,
      round: random() > 0.55,
      color: CONFETTI[index % CONFETTI.length],
      delay: random() * 120,
    };
  });
}

/**
 * La petite victoire en grand : une gerbe de confettis aux couleurs du balcon et une carte au milieu
 * de l'écran (nouveau badge, 1ʳᵉ récolte d'une plante). Se ferme toute seule, ou d'une touche.
 */
export function CelebrationBurst({ celebration, onDone }: CelebrationBurstProps) {
  const colors = useColors();
  const { height } = useWindowDimensions();
  const burst = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const confetti = useMemo(() => (celebration ? pieces(celebration.id) : []), [celebration]);

  useEffect(() => {
    if (!celebration) return;
    burst.setValue(0);
    card.setValue(0);
    fade.setValue(0);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(card, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 170, mass: 0.8 }),
      Animated.timing(burst, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => onDone());
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [burst, card, celebration, fade, onDone]);

  if (!celebration) return null;
  const scale = card.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const wobble = burst.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 1], outputRange: ["0deg", "-14deg", "12deg", "-8deg", "4deg", "0deg"] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, { opacity: fade }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${celebration.title}. ${celebration.detail}. Fermer`} onPress={onDone} style={[StyleSheet.absoluteFill, styles.center]}>
        <View pointerEvents="none" style={[styles.origin, { top: height * 0.42 }]}>
          {confetti.map((piece, index) => {
            const translateX = burst.interpolate({ inputRange: [0, 1], outputRange: [0, piece.dx] });
            // La gerbe monte, puis retombe doucement (un peu de gravité).
            const translateY = burst.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, piece.dy * 0.8, piece.dy + piece.fall] });
            const rotate = burst.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${piece.spin}deg`] });
            const opacity = burst.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] });
            return (
              <Animated.View
                key={index}
                style={[
                  styles.piece,
                  { width: piece.size, height: piece.round ? piece.size : piece.size * 0.5, borderRadius: piece.round ? piece.size / 2 : 2, backgroundColor: piece.color, opacity, transform: [{ translateX }, { translateY }, { rotate }] },
                ]}
              />
            );
          })}
        </View>
        <Animated.View accessibilityLiveRegion="assertive" style={[styles.card, { backgroundColor: colors.background, transform: [{ scale }] }]}>
          <Animated.View style={[styles.emojiCircle, { backgroundColor: colors.leaf, transform: [{ rotate: wobble }] }]}>
            <Text style={styles.emoji}>{celebration.emoji}</Text>
          </Animated.View>
          <Text style={[styles.title, { color: colors.foreground }]}>{celebration.title}</Text>
          <Text style={[styles.detail, { color: colors.muted }]}>{celebration.detail}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 50, elevation: 50, backgroundColor: "rgba(18,22,20,0.16)" },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  origin: { position: "absolute", left: "50%", width: 0, height: 0 },
  piece: { position: "absolute" },
  card: { width: "100%", maxWidth: 340, borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  emojiCircle: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emoji: { fontSize: 44 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", lineHeight: 28 },
  detail: { fontSize: 15, textAlign: "center", lineHeight: 21 },
});

const LAST_BIG_KEY = "balco.celebration.last-big-day.v1";
/** Partagé par tous les écrans : une seule grande fête par jour, où qu'elle ait lieu. */
let lastBigDay: string | null = null;
let lastBigLoaded = false;
void AsyncStorage.getItem(LAST_BIG_KEY)
  .then((stored) => {
    if (!lastBigLoaded) lastBigDay = stored;
    lastBigLoaded = true;
  })
  .catch(() => undefined);

/**
 * La fête à poser au-dessus de l'écran. `celebrate(celebrationFor(...))` lance le plein écran pour un
 * nouveau badge ou une 1ʳᵉ récolte (au plus une fois par jour) et renvoie sinon le mot à mettre devant
 * le message du bas (« 🔥 3 jours de suite »), ou rien quand il n'y a rien à fêter.
 */
export function useCelebration() {
  const [message, setMessage] = useState<CelebrationMessage | null>(null);
  const id = useRef(0);
  const celebrate = useCallback((celebration: Celebration | null): string | null => {
    const now = new Date();
    const style = celebrationStyle(celebration, lastBigDay, now);
    if (!celebration || !style.big) return style.line;
    lastBigDay = dayKey(now);
    lastBigLoaded = true;
    void AsyncStorage.setItem(LAST_BIG_KEY, lastBigDay).catch(() => undefined);
    id.current += 1;
    setMessage({ ...celebration, id: id.current });
    return null;
  }, []);
  const hide = useCallback(() => setMessage(null), []);
  return { celebrate, overlay: <CelebrationBurst celebration={message} onDone={hide} /> };
}
