/**
 * Version de test : toutes les illustrations du pas-à-pas, pour les relire avant qu'elles servent. Chacune doit
 * se comprendre sans sa phrase. S'ouvre depuis Réglages → Version de test.
 */
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuideIllustration, ILLUSTRATION_IDS, ILLUSTRATION_LABELS } from "@/components/guide/illustrations";
import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

export default function IllustrationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]}>
        <ScreenHeader back title="Illustrations" subtitle={`${ILLUSTRATION_IDS.length} dessins du pas-à-pas`} />
        <View style={styles.grid}>
          {ILLUSTRATION_IDS.map((id) => (
            <View key={id} style={[glass.card, styles.card]} accessibilityLabel={ILLUSTRATION_LABELS[id]}>
              <GuideIllustration id={id} size={120} />
              <Text style={[styles.label, { color: colors.foreground }]}>{ILLUSTRATION_LABELS[id]}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: "48%", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, gap: 6 },
  label: { fontSize: 13, textAlign: "center", lineHeight: 17 },
});
