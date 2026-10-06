/**
 * Les illustrations du pas-à-pas pour planter : des dessins au trait, dans le vert Balco sur fond clair,
 * chacun compréhensible sans sa phrase (une flèche montre le geste). Dessinées en code (react-native-svg) :
 * légères, nettes à toutes les tailles, disponibles hors connexion. Revue : Réglages → Version de test →
 * « Illustrations » (app/illustrations.tsx).
 */
import type { ReactNode } from "react";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";

import { type IllustrationId } from "@/lib/plants/illustration-names";

export { ILLUSTRATION_IDS, ILLUSTRATION_LABELS, type IllustrationId } from "@/lib/plants/illustration-names";

const GREEN = "#1F7A4D";
const LEAF = "#E3F1E8";
const SOIL = "#EFE6D8";
const stroke = { stroke: GREEN, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const thin = { ...stroke, strokeWidth: 2 };

// --- Petites pièces communes ----------------------------------------------------------------------------

/** Un pot vu de face : rebord, corps, et sa terre jusqu'à `soilTop` (null : vide). */
function Pot({ soilTop = 72, x = 0, scale = 1 }: { soilTop?: number | null; x?: number; scale?: number }) {
  return (
    <G transform={`translate(${x} 0) translate(60 104) scale(${scale}) translate(-60 -104)`}>
      {soilTop !== null && <Polygon points={`${34 + (soilTop - 66) * (4 / 38)},${soilTop} ${86 - (soilTop - 66) * (4 / 38)},${soilTop} 82,104 38,104`} fill={SOIL} />}
      <Polygon points="34,66 86,66 82,104 38,104" fill="none" {...stroke} />
      <Rect x={29} y={58} width={62} height={9} rx={2} fill="#FFFFFF" {...stroke} />
    </G>
  );
}

/** Une petite pousse à deux feuilles, posée en (x, y). */
function Sprout({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${size})`}>
      <Line x1={0} y1={0} x2={0} y2={-14} {...thin} />
      <Path d="M0 -10 C -9 -12 -12 -20 -10 -24 C -3 -22 0 -16 0 -10 Z" fill={LEAF} {...thin} />
      <Path d="M0 -12 C 9 -14 12 -22 10 -26 C 3 -24 0 -18 0 -12 Z" fill={LEAF} {...thin} />
    </G>
  );
}

/** Un plant plus grand, avec ses feuilles. */
function Plant({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${size})`}>
      <Line x1={0} y1={0} x2={0} y2={-34} {...stroke} />
      <Path d="M0 -12 C -14 -12 -20 -22 -18 -28 C -8 -27 -2 -20 0 -12 Z" fill={LEAF} {...thin} />
      <Path d="M0 -20 C 14 -20 20 -30 18 -36 C 8 -35 2 -28 0 -20 Z" fill={LEAF} {...thin} />
      <Path d="M0 -32 C -8 -34 -10 -42 -6 -46 C -1 -43 1 -38 0 -32 Z" fill={LEAF} {...thin} />
    </G>
  );
}

/** Une flèche qui montre le geste. */
function Arrow({ d, head }: { d: string; head: string }) {
  return (
    <G>
      <Path d={d} fill="none" {...thin} strokeDasharray="5 5" />
      <Path d={head} fill="none" {...thin} />
    </G>
  );
}

/** Un arrosoir, bec vers la gauche. */
function WateringCan({ x, y, rose = false }: { x: number; y: number; rose?: boolean }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Rect x={0} y={0} width={34} height={24} rx={5} fill="#FFFFFF" {...stroke} />
      <Path d="M8 0 C 8 -12 26 -12 26 0" fill="none" {...stroke} />
      <Path d="M0 8 L -20 -6" fill="none" {...stroke} />
      {rose ? <Ellipse cx={-22} cy={-8} rx={4} ry={6} fill="#FFFFFF" {...thin} transform="rotate(-35 -22 -8)" /> : null}
    </G>
  );
}

/** Un doigt (index) tendu vers le bas. */
function Finger({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Path d="M-7 -40 L -7 -6 C -7 2 7 2 7 -6 L 7 -40" fill="#FFFFFF" {...stroke} />
      <Path d="M-4 -8 C -2 -5 2 -5 4 -8" fill="none" {...thin} />
    </G>
  );
}

function Frame({ children, size }: { children: ReactNode; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {children}
    </Svg>
  );
}

// --- Les dessins ----------------------------------------------------------------------------------------

const DRAWINGS: Record<IllustrationId, () => ReactNode> = {
  "pot-holes": () => (
    <>
      <Pot soilTop={null} />
      {[46, 60, 74].map((x) => <Circle key={x} cx={x} cy={104} r={2.5} fill="#FFFFFF" {...thin} />)}
      {[46, 60, 74].map((x) => <Line key={`d${x}`} x1={x} y1={109} x2={x} y2={112} {...thin} />)}
      <Path d="M24 110 L 96 110 L 92 116 L 28 116 Z" fill={LEAF} {...stroke} />
    </>
  ),
  "clay-balls": () => (
    <>
      <Pot soilTop={null} />
      {[[42, 99], [50, 97], [58, 99], [66, 97], [74, 99], [46, 92], [54, 91], [62, 92], [70, 91], [78, 93]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.6} fill={SOIL} {...thin} />)}
      <Arrow d="M60 18 L 60 48" head="M53 41 L 60 48 L 67 41" />
      {[[54, 14], [62, 10], [66, 18]].map(([cx, cy]) => <Circle key={`t${cx}`} cx={cx} cy={cy} r={3.6} fill={SOIL} {...thin} />)}
    </>
  ),
  "fill-soil": () => (
    <>
      <Pot soilTop={74} />
      <G transform="rotate(-28 40 28)">
        <Rect x={22} y={14} width={40} height={30} rx={4} fill="#FFFFFF" {...stroke} />
        <Line x1={22} y1={22} x2={62} y2={22} {...thin} />
      </G>
      {[[64, 46], [68, 54], [62, 58], [70, 62]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2} fill={GREEN} />)}
    </>
  ),
  "finger-hole": () => (
    <>
      <Pot soilTop={70} />
      <Path d="M54 70 L 56 80 L 64 80 L 66 70" fill="#FFFFFF" {...thin} />
      <Finger x={60} y={66} />
      <Line x1={92} y1={70} x2={92} y2={80} {...thin} />
      <Line x1={89} y1={70} x2={95} y2={70} {...thin} />
      <Line x1={89} y1={80} x2={95} y2={80} {...thin} />
    </>
  ),
  "drop-seeds": () => (
    <>
      <Pot soilTop={70} />
      {[44, 60, 76].map((x) => <Path key={x} d={`M${x - 5} 70 L ${x - 3} 77 L ${x + 3} 77 L ${x + 5} 70`} fill="#FFFFFF" {...thin} />)}
      {[44, 60, 76].map((x) => <Ellipse key={`s${x}`} cx={x} cy={74} rx={2.4} ry={1.8} fill={GREEN} />)}
      <G transform="rotate(-25 56 26)">
        <Rect x={42} y={10} width={28} height={34} rx={3} fill="#FFFFFF" {...stroke} />
        <Line x1={42} y1={18} x2={70} y2={18} {...thin} />
        <Sprout x={56} y={38} size={0.55} />
      </G>
      {[[66, 48], [64, 56], [62, 63]].map(([cx, cy]) => <Ellipse key={`f${cx}${cy}`} cx={cx} cy={cy} rx={2.4} ry={1.8} fill={GREEN} />)}
    </>
  ),
  "scatter-seeds": () => (
    <>
      <Path d="M20 84 L 100 84 L 94 100 L 26 100 Z" fill={SOIL} {...stroke} />
      {[30, 38, 46, 54, 62, 70, 78, 86, 34, 42, 50, 58, 66, 74, 82].map((x, index) => <Ellipse key={index} cx={x} cy={index < 8 ? 88 : 93} rx={2} ry={1.5} fill={GREEN} />)}
      <G transform="rotate(-25 56 26)">
        <Rect x={42} y={10} width={28} height={34} rx={3} fill="#FFFFFF" {...stroke} />
        <Line x1={42} y1={18} x2={70} y2={18} {...thin} />
        <Sprout x={56} y={38} size={0.55} />
      </G>
      {[[64, 50], [70, 58], [58, 62], [66, 70], [52, 72], [74, 72]].map(([cx, cy]) => <Ellipse key={`${cx}${cy}`} cx={cx} cy={cy} rx={2} ry={1.5} fill={GREEN} />)}
    </>
  ),
  "cover-seeds": () => (
    <>
      <Pot soilTop={70} />
      {[44, 60, 76].map((x) => <Ellipse key={x} cx={x} cy={76} rx={2.4} ry={1.8} fill={GREEN} />)}
      <Path d="M36 72 L 84 72" stroke={GREEN} strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" />
      <Path d="M42 30 C 50 22 70 22 78 30 L 74 38 L 46 38 Z" fill="#FFFFFF" {...stroke} />
      {[[52, 46], [60, 52], [68, 46], [56, 58], [64, 60]].map(([cx, cy]) => <Circle key={`${cx}${cy}`} cx={cx} cy={cy} r={1.6} fill={GREEN} />)}
    </>
  ),
  "fine-water": () => (
    <>
      <Pot soilTop={70} />
      <WateringCan x={66} y={18} rose />
      {[[38, 40], [44, 46], [50, 40], [40, 54], [48, 56], [56, 50], [44, 62], [52, 64]].map(([cx, cy]) => <Circle key={`${cx}${cy}`} cx={cx} cy={cy} r={1.5} fill={GREEN} />)}
    </>
  ),
  cells: () => (
    <>
      {[18, 46, 74].map((x) => (
        <G key={x}>
          <Polygon points={`${x},70 ${x + 28},70 ${x + 24},100 ${x + 4},100`} fill={SOIL} {...stroke} />
          <Sprout x={x + 14} y={70} size={0.9} />
        </G>
      ))}
      <Line x1={12} y1={104} x2={108} y2={104} {...stroke} />
    </>
  ),
  "cover-bag": () => (
    <>
      <Pot soilTop={72} />
      <Sprout x={60} y={72} />
      <Path d="M24 104 C 22 60 30 24 60 22 C 90 24 98 60 96 104" fill="none" {...thin} strokeDasharray="6 4" />
      <Path d="M44 34 C 40 40 38 48 38 56" fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
    </>
  ),
  windowsill: () => (
    <>
      <Rect x={14} y={10} width={92} height={70} rx={3} fill="#FFFFFF" {...stroke} />
      <Line x1={60} y1={10} x2={60} y2={80} {...thin} />
      <Line x1={14} y1={45} x2={106} y2={45} {...thin} />
      <Circle cx={84} cy={26} r={8} fill={LEAF} {...thin} />
      <Rect x={6} y={80} width={108} height={8} rx={2} fill={LEAF} {...stroke} />
      <Polygon points="44,62 76,62 73,80 47,80" fill={SOIL} {...stroke} />
      <Sprout x={60} y={62} />
    </>
  ),
  sprouts: () => (
    <>
      <Pot soilTop={70} />
      <Sprout x={44} y={70} size={0.9} />
      <Sprout x={60} y={70} />
      <Sprout x={76} y={70} size={0.9} />
      <Path d="M30 30 L 36 36 M 90 30 L 84 36 M 60 18 L 60 26" fill="none" {...thin} />
    </>
  ),
  "dig-hole": () => (
    <>
      <Pot soilTop={66} x={-16} />
      <Path d="M34 66 L 36 86 C 38 92 50 92 52 86 L 54 66" fill="#FFFFFF" {...thin} />
      <G transform="translate(96 80)">
        <Path d="M-10 -10 L 10 -10 L 8 12 L -8 12 Z" fill={SOIL} {...stroke} />
        <Sprout x={0} y={-10} size={0.8} />
      </G>
      <Arrow d="M88 112 L 58 112" head="M63 107 L 58 112 L 63 117" />
    </>
  ),
  unpot: () => (
    <>
      <G transform="rotate(-20 38 70)">
        <Polygon points="22,58 50,58 46,88 26,88" fill="#FFFFFF" {...stroke} />
      </G>
      <G transform="translate(78 64)">
        <Path d="M-12 -12 L 12 -12 L 9 16 L -9 16 Z" fill={SOIL} {...stroke} />
        <Path d="M-6 16 C -8 22 -4 24 -6 28 M 0 16 C 2 22 -2 24 0 30 M 6 16 C 8 22 4 24 6 28" fill="none" {...thin} />
        <Plant x={0} y={-12} size={0.7} />
      </G>
      <Arrow d="M50 52 C 56 44 62 44 66 48" head="M60 46 L 66 48 L 64 42" />
    </>
  ),
  "place-plant": () => (
    <>
      <Pot soilTop={70} />
      <Path d="M48 70 L 49 84 L 71 84 L 72 70" fill={SOIL} {...thin} />
      <Path d="M50 70 L 51 84 L 69 84 L 70 70" fill="#E6D7BF" {...thin} />
      <Plant x={60} y={70} size={0.9} />
      <Arrow d="M88 22 L 88 46" head="M83 41 L 88 46 L 93 41" />
    </>
  ),
  "firm-soil": () => (
    <>
      <Pot soilTop={70} />
      <Plant x={60} y={70} size={0.8} />
      {[42, 78].map((x) => (
        <G key={x} transform={`translate(${x} 52)`}>
          <Rect x={-9} y={-6} width={18} height={14} rx={6} fill="#FFFFFF" {...stroke} />
          <Line x1={-4} y1={8} x2={-4} y2={13} {...thin} />
          <Line x1={0} y1={8} x2={0} y2={14} {...thin} />
          <Line x1={4} y1={8} x2={4} y2={13} {...thin} />
          <Path d="M0 -24 L 0 -12 M -4 -16 L 0 -12 L 4 -16" fill="none" {...thin} />
        </G>
      ))}
    </>
  ),
  "water-well": () => (
    <>
      <Pot soilTop={70} />
      <Plant x={52} y={70} size={0.8} />
      <WateringCan x={80} y={22} />
      <Path d="M60 30 C 62 44 64 54 66 66" fill="none" {...thin} strokeDasharray="3 4" />
      <Path d="M54 30 C 56 44 58 54 60 66" fill="none" {...thin} strokeDasharray="3 4" />
    </>
  ),
  bulb: () => (
    <>
      <Pot soilTop={60} />
      <Path d="M56 72 C 62 78 66 86 64 94 L 48 94 C 46 86 50 78 56 72 Z" fill={LEAF} {...stroke} />
      <Path d="M52 94 L 50 100 M 56 94 L 56 101 M 60 94 L 62 100" {...thin} />
      <Arrow d="M74 96 L 74 74" head="M69 79 L 74 74 L 79 79" />
    </>
  ),
  "big-pot": () => (
    <>
      <Polygon points="26,70 94,70 88,112 32,112" fill={SOIL} {...stroke} />
      <Rect x={22} y={62} width={76} height={9} rx={2} fill="#FFFFFF" {...stroke} />
      <Path d="M60 62 L 60 44 M 60 52 L 48 42 M 60 50 L 72 40" fill="none" {...stroke} />
      <Path d="M34 40 C 26 30 34 16 46 18 C 50 6 70 6 74 18 C 86 16 94 30 86 40 C 78 48 42 48 34 40 Z" fill={LEAF} {...stroke} />
      <Path d="M44 30 C 48 26 52 26 54 28 M 64 24 C 68 20 72 20 74 22 M 70 36 C 74 32 78 32 80 34" fill="none" {...thin} />
    </>
  ),
  thin: () => (
    <>
      <Pot soilTop={74} />
      <Sprout x={44} y={74} />
      <G opacity={0.55}><Sprout x={58} y={74} size={0.7} /></G>
      <Sprout x={74} y={74} />
      <G transform="translate(84 52)">
        <Path d="M-24 6 L 2 -2 M -24 6 L 2 12" fill="none" {...stroke} />
        <Circle cx={8} cy={-4} r={6} fill="#FFFFFF" {...stroke} />
        <Circle cx={8} cy={14} r={6} fill="#FFFFFF" {...stroke} />
      </G>
    </>
  ),
  pinch: () => (
    <>
      <Pot soilTop={92} scale={0.8} />
      <Plant x={60} y={90} size={1.2} />
      <Rect x={36} y={22} width={16} height={11} rx={5.5} fill="#FFFFFF" {...stroke} />
      <Rect x={68} y={22} width={16} height={11} rx={5.5} fill="#FFFFFF" {...stroke} />
      <Path d="M26 28 L 34 28 M 30 24 L 34 28 L 30 32 M 94 28 L 86 28 M 90 24 L 86 28 L 90 32" fill="none" {...thin} />
    </>
  ),
  "harden-off": () => (
    <>
      <Line x1={10} y1={104} x2={110} y2={104} {...stroke} />
      <Polygon points="40,80 64,80 61,104 43,104" fill={SOIL} {...stroke} />
      <Plant x={52} y={80} size={0.8} />
      <Line x1={84} y1={104} x2={84} y2={34} {...stroke} />
      <Path d="M24 40 C 40 20 88 20 104 40 Z" fill={LEAF} {...stroke} />
      <Circle cx={100} cy={14} r={8} fill="#FFFFFF" {...thin} />
      <Path d="M100 1 L 100 -2 M 113 14 L 116 14 M 109 5 L 111 3" fill="none" {...thin} />
    </>
  ),
};

export function GuideIllustration({ id, size = 120 }: { id: IllustrationId; size?: number }) {
  return <Frame size={size}>{DRAWINGS[id]()}</Frame>;
}
