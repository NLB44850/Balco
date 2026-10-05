import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";

import { FadeIn } from "@/components/motion";
import { useColors } from "@/hooks/use-colors";
import type { TodayTone } from "@/lib/garden/today";

type WeatherBannerProps = {
  icon: string;
  tone: TodayTone;
  title: string;
  subtitle: string;
  /** Une ligne de plus sous le sous-titre (l'eau économisée les jours de pluie). */
  note?: string;
  /** Absent : bandeau à lire seulement (pluie). Présent : bouton « C'est fait ». */
  onDone?: () => void;
  onOpen: () => void;
};

/**
 * Une alerte météo en haut d'Aujourd'hui : bleu pour le froid, l'orage, le vent et la pluie, orange pour
 * la chaleur. Toucher le bandeau ouvre le détail (« Dans 3 h », « Pas aujourd'hui ») ; le bouton
 * « C'est fait » note l'action demandée pour toutes les plantes concernées.
 */
export function WeatherBanner({ icon, tone, title, subtitle, note, onDone, onOpen }: WeatherBannerProps) {
  const colors = useColors();
  const heat = tone === "heat";
  const accent = heat ? colors.terracotta : colors.frost;
  const soft = heat ? colors.heatSoft : colors.frostSoft;

  return (
    <FadeIn style={[styles.banner, { backgroundColor: soft, borderColor: accent }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}, détail`} onPress={onOpen} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={[styles.icon, { backgroundColor: "rgba(255,255,255,0.75)" }]}><Text style={[styles.iconText, { color: accent }]}>{icon}</Text></View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: accent }]}>{subtitle}</Text>
          {note ? <Text style={[styles.note, { color: colors.foreground }]}>{note}</Text> : null}
        </View>
      </Pressable>
      {onDone && (
        <Pressable accessibilityRole="button" accessibilityLabel={`C’est fait : ${title}`} onPress={onDone} style={({ pressed }) => [styles.button, { backgroundColor: accent }, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>C’est fait</Text>
        </Pressable>
      )}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 18, borderLeftWidth: 4, padding: 14, gap: 12 },
  main: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 19 },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  subtitle: { fontSize: 13, fontWeight: "600" },
  note: { fontSize: 13, lineHeight: 18 },
  button: { alignSelf: "flex-start", marginLeft: 52, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
