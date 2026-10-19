/**
 * « Confidentialité » (Réglages → À propos) : la politique de confidentialité, le même texte que la page web du
 * serveur (shared/privacy.ts, /confidentialite). L'adresse de contact s'ouvre en e-mail.
 */
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { PRIVACY_CONTACT, PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@/shared/privacy";

/** Le texte, avec l'adresse de contact en lien. */
function WithContact({ text, style, linkColor }: { text: string; style: object; linkColor: string }) {
  const parts = text.split(PRIVACY_CONTACT);
  return (
    <Text style={style}>
      {parts.map((part, index) => (
        <Text key={index}>
          {part}
          {index < parts.length - 1 && (
            <Text accessibilityRole="link" style={{ color: linkColor, fontWeight: "600" }} onPress={() => void Linking.openURL(`mailto:${PRIVACY_CONTACT}`)}>
              {PRIVACY_CONTACT}
            </Text>
          )}
        </Text>
      ))}
    </Text>
  );
}

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const body = [styles.text, { color: colors.foreground }];
  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenHeader back title="Confidentialité" subtitle={`Mise à jour le ${PRIVACY_UPDATED}`} />
        <Text style={[styles.text, { color: colors.muted }]}>{PRIVACY_INTRO}</Text>
        {PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} style={[glass.card, styles.card]}>
            <Text style={[styles.title, { color: colors.foreground }]}>{section.title}</Text>
            {section.paragraphs?.map((paragraph) => <WithContact key={paragraph} text={paragraph} style={body} linkColor={colors.primary} />)}
            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bullet}>
                <Text style={[styles.dot, { color: colors.primary }]}>•</Text>
                <WithContact text={bullet} style={[...body, styles.flex]} linkColor={colors.primary} />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  flex: { flex: 1 },
  card: { padding: 16, gap: 8 },
  title: { fontSize: 17, fontWeight: "700" },
  text: { fontSize: 15, lineHeight: 22 },
  bullet: { flexDirection: "row", gap: 8 },
  dot: { fontSize: 15, lineHeight: 22, fontWeight: "800" },
});
