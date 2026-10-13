/**
 * Le détail d'un geste, au même format pour tous (lib/garden/gesture-detail.ts) : bandeau éventuel, repère en grand,
 * gestes courts avec icône, phrase propre à la plante, encadré à part.
 */
import { StyleSheet, View } from "react-native";

import { WaterDose } from "@/components/today/water-dose";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { DetailHero, GestureDetail } from "@/lib/garden/gesture-detail";

function Hero({ hero }: { hero: DetailHero }) {
  const colors = useColors();
  if (hero.art === "bottles") return <WaterDose liters={hero.liters} />;
  return (
    <View accessible accessibilityLabel={`${hero.value}, ${hero.caption}`} style={[styles.hero, { backgroundColor: colors.leaf }]}>
      <View style={styles.heroCopy}>
        <Text style={[styles.heroValue, { color: colors.primary }]}>{hero.value}</Text>
        <Text style={[styles.heroCaption, { color: colors.foreground }]}>{hero.caption}</Text>
      </View>
      <Text style={styles.heroEmoji}>{hero.emoji}</Text>
    </View>
  );
}

export function GestureDetailView({ detail }: { detail: GestureDetail }) {
  const colors = useColors();
  const { banner } = detail;
  return (
    <>
      {banner && (
        <View style={[styles.banner, { backgroundColor: banner.tone === "water" ? colors.frostSoft : colors.leaf }]}>
          <Text style={[styles.bannerText, { color: banner.tone === "water" ? colors.frost : colors.primary }]}>{banner.text}</Text>
        </View>
      )}
      {detail.hero && <Hero hero={detail.hero} />}
      {detail.steps.length > 0 && (
        <View style={styles.steps}>
          {detail.steps.map((step, index) => (
            <View key={`${index}-${step.text}`} style={styles.step}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
            </View>
          ))}
        </View>
      )}
      {detail.note && <Text style={[styles.note, { color: colors.muted }]}>{detail.note}</Text>}
      {detail.box && (
        <View style={[styles.box, { backgroundColor: colors.surface }]}>
          <Text style={[styles.boxTitle, { color: colors.foreground }]}>{detail.box.title}</Text>
          <Text style={[styles.stepText, { color: colors.foreground }]}>{detail.box.text}</Text>
          <Text style={[styles.note, { color: colors.muted }]}>{detail.box.small}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bannerText: { fontSize: 15, fontWeight: "700" },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  heroCopy: { flexShrink: 1, gap: 2 },
  heroValue: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  heroCaption: { fontSize: 14, fontWeight: "600", lineHeight: 19 },
  heroEmoji: { fontSize: 44 },
  steps: { gap: 10 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepIcon: { fontSize: 20, width: 28, textAlign: "center" },
  stepText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: "600" },
  note: { fontSize: 14, lineHeight: 20 },
  box: { borderRadius: 14, padding: 14, gap: 4 },
  boxTitle: { fontSize: 15, fontWeight: "800" },
});
