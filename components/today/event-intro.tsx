import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { SeasonalEvent } from "@/lib/events/events";

const PARTICLES = 18;

/** Les guillemets restent collés à leurs mots (pas de « » » seul sur la dernière ligne). */
const keepQuotes = (text: string) => text.replace(/« /g, "«\u00A0").replace(/ »/g, "\u00A0»");

type Particle = { emoji: string; x: number; size: number; delay: number; duration: number; sway: number; spin: number };

/** Un tirage stable pour un même événement (les feuilles ne sautent pas à chaque rendu). */
function particles(event: SeasonalEvent, width: number): Particle[] {
  let value = event.id.length * 7919 + 17;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  return Array.from({ length: PARTICLES }, (_, index) => ({
    emoji: event.intro.particles[index % event.intro.particles.length],
    x: random() * width,
    size: 18 + random() * 14,
    delay: random() * 3200,
    duration: 4200 + random() * 2600,
    sway: 20 + random() * 30,
    spin: (random() - 0.5) * 360,
  }));
}

/** Une feuille (ou un flocon, un soleil…) qui tombe en se balançant, encore et encore tant que la carte est ouverte. */
function Falling({ particle, height }: { particle: Particle; height: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(fall, { toValue: 1, duration: particle.duration, easing: Easing.linear, useNativeDriver: true }));
    const timer = setTimeout(() => loop.start(), particle.delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [fall, particle]);
  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-60, height + 60] });
  const translateX = fall.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, particle.sway, 0, -particle.sway, 0] });
  const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${particle.spin}deg`] });
  const opacity = fall.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.Text style={[styles.particle, { left: particle.x, fontSize: particle.size, opacity, transform: [{ translateY }, { translateX }, { rotate }] }]}>
      {particle.emoji}
    </Animated.Text>
  );
}

/**
 * La grande carte d'arrivée d'un temps fort (Sainte-Catherine, Saints de glace…) : à la première ouverture de l'app
 * pendant l'événement, en plein écran, avec ce qui tombe du ciel (feuilles, flocons, soleils). « Voir ce qui se
 * plante » ouvre la page de l'événement, « Plus tard » la ferme ; la petite carte reste ensuite sur Aujourd'hui.
 */
export function EventIntro({ event, text, onOpen, onClose }: { event: SeasonalEvent | null; text: string; onOpen: () => void; onClose: () => void }) {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const falling = useMemo(() => (event ? particles(event, width) : []), [event, width]);

  useEffect(() => {
    if (!event) return;
    fade.setValue(0);
    card.setValue(0);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(card, { toValue: 1, delay: 120, useNativeDriver: true, damping: 11, stiffness: 140, mass: 0.9 }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, card, event, fade]);

  if (!event) return null;
  const close = (then: () => void) => Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => then());
  const translateY = card.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const scale = card.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const lift = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const tilt = bob.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] });

  return (
    <Animated.View accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.layer, { opacity: fade }]}>
      <Pressable accessibilityLabel="Fermer" accessibilityRole="button" onPress={() => close(onClose)} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {falling.map((particle, index) => (
          <Falling key={index} particle={particle} height={height} />
        ))}
      </View>
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View accessibilityLiveRegion="assertive" style={[styles.card, { backgroundColor: colors.background, transform: [{ translateY }, { scale }] }]}>
          <Animated.View style={[styles.emojiCircle, { backgroundColor: colors.leaf, transform: [{ translateY: lift }, { rotate: tilt }] }]}>
            <Text style={styles.emoji}>{event.emoji}</Text>
          </Animated.View>
          <Text style={[styles.kicker, { color: colors.primary }]}>Temps fort de l’année</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{event.title}</Text>
          {event.quote ? <Text style={[styles.quote, { color: colors.foreground }]}>{keepQuotes(event.quote)}</Text> : null}
          <Text style={[styles.text, { color: colors.muted }]}>{text}</Text>
          <Pressable accessibilityRole="button" onPress={() => close(onOpen)} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{event.intro.action}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => close(onClose)} style={({ pressed }) => [styles.later, pressed && styles.pressed]}>
            <Text style={[styles.laterText, { color: colors.muted }]}>Plus tard</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 60, elevation: 60, backgroundColor: "rgba(18,22,20,0.42)" },
  particle: { position: "absolute", top: 0 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  card: { width: "100%", maxWidth: 360, borderRadius: 28, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 16, alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  emojiCircle: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emoji: { fontSize: 56 },
  kicker: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", lineHeight: 32 },
  quote: { fontSize: 15, fontStyle: "italic", textAlign: "center", lineHeight: 21 },
  text: { fontSize: 15, textAlign: "center", lineHeight: 21 },
  primary: { alignSelf: "stretch", marginTop: 12, borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  later: { paddingVertical: 10, paddingHorizontal: 16 },
  laterText: { fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.8 },
});
