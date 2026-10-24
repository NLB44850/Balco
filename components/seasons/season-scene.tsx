/**
 * La scène de saison en haut de Saisons (24/10, maquette A) : un coin de balcon dessiné (rambarde, sol, pot) qui
 * change avec la saison du mois affiché, et qui bouge doucement comme la carte météo d'Aujourd'hui : feuilles qui
 * tombent en automne, flocons en hiver, papillon et pétales au printemps, rayons du soleil en été. Plus rien ne
 * bouge si le téléphone demande moins d'animations. Aussi `SeasonGlyph`, le petit dessin de la saison d'un mois.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";

import type { SeasonId } from "@/lib/plants/plant-year";

const GREEN = "#1F7A4D";
const LEAF = "#3E8E5E";
const ORANGE = "#D2642A";
const AMBER = "#E8A43C";
const RUST = "#B5532A";
const BLUE = "#2F6FB3";
const SUN = "#F2B33D";
const POT = "#C8693B";
const POT_RIM = "#B35A30";

const W = 350;
const H = 150;

const BACKGROUND: Record<SeasonId, string> = { autumn: "#FBF1E4", winter: "#EAF1F8", spring: "#EEF6EC", summer: "#FFF4DC" };
const RAIL: Record<SeasonId, string> = { autumn: "#D9CBB7", winter: "#C9D4E0", spring: "#CFDCC8", summer: "#E3D2AE" };
const FLOOR: Record<SeasonId, string> = { autumn: "#EAD9C2", winter: "#DCE5EE", spring: "#DCE9D6", summer: "#F0DFBB" };

function useLoop(duration: number, running: boolean, delay = 0, easing = Easing.linear) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) {
      value.setValue(0.35);
      return;
    }
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }), Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [delay, duration, easing, running, value]);
  return value;
}

/** Un morceau de la scène, dessiné dans `box` (coordonnées de la scène 350 × 150), à sa place. */
function Piece({ box, k, style, children }: { box: [number, number, number, number]; k: number; style?: object; children: ReactNode }) {
  const [x, y, w, h] = box;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x * k, top: y * k, width: w * k, height: h * k }, style]}>
      <Svg width={w * k} height={h * k} viewBox={`${x} ${y} ${w} ${h}`}>{children}</Svg>
    </Animated.View>
  );
}

/** Une chose qui tombe en se balançant (feuille, flocon, pétale), en boucle. */
function Faller({ x, k, running, duration, delay, children, sway = 14, turn = 120 }: { x: number; k: number; running: boolean; duration: number; delay: number; children: ReactNode; sway?: number; turn?: number }) {
  const fall = useLoop(duration, running, delay);
  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-24 * k, (H + 10) * k] });
  const translateX = fall.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, sway * k, 0, -sway * k, 0] });
  const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${turn}deg`] });
  const opacity = running ? fall.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }) : 1;
  return <Piece box={[x - 12, -12, 24, 24]} k={k} style={{ opacity, transform: [{ translateY }, { translateX }, { rotate }] }}><G transform={`translate(${x} 0)`}>{children}</G></Piece>;
}

const leafShape = (color: string) => (
  <G>
    <Path d="M0 -9c5 4 8 7 7 11-1 3-4 5-7 6-3-1-6-3-7-6-1-4 2-7 7-11z" fill={color} />
    <Path d="M0 -6v13" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
  </G>
);

const flakeShape = (
  <G stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round">
    <Line x1={0} y1={-7} x2={0} y2={7} />
    <Line x1={-6} y1={-3.5} x2={6} y2={3.5} />
    <Line x1={-6} y1={3.5} x2={6} y2={-3.5} />
  </G>
);

const petalShape = <Ellipse cx={0} cy={0} rx={4} ry={2.4} fill="#F3A6C0" />;

function Railing({ season }: { season: SeasonId }) {
  return (
    <G>
      <G stroke={RAIL[season]} strokeWidth={4}>
        {[20, 60, 100, 140, 180, 220, 260, 300, 340].map((x) => <Line key={x} x1={x} y1={70} x2={x} y2={H} />)}
      </G>
      <Line x1={0} y1={70} x2={W} y2={70} stroke={RAIL[season]} strokeWidth={6} />
      <Rect x={0} y={128} width={W} height={22} fill={FLOOR[season]} />
    </G>
  );
}

function Pot({ x = 70 }: { x?: number }) {
  return (
    <G>
      <Path d={`M${x} 96h56l-6 40h-44z`} fill={POT} />
      <Rect x={x - 4} y={90} width={64} height={10} rx={3} fill={POT_RIM} />
    </G>
  );
}

function Still({ season }: { season: SeasonId }) {
  if (season === "autumn") {
    return (
      <G>
        <Circle cx={290} cy={58} r={26} fill="#F6C76A" />
        <Railing season={season} />
        <Pot />
        <Path d="M98 90c-2-20-18-28-30-26 2 14 14 22 30 26z" fill={LEAF} />
        <Path d="M98 90c2-24 20-34 34-30-2 16-16 26-34 30z" fill={GREEN} />
        <Path d="M98 90c0-16 4-30 2-40" stroke={GREEN} strokeWidth={3} fill="none" />
        <Ellipse cx={190} cy={124} rx={26} ry={16} fill="#E07A35" />
        <Path d="M178 112c4 10 4 18 0 26M202 112c-4 10-4 18 0 26M190 108v32" stroke="#C25F22" strokeWidth={2} fill="none" />
        <Path d="M190 108c0-6 4-10 8-10" stroke="#5B7A3A" strokeWidth={3} fill="none" />
      </G>
    );
  }
  if (season === "winter") {
    return (
      <G>
        <Path d="M300 30a20 20 0 1 0 14 32 17 17 0 0 1-14-32z" fill="#F4D58A" />
        <Railing season={season} />
        <Path d="M0 68h350v5H0z" fill="#FFFFFF" />
        <Rect x={0} y={126} width={W} height={4} fill="#FFFFFF" />
        <Pot />
        {/* Un arbuste au repos, sous son voile d'hivernage. */}
        <Path d="M74 92c0-30 12-48 24-48s24 18 24 48z" fill="#F4F8FC" stroke={BLUE} strokeWidth={2} />
        <Path d="M98 90V60M98 72l-10-8M98 66l9-8" stroke="#8C6A4A" strokeWidth={2.5} fill="none" />
        <Path d="M170 136l10-34h30l10 34z" fill={POT} />
        <Path d="M195 102c0-12-3-24 0-34M195 82l-9-7M195 76l8-8" stroke="#8C6A4A" strokeWidth={2.5} fill="none" />
        <Ellipse cx={195} cy={102} rx={17} ry={3} fill="#FFFFFF" />
      </G>
    );
  }
  if (season === "spring") {
    return (
      <G>
        <Circle cx={290} cy={46} r={20} fill="#F6D57A" />
        <Railing season={season} />
        <Pot />
        <Path d="M86 92c0-10-2-18-8-24M98 92c0-14 0-24 2-32M110 92c0-10 2-18 8-22" stroke={GREEN} strokeWidth={3} fill="none" />
        <Path d="M78 68c-6-1-10-6-10-10 6 0 10 4 10 10zM100 60c-2-6 0-12 4-14 2 6 0 11-4 14zM118 70c4-4 10-5 13-3-3 5-8 6-13 3z" fill={LEAF} />
        {/* Une tulipe dans le second pot. */}
        <Path d="M170 136l10-34h30l10 34z" fill={POT} />
        <Path d="M195 102V70" stroke={GREEN} strokeWidth={3} />
        <Path d="M195 92c-10-2-14-10-14-16 8 2 12 8 14 16z" fill={LEAF} />
        <Path d="M184 58c0 10 5 16 11 16s11-6 11-16l-5 4-6-8-6 8z" fill="#E4577B" />
      </G>
    );
  }
  return (
    <G>
      <Railing season={season} />
      <Pot />
      {/* Un pied de tomates cerises sur son tuteur. */}
      <Path d="M98 92V34" stroke="#A47B52" strokeWidth={3} />
      <Path d="M98 88c-14-4-20-14-20-22 10 2 18 10 20 22zM98 70c12-4 20-12 22-20-12 0-20 8-22 20zM98 56c-10-2-16-10-16-16 8 1 14 7 16 16z" fill={LEAF} />
      <Circle cx={84} cy={74} r={6} fill="#E04B3A" />
      <Circle cx={112} cy={60} r={5.5} fill="#E04B3A" />
      <Circle cx={104} cy={80} r={5} fill="#F07A3A" />
      {/* L'arrosoir. */}
      <Path d="M176 136v-28h34v28z" fill="#5C9E7A" />
      <Path d="M210 114l22-14" stroke="#5C9E7A" strokeWidth={5} strokeLinecap="round" />
      <Path d="M182 108c0-12 22-12 22 0" stroke="#4A8566" strokeWidth={4} fill="none" />
    </G>
  );
}

/** Le soleil d'été : le disque fixe, les rayons qui tournent lentement. */
function SummerSun({ k, running }: { k: number; running: boolean }) {
  const turn = useLoop(26_000, running);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const [cx, cy, r] = [292, 44, 22];
  return (
    <>
      <Piece box={[cx - 40, cy - 40, 80, 80]} k={k} style={{ transform: [{ rotate }] }}>
        {Array.from({ length: 10 }, (_, index) => {
          const angle = (index * Math.PI) / 5;
          return <Line key={index} x1={cx + Math.cos(angle) * (r + 6)} y1={cy + Math.sin(angle) * (r + 6)} x2={cx + Math.cos(angle) * (r + 14)} y2={cy + Math.sin(angle) * (r + 14)} stroke={SUN} strokeWidth={4} strokeLinecap="round" />;
        })}
      </Piece>
      <Piece box={[cx - 40, cy - 40, 80, 80]} k={k}><Circle cx={cx} cy={cy} r={r} fill={SUN} /></Piece>
    </>
  );
}

/** Le papillon du printemps, qui traverse doucement en battant des ailes. */
function Butterfly({ k, running }: { k: number; running: boolean }) {
  const fly = useLoop(9000, running, 0, Easing.inOut(Easing.sin));
  const flap = useLoop(500, running);
  const translateX = fly.interpolate({ inputRange: [0, 1], outputRange: [-30 * k, 120 * k] });
  const translateY = fly.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -10 * k, 4 * k, -8 * k, 0] });
  const scaleX = flap.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] });
  return (
    <Piece box={[200, 70, 24, 20]} k={k} style={{ transform: [{ translateX }, { translateY }, { scaleX }] }}>
      <G>
        <Path d="M212 80c-4-8-12-10-12-4s6 8 12 4zM212 80c4-8 12-10 12-4s-6 8-12 4z" fill="#F2B33D" />
        <Path d="M212 80c-3 5-9 7-9 3s5-5 9-3zM212 80c3 5 9 7 9 3s-5-5-9-3z" fill={ORANGE} />
        <Line x1={212} y1={74} x2={212} y2={86} stroke="#5A4632" strokeWidth={2} strokeLinecap="round" />
      </G>
    </Piece>
  );
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => undefined);
  }, []);
  return reduce;
}

const AUTUMN_LEAVES = [
  { x: 40, color: RUST, duration: 7000, delay: 0 },
  { x: 150, color: ORANGE, duration: 8200, delay: 1600 },
  { x: 230, color: AMBER, duration: 7600, delay: 3400 },
  { x: 320, color: RUST, duration: 8800, delay: 900 },
  { x: 130, color: AMBER, duration: 9400, delay: 5200 },
];
const SNOWFLAKES = [30, 75, 125, 160, 215, 255, 300, 335].map((x, index) => ({ x, duration: 7000 + (index % 3) * 1400, delay: index * 850 }));
const PETALS = [{ x: 160, duration: 8000, delay: 0 }, { x: 260, duration: 9600, delay: 3200 }, { x: 40, duration: 8800, delay: 6000 }];

export function SeasonScene({ season, width }: { season: SeasonId; width: number }) {
  const reduce = useReduceMotion();
  const running = !reduce;
  const k = width / W;
  if (width <= 0) return null;
  return (
    <View style={{ width, height: H * k, overflow: "hidden" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={H * k} viewBox={`0 0 ${W} ${H}`}>
        <Rect width={W} height={H} fill={BACKGROUND[season]} />
        <Still season={season} />
      </Svg>
      {season === "summer" && <SummerSun k={k} running={running} />}
      {season === "spring" && <Butterfly k={k} running={running} />}
      {season === "autumn" && AUTUMN_LEAVES.map((leaf) => <Faller key={leaf.x} x={leaf.x} k={k} running={running} duration={leaf.duration} delay={leaf.delay}>{leafShape(leaf.color)}</Faller>)}
      {season === "winter" && SNOWFLAKES.map((flake) => <Faller key={flake.x} x={flake.x} k={k} running={running} duration={flake.duration} delay={flake.delay} sway={8} turn={90}>{flakeShape}</Faller>)}
      {season === "spring" && PETALS.map((petal) => <Faller key={petal.x} x={petal.x} k={k} running={running} duration={petal.duration} delay={petal.delay} sway={18} turn={200}>{petalShape}</Faller>)}
    </View>
  );
}

/** Le petit dessin de la saison d'un mois (flocon, pousse, soleil, feuille), sur les pastilles des mois. */
export function SeasonGlyph({ season, size = 14, color }: { season: SeasonId; size?: number; /** Blanc sur la pastille choisie. */ color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {season === "winter" && (
        <G stroke={color ?? BLUE} strokeWidth={2} strokeLinecap="round">
          <Line x1={10} y1={2} x2={10} y2={18} />
          <Line x1={3} y1={6} x2={17} y2={14} />
          <Line x1={3} y1={14} x2={17} y2={6} />
        </G>
      )}
      {season === "spring" && (
        <G>
          <Path d="M10 18V9" stroke={color ?? GREEN} strokeWidth={2} strokeLinecap="round" />
          <Path d="M10 10C10 5 6 3 3 4c0 4 3 6 7 6z" fill={color ?? GREEN} />
          <Path d="M10 9c0-4 3-6 7-5 0 3-3 5-7 5z" fill={color ?? "#5BAE7E"} />
        </G>
      )}
      {season === "summer" && (
        <G>
          <Circle cx={10} cy={10} r={4.5} fill={color ?? SUN} />
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (index * Math.PI) / 4;
            return <Line key={index} x1={10 + Math.cos(angle) * 7} y1={10 + Math.sin(angle) * 7} x2={10 + Math.cos(angle) * 9} y2={10 + Math.sin(angle) * 9} stroke={color ?? SUN} strokeWidth={2} strokeLinecap="round" />;
          })}
        </G>
      )}
      {season === "autumn" && (
        <G>
          <Path d="M10 2c4 3 7 6 6 10-1 3-4 5-6 6-2-1-5-3-6-6-1-4 2-7 6-10z" fill={color ?? ORANGE} />
          <Path d="M10 5v14" stroke={color ? "rgba(31,122,77,0.6)" : "#9A4A1F"} strokeWidth={1.4} />
        </G>
      )}
    </Svg>
  );
}
