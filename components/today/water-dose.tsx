/**
 * La quantité d'un arrosage, en grand (étape 6a, retour du 13/10 « pas assez visible ») : « 2 L » et autant de grandes
 * bouteilles d'eau dessinées, la dernière remplie au tiers ou aux deux tiers. Le repère se lit sans phrase à retenir.
 */
import { StyleSheet, View } from "react-native";
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { bottleParts, bottlesText, litersText } from "@/lib/plants/watering";

/** Une bouteille de 1,5 L vue de face : bouchon, goulot, épaules, corps. */
const BOTTLE = "M9 1h6v4l3 4v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9l3-4z";
const WIDTH = 24;
const HEIGHT = 33;
/** Le corps se remplit du fond jusqu'aux épaules (y = 9). */
const BODY_TOP = 9;

function Bottle({ fill, id }: { fill: number; id: string }) {
  const colors = useColors();
  const level = BODY_TOP + (HEIGHT - BODY_TOP) * (1 - fill);
  return (
    <Svg width={WIDTH * 1.4} height={HEIGHT * 1.4} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <Defs>
        <ClipPath id={id}>
          <Path d={BOTTLE} />
        </ClipPath>
      </Defs>
      <Rect x={0} y={level} width={WIDTH} height={HEIGHT - level} fill={colors.frost} opacity={0.85} clipPath={`url(#${id})`} />
      <Path d={BOTTLE} fill="none" stroke={colors.frost} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

export function WaterDose({ liters }: { liters: number }) {
  const colors = useColors();
  const { full, thirds } = bottleParts(liters);
  const bottles = [...Array.from({ length: full }, () => 1), ...(thirds > 0 ? [thirds / 3] : [])];
  return (
    <View accessible accessibilityLabel={`Environ ${litersText(liters)}, ${bottlesText(liters)}`} style={[styles.card, { backgroundColor: colors.frostSoft }]}>
      <View style={styles.amount}>
        <Text style={[styles.value, { color: colors.frost }]}>{litersText(liters)}</Text>
        <Text style={[styles.caption, { color: colors.foreground }]}>≈ {bottlesText(liters)}</Text>
      </View>
      <View style={styles.bottles}>
        {bottles.map((fill, index) => <Bottle key={index} fill={fill} id={`bottle-${index}`} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  amount: { flexShrink: 1, gap: 2 },
  value: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  caption: { fontSize: 14, fontWeight: "600" },
  bottles: { flexDirection: "row", alignItems: "flex-end", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 1 },
});
