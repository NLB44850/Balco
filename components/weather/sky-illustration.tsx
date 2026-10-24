/**
 * Les dessins du ciel de la carte météo (lib/weather/forecast-view.ts, `SkyKind`) : soleil, lune, nuages, bruine,
 * pluie, orage, neige, brouillard et gelée, aux couleurs de l'app (bleu du gel pour l'eau et le froid). Chaque dessin
 * est fait de morceaux posés sur une grille de 100 × 100 ; `animated` les fait bouger doucement (rayons qui tournent,
 * nuages qui glissent, gouttes et flocons qui tombent, éclair qui clignote), sauf si le téléphone demande moins
 * d'animations.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

import type { SkyKind } from "@/lib/weather/forecast-view";

const SUN = "#F2B33D";
const MOON = "#F4D58A";
const CLOUD = "#FFFFFF";
const CLOUD_EDGE = "#C9D1D8";
const GREY = "#DCE1E6";
const GREY_EDGE = "#AAB3BC";
const STORM_CLOUD = "#C3CAD2";
const WATER = "#2F6FB3";

type Box = [x: number, y: number, w: number, h: number];

/** Un morceau du dessin : ce qui est dessiné dans `box` (coordonnées de la grille 100 × 100), à sa place. */
function Piece({ box, size, style, children }: { box: Box; size: number; style?: object; children: ReactNode }) {
  const [x, y, w, h] = box;
  const k = size / 100;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x * k, top: y * k, width: w * k, height: h * k }, style]}>
      <Svg width={w * k} height={h * k} viewBox={`${x} ${y} ${w} ${h}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** Une valeur qui va de 0 à 1 en boucle (ou reste à 0 sans animation). */
function useLoop(duration: number, running: boolean, delay = 0, easing = Easing.linear) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [delay, duration, easing, running, value]);
  return value;
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => undefined);
  }, []);
  return reduce;
}

function cloudPath(x: number, y: number, scale: number, fill: string, edge: string) {
  return <Path d="M20 46h52a16 16 0 0 0 0-32 22 22 0 0 0-42-4A18 18 0 0 0 20 46z" fill={fill} stroke={edge} strokeWidth={2.5 / scale} transform={`translate(${x} ${y}) scale(${scale})`} />;
}

function sunShape(cx: number, cy: number, r: number, rays: boolean) {
  return (
    <G>
      {rays &&
        Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4;
          return <Line key={index} x1={cx + Math.cos(angle) * (r + 6)} y1={cy + Math.sin(angle) * (r + 6)} x2={cx + Math.cos(angle) * (r + 13)} y2={cy + Math.sin(angle) * (r + 13)} stroke={SUN} strokeWidth={4} strokeLinecap="round" />;
        })}
      {!rays && <Circle cx={cx} cy={cy} r={r} fill={SUN} />}
    </G>
  );
}

/** Le soleil : le disque fixe, les rayons qui tournent lentement. */
function Sun({ cx, cy, r, size, animated }: { cx: number; cy: number; r: number; size: number; animated: boolean }) {
  const turn = useLoop(24_000, animated);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const reach = r + 15;
  const box: Box = [cx - reach, cy - reach, reach * 2, reach * 2];
  return (
    <>
      <Piece box={box} size={size} style={{ transform: [{ rotate }] }}>{sunShape(cx, cy, r, true)}</Piece>
      <Piece box={box} size={size}>{sunShape(cx, cy, r, false)}</Piece>
    </>
  );
}

function Moon({ size, small, animated }: { size: number; small?: boolean; animated: boolean }) {
  const twinkle = useLoop(2600, animated, 0, Easing.inOut(Easing.sin));
  const opacity = twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] });
  const scale = small ? 0.62 : 1;
  const dx = small ? 2 : 0;
  return (
    <>
      <Piece box={[0, 0, 100, 100]} size={size}>
        <Path d="M62 22a26 26 0 1 0 18 40 22 22 0 0 1-18-40z" fill={MOON} transform={`translate(${dx} 0) scale(${scale})`} />
      </Piece>
      {!small && (
        <Piece box={[0, 0, 100, 100]} size={size} style={{ opacity }}>
          <Circle cx={22} cy={30} r={2.4} fill={MOON} />
          <Circle cx={84} cy={22} r={2} fill={MOON} />
          <Circle cx={78} cy={78} r={1.6} fill={MOON} />
        </Piece>
      )}
    </>
  );
}

/** Un nuage qui glisse un peu de gauche à droite. */
function Cloud({ x, y, scale, size, animated, fill = CLOUD, edge = CLOUD_EDGE, drift = 3, period = 5000 }: { x: number; y: number; scale: number; size: number; animated: boolean; fill?: string; edge?: string; drift?: number; period?: number }) {
  const sway = useLoop(period, animated, 0, Easing.inOut(Easing.sin));
  const k = size / 100;
  const translateX = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift * k, 0] });
  return (
    <Piece box={[0, 0, 100, 100]} size={size} style={{ transform: [{ translateX }] }}>
      {cloudPath(x, y, scale, fill, edge)}
    </Piece>
  );
}

/** Ce qui tombe du nuage : gouttes ou flocons, chacun à son rythme. */
function Falling({ xs, top, size, animated, kind, period = 1100 }: { xs: number[]; top: number; size: number; animated: boolean; kind: "drop" | "small-drop" | "flake"; period?: number }) {
  return (
    <>
      {xs.map((x, index) => (
        <FallingOne key={x} x={x} top={top + (index % 2) * 6} size={size} animated={animated} kind={kind} period={period} delay={index * (period / xs.length)} />
      ))}
    </>
  );
}

function FallingOne({ x, top, size, animated, kind, period, delay }: { x: number; top: number; size: number; animated: boolean; kind: "drop" | "small-drop" | "flake"; period: number; delay: number }) {
  const fall = useLoop(period, animated, delay);
  const k = size / 100;
  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-4 * k, 10 * k] });
  const opacity = animated ? fall.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }) : 1;
  const box: Box = [x - 12, top - 2, 24, 30];
  return (
    <Piece box={box} size={size} style={{ opacity, transform: [{ translateY }] }}>
      {kind === "flake" ? (
        <G stroke={WATER} strokeWidth={3.5} strokeLinecap="round">
          <Line x1={x} y1={top} x2={x} y2={top + 20} />
          <Line x1={x - 8.5} y1={top + 5} x2={x + 8.5} y2={top + 15} />
          <Line x1={x - 8.5} y1={top + 15} x2={x + 8.5} y2={top + 5} />
        </G>
      ) : (
        <Path d={kind === "drop" ? `M${x} ${top} c-6 9 -7 13 -7 16 a7 7 0 0 0 14 0 c0 -3 -1 -7 -7 -16z` : `M${x} ${top + 4} c-4 6 -5 9 -5 11 a5 5 0 0 0 10 0 c0 -2 -1 -5 -5 -11z`} fill={WATER} />
      )}
    </Piece>
  );
}

function Bolt({ size, animated }: { size: number; animated: boolean }) {
  const flash = useLoop(2400, animated);
  const opacity = animated ? flash.interpolate({ inputRange: [0, 0.08, 0.12, 0.18, 0.24, 1], outputRange: [1, 0.15, 1, 0.2, 1, 1] }) : 1;
  return (
    <Piece box={[30, 52, 40, 44]} size={size} style={{ opacity }}>
      <Path d="M52 56 l-12 20 h11 l-6 18 l20 -26 h-11 l7 -12z" fill={SUN} />
    </Piece>
  );
}

function Fog({ size, animated }: { size: number; animated: boolean }) {
  const sway = useLoop(4200, animated, 0, Easing.inOut(Easing.sin));
  const k = size / 100;
  const translateX = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-3 * k, 3 * k, -3 * k] });
  return (
    <Piece box={[0, 0, 100, 100]} size={size} style={{ transform: [{ translateX }] }}>
      <G stroke={GREY_EDGE} strokeWidth={5} strokeLinecap="round">
        <Line x1={18} y1={68} x2={78} y2={68} />
        <Line x1={28} y1={80} x2={88} y2={80} />
        <Line x1={14} y1={92} x2={64} y2={92} />
      </G>
    </Piece>
  );
}

/** La gelée : un grand cristal qui tourne très lentement. */
function Frost({ size, animated }: { size: number; animated: boolean }) {
  const turn = useLoop(30_000, animated);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Piece box={[10, 10, 80, 80]} size={size} style={{ transform: [{ rotate }] }}>
      <G stroke={WATER} strokeWidth={5} strokeLinecap="round">
        {[0, 60, 120].map((angle) => (
          <G key={angle} transform={`rotate(${angle} 50 50)`}>
            <Line x1={50} y1={16} x2={50} y2={84} />
            <Line x1={50} y1={26} x2={42} y2={18} />
            <Line x1={50} y1={26} x2={58} y2={18} />
            <Line x1={50} y1={74} x2={42} y2={82} />
            <Line x1={50} y1={74} x2={58} y2={82} />
          </G>
        ))}
      </G>
    </Piece>
  );
}

export function SkyIllustration({ kind, size, animated = false }: { kind: SkyKind; size: number; animated?: boolean }) {
  const reduce = useReduceMotion();
  const moving = animated && !reduce;
  return (
    <View style={[styles.box, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kind === "sun" && <Sun cx={50} cy={50} r={20} size={size} animated={moving} />}
      {kind === "moon" && <Moon size={size} animated={moving} />}
      {kind === "partly" && (
        <>
          <Sun cx={38} cy={36} r={15} size={size} animated={moving} />
          <Cloud x={18} y={36} scale={0.9} size={size} animated={moving} />
        </>
      )}
      {kind === "partly-night" && (
        <>
          <Moon size={size} small animated={moving} />
          <Cloud x={18} y={36} scale={0.9} size={size} animated={moving} />
        </>
      )}
      {kind === "cloudy" && (
        <>
          <Cloud x={2} y={14} scale={0.9} size={size} animated={moving} fill={GREY} edge={GREY_EDGE} drift={-3} period={6000} />
          <Cloud x={14} y={32} scale={0.95} size={size} animated={moving} />
        </>
      )}
      {kind === "fog" && (
        <>
          <Cloud x={10} y={8} scale={0.9} size={size} animated={moving} fill={GREY} edge={GREY_EDGE} />
          <Fog size={size} animated={moving} />
        </>
      )}
      {kind === "drizzle" && (
        <>
          <Cloud x={8} y={8} scale={1} size={size} animated={moving} />
          <Falling xs={[32, 50, 68]} top={60} size={size} animated={moving} kind="small-drop" period={1500} />
        </>
      )}
      {kind === "rain" && (
        <>
          <Cloud x={8} y={6} scale={1} size={size} animated={moving} />
          <Falling xs={[30, 50, 70]} top={58} size={size} animated={moving} kind="drop" />
        </>
      )}
      {kind === "storm" && (
        <>
          <Cloud x={8} y={4} scale={1} size={size} animated={moving} fill={STORM_CLOUD} edge={GREY_EDGE} />
          <Bolt size={size} animated={moving} />
          <Falling xs={[24, 76]} top={58} size={size} animated={moving} kind="small-drop" period={900} />
        </>
      )}
      {kind === "snow" && (
        <>
          <Cloud x={8} y={6} scale={1} size={size} animated={moving} />
          <Falling xs={[28, 52, 76]} top={58} size={size} animated={moving} kind="flake" period={2600} />
        </>
      )}
      {kind === "frost" && <Frost size={size} animated={moving} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: "relative", overflow: "visible" },
});
