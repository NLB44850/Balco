/**
 * « Crédits photos » : l'auteur et la licence de chaque photo d'exemple des plantes (Wikimedia
 * Commons). Les licences CC BY et CC BY-SA demandent de citer l'auteur et la licence. S'ouvre
 * depuis Réglages.
 */
import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import credits from "@/assets/plants/credits.json";
import { LightScreen } from "@/components/light-screen";
import { CatalogPicture } from "@/components/plant-picture";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { PLANT_CATALOG } from "@/lib/plants/catalog";

type Credit = { author: string; license: string; licenseUrl?: string; page: string };

export default function CreditsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const rows = useMemo(
    () => PLANT_CATALOG.flatMap((entry) => {
      const credit = (credits as Record<string, Credit>)[entry.id];
      return credit ? [{ entry, credit }] : [];
    }).sort((a, b) => a.entry.name.localeCompare(b.entry.name, "fr")),
    [],
  );

  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Crédits photos" subtitle="Les photos d’exemple des plantes" />
        <Text style={[styles.text, { color: colors.muted }]}>Tant que tu n’as pas pris ta plante en photo, Balco montre une photo d’exemple venue de Wikimedia Commons. Merci à leurs auteurs. Touche une ligne pour voir la photo d’origine et sa licence.</Text>
        <View style={[glass.card, styles.list]}>
          {rows.map(({ entry, credit }, index) => (
            <Pressable key={entry.id} accessibilityRole="link" accessibilityLabel={`${entry.name} : photo de ${credit.author}, licence ${credit.license}`} onPress={() => void Linking.openURL(credit.page)} style={({ pressed }) => [styles.row, index < rows.length - 1 && glass.line, pressed && styles.pressed]}>
              <CatalogPicture entry={entry} style={styles.thumb} />
              <View style={styles.flex}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={2}>{credit.author} · {credit.license}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  flex: { flex: 1 },
  text: { fontSize: 14, lineHeight: 20 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  thumb: { width: 44, height: 44, borderRadius: 12 },
  name: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  chevron: { fontSize: 24, fontWeight: "300" },
  pressed: { opacity: 0.78 },
});
