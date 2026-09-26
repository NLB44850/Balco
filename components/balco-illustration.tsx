import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

type BalcoIllustrationProps = { width?: number; height?: number; compact?: boolean };

export function BalcoIllustration({ width = 290, height = 210, compact = false }: BalcoIllustrationProps) {
  const scale = compact ? 0.78 : 1;
  return (
    <Svg width={width} height={height} viewBox="0 0 290 210">
      <Circle cx="225" cy="52" r="27" fill="#F7C867" opacity="0.9" />
      <Circle cx="53" cy="49" r="35" fill="#E3F0E3" />
      <Path d="M16 164C49 151 87 157 118 164c45 10 91 2 156-11v31H16v-20Z" fill="#F3D6C6" opacity="0.68" />
      <Rect x="30" y="145" width="226" height="9" rx="4.5" fill="#CF765B" />
      <Line x1="47" y1="154" x2="47" y2="190" stroke="#CF765B" strokeWidth="5" strokeLinecap="round" />
      <Line x1="239" y1="154" x2="239" y2="190" stroke="#CF765B" strokeWidth="5" strokeLinecap="round" />
      <G transform={`translate(${compact ? 13 : 0} ${compact ? 10 : 0}) scale(${scale})`}>
        <Path d="M122 146c2-33 3-53 3-83" stroke="#2E6B4D" strokeWidth="5" strokeLinecap="round" />
        <Path d="M124 92C96 80 83 62 85 44c22 0 39 13 43 38" fill="#438B63" />
        <Path d="M126 111c26-15 42-33 43-53-22 1-38 14-43 38" fill="#2E6B4D" />
        <Path d="M124 73C109 52 108 32 118 18c17 12 21 29 9 50" fill="#77A86E" />
        <Path d="M124 127c-27-13-44-9-53 5 20 12 38 10 53-5" fill="#8BB67D" />
        <Circle cx="124" cy="143" r="18" fill="#EECFB7" />
        <Path d="M107 140h34v15h-34Z" fill="#CF765B" />
        <Path d="M106 151c8 7 24 7 35 0" stroke="#F7E8D9" strokeWidth="3" fill="none" />
      </G>
      <G>
        <Path d="M191 147c0-24 0-42 1-57" stroke="#2E6B4D" strokeWidth="4" strokeLinecap="round" />
        <Path d="M193 104c-20-7-28-18-27-31 16 0 26 9 28 25" fill="#438B63" />
        <Path d="M193 119c18-9 27-20 27-34-15 0-25 9-27 24" fill="#77A86E" />
        <Circle cx="191" cy="149" r="14" fill="#D6E7D5" />
      </G>
      <Circle cx="61" cy="124" r="4" fill="#CF765B" />
      <Circle cx="73" cy="116" r="3" fill="#F7C867" />
      <Circle cx="232" cy="119" r="4" fill="#CF765B" />
    </Svg>
  );
}
