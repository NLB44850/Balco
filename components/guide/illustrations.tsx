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
  "roots-out": () => (
    <>
      <G transform="translate(0 -8)">
        <Pot soilTop={68} />
        <Plant x={60} y={68} size={0.8} />
        {/* Les racines passent par les trous du fond. */}
        <Path d="M46 104 C 44 110 50 112 46 118 M 56 104 C 58 110 52 114 56 120 M 66 104 C 64 109 70 112 66 118 M 74 104 C 78 108 74 112 80 116" fill="none" {...thin} />
      </G>
      <Arrow d="M104 84 C 100 96 94 104 86 108" head="M88 101 L 86 108 L 93 108" />
    </>
  ),
  "loosen-roots": () => (
    <>
      {/* La motte sortie du pot : les racines tournent autour, on en écarte quelques-unes. */}
      <Path d="M38 62 L 82 62 L 78 100 L 42 100 Z" fill={SOIL} {...stroke} />
      <Path d="M42 74 C 54 80 66 80 80 74 M 41 86 C 54 92 66 92 79 86 M 42 97 C 54 100 66 100 78 97" fill="none" {...thin} />
      <Plant x={60} y={62} size={0.8} />
      <Path d="M41 90 C 32 94 26 100 20 106 M 79 90 C 88 94 94 100 100 106 M 52 100 C 50 106 46 110 44 116 M 68 100 C 70 106 74 110 76 116" fill="none" {...thin} />
      <Arrow d="M30 80 L 14 88" head="M16 81 L 14 88 L 21 90" />
      <Arrow d="M90 80 L 106 88" head="M104 81 L 106 88 L 99 90" />
    </>
  ),
  "scrape-top": () => (
    <>
      <Pot soilTop={68} />
      <Plant x={60} y={68} size={0.8} />
      {/* Les 5 cm du dessus : la vieille terre qu'on retire. */}
      <Line x1={36} y1={78} x2={84} y2={78} {...thin} strokeDasharray="4 4" />
      <Line x1={98} y1={68} x2={98} y2={78} {...thin} />
      <Line x1={95} y1={68} x2={101} y2={68} {...thin} />
      <Line x1={95} y1={78} x2={101} y2={78} {...thin} />
      <G transform="rotate(35 86 48)">
        <Line x1={86} y1={20} x2={86} y2={52} {...stroke} />
        <Path d="M80 52 L 92 52 M 80 52 L 80 64 M 84 52 L 84 64 M 88 52 L 88 64 M 92 52 L 92 64" fill="none" {...thin} />
      </G>
      {[[30, 54], [24, 60], [34, 48]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.4} fill={SOIL} {...thin} />)}
      <Arrow d="M50 44 C 42 42 38 46 36 50" head="M35 43 L 36 50 L 42 48" />
    </>
  ),
  "two-shoots": () => (
    <>
      <Pot soilTop={70} />
      {/* La tige pincée (coupe plate) et, sous la coupe, deux nouvelles pousses de part et d'autre. */}
      <Line x1={60} y1={70} x2={60} y2={28} {...stroke} />
      <Line x1={55} y1={28} x2={65} y2={28} {...stroke} />
      <Path d="M60 56 C 48 56 42 48 44 42 C 52 43 58 50 60 56 Z" fill={LEAF} {...thin} />
      <Path d="M60 56 C 72 56 78 48 76 42 C 68 43 62 50 60 56 Z" fill={LEAF} {...thin} />
      <Path d="M60 36 C 52 30 44 30 38 22" fill="none" {...thin} />
      <Path d="M60 36 C 68 30 76 30 82 22" fill="none" {...thin} />
      <Path d="M38 22 C 30 22 28 14 32 10 C 38 12 40 18 38 22 Z" fill={LEAF} {...thin} />
      <Path d="M82 22 C 90 22 92 14 88 10 C 82 12 80 18 82 22 Z" fill={LEAF} {...thin} />
    </>
  ),
  "leaf-underside": () => (
    <>
      {/* Une feuille retournée, quelques pucerons sur son revers, et une loupe. */}
      <Path d="M14 70 C 30 32 74 26 100 44 C 84 78 40 92 14 70 Z" fill={LEAF} {...stroke} />
      <Path d="M14 70 C 40 62 70 52 100 44" fill="none" {...thin} />
      {[[42, 66], [50, 62], [58, 70], [66, 58]].map(([cx, cy]) => <Ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={2.6} ry={2} fill="#FFFFFF" {...thin} />)}
      <Circle cx={56} cy={64} r={17} fill="none" {...stroke} />
      <Line x1={68} y1={77} x2={84} y2={96} {...stroke} strokeWidth={5} />
      <Arrow d="M24 34 C 26 26 32 22 40 22" head="M33 18 L 40 22 L 34 27" />
    </>
  ),
  "empty-saucer": () => (
    <>
      {/* Le pot soulevé, la soucoupe penchée : l'eau part. */}
      <G transform="translate(-14 -22)">
        <Pot soilTop={72} />
        <Sprout x={60} y={72} />
      </G>
      <G transform="rotate(18 70 104)">
        <Path d="M40 100 L 100 100 L 96 108 L 44 108 Z" fill={LEAF} {...stroke} />
      </G>
      {[[100, 112], [104, 118], [96, 118]].map(([cx, cy]) => <Ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={2} ry={3} fill="#FFFFFF" {...thin} />)}
      <Arrow d="M46 92 C 46 84 44 80 40 76" head="M37 82 L 40 76 L 46 79" />
    </>
  ),
  "away-radiator": () => (
    <>
      {/* Un radiateur et sa chaleur à gauche ; le pot éloigné, à droite. */}
      <Rect x={8} y={50} width={36} height={46} rx={4} fill="#FFFFFF" {...stroke} />
      {[16, 24, 32].map((x) => <Line key={x} x1={x} y1={56} x2={x} y2={90} {...thin} />)}
      <Path d="M14 44 C 10 38 18 34 14 28 M 26 44 C 22 38 30 34 26 28 M 38 44 C 34 38 42 34 38 28" fill="none" {...thin} />
      <G transform="translate(30 0) scale(0.85) translate(24 18)">
        <Pot soilTop={72} />
        <Plant x={60} y={72} size={0.9} />
      </G>
      <Arrow d="M50 104 L 74 104" head="M68 99 L 74 104 L 68 109" />
    </>
  ),
  // --- Gestes d'entretien du catalogue balcon et terrasse (23/10) ---------------------------------------
  trellis: () => (
    <>
      <G transform="translate(0 6)">
        <Pot soilTop={72} scale={0.8} />
      </G>
      {/* Le treillage au-dessus du pot, et la tige qui s'enroule autour. */}
      {[40, 60, 80].map((x) => <Line key={x} x1={x} y1={10} x2={x} y2={70} {...thin} />)}
      {[22, 40, 58].map((y) => <Line key={y} x1={34} y1={y} x2={86} y2={y} {...thin} />)}
      <Path d="M60 76 C 46 70 74 62 60 54 C 46 46 74 38 60 30 C 50 24 54 16 64 12" fill="none" {...stroke} />
      <Path d="M52 64 C 44 64 40 58 42 54 C 48 55 51 59 52 64 Z" fill={LEAF} {...thin} />
      <Path d="M68 44 C 76 44 80 38 78 34 C 72 35 69 39 68 44 Z" fill={LEAF} {...thin} />
      <Path d="M54 26 C 46 26 42 20 44 16 C 50 17 53 21 54 26 Z" fill={LEAF} {...thin} />
      <Arrow d="M100 64 C 108 50 108 36 98 24" head="M97 31 L 98 24 L 105 26" />
    </>
  ),
  "tie-stem": () => (
    <>
      {/* De près : le montant du support, la tige à côté, et le lien en huit, lâche, entre les deux. */}
      <Rect x={38} y={8} width={12} height={104} rx={3} fill="#FFFFFF" {...stroke} />
      <Path d="M76 112 C 70 90 74 70 70 50 C 67 34 72 20 78 8" fill="none" {...stroke} />
      <Path d="M72 82 C 84 80 92 72 90 66 C 82 66 76 72 72 82 Z" fill={LEAF} {...thin} />
      <Path d="M71 36 C 60 34 54 26 56 22 C 64 23 69 28 71 36 Z" fill={LEAF} {...thin} />
      <Path d="M44 54 C 30 48 30 66 44 62 C 56 58 62 50 72 54 C 84 58 82 70 70 64 C 60 60 54 58 44 54 Z" fill="none" {...thin} />
      <Path d="M30 58 L 18 58 M 22 54 L 18 58 L 22 62" fill="none" {...thin} />
    </>
  ),
  "fruit-sling": () => (
    <>
      {/* Le fruit pend dans un filet noué au support : il ne tire plus sur la tige. */}
      <Line x1={96} y1={10} x2={96} y2={112} {...stroke} />
      <Line x1={14} y1={18} x2={96} y2={18} {...stroke} />
      <Path d="M20 18 C 24 30 34 40 46 50" fill="none" {...stroke} />
      <Path d="M30 32 C 20 34 14 28 16 22 C 24 22 28 26 30 32 Z" fill={LEAF} {...thin} />
      <Circle cx={56} cy={70} r={20} fill={SOIL} {...stroke} />
      <Path d="M36 72 C 38 94 74 94 76 72" fill={LEAF} fillOpacity={0.5} {...thin} />
      <Path d="M44 74 L 50 90 M 56 76 L 56 92 M 68 74 L 62 90" fill="none" {...thin} />
      <Path d="M36 72 L 70 18 M 76 72 L 96 40" fill="none" {...thin} />
    </>
  ),
  secateurs: () => (
    <>
      {/* Une branche, le sécateur qui coupe net, le bout coupé qui tombe. */}
      <Line x1={8} y1={50} x2={58} y2={50} {...stroke} />
      <Ellipse cx={30} cy={45} rx={3} ry={2.2} fill={LEAF} {...thin} />
      <G opacity={0.45}>
        <Line x1={66} y1={56} x2={100} y2={68} {...stroke} />
      </G>
      <Path d="M62 38 C 54 42 52 52 58 60 L 70 62 Z" fill="#FFFFFF" {...stroke} />
      <Path d="M58 62 C 54 54 56 46 64 40" fill="none" {...thin} />
      <Circle cx={68} cy={62} r={3} fill="#FFFFFF" {...thin} />
      <Path d="M70 64 C 82 74 90 88 94 106" fill="none" {...stroke} strokeWidth={6} />
      <Path d="M66 66 C 70 80 72 94 70 110" fill="none" {...stroke} strokeWidth={6} />
    </>
  ),
  "two-buds": () => (
    <>
      {/* Le vieux bois en bas, le rameau de l'an dernier, deux bourgeons gardés ; le haut coupé, en pâle. */}
      <Rect x={50} y={96} width={20} height={18} rx={4} fill={SOIL} {...stroke} />
      <Line x1={60} y1={96} x2={60} y2={58} {...stroke} />
      <Ellipse cx={53} cy={84} rx={5} ry={4} fill={LEAF} {...stroke} />
      <Ellipse cx={67} cy={68} rx={5} ry={4} fill={LEAF} {...stroke} />
      <G opacity={0.35}>
        <Line x1={60} y1={56} x2={60} y2={14} {...stroke} />
        <Ellipse cx={53} cy={44} rx={5} ry={4} fill={LEAF} {...thin} />
        <Ellipse cx={67} cy={26} rx={5} ry={4} fill={LEAF} {...thin} />
      </G>
      <Line x1={40} y1={60} x2={80} y2={56} {...thin} strokeDasharray="5 4" />
      <Path d="M100 56 L 86 57 M 90 53 L 86 57 L 90 61" fill="none" {...thin} />
    </>
  ),
  "grape-bunches": () => (
    <>
      {/* Trois grappes sur la tige : deux gardées, la troisième coupée (en pâle), les ciseaux à côté. */}
      <Path d="M6 24 C 40 18 80 18 114 26" fill="none" {...stroke} />
      {[24, 58].map((x) => (
        <G key={x}>
          <Line x1={x} y1={22} x2={x} y2={34} {...thin} />
          {[[0, 38], [-7, 44], [7, 44], [-10, 52], [0, 51], [10, 52], [-6, 59], [6, 59], [0, 66]].map(([dx, y]) => <Circle key={`${dx}-${y}`} cx={x + dx} cy={y} r={4.2} fill={LEAF} {...thin} />)}
        </G>
      ))}
      <G opacity={0.4}>
        <Line x1={92} y1={24} x2={92} y2={34} {...thin} />
        {[[0, 38], [-7, 44], [7, 44], [0, 51], [0, 58]].map(([dx, y]) => <Circle key={`${dx}-${y}`} cx={92 + dx} cy={y} r={4.2} fill={LEAF} {...thin} />)}
      </G>
      <Line x1={86} y1={30} x2={98} y2={30} {...thin} strokeDasharray="3 3" />
      <G transform="translate(96 92) rotate(-60)">
        <Path d="M-24 6 L 2 -2 M -24 6 L 2 12" fill="none" {...stroke} />
        <Circle cx={8} cy={-4} r={6} fill="#FFFFFF" {...stroke} />
        <Circle cx={8} cy={14} r={6} fill="#FFFFFF" {...stroke} />
      </G>
    </>
  ),
  "cut-stalk": () => (
    <>
      {/* La touffe de rhubarbe, la grande tige à fleurs au milieu, coupée tout en bas (la flèche). */}
      <Pot soilTop={80} />
      <Path d="M52 80 C 44 70 34 64 22 62 C 18 52 30 44 40 50 C 46 54 50 66 52 80 Z" fill={LEAF} {...thin} />
      <Path d="M68 80 C 76 70 86 64 98 62 C 102 52 90 44 80 50 C 74 54 70 66 68 80 Z" fill={LEAF} {...thin} />
      <Line x1={60} y1={78} x2={60} y2={20} {...stroke} />
      {[[60, 14], [53, 20], [67, 20], [56, 27], [64, 27]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.6} fill="#FFFFFF" {...thin} />)}
      <Line x1={50} y1={76} x2={70} y2={76} {...stroke} />
      <Arrow d="M112 30 C 108 56 88 70 72 75" head="M78 70 L 72 75 L 79 79" />
    </>
  ),
  "earth-up": () => (
    <>
      {/* Le terreau ramené en petite butte autour du pied, des deux côtés. */}
      <Pot soilTop={80} />
      <Path d="M38 80 C 46 66 74 66 82 80 Z" fill={SOIL} {...stroke} />
      <Plant x={60} y={70} size={0.8} />
      <Arrow d="M14 58 C 22 60 30 64 36 70" head="M29 69 L 36 70 L 34 63" />
      <Arrow d="M106 58 C 98 60 90 64 84 70" head="M91 69 L 84 70 L 86 63" />
    </>
  ),
  mulch: () => (
    <>
      {/* Une couche de paille sur la terre, au pied de la plante. */}
      <Pot soilTop={80} />
      <Path d="M37 82 C 44 70 76 70 83 82 Z" fill={SOIL} {...thin} />
      {[[40, 78, 50, 74], [46, 82, 56, 77], [52, 75, 62, 79], [62, 77, 72, 73], [66, 82, 76, 78], [72, 75, 80, 80], [42, 74, 48, 80], [56, 72, 64, 74]].map(([x1, y1, x2, y2]) => <Line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} {...thin} />)}
      <Plant x={60} y={72} size={0.85} />
      <Path d="M102 30 L 102 56 M 97 51 L 102 56 L 107 51" fill="none" {...thin} />
    </>
  ),
  "winter-wrap": () => (
    <>
      {/* Le mur à gauche, le pot collé contre lui, entouré d'une natte ; le vent de l'autre côté. */}
      <Rect x={4} y={14} width={18} height={98} fill="#FFFFFF" {...stroke} />
      {[30, 50, 70, 90].map((y) => <Line key={y} x1={4} y1={y} x2={22} y2={y} {...thin} />)}
      <G transform="translate(-6 0)">
        <Pot soilTop={72} />
        <Plant x={60} y={72} size={0.9} />
        <Path d="M30 70 L 90 70 L 85 106 L 35 106 Z" fill="none" {...thin} strokeDasharray="5 3" />
        {[[42, 80], [54, 86], [66, 80], [78, 86], [48, 96], [72, 96]].map(([cx, cy]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="none" {...thin} />)}
      </G>
      <Line x1={4} y1={112} x2={116} y2={112} {...stroke} />
      <Path d="M114 40 C 104 38 100 46 92 44 M 114 54 C 106 52 102 60 96 58" fill="none" {...thin} />
    </>
  ),
  fleece: () => (
    <>
      {/* La nuit : un voile léger posé sur la plante, qui laisse passer l'air. */}
      <Pot soilTop={72} />
      <Plant x={60} y={72} size={1} />
      <Path d="M28 104 C 24 60 34 26 60 24 C 86 26 96 60 92 104" fill="none" {...thin} strokeDasharray="6 4" />
      <Path d="M100 8 C 92 10 90 22 98 26 C 92 26 86 20 88 12 C 90 8 96 6 100 8 Z" fill={LEAF} {...thin} />
      <Path d="M18 16 L 18 22 M 15 19 L 21 19 M 30 8 L 30 12 M 28 10 L 32 10" fill="none" {...thin} />
    </>
  ),
};

export function GuideIllustration({ id, size = 120 }: { id: IllustrationId; size?: number }) {
  return <Frame size={size}>{DRAWINGS[id]()}</Frame>;
}
