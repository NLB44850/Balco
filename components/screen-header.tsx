/**
 * L'en-tête commun des écrans : un grand titre, une ligne de contexte, un bouton à droite (l'appareil photo
 * d'Aujourd'hui et de Balcon) et un bouton retour sur les écrans secondaires. « Moi » est le 5ᵉ onglet depuis le
 * 24/10 (l'avatar en haut n'était pas clair).
 */
import { useRouter } from "expo-router";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { BackButton } from "@/components/ui/nav-buttons";
import { Text } from "@/components/ui/typography";

import { useColors } from "@/hooks/use-colors";

type Props = {
  title: string;
  subtitle?: string;
  /** Écran secondaire : un bouton retour à gauche du titre. */
  back?: boolean;
  /** Ce que fait le bouton retour à la place de revenir à l'écran d'avant (catalogue : revenir aux familles). */
  onBack?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, back, onBack, right, style }: Props) {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={[styles.header, style]}>
      {back && (
        <BackButton onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)")))} />
      )}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
        {/* Deux lignes : un bouton à droite (« Effacer » de Nora) ne coupe plus la phrase (retour du 14/10). */}
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 14 },
  right: { alignSelf: "center" },
});
