/**
 * Le décor de l'accueil, en filigrane derrière tout l'écran : ton balcon vu de dehors.
 * Le ciel suit l'heure et la météo (pluie, flocons, orage, soleil, lune), la rambarde et
 * un pot par plante restent posés en bas de l'écran, et la liste défile par-dessus.
 * Les nuages et le soleil remontent plus lentement que la liste (effet de profondeur).
 * Animations lentes, arrêtées hors de l'écran ou si le téléphone demande moins d'animations.
 */
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";

import type { PotShape, SkyScene } from "@/lib/garden/sky";

const RAILING_HEIGHT = 58;
/** Hauteur du balcon posé en bas de l'écran : la liste garde cette marge pour finir au-dessus. */
export const BALCONY_FLOOR_HEIGHT = 96;

type Props = { scene: SkyScene; pots: PotShape[]; topInset: number; scrollY: Animated.Value };

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => active && setReduce(value))
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

/** Une valeur qui va de 0 à 1 en boucle, seulement pendant que l'écran est affiché. */
function useLoop(duration: number, enabled: boolean, easing: (value: number) => number = Easing.linear) {
  const value = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      value.setValue(0);
      const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }));
      loop.start();
      return () => loop.stop();
    }, [duration, easing, enabled, value]),
  );
  return value;
}

/** La même boucle, décalée : chaque goutte, nuage ou étoile a sa propre phase. */
function phased(value: Animated.Value, phase: number) {
  return Animated.modulo(Animated.add(value, phase), 1);
}

/** Petit générateur déterministe : la scène ne « saute » pas d'un rendu à l'autre. */
function seeded(count: number, seed: number) {
  let state = seed;
  return Array.from({ length: count }, () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  });
}

function parallax(scrollY: Animated.Value, distance: number) {
  return scrollY.interpolate({ inputRange: [0, 1200], outputRange: [0, -distance], extrapolate: "clamp" });
}

export function BalconySky({ scene, pots, topInset, scrollY }: Props) {
  const reduce = useReduceMotion();
  const animate = !reduce;
  const [size, setSize] = useState({ width: 390, height: 760 });
  const { width, height } = size;
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    if (nextWidth !== width || nextHeight !== height) setSize({ width: nextWidth, height: nextHeight });
  };

  const drift = useLoop(Math.round(90000 / (0.6 + scene.wind)), animate);
  const fall = useLoop(scene.particles === "snow" ? 14000 : 1800, animate && scene.particles !== null);
  const sway = useLoop(Math.round(3600 / (0.55 + scene.wind * 0.8)), animate, Easing.inOut(Easing.sin));
  const twinkle = useLoop(4200, animate && scene.stars);
  const pulse = useLoop(5200, animate && scene.body === "sun", Easing.inOut(Easing.sin));
  const flash = useLoop(6500, animate && scene.flash);

  const stars = useMemo(() => {
    const random = seeded(42, 7);
    return Array.from({ length: 14 }, (_, index) => ({ x: random[index] * width, y: topInset + random[14 + index] * height * 0.55, phase: random[28 + index], size: index % 4 === 0 ? 4 : 3 }));
  }, [height, topInset, width]);
  const drops = useMemo(() => {
    const count = scene.particles === "snow" ? 22 : 30;
    const random = seeded(count * 3, scene.particles === "snow" ? 11 : 3);
    return Array.from({ length: count }, (_, index) => ({ x: random[index] * width, phase: random[count + index], size: 3 + random[count * 2 + index] * 3 }));
  }, [scene.particles, width]);

  const night = scene.mood === "night";
  const cloudFill = scene.cloudTone === "dark" ? "#8E99A8" : scene.cloudTone === "grey" ? "#E4E9EE" : "#FFFFFF";
  const sunSize = scene.weather === "heat" ? 70 : 52;
  const sunX = width * 0.66;
  const sunY = topInset + 20;
  const swayDegrees = 2 + scene.wind * 9;
  const railColor = night ? "#4A5675" : "#35503F";
  const sunShift = parallax(scrollY, 260);
  const cloudShift = parallax(scrollY, 160);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={scene.gradient} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />

      {scene.stars && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: sunShift }] }]}>
          {stars.map((star, index) => (
            <Animated.View
              key={`star-${index}`}
              style={[styles.star, { left: star.x, top: star.y, width: star.size, height: star.size, borderRadius: star.size, opacity: animate ? phased(twinkle, star.phase).interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.75, 0.2] }) : 0.5 }]}
            />
          ))}
        </Animated.View>
      )}

      {scene.body === "sun" && (
        <Animated.View style={{ position: "absolute", left: sunX - sunSize, top: sunY - sunSize / 2, width: sunSize * 2, height: sunSize * 2, alignItems: "center", justifyContent: "center", opacity: 0.75, transform: [{ translateY: sunShift }] }}>
          <Animated.View style={[styles.halo, { width: sunSize * 1.9, height: sunSize * 1.9, borderRadius: sunSize, backgroundColor: scene.weather === "heat" ? "#FFC47D" : "#FFEAB0", transform: [{ scale: animate ? pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.08, 0.92] }) : 1 }] }]} />
          <View style={{ width: sunSize, height: sunSize, borderRadius: sunSize / 2, backgroundColor: scene.weather === "heat" ? "#FFB45A" : scene.mood === "evening" ? "#FFC194" : "#FFDD85" }} />
        </Animated.View>
      )}

      {scene.body === "moon" && (
        <Animated.View style={{ position: "absolute", left: sunX - 24, top: sunY, opacity: 0.8, transform: [{ translateY: sunShift }] }}>
          <Svg width={48} height={48}>
            <Path d="M32 6a18 18 0 1 0 9 32A15 15 0 0 1 32 6z" fill="#B7C0DC" />
          </Svg>
        </Animated.View>
      )}

      {Array.from({ length: scene.clouds + 1 }, (_, index) => {
        const phase = [0.15, 0.55, 0.85, 0.35][index];
        const top = topInset + [0.02, 0.2, 0.38, 0.55][index] * height;
        const scale = [1, 0.8, 1.25, 0.9][index];
        return (
          <Animated.View key={`cloud-${index}`} style={{ position: "absolute", top, left: 0, opacity: night ? 0.45 : 0.8, transform: [{ translateY: cloudShift }, { translateX: animate ? phased(drift, phase).interpolate({ inputRange: [0, 1], outputRange: [-150, width + 20] }) : phase * width }, { scale }] }}>
            <Svg width={120} height={48}>
              <Circle cx={34} cy={30} r={16} fill={cloudFill} />
              <Circle cx={58} cy={22} r={20} fill={cloudFill} />
              <Circle cx={84} cy={30} r={15} fill={cloudFill} />
              <Rect x={20} y={30} width={80} height={16} rx={8} fill={cloudFill} />
            </Svg>
          </Animated.View>
        );
      })}

      {scene.particles &&
        drops.map((drop, index) => {
          const progress = animate ? phased(fall, drop.phase) : null;
          const snow = scene.particles === "snow";
          return (
            <Animated.View
              key={`drop-${index}`}
              style={[
                snow ? { width: drop.size, height: drop.size, borderRadius: drop.size, backgroundColor: night ? "#C7CEE4" : "#FFFFFF", opacity: 0.95 } : { width: 1.6, height: 12, borderRadius: 1, backgroundColor: "#7F97B0", opacity: 0.4 },
                {
                  position: "absolute",
                  left: drop.x,
                  top: 0,
                  transform: [
                    { translateY: progress ? progress.interpolate({ inputRange: [0, 1], outputRange: [-20, height - BALCONY_FLOOR_HEIGHT + 20] }) : drop.phase * (height - BALCONY_FLOOR_HEIGHT) },
                    { translateX: progress && snow ? progress.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 8, 0, -8, 0] }) : 0 },
                    { rotate: snow ? "0deg" : `${Math.round(scene.wind * 18)}deg` },
                  ],
                },
              ]}
            />
          );
        })}

      {scene.flash && animate && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", opacity: flash.interpolate({ inputRange: [0, 0.9, 0.915, 0.93, 0.95, 0.97, 1], outputRange: [0, 0, 0.5, 0.1, 0.35, 0, 0] }) }]} />
      )}

      <View style={[styles.floor, { height: BALCONY_FLOOR_HEIGHT }]}>
        <Svg width={width} height={RAILING_HEIGHT} style={{ position: "absolute", left: 0, bottom: 8, opacity: 0.55 }}>
          <Rect x={0} y={4} width={width} height={5} rx={2.5} fill={railColor} opacity={0.55} />
          {Array.from({ length: Math.ceil(width / 18) }, (_, index) => (
            <Line key={`bar-${index}`} x1={9 + index * 18} y1={9} x2={9 + index * 18} y2={RAILING_HEIGHT - 6} stroke={railColor} strokeWidth={2} opacity={0.3} />
          ))}
          <Rect x={0} y={RAILING_HEIGHT - 8} width={width} height={4} rx={2} fill={railColor} opacity={0.4} />
        </Svg>
        {pots.map((shape, index) => {
          const slot = (index + 0.5) / pots.length;
          const left = pots.length === 1 ? width * 0.22 : width * (0.08 + slot * 0.84) - 28;
          const phase = (index * 0.37) % 1;
          return (
            <View key={`pot-${index}`} style={{ position: "absolute", left, bottom: 4, width: 56, alignItems: "center", opacity: 0.6 }}>
              <Animated.View
                style={{
                  width: 56,
                  height: 58,
                  marginBottom: -4,
                  transformOrigin: "bottom",
                  transform: [{ rotate: animate ? phased(sway, phase).interpolate({ inputRange: [0, 0.5, 1], outputRange: [`${-swayDegrees}deg`, `${swayDegrees}deg`, `${-swayDegrees}deg`] }) : "0deg" }],
                }}
              >
                <Foliage shape={shape} />
              </Animated.View>
              <Svg width={40} height={30}>
                <Rect x={1} y={0} width={38} height={7} rx={2} fill="#B9582E" />
                <Path d="M4 7 H36 L32 30 H8 Z" fill="#D2642A" />
                <Path d="M8 12 H33" stroke="#E07E4D" strokeWidth={1.5} opacity={0.6} />
              </Svg>
            </View>
          );
        })}
      </View>

      {/* Sous l'heure et la batterie, la liste disparaît derrière le ciel au lieu de passer dessous. */}
      <View style={[styles.statusStrip, { height: topInset, backgroundColor: scene.gradient[0] }]} />
    </View>
  );
}

const LEAF = "#3E8E57";
const LEAF_LIGHT = "#62AE70";

function Foliage({ shape }: { shape: PotShape }) {
  switch (shape) {
    case "flower":
      return (
        <Svg width={56} height={58}>
          <Path
            d="M28 58 C27 44 20 34 16 24 M28 58 C29 42 34 30 40 20 M28 58 V16"
            stroke={LEAF}
            strokeWidth={2}
            fill="none"
          />
          <Ellipse
            cx={22}
            cy={44}
            rx={7}
            ry={3.5}
            fill={LEAF_LIGHT}
            transform="rotate(-30 22 44)"
          />
          <Ellipse
            cx={35}
            cy={40}
            rx={7}
            ry={3.5}
            fill={LEAF}
            transform="rotate(30 35 40)"
          />
          <Circle cx={16} cy={22} r={6} fill="#E36A8F" />
          <Circle cx={40} cy={18} r={6} fill="#F0A93B" />
          <Circle cx={28} cy={12} r={6.5} fill="#9A7BDD" />
          <Circle cx={16} cy={22} r={2} fill="#FFF3C4" />
          <Circle cx={40} cy={18} r={2} fill="#FFF3C4" />
          <Circle cx={28} cy={12} r={2} fill="#FFF3C4" />
        </Svg>
      );
    case "tall":
      return (
        <Svg width={56} height={58}>
          <Line
            x1={36}
            y1={58}
            x2={36}
            y2={2}
            stroke="#9B7B5B"
            strokeWidth={2}
          />
          <Path
            d="M28 58 C26 40 30 24 28 8"
            stroke={LEAF}
            strokeWidth={2.2}
            fill="none"
          />
          <Ellipse
            cx={20}
            cy={42}
            rx={8}
            ry={4}
            fill={LEAF_LIGHT}
            transform="rotate(-25 20 42)"
          />
          <Ellipse
            cx={36}
            cy={32}
            rx={8}
            ry={4}
            fill={LEAF}
            transform="rotate(25 36 32)"
          />
          <Ellipse
            cx={20}
            cy={22}
            rx={7}
            ry={3.5}
            fill={LEAF}
            transform="rotate(-25 20 22)"
          />
          <Ellipse
            cx={34}
            cy={12}
            rx={6}
            ry={3}
            fill={LEAF_LIGHT}
            transform="rotate(25 34 12)"
          />
          <Circle cx={24} cy={30} r={4} fill="#E0472F" />
          <Circle cx={31} cy={38} r={3.5} fill="#E0472F" />
          <Circle cx={30} cy={20} r={3} fill="#F07A3A" />
        </Svg>
      );
    case "leafy":
      return (
        <Svg width={56} height={58}>
          <Path d="M28 58 C14 50 8 34 12 22 C22 30 27 44 28 58 Z" fill={LEAF} />
          <Path
            d="M28 58 C42 50 48 34 44 22 C34 30 29 44 28 58 Z"
            fill={LEAF}
          />
          <Path
            d="M28 58 C22 42 22 26 28 12 C34 26 34 42 28 58 Z"
            fill={LEAF_LIGHT}
          />
        </Svg>
      );
    case "berry":
      return (
        <Svg width={56} height={58}>
          <Circle cx={20} cy={40} r={12} fill={LEAF} />
          <Circle cx={36} cy={38} r={13} fill={LEAF_LIGHT} />
          <Circle cx={28} cy={26} r={13} fill={LEAF} />
          <Circle cx={22} cy={34} r={3} fill="#C2253F" />
          <Circle cx={34} cy={30} r={3} fill="#C2253F" />
          <Circle cx={30} cy={44} r={3} fill="#7A2F7C" />
        </Svg>
      );
    case "sprout":
      return (
        <Svg width={56} height={58}>
          <Path d="M28 58 V40" stroke={LEAF} strokeWidth={2.2} />
          <Ellipse
            cx={21}
            cy={38}
            rx={8}
            ry={4}
            fill={LEAF_LIGHT}
            transform="rotate(-25 21 38)"
          />
          <Ellipse
            cx={35}
            cy={36}
            rx={8}
            ry={4}
            fill={LEAF}
            transform="rotate(25 35 36)"
          />
        </Svg>
      );
    default:
      return (
        <Svg width={56} height={58}>
          <Circle cx={18} cy={44} r={11} fill={LEAF} />
          <Circle cx={38} cy={44} r={11} fill={LEAF} />
          <Circle cx={28} cy={32} r={13} fill={LEAF_LIGHT} />
          <Circle cx={20} cy={30} r={7} fill={LEAF} opacity={0.9} />
          <Circle cx={37} cy={28} r={7} fill={LEAF} opacity={0.9} />
        </Svg>
      );
  }
}

const styles = StyleSheet.create({
  star: { position: "absolute", backgroundColor: "#8C98C2" },
  halo: { position: "absolute", opacity: 0.45 },
  floor: { position: "absolute", left: 0, right: 0, bottom: 0 },
  statusStrip: { position: "absolute", top: 0, left: 0, right: 0 },
});
