/**
 * La carte météo illustrée en haut d'Aujourd'hui (maquette A du 24/10) : le ciel dessiné qui bouge doucement, la
 * température, une phrase (« Pluie vers 15 h »), le mini et le maxi, un conseil pour le balcon et les prochaines
 * heures. La toucher ouvre le détail (`WeatherDetail`, dans la feuille du bas) avec les 3 jours suivants.
 * Calculs dans lib/weather/forecast-view.ts.
 */
import { Pressable, StyleSheet, View } from "react-native";

import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { SkyIllustration } from "@/components/weather/sky-illustration";
import { useColors } from "@/hooks/use-colors";
import type { ForecastView, HourView, WeatherNote } from "@/lib/weather/forecast-view";

function NoteLine({ note }: { note: WeatherNote }) {
  const colors = useColors();
  const tone = note.tone === "cold" ? { backgroundColor: colors.frostSoft, color: colors.frost } : note.tone === "warm" ? { backgroundColor: colors.heatSoft, color: colors.warning } : { backgroundColor: colors.leaf, color: colors.primary };
  return (
    <View style={[styles.note, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.noteText, { color: tone.color }]}>{`${note.emoji}  ${note.text}`}</Text>
    </View>
  );
}

function Hours({ hours }: { hours: HourView[] }) {
  const colors = useColors();
  if (hours.length === 0) return null;
  return (
    <View style={[styles.hours, { borderTopColor: colors.border }]}>
      {hours.map((hour) => (
        <View key={hour.label} style={styles.hour} accessibilityLabel={`${hour.label === "Maint." ? "Maintenant" : hour.label} : ${hour.temperatureC}°${hour.rainChance ? `, pluie ${hour.rainChance} %` : ""}`}>
          <Text style={[styles.hourLabel, { color: colors.muted }]}>{hour.label}</Text>
          <SkyIllustration kind={hour.kind} size={34} />
          <Text style={[styles.hourTemp, { color: colors.foreground }]}>{`${hour.temperatureC}°`}</Text>
          <Text style={[styles.hourRain, { color: colors.frost }]}>{hour.rainChance ? `${hour.rainChance} %` : " "}</Text>
        </View>
      ))}
    </View>
  );
}

export function WeatherCard({ view, city, stale, onOpen }: { view: ForecastView; city: string; /** « Météo reçue à 14 h » hors connexion. */ stale?: string; onOpen: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Météo à ${city} : ${view.temperatureC}°, ${view.headline}. Mini ${view.minC}°, maxi ${view.maxC}°. Voir le détail`}
      onPress={onOpen}
      style={({ pressed }) => [glass.card, styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <SkyIllustration kind={view.kind} size={86} animated />
        <View style={styles.copy}>
          <Text style={[styles.temperature, { color: colors.foreground }]}>{`${view.temperatureC}°`}</Text>
          <Text style={[styles.line, { color: colors.foreground }]} numberOfLines={1}>{`${view.headline} · ${city}`}</Text>
          <Text style={[styles.line, { color: colors.muted }]} numberOfLines={1}>{stale ?? `Mini ${view.minC}° · maxi ${view.maxC}°`}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
      </View>
      {view.note && <NoteLine note={view.note} />}
      <Hours hours={view.hours} />
    </Pressable>
  );
}

/** Le détail, dans la feuille du bas : le moment présent, les prochaines heures, puis les 3 jours suivants. */
export function WeatherDetail({ view, city }: { view: ForecastView; city: string }) {
  const colors = useColors();
  // L'échelle commune des barres des jours (du plus froid au plus chaud).
  const low = Math.min(view.minC, ...view.days.map((day) => day.minC));
  const high = Math.max(view.maxC, ...view.days.map((day) => day.maxC));
  const span = Math.max(1, high - low);
  const facts = [`Ressenti ${view.apparentC}°`, view.rainTodayMm >= 0.5 ? `${String(view.rainTodayMm).replace(".", ",")} mm de pluie aujourd’hui` : null, view.gustKmh >= 30 ? `rafales à ${view.gustKmh} km/h` : null].filter(Boolean).join(" · ");
  return (
    <View style={styles.detail}>
      <View style={styles.top}>
        <SkyIllustration kind={view.kind} size={76} animated />
        <View style={styles.copy}>
          <Text style={[styles.temperature, styles.detailTemperature, { color: colors.foreground }]}>{`${view.temperatureC}°`}</Text>
          <Text style={[styles.line, { color: colors.foreground }]}>{`${view.headline} · ${city}`}</Text>
          <Text style={[styles.line, { color: colors.muted }]}>{facts}</Text>
        </View>
      </View>
      {view.note && <NoteLine note={view.note} />}
      <Hours hours={view.hours} />
      {view.days.length > 0 && (
        <>
          <Text style={[styles.daysTitle, { color: colors.foreground }]}>Les jours qui viennent</Text>
          {view.days.map((day) => (
            <View key={day.label} style={[styles.day, { borderBottomColor: colors.border }]} accessibilityLabel={`${day.label} : de ${day.minC}° à ${day.maxC}°${day.rainMm >= 0.5 ? `, ${day.rainMm} mm de pluie` : ""}`}>
              <Text style={[styles.dayLabel, { color: colors.foreground }]}>{day.label}</Text>
              <SkyIllustration kind={day.kind} size={34} />
              <Text style={[styles.dayMin, { color: day.minC <= 0 ? colors.frost : colors.muted }]}>{`${day.minC}°`}</Text>
              <View style={[styles.bar, { backgroundColor: colors.border }]}>
                <View style={[styles.barFill, { left: `${((day.minC - low) / span) * 100}%`, right: `${((high - day.maxC) / span) * 100}%`, backgroundColor: day.maxC >= 28 ? colors.warning : day.minC <= 0 ? colors.frost : colors.primary }]} />
              </View>
              <Text style={[styles.dayMax, { color: colors.foreground }]}>{`${day.maxC}°`}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  copy: { flex: 1, gap: 2 },
  temperature: { fontSize: 50, lineHeight: 54, fontWeight: "800", letterSpacing: -2 },
  detailTemperature: { fontSize: 44, lineHeight: 48 },
  line: { fontSize: 14, lineHeight: 19 },
  chevron: { fontSize: 24, alignSelf: "flex-start" },
  note: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  noteText: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  hours: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  hour: { alignItems: "center", gap: 3, minWidth: 48 },
  hourLabel: { fontSize: 13 },
  hourTemp: { fontSize: 15, fontWeight: "700" },
  hourRain: { fontSize: 12, fontWeight: "600" },
  detail: { gap: 14, paddingBottom: 8 },
  daysTitle: { fontSize: 17, fontWeight: "800", marginTop: 4 },
  day: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  dayLabel: { width: 78, fontSize: 15, fontWeight: "600" },
  dayMin: { width: 32, textAlign: "right", fontSize: 14 },
  bar: { flex: 1, height: 6, borderRadius: 3, position: "relative", overflow: "hidden" },
  barFill: { position: "absolute", top: 0, bottom: 0, borderRadius: 3 },
  dayMax: { width: 32, fontSize: 15, fontWeight: "700" },
});
