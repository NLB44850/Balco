/**
 * L'en-tête commun des écrans : un grand titre, une ligne de contexte, et l'avatar qui ouvre
 * « Moi » (ou un bouton retour sur les écrans secondaires).
 */
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/typography";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { initials } from "@/lib/garden/garden-logic";

type Props = {
  title: string;
  subtitle?: string;
  /** Écran secondaire : un bouton retour à gauche du titre, et pas d'avatar. */
  back?: boolean;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, back, right, style }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { profile } = useGarden();
  const letter = initials(profile.firstName);
  return (
    <View style={[styles.header, style]}>
      {back && (
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <IconSymbol name="chevron.left" size={26} color={colors.foreground} />
        </Pressable>
      )}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
      {!back && (
        <Pressable accessibilityRole="button" accessibilityLabel="Moi : profil et réglages" onPress={() => router.push("/(tabs)/profile")} style={({ pressed }) => [styles.avatar, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
          <Text style={styles.avatarText}>{letter ?? "🌱"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { marginLeft: -8, width: 34, height: 40, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
