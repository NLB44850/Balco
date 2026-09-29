/**
 * Le décor de l'accueil : la lumière du soleil sur ton balcon. Derrière la liste, on voit
 * les ombres de la rambarde, d'une plante grimpante et de chacune de tes plantes en pot.
 * Les feuillages se balancent avec le vent, les ombres changent de côté l'après-midi,
 * s'effacent au passage des nuages, et la pluie laisse des gouttes sur la vitre.
 * Les ombres sont peintes en avance (scripts/art/ombres-balcon.mjs) puis teintées et animées.
 * Animations lentes, arrêtées hors de l'écran ou si le téléphone demande moins d'animations.
 */
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { PLANT_SHADOWS as PLANTS } from "@/components/plant-shadows";
import type { PotShape, SkyScene } from "@/lib/garden/sky";

/** La liste garde cette marge en bas pour finir au-dessus des plantes en pot. */
export const BALCONY_FLOOR_HEIGHT = 96;

const LEAVES_NEAR = require("@/assets/images/balcony/leaves-near.png");
const LEAVES_FAR = require("@/assets/images/balcony/leaves-far.png");
const RAILING = require("@/assets/images/balcony/railing.png");
const DROPS = [require("@/assets/images/balcony/drop-small.png"), require("@/assets/images/balcony/drop-medium.png"), require("@/assets/images/balcony/drop-large.png")];
/** Dans l'image d'une plante (carrée), le pot est centré à 200/560 et son pied à 90 % de la hauteur. */
const POT_CENTER = 200 / 560;
const POT_FOOT = 0.9;

type Props = {
  scene: SkyScene;
  /** Écrans autres que l'accueil : seulement la lumière et le feuillage, plus discrets. */
  quiet?: boolean;
  pots?: PotShape[];
  topInset: number;
  scrollY?: Animated.Value;
};

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

/** La même boucle, décalée : chaque feuillage ou goutte a sa propre phase. */
function phased(value: Animated.Value, phase: number) {
  return Animated.modulo(Animated.add(value, phase), 1);
}

/** Un aller-retour doux (départ → arrivée → départ) sur une boucle. */
function swing<T extends number | string>(value: Animated.Animated & { interpolate: Animated.Value["interpolate"] }, from: T, to: T) {
  return value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [from, to, from] as number[] | string[] });
}

/** Petit générateur déterministe : le décor ne « saute » pas d'un rendu à l'autre. */
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

const STILL = new Animated.Value(0);

export function BalconySky({ scene, quiet = false, pots = [], topInset, scrollY = STILL }: Props) {
  const reduce = useReduceMotion();
  const animate = !reduce;
  const [size, setSize] = useState({ width: 390, height: 760 });
  const { width, height } = size;
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    if (nextWidth !== width || nextHeight !== height) setSize({ width: nextWidth, height: nextHeight });
  };

  const breeze = Math.round(7000 / (0.6 + scene.wind));
  const swayNear = useLoop(breeze, animate, Easing.inOut(Easing.sin));
  const swayFar = useLoop(Math.round(breeze * 1.45), animate, Easing.inOut(Easing.sin));
  const drift = useLoop(24000, animate, Easing.inOut(Easing.sin));
  const clouds = useLoop(21000, animate && scene.passingClouds, Easing.inOut(Easing.quad));
  const particles = quiet ? null : scene.particles;
  const fall = useLoop(particles === "snow" ? 16000 : 30000, animate && particles !== null);
  const flash = useLoop(7000, animate && scene.flash && !quiet);

  const drops = useMemo(() => {
    const count = scene.particles === "snow" ? 24 : 16;
    const random = seeded(count * 3, scene.particles === "snow" ? 11 : 5);
    return Array.from({ length: count }, (_, index) => ({ x: random[index] * width, phase: random[count + index], pick: random[count * 2 + index] }));
  }, [scene.particles, width]);

  const s = scene.shadow * (quiet ? 0.7 : 1);
  const flip = scene.mirrored ? -1 : 1;
  const stretch = scene.lowSun ? 1.12 : 1;
  const angle = 1.2 + scene.wind * 3;
  const tint = { tintColor: scene.shadowTint };
  // Des nuages de passage : toutes les ombres pâlissent puis reviennent, doucement.
  const shade = scene.passingClouds && animate ? swing(clouds, 1, 0.35) : 1;
  const leavesWidth = width * 1.25;
  const railWidth = width * 1.15;
  const plantSize = Math.min(210, width * 0.52);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={scene.background} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shade, transform: [{ scaleX: flip }] }]}>
        {/* La plante grimpante au loin : grande, floue, lente. */}
        <Animated.Image
          source={LEAVES_FAR}
          resizeMode="stretch"
          style={[
            tint,
            {
              position: "absolute",
              top: -60,
              left: -width * 0.12,
              width: leavesWidth,
              height: leavesWidth * 2,
              opacity: 0.13 * s,
              transformOrigin: "top",
              transform: [{ translateY: parallax(scrollY, 60) }, { rotate: animate ? swing(phased(swayFar, 0.3), `${-angle * 0.6}deg`, `${angle * 0.6}deg`) : "0deg" }],
            },
          ]}
        />

        {/* L'ombre de la rambarde glisse très lentement, comme le soleil qui tourne. */}
        {!quiet && (
        <Animated.Image
          source={RAILING}
          resizeMode="stretch"
          style={[
            tint,
            {
              position: "absolute",
              bottom: 0,
              left: -width * 0.08,
              width: railWidth,
              height: railWidth * 2 * stretch,
              opacity: 0.12 * s,
              transform: [{ translateX: animate ? swing(drift, -6, 6) : 0 }],
            },
          ]}
        />
        )}

        {pots.map((shape, index) => {
          const slot = (index + 0.5) / pots.length;
          const center = pots.length === 1 ? width * 0.3 : width * (0.1 + slot * 0.8);
          return (
            <Animated.Image
              key={`plant-${index}`}
              source={PLANTS[shape]}
              style={[
                tint,
                {
                  position: "absolute",
                  left: center - plantSize * POT_CENTER,
                  bottom: -plantSize * (1 - POT_FOOT),
                  width: plantSize,
                  height: plantSize * stretch,
                  opacity: 0.19 * s,
                  transformOrigin: "bottom",
                  transform: [{ rotate: animate ? swing(phased(swayNear, (index * 0.37) % 1), `${-angle * 0.8}deg`, `${angle * 0.8}deg`) : "0deg" }],
                },
              ]}
            />
          );
        })}

        {/* La plante grimpante au premier plan : plus nette, elle bouge plus. */}
        <Animated.Image
          source={LEAVES_NEAR}
          resizeMode="stretch"
          style={[
            tint,
            {
              position: "absolute",
              top: -40,
              right: -width * 0.1,
              width: leavesWidth,
              height: leavesWidth * 2,
              opacity: 0.2 * s,
              transformOrigin: "top right",
              transform: [{ translateY: parallax(scrollY, 120) }, { rotate: animate ? swing(swayNear, `${angle}deg`, `${-angle}deg`) : "0deg" }],
            },
          ]}
        />
      </Animated.View>

      {particles === "rain" &&
        drops.map((drop, index) => {
          const dropSize = 8 + Math.round(drop.pick * 14);
          const source = DROPS[drop.pick < 0.45 ? 0 : drop.pick < 0.85 ? 1 : 2];
          const progress = animate ? phased(fall, drop.phase) : null;
          return (
            <Animated.Image
              key={`drop-${index}`}
              source={source}
              style={{
                position: "absolute",
                left: drop.x,
                top: 0,
                width: dropSize * 2,
                height: dropSize * 2,
                opacity: progress ? progress.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 0.8, 0.8, 0] }) : 0.75,
                transform: [{ translateY: progress ? progress.interpolate({ inputRange: [0, 1], outputRange: [topInset + drop.phase * 40, height * (0.55 + drop.pick * 0.4)] }) : topInset + drop.phase * (height - 160) }],
              }}
            />
          );
        })}

      {particles === "snow" &&
        drops.map((drop, index) => {
          const flake = 3 + drop.pick * 4;
          const progress = animate ? phased(fall, drop.phase) : null;
          return (
            <Animated.View
              key={`flake-${index}`}
              style={{
                position: "absolute",
                left: drop.x,
                top: 0,
                width: flake,
                height: flake,
                borderRadius: flake,
                backgroundColor: "#9AA8BD",
                opacity: 0.45,
                transform: [
                  { translateY: progress ? progress.interpolate({ inputRange: [0, 1], outputRange: [-10, height] }) : drop.phase * height },
                  { translateX: progress ? progress.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 10, 0, -10, 0] }) : 0 },
                ],
              }}
            />
          );
        })}

      {scene.flash && animate && !quiet && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", opacity: flash.interpolate({ inputRange: [0, 0.9, 0.915, 0.93, 0.95, 0.97, 1], outputRange: [0, 0, 0.6, 0.1, 0.45, 0, 0] }) }]} />
      )}

      {/* Sous l'heure et la batterie, la liste disparaît dans la lumière au lieu de passer dessous. */}
      <View style={[styles.statusStrip, { height: topInset, backgroundColor: scene.background[0] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  statusStrip: { position: "absolute", top: 0, left: 0, right: 0 },
});
